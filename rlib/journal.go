package rlib

import (
	"context"
	"fmt"
	"time"
)

//=================================================================================================
func sumAllocations(m *[]AcctRule) (float64, float64) {
	sum := float64(0.0)
	debits := float64(0.0)
	for i := 0; i < len(*m); i++ {
		if (*m)[i].Action == "c" {
			sum -= (*m)[i].Amount
		} else {
			sum += (*m)[i].Amount
			debits += (*m)[i].Amount
		}
	}
	return sum, debits
}

// builds the account rule based on an ARID
func buildRule(ctx context.Context, id int64) (string, error) {
	rule, err := GetAR(ctx, id)
	if err != nil {
		Ulog("buildRule: Error from getAR(%d):  %s\n", id, err.Error())
		return "", err
	}

	d, err := GetLedger(ctx, rule.DebitLID)
	if err != nil {
		return "", err
	}

	c, err := GetLedger(ctx, rule.CreditLID)
	if err != nil {
		return "", err
	}

	s := fmt.Sprintf("d %s _, c %s _", d.GLNumber, c.GLNumber)
	return s, err
}

// GetAssessmentAccountRule looks at the supplied Assessment.  If the .AcctRule is present
// then it is returned. If it is not present, then the ARID is used and an AcctRule is built
// from the ARID.
func GetAssessmentAccountRule(ctx context.Context, a *Assessment) (string, error) {
	if len(a.AcctRule) > 0 {
		return a.AcctRule, nil
	}
	return buildRule(ctx, a.ARID)
}

// GetReceiptAccountRule looks at the supplied Receipt.  If the .AcctRule is present
// then it is returned. If it is not present, then the ARID is used and an AcctRule is built
// from the ARID.
func GetReceiptAccountRule(ctx context.Context, a *Receipt) (string, error) {
	if len(a.AcctRuleApply) > 0 {
		return a.AcctRuleApply, nil
	}
	return buildRule(ctx, a.ARID)
}

func getRuleText(ctx context.Context, id int64) (string, error) {
	rule, err := GetAR(ctx, id)
	if err != nil {
		Ulog("getRuleText: Error from getAR(%d):  %s\n", id, err.Error())
		return "", err
	}
	return rule.Name, err
}

// GetAssessmentAccountRuleText returns the text to use in reports or in a UI that describes
// the assessment
func GetAssessmentAccountRuleText(ctx context.Context, a *Assessment) (string, error) {
	if len(a.AcctRule) > 0 {
		return a.AcctRule, nil
	}
	return getRuleText(ctx, a.ARID)
}

// GetReceiptAccountRuleText returns the text to use in reports or in a UI that describes
// the Receipt
func GetReceiptAccountRuleText(ctx context.Context, a *Receipt) (string, error) {
	if len(a.AcctRuleApply) > 0 {
		return a.AcctRuleApply, nil
	}
	return getRuleText(ctx, a.ARID)
}

