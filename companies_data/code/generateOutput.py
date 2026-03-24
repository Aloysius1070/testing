import traceback
import pandas as pd
import printTable, getCompany

def generateOutput(output, company, transactionType):
    try:
        output['Invoice Date'] = pd.to_datetime(output['Invoice Date']).dt.strftime('%d/%m/%Y')

        outputFilepath = '../files/' + getCompany.clean_company_names(company) + '/' + transactionType + '/output.xlsx'
        writer = pd.ExcelWriter(outputFilepath, engine="xlsxwriter")
        output.to_excel(writer, sheet_name="Sheet1", index=False)

        # Get the xlsxwriter workbook and worksheet objects.
        workbook = writer.book
        worksheet = writer.sheets["Sheet1"]

        # Add a percent number format.
        percent_format = workbook.add_format({"num_format": "0%"})

        # Apply the number format to Grade column.
        worksheet.set_column('K:K', None, percent_format)

        # Close the Pandas Excel writer and output the Excel file.
        writer.close()

        printTable.pretty_print()
        print ("[OUTPUT SUCCESS] Output file generated. It has " + str(output.shape[0]) + " rows and " + str(output.shape[1]) + " columns.")
        printTable.pretty_print()
    except Exception:
        print ("[ERROR] There was an error while saving output to excel.")
        