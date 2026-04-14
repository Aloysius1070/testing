import pandas as pd
import os
import difflib
import getCompany, printTable


def readFile(company, transactionType):
    # Clean and define paths
    clean_name = getCompany.clean_company_names(company)
    base_path = os.path.abspath(f"../files/{clean_name}")
    input_dir = os.path.join(base_path, transactionType)
    mapping_dir = os.path.join(base_path, "mappings")
    expected_input_file = "DayBook.xlsx"
    expected_mapping_file = f"{transactionType}_mappings.xlsx"

    # Resolve full paths
    input_path = os.path.join(input_dir, expected_input_file)
    mapping_path = os.path.join(mapping_dir, expected_mapping_file)

    # Check and auto-correct DayBook.xlsx if not found
    if not os.path.exists(input_path):
        printTable.pretty_print()
        print(f"\n[WARNING] Input file not found at expected path: {input_path}")

        if os.path.exists(input_dir):
            files = os.listdir(input_dir)
            print(f"[INFO] Files in input directory:")
            for f in files:
                print("  -", f)

            # Try to auto-correct filename
            close_matches = difflib.get_close_matches(expected_input_file, files, n=1, cutoff=0.6)
            if close_matches:
                corrected_file = close_matches[0]
                input_path = os.path.join(input_dir, corrected_file)
                print(f"[FIXED] Using close match for input file: {corrected_file}")
            else:
                print(f"[ERROR] Could not find any file similar to '{expected_input_file}' in {input_dir}\n")
                printTable.pretty_print()
                exit()
        else:
            print(f"[ERROR] Input directory does not exist: {input_dir}")
            printTable.pretty_print()
            exit()

    # Check mapping file
    if not os.path.exists(mapping_path):
        printTable.pretty_print()
        print(f"\n[ERROR] Mapping file not found: {mapping_path}\n")
        if os.path.exists(mapping_dir):
            print("[INFO] Files in mappings directory:")
            for f in os.listdir(mapping_dir):
                print("  -", f)
        else:
            print("[ERROR] Mappings directory does not exist.")
        printTable.pretty_print()
        exit()

    # Try reading the files
    try:
        df = pd.read_excel(input_path)
        df_mappings = pd.read_excel(mapping_path)
    except Exception as e:
        printTable.pretty_print()
        print(f"\n[ERROR] Failed to read one of the files:\n{e}\n")
        printTable.pretty_print()
        exit()

    printTable.pretty_print()
    print(f"[INPUT SUCCESS] Input file read successfully. It has {df.shape[0]} rows and {df.shape[1]} columns.")
    printTable.pretty_print()

    return df, df_mappings
