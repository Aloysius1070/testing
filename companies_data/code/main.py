import pandas as pd
import warnings
import getCompany, printTable, importFile, mappings, convert, getTransaction, generateOutput
warnings.filterwarnings("ignore")

def run_program():
    printTable.pretty_print()
    company, companyGst = getCompany.validateCompany()
    transactionType = getTransaction.getTransactionType()

    df, dfMappings = importFile.readFile(company, transactionType)
    mappings.validateMappings(df, dfMappings)

    output = convert.convertData(df, dfMappings, transactionType)
    generateOutput.generateOutput(output, company, transactionType)

if __name__ == "__main__":
    run_program()
