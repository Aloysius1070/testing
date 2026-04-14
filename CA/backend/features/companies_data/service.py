"""Service layer for Companies Data processing."""

import io
import os
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

from .constants import COLUMNS_MAP, OUTPUT_COLUMNS, TAX_RATES, TAX_TYPES
from .jobs import update_job_progress

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_MAPPINGS_DIR = BASE_DIR / "default_mappings"
COMPANY_STORAGE_DIR = BASE_DIR / "company_storage"


def _safe_company_slug(company_name: str) -> str:
    return "".join(ch if ch.isalnum() else "_" for ch in company_name.strip()).strip("_").upper()


def _query_df(df: pd.DataFrame, input_col: str, input_val: str, output_col: str) -> pd.Series:
    return df.loc[df[input_col] == input_val][output_col]


def _verify_tax_rate(tax_rate: int):
    if tax_rate not in TAX_RATES and tax_rate != 0:
        raise ValueError(f"Unsupported tax rate detected: {tax_rate}")


def _add_metadata(row: pd.Series) -> dict:
    result = {}
    for source_col, target_col in COLUMNS_MAP.items():
        if source_col in row:
            result[target_col] = row[source_col]
    return result


def _compute_taxable_value(df: pd.DataFrame, df_mappings: pd.DataFrame, row: pd.Series) -> float:
    filter_cols = []
    mapping_index = {name: idx for idx, name in enumerate(df_mappings["Column Name"].tolist())}

    for col_name in df.columns.values:
        if col_name in mapping_index:
            value = df_mappings.loc[mapping_index[col_name], "Entry Type"]
            if value == "Taxable":
                filter_cols.append(col_name)

    taxable_value = row[filter_cols].dropna().values.sum() if filter_cols else 0
    return 0 if np.isnan(taxable_value) else float(taxable_value)


def _get_ledger(df: pd.DataFrame, df_mappings: pd.DataFrame, row: pd.Series, output_list: list) -> list:
    taxable_cols = set(_query_df(df_mappings, "Entry Type", "Taxable", "Column Name"))
    intersect_cols = list(taxable_cols.intersection(set(df.columns.values)))

    if len(output_list) > 1:
        for output in output_list:
            ledger_list = [col for col in intersect_cols if str(output[1]) in col]
            if ledger_list:
                try:
                    output.append(row[ledger_list].idxmax())
                except ValueError:
                    output.append("N/A")
            else:
                output.append("N/A")
    else:
        if intersect_cols:
            try:
                output_list[0].append(row[intersect_cols].idxmax())
            except ValueError:
                output_list[0].append("N/A")
        else:
            output_list[0].append("N/A")

    return output_list


def _get_tax_dict(df: pd.DataFrame, df_mappings: pd.DataFrame, row: pd.Series) -> dict:
    tax_dict = {t: 0 for t in TAX_TYPES}

    tax_rate_cols_from_mappings = set(_query_df(df_mappings, "Entry Type", "Tax Rate", "Column Name").values)
    for tax_type in TAX_TYPES:
        tax_cols_from_df = [
            col for col in df.columns if col in tax_rate_cols_from_mappings and tax_type in col.upper()
        ]
        filtered_row = row[tax_cols_from_df].dropna() if tax_cols_from_df else pd.Series(dtype=float)
        tax_dict[tax_type] = filtered_row.to_dict()

    return tax_dict


def _get_tds_values(df_mappings: pd.DataFrame, row: pd.Series):
    tds_cols = _query_df(df_mappings, "Entry Type", "TDS", "Column Name").values
    available_cols = [col for col in tds_cols if col in row.index]
    tds_data = row[available_cols].dropna() if available_cols else pd.Series(dtype=float)
    tds_amount = float(tds_data.sum()) if not tds_data.empty else 0
    tds_ledger = tds_data.idxmax() if not tds_data.empty else "N/A"
    return tds_amount, tds_ledger


