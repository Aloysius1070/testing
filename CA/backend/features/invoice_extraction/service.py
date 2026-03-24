"""Invoice extraction service with OCR and pattern matching"""

import re
import math
import fitz  # PyMuPDF
from typing import List, Dict, Any, Optional
from PIL import Image
import pytesseract
import os

# Set Tesseract path for Windows (common installation path)
if os.name == 'nt':  # Windows
    tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    if os.path.exists(tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
else:
    # On Linux/Unix, Tesseract is typically in PATH after apt-get install
    # No explicit path setting needed, pytesseract will find it automatically
    pass

# Extract date in format like "5-Apr-23" - search anywhere in text
DATE_RE = re.compile(r"(\d{1,2}-[A-Za-z]{3}-\d{2,4})", re.IGNORECASE)

# Extract invoice number - look for patterns like "Apr/2023-24/01"
# More flexible pattern to match the format
INVOICE_RE = re.compile(r"([A-Za-z]{3}/\d{4}-\d{2}/\d{2})", re.IGNORECASE)

# Extract GSTIN from buyer section - look specifically after "Buyer (Bill to)" section
# This ensures we get the buyer's GSTIN, not the seller's
GSTIN_BUYER_RE = re.compile(
    r"Buyer\s*\(Bill\s*to\).*?GSTIN[/:]?\s*UIN[:\s]*([0-9]{2}[A-Z0-9]{13})",
    re.IGNORECASE | re.DOTALL
)

# Tax table row pattern - Updated to match OCR output format
# OCR produces: "995421 995421 48,92,580.79 Output CGST @9% 4,40,332.27 Output SGST @9% 4,40,332.27"
# Note: HSN appears twice, and has "Output" before CGST/SGST
TAX_ROW_RE = re.compile(
    r"(?P<hsn>\d{4,8})\s+"                                    # First HSN/SAC code
    r"\d{4,8}\s+"                                              # Duplicate HSN (ignore)
    r"(?P<taxable>[\d,]+\.?\d{0,2})\s+"                       # Taxable value
    r"(?:Output\s+)?CGST\s*@?(?P<cgst_rate>\d{1,2})\s*%\s+"  # CGST rate with optional "Output"
    r"(?P<cgst_amount>[\d,]+\.?\d{0,2})\s+"                   # CGST amount
    r"(?:Output\s+)?SGST\s*@?(?P<sgst_rate>\d{1,2})\s*%\s+"  # SGST rate with optional "Output"
    r"(?P<sgst_amount>[\d,]+\.?\d{0,2})",                     # SGST amount
    re.IGNORECASE
)


def parse_money(v: str) -> float:
    """Parse money string to float"""
    return float(v.replace(",", "").strip())


def parse_rate(v: str) -> float:
    """Parse rate string to float"""
    return float(v.strip())


def round2(v: float) -> float:
    """Round to 2 decimal places"""
    return math.floor(v * 100 + 0.5) / 100.0


def validate_gst_math(taxable, cgst_rate, cgst_amt, sgst_rate, sgst_amt, total_tax, tol=1.0):
    """Validate GST calculations with tolerance for rounding"""
    cgst_expected = round2(taxable * cgst_rate / 100)
    sgst_expected = round2(taxable * sgst_rate / 100)
    total_expected = round2(cgst_expected + sgst_expected)
    
    cgst_ok = abs(cgst_expected - cgst_amt) <= tol
    sgst_ok = abs(sgst_expected - sgst_amt) <= tol
    total_ok = abs(total_expected - total_tax) <= tol
    
    issues = []
    if not cgst_ok: 
        issues.append(f"CGST mismatch (expected {cgst_expected:.2f}, got {cgst_amt:.2f})")
    if not sgst_ok: 
        issues.append(f"SGST mismatch (expected {sgst_expected:.2f}, got {sgst_amt:.2f})")
    if not total_ok: 
        issues.append(f"Total tax mismatch (expected {total_expected:.2f}, got {total_tax:.2f})")
    
    return cgst_expected, sgst_expected, cgst_ok, sgst_ok, total_ok, "; ".join(issues) if issues else "OK"


def parse_invoice_pages(start: int, end: int, pdf_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Parse invoice pages and extract tax data with validation
    
    Args:
        start: Start page index
        end: End page index
        pdf_bytes: PDF file as bytes
        
    Returns:
        List of invoice data dictionaries
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    out: List[Dict[str, Any]] = []

    for i in range(start, end):
        page = doc[i]
        
        # First try to extract text directly
        text = page.get_text("text") or ""
        
        # If no text found, the PDF is likely image-based - use OCR
        if len(text.strip()) < 50:  # Very little or no text
            try:
                # Convert PDF page to image
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better OCR
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # Perform OCR
                text = pytesseract.image_to_string(img, lang='eng')
            except pytesseract.TesseractNotFoundError:
                # Tesseract not installed on server
                print(f"❌ Tesseract OCR not found. Please install tesseract-ocr on the server.")
                text = ""
            except Exception as e:
                # Log OCR errors only
                print(f"⚠️ OCR Error on page {i+1}: {str(e)}")
                text = ""
        
        # Normalize whitespace but preserve line structure
        text = re.sub(r"[ \t]+", " ", text)
        
        # Additional cleanup for OCR text
        text = text.replace('\n', ' ')  # Replace newlines with spaces for better matching
        text = re.sub(r'\s+', ' ', text)  # Collapse multiple spaces

        # Extract basic information
        m_date = DATE_RE.search(text)
        m_inv = INVOICE_RE.search(text)
        m_gstin = GSTIN_BUYER_RE.search(text)

        date = m_date.group(1) if m_date else None
        inv_no = m_inv.group(1) if m_inv else None
        gstin = m_gstin.group(1) if m_gstin else None

        # Find tax table rows
        matches = list(TAX_ROW_RE.finditer(text))
        
        if not matches:
            # No tax data found
            out.append({
                "date": date,
                "invoice_number": inv_no,
                "gstin_no": gstin,
                "hsn_sac": None,
                "taxable_value": None,
                "cgst_rate": None,
                "cgst_amount": None,
                "sgst_rate": None,
                "sgst_amount": None,
                "total_tax_amount": None,
                "page_no": i + 1,
                "issues": "Tax table row not found"
            })
            continue

        # Process each tax row found
        for m in matches:
            try:
                taxable = parse_money(m["taxable"])
                cgst_rate = parse_rate(m["cgst_rate"])
                cgst_amt = parse_money(m["cgst_amount"])
                sgst_rate = parse_rate(m["sgst_rate"])
                sgst_amt = parse_money(m["sgst_amount"])
                total_tax = cgst_amt + sgst_amt  # Calculate total from CGST + SGST

                # Validate calculations
                cgst_exp, sgst_exp, cgst_ok, sgst_ok, total_ok, issues = validate_gst_math(
                    taxable, cgst_rate, cgst_amt, sgst_rate, sgst_amt, total_tax
                )

                out.append({
                    "date": date,
                    "invoice_number": inv_no,
                    "gstin_no": gstin,
                    "hsn_sac": m["hsn"],
                    "taxable_value": taxable,
                    "cgst_rate": cgst_rate,
                    "cgst_amount": cgst_amt,
                    "sgst_rate": sgst_rate,
                    "sgst_amount": sgst_amt,
                    "total_tax_amount": total_tax,
                    "page_no": i + 1,
                    "issues": issues
                })
            except Exception as e:
                # Log parsing errors
                print(f"⚠️ Parsing error on page {i+1}: {str(e)}")
                # Handle parsing errors
                out.append({
                    "date": date,
                    "invoice_number": inv_no,
                    "gstin_no": gstin,
                    "hsn_sac": m.get("hsn"),
                    "taxable_value": None,
                    "cgst_rate": None,
                    "cgst_amount": None,
                    "sgst_rate": None,
                    "sgst_amount": None,
                    "total_tax_amount": None,
                    "page_no": i + 1,
                    "issues": f"Parsing error: {str(e)}"
                })

    doc.close()
    return out


def parse_invoice_fields(raw_data: dict):
    """Parse and structure invoice fields"""
    pass