// ProrateAssessment - determines the proration factor for this assessment
//
// Parameters:
//		a		 pointer to the assessment
//      d        date or the recurrence date of the assessment being analyzed
//  	d1, d2:  the time period we're being asked to analyze
//
// Returns:
//         	pf:  prorate factor = rentDur/asmtDur
//		   num:	 pf numerator, amount of rentcycle actually used expressed in units of prorateCycle
//         den:  pf denominator, the rent cycle, expressed in units of prorateCycle
//       start:	 trimmed start date (latest of RentalAgreement.PossessionStart and d1)
//        stop:	 trmmed stop date (soonest of RentalAgreement.PossessionStop and d2)
//=================================================================================================
func ProrateAssessment(ctx context.Context, xbiz *XBusiness, a *Assessment, d, d1, d2 *time.Time) (float64, int64, int64, time.Time, time.Time, error) {
	const funcname = "ProrateAssessment"

	var (
		pf          float64
		num, den    int64
		start, stop time.Time
		r           Rentable
		err         error
	)

	// Console("ProrateAssessment: A\n")
	useStatus := int64(USESTATUSinService) // if RID==0, then it's for an application fee or similar.  Assume rentable is online.

	if a.RID > 0 {
		// Console("ProrateAssessment: B\n")
		r, err = GetRentable(ctx, a.RID)
		if err != nil {
			return pf, num, den, start, stop, err
		}

		useStatus, err = GetRentableStateForDate(ctx, r.RID, d)
		if err != nil {
			return pf, num, den, start, stop, err
		}
	}

	// Console("ProrateAssessment: C\n")
	// Console("GetRentableStateForDate( %d, %s ) = %d\n", r.RID, d.Format(RRDATEINPFMT), useStatus)
	switch useStatus {
	case USESTATUSemployee:
		fallthrough
	case USESTATUSinService:
		// Console("ProrateAssessment: D\n")
		// Console("%s: at case USESTATUSinService.\n", funcname)
		ra, err := GetRentalAgreement(ctx, a.RAID)
		if err != nil {
			Ulog("ProrateAssessment: error getting rental agreement RAID=%d, err = %s\n", a.RAID, err.Error())
		} else {
			// Console("ProrateAssessment: E\n")
			switch a.RentCycle {
			case RECURDAILY:
				// Console("%s: RECURDAILY: ra.RAID = %d, ra.RentStart = %s, ra.RentStop = %s\n", funcname, ra.RAID, ra.RentStart.Format(RRDATEFMT4), ra.RentStop.Format(RRDATEFMT4))
				pf, num, den, start, stop = CalcProrationInfo(&ra.RentStart, &ra.RentStop, d, d, a.RentCycle, a.ProrationCycle)
			case RECURNONE:
				fallthrough
			case RECURMONTHLY:
				// Console("%s: RECURMONTHLY: ra.RAID = %d, ra.RentStart = %s, ra.RentStop = %s\n", funcname, ra.RAID, ra.RentStart.Format(RRDATEFMT4), ra.RentStop.Format(RRDATEFMT4))
				pf, num, den, start, stop = CalcProrationInfo(&ra.RentStart, &ra.RentStop, d1, d2, a.RentCycle, a.ProrationCycle)
			default:
				LogAndPrint("Accrual rate %d not implemented\n", a.RentCycle)
			}
		}
		// Console("Assessment = %d, Rentable = %d, RA = %d, pf = %3.2f\n", a.ASMID, r.RID, ra.RAID, pf)

	case USESTATUSadmin:
		fallthrough
	case USESTATUSownerOccupied:
		fallthrough
	case USESTATUSofflineRenovation:
		fallthrough
	case USESTATUSofflineMaintenance:
		// Console("ProrateAssessment: F\n")
		ta, err := GetAllRentableAssessments(ctx, r.RID, d1, d2)
		if err != nil {
			return pf, num, den, start, stop, nil
		}

		if len(ta) > 0 {
			rentcycle, proration, _, err := GetRentCycleAndProration(ctx, &r, d1, xbiz)
			if err != nil {
				// TODO(Steve): dont we return error?
				Ulog("%s: error getting rent cycle for rentable %d. err = %s\n", funcname, r.RID, err.Error())
			}

			pf, num, den, start, stop = CalcProrationInfo(&(ta[0].Start), &(ta[0].Stop), d1, d2, rentcycle, proration)
			if len(ta) > 1 {
				Ulog("%s: %d Assessments affect Rentable %d (%s) with OFFLINE useStatus during %s - %s\n",
					funcname, len(ta), r.RID, r.RentableName, d1.Format(RRDATEINPFMT), d2.Format(RRDATEINPFMT))
			}
		}
	default:
		// Console("ProrateAssessment: G\n")

		Ulog("%s: Rentable %d on %s has unknown useStatus: %d\n", funcname, r.RID, d.Format(RRDATEINPFMT), useStatus)
	}

	return pf, num, den, start, stop, err
}