def _check_preconditions(tax_dict: dict):
    len_i, len_c, len_s = len(tax_dict["IGST"]), len(tax_dict["CGST"]), len(tax_dict["SGST"])

    if len_i == len_c == len_s == 0:
        return None
    if len_c != len_s:
        return None
    if len_i > 0 and len_c > 0:
        return None
    if set(tax_dict["CGST"].values()) != set(tax_dict["SGST"].values()):
        return None

    return True


def _compute_taxes(
    tax_items,
    tax_type: str,
    df: pd.DataFrame,
    row: pd.Series,
    df_mappings: pd.DataFrame,
    transaction_type: str,
):
    output_list = []

    for column_name, amount in tax_items:
        tmp_tax = {t: 0 for t in TAX_TYPES}
        tmp_tax[tax_type] = amount
        tmp_tax["SGST"] = amount if tax_type == "CGST" else 0

        multiplier = 2 if tax_type == "CGST" else 1
        tax_rate = int(_query_df(df_mappings, "Column Name", column_name, "Percent Tax").values.sum() * multiplier)
        _verify_tax_rate(tax_rate)

        code = "IS" if tax_type == "IGST" else ""
        gst_code = f"{transaction_type[0].upper()}{code} {tax_rate}%"

        output_list.append([tmp_tax, tax_rate, gst_code])

    return _get_ledger(df, df_mappings, row, output_list)


def _get_taxes(df: pd.DataFrame, row: pd.Series, df_mappings: pd.DataFrame, transaction_type: str):
    tax_dict = _get_tax_dict(df, df_mappings, row)

    if _check_preconditions(tax_dict) is None:
        return None

    if len(tax_dict["IGST"]) > 0:
        return _compute_taxes(tax_dict["IGST"].items(), "IGST", df, row, df_mappings, transaction_type)

    return _compute_taxes(tax_dict["CGST"].items(), "CGST", df, row, df_mappings, transaction_type)


def _validate_mappings(daybook_df: pd.DataFrame, mapping_df: pd.DataFrame):
    columns = daybook_df.columns.values
    start = None
    for i, col in enumerate(columns):
        if str(col).lower() == "gross total":
            start = i + 1
            break

    if start is None:
        raise ValueError("Gross Total column not found in DayBook.")

    check_cols = columns[start:]
    missing = [col for col in check_cols if col not in mapping_df["Column Name"].values]
    if missing:
        raise ValueError(f"Mapping missing for columns: {', '.join(map(str, missing))}")


def _convert_data(daybook_df: pd.DataFrame, mapping_df: pd.DataFrame, transaction_type: str) -> pd.DataFrame:
    output_rows = {}
    counter = 0

    for _, row in daybook_df.iterrows():
        tax_iter = _get_taxes(daybook_df, row, mapping_df, transaction_type)
        tds_amount, tds_ledger = _get_tds_values(mapping_df, row)

        if tax_iter is None:
            taxable_value = _compute_taxable_value(daybook_df, mapping_df, row)

            tmp_row = _add_metadata(row)
            tmp_row["Taxable value"] = taxable_value
            tmp_row["IGST"] = 0
            tmp_row["CGST"] = 0
            tmp_row["SGST"] = 0
            tmp_row["Tax Rate"] = 0
            tmp_row["Tax Amount"] = 0
            tmp_row["TDS Amount"] = tds_amount
            tmp_row["TDS Ledger"] = tds_ledger
            tmp_row["GST Code"] = "Exempted"
            tmp_row["Ledger"] = "N/A"

            output_rows[counter] = tmp_row
            counter += 1
            continue

        for item in tax_iter:
            taxes, tax_rate, gst_code, ledger = item[0], item[1], item[2], item[3]
            total_taxes = float(sum(taxes.values()))

            tmp_row = _add_metadata(row)
            tmp_row["Taxable value"] = total_taxes * 100 / int(tax_rate) if tax_rate else 0
            tmp_row.update(taxes)
            tmp_row["Tax Rate"] = tax_rate
            tmp_row["Tax Amount"] = total_taxes
            tmp_row["TDS Amount"] = tds_amount
            tmp_row["TDS Ledger"] = tds_ledger
            tmp_row["GST Code"] = gst_code
            tmp_row["Ledger"] = ledger

            output_rows[counter] = tmp_row
            counter += 1

    output_df = pd.DataFrame(output_rows).transpose()
    for col in OUTPUT_COLUMNS:
        if col not in output_df.columns:
            output_df[col] = ""

    output_df = output_df[OUTPUT_COLUMNS]
    return output_df


