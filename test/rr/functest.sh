#!/bin/bash

TESTNAME="RR View Use Case Databases"
TESTSUMMARY="Generates separate databases for multiple use cases"

# CREATENEWDB=0

source ../share/base.sh

function dbcore() {
	docsvtest "a" "-b business.csv -L 3" "Business"
	docsvtest "b" "-c coa.csv -L 10,${BUD}" "ChartOfAccounts"
	docsvtest "c" "-ar ar.csv" "AccountRules"
	docsvtest "d" "-m depmeth.csv -L 23,${BUD}" "DepositMethods"
	docsvtest "e" "-d depository.csv -L 18,${BUD}" "Depositories"
	docsvtest "f" "-P pmt.csv -L 12,${BUD}" "PaymentTypes"
	docsvtest "t" "-T ratemplates.csv  -L 8,${BUD}" "RentalAgreementTemplates"
	docsvtest "h" "-p people.csv  -L 7,${BUD}" "People"
}
#------------------------------------------------------------------------------
#  TEST 00
#  Simple Asmt/Rcpt -  Non recurring assessment, a receipt, apply payments.
#
#  Scenario:  Assess $100 Electric Base Fee, receive a receipt for $250. Apply
#             the funds toward the $100 assessment. $150 should carry forward
#             to the next period.
#------------------------------------------------------------------------------
echo "STARTING RENTROLL SERVER"
startRentRollServer
dbcore
docsvtest "i" "-R rt1.csv -L 5,${BUD}" "RentableTypes"
docsvtest "j" "-r r1.csv -L 6,${BUD}" "Rentables"
docsvtest "k" "-C ra1.csv -L 9,${BUD}" "RentalAgreements"

mysqldump --no-defaults rentroll >empty1.sql

# Create a non-recurring Assessment
echo "*** TEST 00 ***"
echo "%7B%22cmd%22%3A%22save%22%2C%22recid%22%3A0%2C%22name%22%3A%22asmEpochForm%22%2C%22record%22%3A%7B%22ARID%22%3A11%2C%22recid%22%3A0%2C%22RID%22%3A1%2C%22ASMID%22%3A0%2C%22PASMID%22%3A0%2C%22ATypeLID%22%3A0%2C%22InvoiceNo%22%3A0%2C%22RAID%22%3A1%2C%22BID%22%3A1%2C%22BUD%22%3A%22REX%22%2C%22Start%22%3A%2211%2F3%2F2017%22%2C%22Stop%22%3A%2211%2F3%2F2017%22%2C%22RentCycle%22%3A0%2C%22ProrationCycle%22%3A0%2C%22TCID%22%3A0%2C%22Amount%22%3A100%2C%22Rentable%22%3A%22309+Rexford%22%2C%22AcctRule%22%3A%22%22%2C%22Comment%22%3A%22%22%2C%22ExpandPastInst%22%3A0%2C%22FLAGS%22%3A0%2C%22Mode%22%3A0%7D%7D" > request
dojsonPOST "http://localhost:8270/v1/asm/1/0" "request" "a00"  "WebService--CreateAssessment"

# Receive a Receipt of $250 
echo "%7B%22cmd%22%3A%22save%22%2C%22recid%22%3A0%2C%22name%22%3A%22receiptForm%22%2C%22record%22%3A%7B%22recid%22%3A0%2C%22RCPTID%22%3A0%2C%22PRCPTID%22%3A0%2C%22ARID%22%3A25%2C%22PMTID%22%3A4%2C%22RAID%22%3A1%2C%22PmtTypeName%22%3A4%2C%22BID%22%3A1%2C%22BUD%22%3A%22REX%22%2C%22DID%22%3A0%2C%22Dt%22%3A%2211%2F3%2F2017%22%2C%22DocNo%22%3A%22234234234%22%2C%22Payor%22%3A%22Aaron%2BRead%2B(TCID%3A%2B1)%22%2C%22TCID%22%3A1%2C%22Amount%22%3A250%2C%22Comment%22%3A%22%22%2C%22OtherPayorName%22%3A%22%22%2C%22FLAGS%22%3A0%7D%7D" > request
dojsonPOST "http://localhost:8270/v1/receipt/1/0" "request" "a01"  "WebService--ReceiveReceipt"