// journalAssessment processes the assessment, creates a Journal entry, and returns its id
// Parameters:
//		xbiz - the business struct
//		rid - Rentable ID
//		d - date of this assessment
//		a - the assessment
//		d1-d2 - defines the timerange being covered in this period
//=================================================================================================
func journalAssessment(ctx context.Context, xbiz *XBusiness, d time.Time, a *Assessment, d1, d2 *time.Time) (Journal, error) {
	funcname := "journalAssessment"
	Console("*** Entered  %s\n", funcname)
	Console("%s: d = %s, d1 = %s, d2 = %s\n", funcname, d.Format(RRDATEREPORTFMT), d1.Format(RRDATEREPORTFMT), d2.Format(RRDATEREPORTFMT))
	Console("%s: Assessment: PASMID = %d, RentCycle = %d, ProrationCycle = %d, Start = %s, Stop = %s\n", funcname, a.PASMID, a.RentCycle, a.ProrationCycle, a.Start.Format(RRDATETIMEW2UIFMT), a.Stop.Format(RRDATETIMEW2UIFMT))
	var j Journal

	pf, num, den, start, stop, err := ProrateAssessment(ctx, xbiz, a, &d, d1, d2)
	if err != nil {
		// Console("%s: exiting.  err = %s\n", funcname, err.Error())
		return j, err
	}

	Console("%s: A:: **** AFTER PRORATION CHECK **** pf = %6.4f, num = %d, den = %d, start = %s, stop = %s\n", funcname, pf, num, den, start.Format(RRDATEFMT3), stop.Format(RRDATEFMT3))
	Console("%s: B:: After ProrateAssessment: start = %s, stop = %s\n", funcname, start.Format(RRDATETIMEW2UIFMT), stop.Format(RRDATETIMEW2UIFMT))

	//--------------------------------------------------------------------------------------
	// This is a safeguard against issues encountered in Feb 2018 where rent assessments
	// continued after the RentalAgreement RentStop date.
	//--------------------------------------------------------------------------------------
	if pf < float64(0) {
		pf = float64(0)
	}

	// Console("%s: a.ASMTID = %d, d = %s, d1 = %s, d2 = %s\n", funcname, a.ASMID, d.Format(RRDATEFMT4), d1.Format(RRDATEFMT4), d2.Format(RRDATEFMT4))
	// Console("%s: pf = %f, num = %d, den = %d, start = %s, stop = %s\n", funcname, pf, num, den, start.Format(RRDATEFMT4), stop.Format(RRDATEFMT4))

	j = Journal{BID: a.BID, Dt: d, Type: JNLTYPEASMT, ID: a.ASMID}

	asmRules, err := GetAssessmentAccountRule(ctx, a)
	if err != nil {
		Console("%s: exiting.  err = %s\n", funcname, err.Error())
		return j, err
	}

	Console("%s: C:: Parsing account rule: %s  Amount = %8.2f\n", funcname, asmRules, a.Amount)
	m, err := ParseAcctRule(ctx, xbiz, a.RID, d1, d2, asmRules, a.Amount, pf) // a rule such as "d 11001 1000.0, c 40001 1100.0, d 41004 100.00"
	if err != nil {
		Console("%s: C1:: exiting.  err = %s\n", funcname, err.Error())
		return j, err
	}

	Console("%s:  m = %#v\n", funcname, m)
	for i := 0; i < len(m); i++ {
		Console("D:: m[%d].Amount = %f,  .Action = %s   .Expr = %s\n", i, m[i].Amount, m[i].Action, m[i].Expr)
	}

	_, j.Amount = sumAllocations(&m)
	j.Amount = RoundToCent(j.Amount)

	Console("%s: E:: j.Amount = %8.2f, pf = %8.5f\n", funcname, j.Amount, pf)

	//------------------------------------------------------------------------------------------------------
	// the assessment amount may have
	// been prorated as it was a newly created recurring assessment for a RentalAgreement that was either
	// just beginning or just ending. If so, we'll update the assessment amount here the calculated
	// j.Amount != a.Amount
	//------------------------------------------------------------------------------------------------------
	if pf < 1.0 {
		Console("%s: F:: will update assessment\n", funcname)
		a.Amount = j.Amount // update to the prorated amount
		a.Start = start     // adjust to the dates used in the proration
		a.Stop = stop       // adjust to the dates used in the proration
		a.Comment = fmt.Sprintf("Prorated for %d of %d %s", num, den, ProrationUnits(a.ProrationCycle))
		Console("%s: G:: a.Amount = %8.2f\n", funcname, a.Amount)
		if err := UpdateAssessment(ctx, a); err != nil {
			err = fmt.Errorf("Error updating prorated assessment amount: %s", err.Error())
			Console("%s: H:: exiting.  err = %s\n", funcname, err.Error())
			return j, err
		}
		Console("%s:  I::  Updating ASMID = %d, Amount = %8.2f\n", funcname, a.ASMID, a.Amount)
	}
	Console("%s:  J::  ASMID = %d, Amount = %8.2f\n", funcname, a.ASMID, a.Amount)

	//-------------------------------------------------------------------------------------------
	// In the event that we need to prorate, pull together the pieces and determine the
	// fractional amounts so that all the entries can net to 0.00.  Essentially, this means
	// handling the $0.01 off problem when dealing with fractional numbers.  The way we'll
	// handle this is to apply the extra cent to the largest number
	//-------------------------------------------------------------------------------------------
	if pf < 1.0 {
		// new method using ProcessSum
		var asum []SumFloat
		for i := 0; i < len(m); i++ {
			var b SumFloat
			if m[i].Action == "c" {
				b.Val = -m[i].Amount
			} else {
				b.Val = m[i].Amount
			}
			b.Amount = RoundToCent(b.Val)
			b.Remainder = b.Amount - b.Val
			asum = append(asum, b)
		}
		ProcessSumFloats(asum)
		for i := 0; i < len(asum); i++ {
			if m[i].Action == "c" {
				m[i].Amount = -asum[i].Amount // the adjusted value after ProcessSumFloats
			} else {
				m[i].Amount = asum[i].Amount // the adjusted value after ProcessSumFloats
			}
		}

	}

	Console("INSERTING JOURNAL: Date = %s, Type = %d, amount = %f\n", j.Dt, j.Type, j.Amount)

	jid, err := InsertJournal(ctx, &j)
	if err != nil {
		LogAndPrintError(funcname, err)
		Console("%s: exiting.  err = %s\n", funcname, err.Error())
		return j, err
	}

	s := ""
	for i := 0; i < len(m); i++ {
		s += fmt.Sprintf("%s %s %.2f", m[i].Action, m[i].AcctExpr, RoundToCent(m[i].Amount))
		if i+1 < len(m) {
			s += ", "
		}
	}
	if jid > 0 {
		var ja JournalAllocation
		ja.JID = jid
		ja.RID = a.RID
		ja.ASMID = a.ASMID
		ja.Amount = RoundToCent(j.Amount)
		ja.AcctRule = s
		ja.BID = a.BID
		ja.RAID = a.RAID

		// Console("INSERTING JOURNAL-ALLOCATION: ja.JID = %d, ja.ASMID = %d, ja.RAID = %d\n", ja.JID, ja.ASMID, ja.RAID)
		if _, err = InsertJournalAllocationEntry(ctx, &ja); err != nil {
			LogAndPrintError(funcname, err)
			Console("%s: exiting.  err = %s\n", funcname, err.Error())
			return j, err
		}
		j.JA = append(j.JA, ja)
	}

	Console("%s: exiting\n", funcname)
	return j, err
}