def _read_excel(file_bytes: bytes, label: str) -> pd.DataFrame:
    try:
        return pd.read_excel(io.BytesIO(file_bytes))
    except Exception as exc:
        raise ValueError(f"Failed to read {label} DayBook. Ensure it is a valid Excel file.") from exc


def _load_default_mapping(transaction_type: str) -> pd.DataFrame:
    mapping_path = DEFAULT_MAPPINGS_DIR / f"{transaction_type}_mappings.xlsx"
    if not mapping_path.exists():
        raise ValueError(f"Default mapping file not found for {transaction_type}: {mapping_path}")
    return pd.read_excel(mapping_path)


def _persist_company_inputs(company_name: str, purchase_bytes: bytes, sales_bytes: bytes) -> Path:
    company_slug = _safe_company_slug(company_name)
    company_dir = COMPANY_STORAGE_DIR / company_slug
    purchase_dir = company_dir / "purchase"
    sales_dir = company_dir / "sale"

    purchase_dir.mkdir(parents=True, exist_ok=True)
    sales_dir.mkdir(parents=True, exist_ok=True)

    (purchase_dir / "DayBook.xlsx").write_bytes(purchase_bytes)
    (sales_dir / "DayBook.xlsx").write_bytes(sales_bytes)

    return company_dir


def process_company_daybooks(
    company_name: str,
    purchase_bytes: bytes,
    sales_bytes: bytes,
    job_id: str | None = None,
):
    if not company_name or not company_name.strip():
        raise ValueError("Company name is required.")

    if job_id:
        update_job_progress(job_id, 10, "Saving uploaded files...")

    company_dir = _persist_company_inputs(company_name, purchase_bytes, sales_bytes)

    if job_id:
        update_job_progress(job_id, 25, "Loading daybooks and default mappings...")

    purchase_df = _read_excel(purchase_bytes, "purchase")
    sale_df = _read_excel(sales_bytes, "sale")
    purchase_mapping_df = _load_default_mapping("purchase")
    sale_mapping_df = _load_default_mapping("sale")

    if job_id:
        update_job_progress(job_id, 40, "Validating mapping coverage...")

    _validate_mappings(purchase_df, purchase_mapping_df)
    _validate_mappings(sale_df, sale_mapping_df)

    if job_id:
        update_job_progress(job_id, 65, "Generating purchase output...")

    purchase_output = _convert_data(purchase_df, purchase_mapping_df, "purchase")

    if job_id:
        update_job_progress(job_id, 80, "Generating sales output...")

    sale_output = _convert_data(sale_df, sale_mapping_df, "sale")

    if job_id:
        update_job_progress(job_id, 90, "Preparing downloadable workbook...")

    output_buffer = io.BytesIO()
    with pd.ExcelWriter(output_buffer) as writer:
        purchase_output.to_excel(writer, sheet_name="purchase_output", index=False)
        sale_output.to_excel(writer, sheet_name="sale_output", index=False)

    output_bytes = output_buffer.getvalue()

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    company_slug = _safe_company_slug(company_name)
    download_name = f"{company_slug}_companies_data_{timestamp}.xlsx"

    # Persist output alongside uploaded files for auditability.
    (company_dir / download_name).write_bytes(output_bytes)

    return download_name, output_bytes
