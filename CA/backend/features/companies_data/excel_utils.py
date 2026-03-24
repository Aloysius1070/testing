"""Excel export utility for companies data extraction"""

import pandas as pd
import io


def export_excel(data: list[dict]) -> bytes:
    """
    Export companies data to Excel format with proper formatting

    Args:
        data: List of company data dictionaries

    Returns:
        Excel file as bytes
    """
    df = pd.DataFrame(data)
    out = io.BytesIO()

    with pd.ExcelWriter(out, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Companies Data")

        # Get the worksheet
        worksheet = writer.sheets['Companies Data']

        # Auto-adjust column widths
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if cell.value:
                        max_length = max(max_length, len(str(cell.value)))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)  # Cap at 50 characters
            worksheet.column_dimensions[column_letter].width = adjusted_width

    out.seek(0)
    return out.read()