// RemoveJournalEntries clears out the records in the supplied range provided the range is not closed by a JournalMarker
//=================================================================================================
func RemoveJournalEntries(ctx context.Context, xbiz *XBusiness, d1, d2 *time.Time) error {
	// Remove the Journal entries and the JournalAllocation entries
	rows, err := RRdb.Prepstmt.GetAllJournalsInRange.Query(xbiz.P.BID, d1, d2)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var j Journal
		ReadJournals(rows, &j)
		DeleteJournalAllocations(ctx, j.JID)
		DeleteJournal(ctx, j.JID)
	}

	// only delete the marker if it is in this time range and if it is not the origin marker
	jm, err := GetLastJournalMarker(ctx)
	if err != nil {
		return err
	}

	if jm.State == LMOPEN && (jm.DtStart.After(*d1) || jm.DtStart.Equal(*d1)) && (jm.DtStop.Before(*d2) || jm.DtStop.Equal(*d2)) {
		DeleteJournalMarker(ctx, jm.JMID)
	}

	RemoveLedgerEntries(ctx, xbiz, d1, d2)
	return err
}

// ProcessNewAssessmentInstance must be supplied with a non-recurring instance.
// It does the Insert for a new assessment instance, then it creates the
// associated Journal entry for the supplied non-recurring assessment
//
// INPUTS
//    ctx   - db context
//    xbiz  - biz info
//   d1,d2  - time range -- used to determine if proration is needed
//       a  - the assessment
//==============================================================================
func ProcessNewAssessmentInstance(ctx context.Context, xbiz *XBusiness, d1, d2 *time.Time, a *Assessment) (Journal, error) {
	funcname := "ProcessNewAssessmentInstance"
	var j Journal
	var err error
	Console("Entered %s:  d1 = %s, d2 = %s, Assessment date: %s\n", funcname, d1.Format(RRDATEREPORTFMT), d2.Format(RRDATEREPORTFMT), a.Start.Format(RRDATEREPORTFMT))
	if a.PASMID == 0 && a.RentCycle != RECURNONE { // if this assessment is not a single instance recurrence, then return an error
		err = fmt.Errorf("%s: Function only accepts non-recurring instances, RentCycle = %d", funcname, a.RentCycle)
		LogAndPrintError(funcname, err)
		return j, err
	}
	if a.ASMID == 0 && a.RentCycle != RECURNONE {
		_, err = InsertAssessment(ctx, a)
		if nil != err {
			LogAndPrintError(funcname, err)
			return j, err
		}
	}

	Console("%s: Calling journalAssessment for ASMID = %d, PASMID = %d\n", funcname, a.ASMID, a.PASMID)
	j, err = journalAssessment(ctx, xbiz, a.Start, a, d1, d2)
	return j, err
}

