
def getTransactionType():
    transactionType = None
    while transactionType == None:
        transactionInput = input('Enter \'s\' for sale and \'p\' for purchase  :  ').lower()
        if transactionInput == 's':
            transactionType = 'sale'
        elif transactionInput == 'p':
            transactionType = 'purchase'
        else:
            print ('Incorrect transaction type entered, please try again...')    
    return transactionType