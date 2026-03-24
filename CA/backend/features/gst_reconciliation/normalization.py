"""Invoice and header normalization utilities for GST reconciliation"""

import re
import pandas as pd


def normalize_invoice_number(invoice):
    """
    Normalize invoice numbers by removing year patterns anywhere.
    - 00010/2425 → 10 (remove /2425 year + leading zeros)
    - SA47/2024/24-25 → SA47/2024 (remove /24-25 year)
    - KSG/24-25/1241 → KSG/1241 (remove /24-25/ year)
    - AE/2024-25/1004 → AE/1004 (remove /2024-25/ year)
    - DE/0126 → DE/126 (leading zeros only)
    """
    if pd.isna(invoice):
        return ''
    
    inv = str(invoice).strip().upper()
    
    # Step 1: Remove ALL year patterns (in middle OR at end)
    inv = re.sub(r'/20\d{2}-\d{2}/', '/', inv)  # /2024-25/ in middle
    inv = re.sub(r'/\d{2}-\d{2}/', '/', inv)    # /24-25/ in middle
    inv = re.sub(r'/20\d{2}-\d{2}$', '', inv)   # /2024-25 at end
    inv = re.sub(r'/\d{2}-\d{2}$', '', inv)     # /24-25 at end
    inv = re.sub(r'/2[0-4]\d{2}$', '', inv)     # /2425, /2024 at end (years 2000-2499 only)
    inv = re.sub(r'-FY\d{4}$', '', inv)         # -FY2024 at end
    
    # Step 2: Clean up double slashes and trailing slashes
    inv = re.sub(r'/+', '/', inv)
    inv = inv.rstrip('/')
    
    # Step 3: Remove leading zeros from numeric parts only
    parts = re.split(r'([/-])', inv)
    normalized_parts = []
    for part in parts:
        if part and part not in ['/', '-']:
            if part.isdigit():
                normalized_parts.append(part.lstrip('0') or '0')
            else:
                normalized_parts.append(part)
        elif part in ['/', '-']:
            normalized_parts.append(part)
    inv = ''.join(normalized_parts)
    
    return inv


def unify_invoice_numbers(df, invoice_col='Invoice No.'):
    """Keep normalized invoice column for matching - DON'T drop it!"""
    df['Normalized_Invoice'] = df[invoice_col].apply(normalize_invoice_number)
    # Keep both original and normalized columns for comparison
    return df


def _normalize_header_token(s: str) -> str:
    if s is None:
        return ""
    s = str(s).upper().strip()
    for ch in [".", ",", "-", "_", "/", "\\", "(", ")", ":", ";"]:
        s = s.replace(ch, " ")
    s = " ".join(s.split())
    return s


def _canonical_header_map() -> dict:
    return {
        "FORMS": "Forms",
        "FORM": "Forms",
        "OPENING": "Forms",
        "GSTIN": "GSTIN NO.",
        "GSTIN NO": "GSTIN NO.",
        "GSTIN NUMBER": "GSTIN NO.",
        "GST NO": "GSTIN NO.",
        "INVOICE NO": "Invoice No.",
        "INVOICE NUMBER": "Invoice No.",
        "INV NO": "Invoice No.",
        "INV NUMBER": "Invoice No.",
        "INVOICE": "Invoice No.",
        "CGST": "CGST",
        "SGST": "SGST",
        "IGST": "IGST",
        "TAXABLE AMT": "Taxable Amt",
        "TAXABLE AMOUNT": "Taxable Amt",
        "TAXABLE VALUE": "Taxable Amt",
        "TAXABLE": "Taxable Amt",
    }


def rename_headers_canonically(df: pd.DataFrame) -> pd.DataFrame:
    """Rename DataFrame headers to canonical column names"""
    synonyms = _canonical_header_map()
    new_cols = []
    for col in df.columns:
        norm = _normalize_header_token(col)
        canonical = synonyms.get(norm)
        new_cols.append(canonical if canonical else str(col).strip())
    df = df.copy()
    df.columns = new_cols
    return df


def find_sheet_with_headers(file_path):
    """Find the sheet containing the GST data headers"""
    try:
        xls = pd.ExcelFile(file_path)
    except Exception:
        return None
    for s in xls.sheet_names:
        try:
            df_raw_probe = pd.read_excel(file_path, sheet_name=s, header=None)
        except Exception:
            continue
        for _, row in df_raw_probe.iterrows():
            row_values = row.fillna('').astype(str).tolist()
            norm_values = {_normalize_header_token(v) for v in row_values}
            if {"FORMS", "GSTIN NO"}.issubset(norm_values) or {"FORMS", "GSTIN"}.issubset(norm_values):
                return s
    return xls.sheet_names[0] if xls.sheet_names else None