// ProcessNewReceipt creates a Journal entry for the supplied receipt
//-----------------------------------------------------------------------------
func ProcessNewReceipt(ctx context.Context, xbiz *XBusiness, d1, d2 *time.Time, r *Receipt) (Journal, error) {
	var j Journal
	j.BID = xbiz.P.BID
	j.Amount = RoundToCent(r.Amount)
	j.Dt = r.Dt
	j.Type = JNLTYPERCPT
	j.ID = r.RCPTID
	// j.RAID = r.RAID
	jid, err := InsertJournal(ctx, &j)
	if err != nil {
		Ulog("Error inserting Journal entry: %v\n", err)
		return j, err
	}
	if jid > 0 {
		// now add the Journal allocation records...
		for i := 0; i < len(r.RA); i++ {
			// // Console("r.RA[%d] id = %d\n", i, r.RA[i].RCPAID)
			// rntagr, _ := GetRentalAgreement(r.RA[i].RAID) // what Rental Agreements did this payment affect and the amounts for each
			var ja JournalAllocation
			ja.JID = jid
			ja.TCID = r.TCID
			ja.Amount = RoundToCent(r.RA[i].Amount)
			ja.BID = j.BID
			ja.ASMID = r.RA[i].ASMID
			ja.AcctRule = r.RA[i].AcctRule
			if ja.ASMID > 0 { // there may not be an assessment associated, it could be unallocated funds
				// TODO(Steve): should we ignore error?
				a, _ := GetAssessment(ctx, ja.ASMID) // but if there is an associated assessment, then mark the RID and RAID
				ja.RID = a.RID
				ja.RAID = r.RA[i].RAID
			}
			ja.TCID = r.TCID
			if _, err = InsertJournalAllocationEntry(ctx, &ja); err != nil {
				LogAndPrintError("ProcessNewReceipt", err)
				return j, err
			}
			j.JA = append(j.JA, ja)
		}
	}
	return j, nil
}

// ProcessNewExpense adds a new expense instance.
//-----------------------------------------------------------------------------
func ProcessNewExpense(ctx context.Context, a *Expense, xbiz *XBusiness) error {
	InitBizInternals(a.BID, xbiz)
	var j = Journal{
		BID:    xbiz.P.BID,
		Amount: a.Amount,
		Dt:     a.Dt,
		Type:   JNLTYPEEXP,
		ID:     a.EXPID,
	}
	_, err := InsertJournal(ctx, &j)
	if err != nil {
		Ulog("Error inserting Journal Expense entry: %v\n", err)
		return err
	}
	var ja = JournalAllocation{
		JID:    j.JID,
		BID:    j.BID,
		RID:    a.RID,
		RAID:   a.RAID,
		Amount: a.Amount,
		EXPID:  a.EXPID,
	}
	clid := RRdb.BizTypes[a.BID].AR[a.ARID].CreditLID
	dlid := RRdb.BizTypes[a.BID].AR[a.ARID].DebitLID
	ja.AcctRule = fmt.Sprintf("d %s %.2f, c %s %.2f",
		RRdb.BizTypes[a.BID].GLAccounts[dlid].GLNumber, a.Amount,
		RRdb.BizTypes[a.BID].GLAccounts[clid].GLNumber, a.Amount)
	if _, err = InsertJournalAllocationEntry(ctx, &ja); err != nil {
		LogAndPrintError("ProcessNewReceipt", err)
		return err
	}
	j.JA = append(j.JA, ja)
	d1 := time.Date(a.Dt.Year(), a.Dt.Month(), 1, 0, 0, 0, 0, time.UTC)
	d2 := d1.AddDate(0, 1, 0)
	InitLedgerCache()
	GenerateLedgerEntriesFromJournal(ctx, xbiz, &j, &d1, &d2)
	return nil
}

