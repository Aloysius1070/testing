import pandas as pd
import numpy as np
import getCompany, printTable, importFile, getTransaction, mappings

#Take company name and sale/purchase input from user
company = getCompany.validateCompany()[0]
transactionType = getTransaction.getTransactionType()

#Read input file to identify columns that need mapping
filepath = '../files/' + getCompany.clean_company_names(company) + '/' + transactionType + '/DayBook.xlsx'

df = pd.read_excel(filepath)
start = mappings.getFieldsWithMappings(df.columns)

#Create new data frame
mappings_columns = ['Column Name', 'Entry Type', 'Percent Tax']
columnNames = df.columns[start:]

df = pd.DataFrame(columns = mappings_columns)
df['Column Name'] = columnNames

mappingFilepath = '../files/' + getCompany.clean_company_names(company) + '/mappings/' + transactionType + '_mappings.xlsx'

df.to_excel(mappingFilepath, index=False)

printTable.pretty_print()
print ("[OUTPUT SUCCESS] Mapping has been created")
printTable.pretty_print()