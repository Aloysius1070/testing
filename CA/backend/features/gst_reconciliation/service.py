"""GST reconciliation service - core business logic"""

import os
import tempfile
import pandas as pd
from concurrent.futures import ThreadPoolExecutor

from .normalization import find_sheet_with_headers
from .excel_utils import load_and_validate_excel, apply_excel_formatting
from .jobs import update_job_progress


MAX_WORKERS = os.cpu_count() or 4


def check_gstin_matching(file_path: str, sheet_name: str = None, job_id: str = None):
    """
    Main GST reconciliation logic
    Checks GSTIN matching between 2B, 3B and Opening forms
    """
    if job_id:
        update_job_progress(job_id, 5, message='Reading Excel file...')
    
    if sheet_name is None:
        sheet_name = find_sheet_with_headers(file_path)
        if sheet_name is None:
            raise ValueError("Could not detect a header row. Ensure your sheet has 'Forms' and 'GSTIN NO.' columns.")
    
    if job_id:
        update_job_progress(job_id, 15, message='Loading data...')
    
    df = load_and_validate_excel(file_path, sheet_name)
    
    if job_id:
        update_job_progress(job_id, 25, message=f'Processing {len(df)} rows...')
    
    # Separate dataframes by form type
    df_3b = df[df['Forms'].isin(['3B', 'Opening'])]
    df_2b = df[df['Forms'] == '2B']
    df_opening = df[df['Forms'] == 'Opening']
    
    # Create sets for matching
    gstin_invoice_3b = set(zip(df_3b['GSTIN NO.'], df_3b['Normalized_Invoice']))
    gstin_invoice_2b = set(zip(df_2b['GSTIN NO.'], df_2b['Normalized_Invoice']))
    gstin_invoice_opening = set(zip(df_opening['GSTIN NO.'], df_opening['Normalized_Invoice']))
    
    if job_id:
        update_job_progress(job_id, 55, message='Calculating GST totals...')
    
    # Calculate total GST per invoice
    df['Total GST'] = df['CGST'].fillna(0) + df['SGST'].fillna(0) + df['IGST'].fillna(0)
    gstin_invoice_totals = df.groupby(['GSTIN NO.', 'Normalized_Invoice'])['Total GST'].sum().reset_index()
    gstin_invoice_totals.columns = ['GSTIN NO.', 'Normalized_Invoice', 'Invoice Total GST']
    df = df.merge(gstin_invoice_totals, on=['GSTIN NO.', 'Normalized_Invoice'], how='left')
    
    # Pre-compute lookup sets for faster access
    df_3b_gstin_set = set(df_3b['GSTIN NO.'].values)
    df_2b_gstin_set = set(df_2b['GSTIN NO.'].values)
    df_3b_invoice_set = set(df_3b['Normalized_Invoice'].values)
    df_2b_invoice_set = set(df_2b['Normalized_Invoice'].values)
    
    def get_final_remark_batch(chunk_df):
        """Process a chunk of rows in parallel"""
        remarks = []
        allowed_remarks = {'Matched', 'Mismatched', 'NIB', 'NI2B'}
        
        for idx, row in chunk_df.iterrows():
            gstin = str(row['GSTIN NO.']).strip()
            invoice_no = str(row['Normalized_Invoice']).strip()
            form = row['Forms']

            remark = ''
            if pd.isna(gstin) or pd.isna(invoice_no):
                remark = ''
            elif gstin == 'R364':
                remark = ''
            else:
                in_3b = (gstin, invoice_no) in gstin_invoice_3b
                in_2b = (gstin, invoice_no) in gstin_invoice_2b

                if form != 'Opening' and gstin != 'R364':
                    if in_3b and not in_2b:
                        remark = 'NI2B'
                    elif in_2b and not in_3b:
                        remark = 'NIB'

                if not remark:
                    try:
                        gst_total = float(row['Invoice Total GST'])
                    except (ValueError, TypeError):
                        remark = 'Mismatched'
                    else:
                        if -1 <= gst_total <= 1:
                            if (gstin, invoice_no) in gstin_invoice_opening:
                                remark = ''  # Opening Match not allowed
                            else:
                                remark = 'Matched'
                        else:
                            remark = 'Mismatched'

            if remark not in allowed_remarks:
                remark = ''
            remarks.append(remark)
        return remarks

    if job_id:
        update_job_progress(job_id, 70, message='Applying matching logic...')
    
    # Split dataframe into chunks for parallel processing
    chunk_size = max(100, len(df) // MAX_WORKERS)
    df_chunks = [df.iloc[i:i + chunk_size] for i in range(0, len(df), chunk_size)]
    
    # Process chunks in parallel
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        results = list(executor.map(get_final_remark_batch, df_chunks))
    
    # Flatten results and assign to dataframe
    remarks_flat = [remark for chunk_remarks in results for remark in chunk_remarks]
    df['Remark'] = remarks_flat
    
    # Clean up temporary columns
    df.drop(columns=['Total GST', 'Invoice Total GST', 'Normalized_Invoice'], inplace=True)
    df = df.sort_values(by=['Invoice No.', 'GSTIN NO.'])
    
    if job_id:
        update_job_progress(job_id, 85, message='Generating output file...')
    
    # Save to Excel
    output_file = file_path.replace('.xlsx', '_checked.xlsx')
    df.to_excel(output_file, index=False)
    
    # Apply formatting
    apply_excel_formatting(output_file)
    
    if job_id:
        update_job_progress(job_id, 100, status='completed', message='Processing complete!')
    
    return output_file


def process_uploaded_excel(file_bytes: bytes, original_filename: str = 'uploaded.xlsx', job_id: str = None):
    """Process uploaded Excel file and return results"""
    tmp_in = tempfile.NamedTemporaryFile(
        delete=False, 
        suffix=os.path.splitext(original_filename)[1] or '.xlsx'
    )
    
    try:
        tmp_in.write(file_bytes)
        tmp_in.flush()
        tmp_in.close()
        
        out_path = check_gstin_matching(tmp_in.name, job_id=job_id)
        
        if not out_path or not os.path.exists(out_path):
            raise RuntimeError('Processing failed: no output produced.')
        
        with open(out_path, 'rb') as f:
            output_bytes = f.read()
        
        download_name = os.path.basename(out_path)
        return download_name, output_bytes
        
    finally:
        # Cleanup temporary files
        try:
            os.remove(tmp_in.name)
        except Exception:
            pass
        try:
            if 'out_path' in locals() and out_path and os.path.exists(out_path):
                os.remove(out_path)
        except Exception:
            pass