# Create a Deposit
echo "%7B%22cmd%22%3A%22save%22%2C%22recid%22%3A0%2C%22name%22%3A%22depositForm%22%2C%22Receipts%22%3A%5B1%5D%2C%22record%22%3A%7B%22recid%22%3A0%2C%22check%22%3A0%2C%22DID%22%3A0%2C%22BID%22%3A1%2C%22BUD%22%3A%22REX%22%2C%22DEPID%22%3A1%2C%22DEPName%22%3A1%2C%22DPMID%22%3A1%2C%22DPMName%22%3A1%2C%22Dt%22%3A%2211%2F4%2F2017%22%2C%22FLAGS%22%3A0%2C%22Amount%22%3A250%2C%22ClearedAmount%22%3A0%7D%7D" > request
dojsonPOST "http://localhost:8270/v1/deposit/1/0" "request" "a02"  "WebService--CreateDeposit"

# Apply the payment
echo "%7B%22cmd%22%3A%22save%22%2C%22TCID%22%3A1%2C%22BID%22%3A1%2C%22records%22%3A%5B%7B%22recid%22%3A0%2C%22Date%22%3A%2211%2F3%2F2017%22%2C%22ASMID%22%3A1%2C%22ARID%22%3A11%2C%22Assessment%22%3A%22Electric%20Base%20Fee%22%2C%22Amount%22%3A100%2C%22AmountPaid%22%3A0%2C%22AmountOwed%22%3A100%2C%22Dt%22%3A%2211%2F4%2F2017%22%2C%22Allocate%22%3A100%2C%22Date_%22%3A%222017-11-03T07%3A00%3A00.000Z%22%2C%22Dt_%22%3A%222017-11-04T07%3A00%3A00.000Z%22%7D%5D%7D" > request
dojsonPOST "http://localhost:8270/v1/allocfunds/1" "request" "a03"  "WebService--ApplyThePayment"

# Do a text version of the Journal and LedgerActivity to make sure all the
# funds are properly transferred
RRDATERANGE="-j 2017-11-01 -k 2017-12-01"
dorrtest "a04" "${RRDATERANGE} -b ${BUD} -r 1" "Journal"
dorrtest "a05" "${RRDATERANGE} -b ${BUD} -r 10" "LedgerActivity"

mysqldump --no-defaults rentroll >test00.sql

#------------------------------------------------------------------------------
#  TEST 01
#  Floating Deposit -  Receipt where RAID is required. In this
#      example, Receipt.RAID will be non-zero.  In this scenario
#      a $1000 floating deposit is made in October 2017, and $500
#      more is added to the floating deposit in November. The Ending
#      Security Deposit amount for November should be $1500
#------------------------------------------------------------------------------
mysql --no-defaults rentroll < empty1.sql

echo "*** TEST 01 ***"

# Create the October Receipt
echo "%7B%22cmd%22%3A%22save%22%2C%22recid%22%3A0%2C%22name%22%3A%22receiptForm%22%2C%22record%22%3A%7B%22recid%22%3A0%2C%22RCPTID%22%3A0%2C%22PRCPTID%22%3A0%2C%22ARID%22%3A15%2C%22PMTID%22%3A4%2C%22RAID%22%3A1%2C%22PmtTypeName%22%3A4%2C%22BID%22%3A1%2C%22BUD%22%3A%22REX%22%2C%22DID%22%3A0%2C%22Dt%22%3A%2210%2F2%2F2017%22%2C%22DocNo%22%3A%22234234234%22%2C%22Payor%22%3A%22Aaron%2BRead%2B(TCID%3A%2B1)%22%2C%22TCID%22%3A1%2C%22Amount%22%3A1000%2C%22Comment%22%3A%22%22%2C%22OtherPayorName%22%3A%22%22%2C%22FLAGS%22%3A0%7D%7D" > request
dojsonPOST "http://localhost:8270/v1/receipt/1/0" "request" "b00"  "WebService--AddFloatingDeposit1"

