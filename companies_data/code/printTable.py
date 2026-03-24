import tabulate

def printTable(df):
    print(tabulate.tabulate(df, tablefmt='grid', headers='keys'))

def pretty_print():
    print ()
    print ("================================")
    print ()