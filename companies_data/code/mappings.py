import printTable

def getFieldsWithMappings(cols):
    for i in range(len(cols)):
        if cols[i].lower() == 'gross total':
            start = i+1
            break
    return start

def validateMappings(df, df_mappings):
    cols = df.columns.values
    start = getFieldsWithMappings(cols)
    check_cols = cols[start:]
    tmp_cols = []
    
    for i in check_cols:
        if i not in df_mappings['Column Name'].values:
            tmp_cols.append(i)
    
    if len(tmp_cols) > 0:
        print ("[MAPPING ERROR] The below columns are not defined in mappings.xlsx. Add them to proceed")    
        for i in tmp_cols:
            print (i)
        printTable.pretty_print()
        exit()
    else:
        print ("[MAPPING SUCCESS] Mappings read successfully")
        printTable.pretty_print()
