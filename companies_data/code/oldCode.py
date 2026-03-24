import math, constants, convert

def validate_taxable_value(df, row, taxable_value):
    filter_col = [col for col in df if col.lower().startswith('input')]
    taxes = row[filter_col].dropna().values.sum()
    calculated_taxable_value = row['Gross Total'] - taxes
    calculated_taxable_value = 0 if np.isnan(calculated_taxable_value) else calculated_taxable_value

    if round(taxable_value, 2) == round(calculated_taxable_value, 2):
        return True
    else:
        print (taxable_value, calculated_taxable_value)
        return False

def compute_numbers(d, companyGst, transactionType):

    outputRow = {}

    taxable_value = d['Taxable value'] if 'Taxable value' in d else 0
    total_tax = d['IGST'] + d['CGST'] + d['SGST']
    if taxable_value != 0:
        taxRatio = total_tax/taxable_value
    else:
        taxRatio = 0

    if math.isnan(taxRatio):
        taxRatio = 0

    GST_start = str(d['GSTTin No.'])[:2]
    
    if GST_start == companyGst[:2]:
        code = transactionType[0].upper()
    else:
        code = transactionType[0].upper() + 'IS'

    GST_code = code + ' ' + str(round (taxRatio*100)) + '%'
    
    outputRow['GST Code'] = GST_code

    # outputRow['Tax Rate'] = round (taxRatio, 4)
    # outputRow['Difference'] = round ((taxable_value * round(taxRatio, 2))  - total_tax, 2)
    return outputRow   

def compute_taxes(dfMappings, newD, lenI, lenC, lenS, outputList):
    if lenI > 0:
        if lenI > 1:
            isMultiRow = True
            for k, v in newD['IGST'].items():
                d1 = {t: 0 for t in constants.taxtypes}

                d1['IGST'] = v
                taxRate = int(convert.queryDf(dfMappings, 'Column Name', k, 'Percent Tax').values.sum())
                GSTCode = 'IS'
                outputList.append([d1, taxRate, GSTCode])
        else:
            refinedTaxCol = list(newD['IGST'].keys())[0]
            d['IGST'] = sum(newD['IGST'].values())
            taxRate = int(convert.queryDf(dfMappings, 'Column Name', refinedTaxCol, 'Percent Tax').values.sum())
            GSTCode = 'IS'
            outputList.append([d, taxRate, GSTCode])

    if lenC > 0:
        if lenC > 1:
            isMultiRow = True
            for k, v in newD['CGST'].items():
                d2 = {t: 0 for t in constants.taxtypes}
                d2['CGST'] = v
                d2['SGST'] = newD['SGST'][k.replace('CGST', 'SGST')]
                taxRate = int(dfMappings.loc[dfMappings['Column Name'] == k]['Percent Tax'].values.sum()*2)
                outputList.append([d2, taxRate, GSTCode])
        else:
            refinedTaxCol = list(newD['CGST'].keys())[0]
            d['SGST'] = sum(newD['SGST'].values())
            d['CGST'] = sum(newD['CGST'].values())
            taxRate = int(dfMappings.loc[dfMappings['Column Name'] == refinedTaxCol]['Percent Tax'].values.sum()*2)
            outputList.append([d, taxRate, GSTCode])