"""Companies Data Extraction Service"""

import asyncio
from typing import List, Dict


async def extract_companies_data(file_bytes: bytes, filename: str, file_type: str) -> List[Dict]:
    """
    Extract company information from uploaded documents

    Args:
        file_bytes: File content as bytes
        filename: Original filename
        file_type: File type ('pdf' or 'excel')

    Returns:
        List of company data dictionaries
    """
    # Simulate processing time
    await asyncio.sleep(2)

    # TODO: Implement actual extraction logic based on file_type
    # For PDF files: Use OCR/PDF parsing to extract text, then parse company info
    # For Excel files: Read Excel and extract company data from structured format

    # Placeholder data structure - replace with actual extracted data
    extracted_data = [
        {
            'Company Name': 'Sample Company Ltd.',
            'CIN': 'L12345DE2020PTC123456',
            'Registration Number': 'REG123456',
            'Registration Date': '2020-01-15',
            'Company Type': 'Private Limited',
            'Status': 'Active',
            'Address': '123 Business Street, Mumbai, Maharashtra, 400001',
            'State': 'Maharashtra',
            'Email': 'info@samplecompany.com',
            'Phone': '+91-22-12345678',
            'Authorized Capital': '10,00,000',
            'Paid Up Capital': '5,00,000',
            'Number of Directors': '3',
            'Number of Shareholders': '5',
            'Business Activity': 'Manufacturing',
            'GST Number': '27AABCU9603R1ZX',
            'PAN': 'AABCU9603R',
            'Year of Incorporation': '2020',
            'Financial Year End': '31-Mar',
            'Last AGM Date': '2024-09-30',
            'Source File': filename
        }
    ]

    # If processing Excel files, you might extract multiple companies
    # If processing PDF, you might extract data from a single company document

    return extracted_data


async def extract_from_pdf(file_bytes: bytes, filename: str) -> List[Dict]:
    """
    Extract company data from PDF documents

    Args:
        file_bytes: PDF file as bytes
        filename: Original filename

    Returns:
        List of extracted company data
    """
    # TODO: Implement PDF extraction logic
    # 1. Use PyMuPDF or similar to extract text
    # 2. Use regex/NLP to identify company information fields
    # 3. Structure the data into dictionaries

    return await extract_companies_data(file_bytes, filename, 'pdf')


async def extract_from_excel(file_bytes: bytes, filename: str) -> List[Dict]:
    """
    Extract company data from Excel files

    Args:
        file_bytes: Excel file as bytes
        filename: Original filename

    Returns:
        List of extracted company data
    """
    # TODO: Implement Excel extraction logic
    # 1. Use pandas to read Excel file
    # 2. Map columns to company data fields
    # 3. Validate and clean the data

    import pandas as pd
    import io

    try:
        # Read Excel file
        df = pd.read_excel(io.BytesIO(file_bytes))

        # Convert DataFrame rows to list of dictionaries
        # TODO: Map actual column names to expected fields
        data = df.to_dict('records')

        # Add source filename to each record
        for record in data:
            record['Source File'] = filename

        return data
    except Exception as e:
        # If Excel reading fails, return placeholder data
        print(f"Error reading Excel: {e}")
        return await extract_companies_data(file_bytes, filename, 'excel')
