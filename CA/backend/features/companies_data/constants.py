"""Constants for Companies Data processing."""

OUTPUT_COLUMNS = [
    "Date",
    "Particulars",
    "Voucher No.",
    "Supplier Invoice No",
    "GSTTin No.",
    "Taxable value",
    "IGST",
    "CGST",
    "SGST",
    "Tax Rate",
    "Tax Amount",
    "TDS Amount",
    "TDS Ledger",
    "GST Code",
    "Ledger",
]

COLUMNS_MAP = {
    "Date": "Date",
    "Particulars": "Particulars",
    "Voucher No.": "Voucher No.",
    "Supplier Invoice No": "Supplier Invoice No",
    "GSTIN/UIN": "GSTTin No.",
}

TAX_RATES = [3, 5, 12, 18, 28]
TAX_TYPES = ["IGST", "CGST", "SGST"]
