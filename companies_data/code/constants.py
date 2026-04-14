output_columns= ["Code", "Date", "Particulars", "Voucher No.", "Supplier Invoice No", "GSTTin No.", "Taxable value", "IGST", "CGST", "SGST", "GST Code",  "Tax Rate", "Diffence", "Ledger"]

columns_map =  {
    'Date': 'Date',
    'Particulars': 'Particulars',
    'Voucher No.': 'Voucher No.',
    'Supplier Invoice No': 'Supplier Invoice No',  # Changed from "Invoice Reference No"
    'GSTIN/UIN': 'GSTTin No.'
}   

taxRates = [3, 5, 12, 18, 28]

taxtypes = ['IGST', 'CGST', 'SGST']