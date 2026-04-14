import pandas as pd
import numpy as np
from sklearn.preprocessing import OneHotEncoder

def process_tds_calculation(sheet_df, abc_path):
    """
    Process TDS calculation using the CA logic
    
    Args:
        sheet_df: DataFrame from uploaded sheet (transaction data)
        abc_path: Path to sheet.csv (classification reference)
    
    Returns:
        Processed DataFrame with TDS calculations
    """
    # Step 1: Load classification reference (sheet.csv)
    classification_df = pd.read_csv(abc_path)  # This is sheet.csv
    
    # Classify entries from reference
    classification_df['Constant'] = 'Ledger'  # Default to Ledger
    classification_df.loc[classification_df['TDS Account'] == 'ICICI Bank', 'Constant'] = "Ignore"
    classification_df.loc[classification_df['TDS Account'] == 'Round Off-Purchase', 'Constant'] = "Ignore"
    
    # Get ignored and ledger accounts
    ignored_accounts = classification_df[classification_df['Constant'] == 'Ignore']['TDS Account'].dropna().tolist()
    ledgered_accounts = classification_df[classification_df['Constant'] == 'Ledger']['TDS Account'].dropna().tolist()
    
    # Step 2: The sheet_df is the transaction data (uploaded file)
    df = sheet_df.copy()
    
    # Step 3: Drop ignored columns
    df.drop(columns=ignored_accounts, errors='ignore', inplace=True)
    
    # Step 4: Fill NaN
    df.fillna(0, inplace=True)
    
    # Step 5: TDS Matching
    percentages = [1, 2, 5, 10, 20]
    
    # Initialize columns
    df['Rate'] = None
    df['Value'] = None
    df['Ledger'] = None
    
    # Convert ledger columns to numeric
    for col in ledgered_accounts:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    for idx, row in df.iterrows():
        tds_val = row['TDS Account']
        
        if pd.isna(tds_val) or tds_val == 0:
            continue
        
        matched = False
        
        for col in ledgered_accounts:
            if col not in df.columns:
                continue
                
            ledger_val = row[col]
            
            if pd.isna(ledger_val):
                continue
            
            abs_val = abs(ledger_val)
            
            for p in percentages:
                expected_tds = abs_val * (p / 100.0)
                
                if np.isclose(tds_val, expected_tds, atol=0.5):
                    df.at[idx, 'Rate'] = f"{p}%"
                    df.at[idx, 'Value'] = ledger_val
                    df.at[idx, 'Ledger'] = col
                    matched = True
                    break
            
            if matched:
                break
    
    # Keep only matched rows
    df.dropna(subset=['Rate'], inplace=True)
    df.reset_index(drop=True, inplace=True)
    
    # Drop ledger columns
    df.drop(columns=ledgered_accounts, errors='ignore', inplace=True)
    
    return df

# If run as script
if __name__ == "__main__":
    # Original script logic for testing
    # Load transaction data (assuming abc.csv exists for testing)
    try:
        df = pd.read_csv("abc.csv")
        result = process_tds_calculation(df, "sheet.csv")
        result.to_excel('output.xlsx', index=False)
        print("Processing complete. Output saved to output.xlsx")
    except FileNotFoundError:
        print("abc.csv not found. Please ensure test data is available.")



