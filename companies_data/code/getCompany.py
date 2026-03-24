import pandas as pd
import printTable
import os

def clean_company_names(company):
    company = company.replace(' ', '_')
    company = company.replace('&', 'AND')
    return company

def get_company_names():
    df = pd.read_excel("../clientMaster.xlsx")
    return df

def validateCompany():
    df = get_company_names()
    printTable.printTable(df)
    selection = input("\nEnter number to select company  :  ")
    company_name = df.loc[int(selection), 'Client Name']
    companyGst = df.loc[int(selection), 'GST No.']
    print ("\nYou have selected " + company_name)
    printTable.pretty_print()
    return company_name, companyGst

def create_dirs(df):
    clients = df['Client Name'].values
    path = '../files/'

    for i in clients:
        i = clean_company_names(i)
        if not os.path.exists(path + i):
            continue
            print ('scene hua hai.....')
        else:
            os.makedirs(path + i + '/mappings')
            os.makedirs(path + i + '/purchase')

    exit()