// GenerateRecurInstances creates Assessment instance records for recurring Assessments and then
// creates the corresponding journal instances for the new assessment instances
//=================================================================================================
func GenerateRecurInstances(ctx context.Context, xbiz *XBusiness, d1, d2 *time.Time) error {
	// // Console("GetRecurringAssessmentsByBusiness - d1 = %s   d2 = %s\n", d1.Format(RRDATEINPFMT, d2.Format(RRDATEINPFMT)))
	rows, err := RRdb.Prepstmt.GetRecurringAssessmentsByBusiness.Query(xbiz.P.BID, d2, d1) // only get recurring instances without a parent
	if err != nil {
		return err
	}
	defer rows.Close()

	noClose := ClosePeriod{
		Dt:               TIME0,
		OpenPeriodDt:     TIME0,
		ExpandAsmDtStart: TIME0,
		ExpandAsmDtStop:  ENDOFTIME,
	}
	for rows.Next() {
		var a Assessment
		err = ReadAssessments(rows, &a)
		if err != nil {
			return err
		}

		// Console("\n\n\n**** GenerateRecurInstances: calling ExpandAssessment ASMID = %d\n", a.ASMID)
		err = ExpandAssessment(ctx, &a, xbiz, d1, d2, false, &noClose)
		if err != nil {
			return err
		}
	}

	return rows.Err()
}

// ProcessReceiptRange creates Journal records for Receipts in the supplied date range
//=================================================================================================
func ProcessReceiptRange(ctx context.Context, xbiz *XBusiness, d1, d2 *time.Time) error {
	r, err := GetReceipts(ctx, xbiz.P.BID, d1, d2)
	if err != nil {
		return err
	}

	for i := 0; i < len(r); i++ {
		j, err := GetJournalByReceiptID(ctx, r[i].RCPTID)
		if err != nil || j.JID == 0 { // TODO(Steve): are we sure that we want to proceed if err != nil?
			// if you want log the error then separate this condition in two if clauses
			_, err = ProcessNewReceipt(ctx, xbiz, d1, d2, &r[i])
			if err != nil {
				return err
			}
		}
	}

	return err
}

// CreateJournalMarker creates a Journal Marker record for the supplied date range
//=================================================================================================
func CreateJournalMarker(ctx context.Context, xbiz *XBusiness, d1, d2 *time.Time) error {
	const funcname = "CreateJournalMarker"
	var jm JournalMarker
	jm.BID = xbiz.P.BID
	jm.State = LMOPEN
	jm.DtStart = *d1
	jm.DtStop = *d2

	_, err := InsertJournalMarker(ctx, &jm)
	if err != nil {
		Ulog("%s: Error while inserting journal marker: %s\n", funcname, err.Error())
	}
	return err
}

// GenerateJournalRecords creates Journal records for Assessments and receipts over the supplied time range.
//=================================================================================================
func GenerateJournalRecords(ctx context.Context, xbiz *XBusiness, d1, d2 *time.Time, skipVac bool) error {
	// err := RemoveJournalEntries(xbiz, d1, d2)
	// if err != nil {
	// 	Ulog("Could not remove existing Journal entries from %s to %s. err = %v\n", d1.Format(RRDATEFMT), d2.Format(RRDATEFMT), err)
	// 	return
	// }
	var (
		err error
	)

	err = GenerateRecurInstances(ctx, xbiz, d1, d2)
	if err != nil {
		return err
	}
	if !skipVac {
		_, err = GenVacancyJournals(ctx, xbiz, d1, d2)
		if err != nil {
			return err
		}
	}
	err = ProcessReceiptRange(ctx, xbiz, d1, d2)
	if err != nil {
		return err
	}
	return CreateJournalMarker(ctx, xbiz, d1, d2)
	// return err
}