# Make the October bank deposit
echo "%7B%22cmd%22%3A%22save%22%2C%22recid%22%3A0%2C%22name%22%3A%22depositForm%22%2C%22Receipts%22%3A%5B1%5D%2C%22record%22%3A%7B%22recid%22%3A0%2C%22check%22%3A0%2C%22DID%22%3A0%2C%22BID%22%3A1%2C%22BUD%22%3A%22REX%22%2C%22DEPID%22%3A1%2C%22DEPName%22%3A1%2C%22DPMID%22%3A1%2C%22DPMName%22%3A1%2C%22Dt%22%3A%2210%2F3%2F2017%22%2C%22FLAGS%22%3A0%2C%22Amount%22%3A1000%2C%22ClearedAmount%22%3A0%7D%7D" > request
dojsonPOST "http://localhost:8270/v1/deposit/1/0" "request" "b01"  "WebService--CreateBankDeposit"

# Create the November Receipt
echo "%7B%22cmd%22%3A%22save%22%2C%22recid%22%3A0%2C%22name%22%3A%22receiptForm%22%2C%22record%22%3A%7B%22recid%22%3A0%2C%22RCPTID%22%3A0%2C%22PRCPTID%22%3A0%2C%22ARID%22%3A15%2C%22PMTID%22%3A4%2C%22RAID%22%3A1%2C%22PmtTypeName%22%3A4%2C%22BID%22%3A1%2C%22BUD%22%3A%22REX%22%2C%22DID%22%3A0%2C%22Dt%22%3A%2211%2F3%2F2017%22%2C%22DocNo%22%3A%2223523523%22%2C%22Payor%22%3A%22Aaron+Read+(TCID%3A+1)%22%2C%22TCID%22%3A1%2C%22Amount%22%3A500%2C%22Comment%22%3A%22%22%2C%22OtherPayorName%22%3A%22%22%2C%22FLAGS%22%3A0%7D%7D" > request
dojsonPOST "http://localhost:8270/v1/receipt/1/0" "request" "b02"  "WebService--AddFloatingDeposit2"

# Make the November bank deposit
echo "%7B%22cmd%22%3A%22save%22%2C%22recid%22%3A0%2C%22name%22%3A%22depositForm%22%2C%22Receipts%22%3A%5B2%5D%2C%22record%22%3A%7B%22recid%22%3A0%2C%22check%22%3A0%2C%22DID%22%3A0%2C%22BID%22%3A1%2C%22BUD%22%3A%22REX%22%2C%22DEPID%22%3A2%2C%22DEPName%22%3A2%2C%22DPMID%22%3A1%2C%22DPMName%22%3A1%2C%22Dt%22%3A%2211%2F3%2F2017%22%2C%22FLAGS%22%3A0%2C%22Amount%22%3A500%2C%22ClearedAmount%22%3A0%7D%7D" > request
dojsonPOST "http://localhost:8270/v1/deposit/1/0" "request" "b03"  "WebService--CreateBankDeposit"

# Do a text version of the Journal to make sure all the funds are properly transferred
RRDATERANGE="-j 2017-10-01 -k 2017-12-01"
dorrtest "o01" "${RRDATERANGE} -b ${BUD} -r 1" "Journal"

mysqldump --no-defaults rentroll >rrFloatingDep.sql

#------------------------------------------------------------------------------
#  TEST 2
#  Reverse Floating Deposit - This scenario uses the database created in
#      TEST 1 and simply reverses the first receipt. The result should be
#      that the $1000 is removed, but the $500 remains on the books.
#------------------------------------------------------------------------------

# # Make the reversal entry
# echo "%7B%22cmd%22%3A%22delete%22%2C%22formname%22%3A%22receiptForm%22%2C%22RCPTID%22%3A1%7D" > request
# dojsonPOST "http://localhost:8270/v1/receipt/1/1" "request" "k02"  "WebService--Reverse Deposit"

# # Do a text version of the Journal to make sure all the funds are properly transferred
# RRDATERANGE="-j 2017-10-01 -k 2017-12-01"
# dorrtest "m1" "${RRDATERANGE} -b ${BUD} -r 1" "Journal"


#----------------------------------------------------
#  TEST 3
#  Rentable Type Change during vacancy.
#----------------------------------------------------
#createDB
#dbcore


stopRentRollServer
echo "RENTROLL SERVER STOPPED"
logcheck

exit 0
