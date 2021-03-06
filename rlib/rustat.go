package rlib

import (
	"context"
	"time"
)

// RSUseStatus is a slice of the string meaning of each UseStatus
var RSUseStatus = []string{
	"Ready",        // 0
	"In Service",   // 1
	"Major Repair", // 2
	"Housekeeping", // 3
	"Inactive",     // 4
}

// RSMakeReadyStatus is a slice of the string meaning of each MakeReadyStatus
var RSMakeReadyStatus = []string{
	"Unknown",
	"In Progress Housekeeping",
	"In Progress Maintenance",
	"Pending Inspection",
	"Ready",
}

// UseStatusStringer returns the string associated with the UseStatus
// in struct t.
//-----------------------------------------------------------------------------
func (t *RentableUseStatus) UseStatusStringer() string {
	return UseStatusString(t.UseStatus)
}

// UseStatusString returns the string associated with UseStatus us
//-----------------------------------------------------------------------------
func UseStatusString(us int64) string {
	i := int(us)
	if i > len(RSUseStatus) {
		i = 0
	}
	return RSUseStatus[i]
}

// MakeReadyStatusStringer returns the string associated with the MakeReadyStatus
// in struct t.
//-----------------------------------------------------------------------------
func (t *Rentable) MakeReadyStatusStringer() string {
	return MakeReadyStatusString(t.MRStatus)
}

// MakeReadyStatusString returns the string associated with MakeReadyStatus mr
//-----------------------------------------------------------------------------
func MakeReadyStatusString(mr int64) string {
	i := int(mr)
	if i > len(RSMakeReadyStatus) {
		i = 0
	}
	return RSMakeReadyStatus[i]
}

// SetRentableUseStatusAbbr changes the use status from d1 to d2 to the supplied
// status, us.
//
// INPUTS
//     ctx - db context
//     bid - which business
//     rid - which rentable
//     us  - new use status
//     d1  - start time for status us
//     d2  - stop time for status us
//-----------------------------------------------------------------------------
func SetRentableUseStatusAbbr(ctx context.Context, bid, rid, us int64, d1, d2 *time.Time) error {
	var b = RentableUseStatus{
		RID:       rid,
		BID:       bid,
		DtStart:   *d1,
		DtStop:    *d2,
		Comment:   "",
		UseStatus: us,
	}
	return SetRentableUseStatus(ctx, &b)

}

// SetRentableUseStatus implements the proper insertion of a use status
//     under all the circumstances considered.
//
// INPUTS
//     ctx - db context
//     rus - the new use status structure
//-----------------------------------------------------------------------------
func SetRentableUseStatus(ctx context.Context, rus *RentableUseStatus) error {
	// funcname := "SetRentableUseStatus"
	// Console("\nEntered %s.  range = %s, UseStatus = %d\n", funcname, ConsoleDRange(&rus.DtStart, &rus.DtStop), rus.UseStatus)

	var err error
	var b []RentableUseStatus
	d1 := rus.DtStart
	d2 := rus.DtStop
	a, err := GetRentableUseStatusByRange(ctx, rus.RID, &d1, &d2)
	if err != nil {
		return err
	}

	// Console("%s: Range = %s    found %d records\n", funcname, ConsoleDRange(&d1, &d2), len(a))

	//--------------------------------------------------------------------------
	// Remove any status records that are fully encompassed by rus.
	//--------------------------------------------------------------------------
	for i := 0; i < len(a); i++ {
		// Console("i = %d, RSID = %d\n", i, a[i].RSID)
		if (d1.Before(a[i].DtStart) || d1.Equal(a[i].DtStart)) &&
			(d2.After(a[i].DtStop) || d2.Equal(a[i].DtStop)) {
			// Console("%s: deleting RSID = %d ------------------------------------\n", funcname, a[i].RSID)
			if err = DeleteRentableUseStatus(ctx, a[i].RSID); err != nil {
				return err
			}
		} else {
			// Console("Appending RSID=%d to a[]\n", a[i].RSID)
			b = append(b, a[i])
		}
	}

	//-------------------------------------------------------------------
	// We're left with 0 or 1 or 2 items in b.  The overlap cases are
	// handled by this loop.  When it finishes, rus is is inserted.
	//-------------------------------------------------------------------
	if len(b) == 0 {
		_, err = InsertRentableUseStatus(ctx, rus)
		return err
	}

	//------------------------------------------------------------------------
	// CASE 1  -  after simplification, there is overlap on only one record
	//------------------------------------------------------------------------
	if len(b) == 1 {
		match := b[0].UseStatus == rus.UseStatus
		before := b[0].DtStart.Before(d1)
		after := b[0].DtStop.After(d2)
		if match {
			//-----------------------------------------------
			// CASE 1a -  rus is contained by b[0] and statuses are equal
			//-----------------------------------------------
			//     b[0]: @@@@@@@@@@@@@@@@@@@@@
			//      rus:      @@@@@@@@@@@@
			//   Result: @@@@@@@@@@@@@@@@@@@@@
			//-----------------------------------------------
			// Console("%s: Case 1a\n", funcname)
			if !before {
				b[0].DtStart = d1
			}
			if !after {
				b[0].DtStop = d2
			}
			return UpdateRentableUseStatus(ctx, &b[0])
		}

		if before && after {
			//-----------------------------------------------
			// CASE 1b -  rus contains b[0], match == false
			//-----------------------------------------------
			//     b[0]: @@@@@@@@@@@@@@@@@@@@@
			//      rus:      ############
			//   Result: @@@@@############@@@@
			//-----------------------------------------------
			// Console("%s: Case 1b\n", funcname)
			n := b[0]
			n.DtStart = d2
			if _, err = InsertRentableUseStatus(ctx, &n); err != nil {
				return err
			}
			b[0].DtStop = d1
			if err = UpdateRentableUseStatus(ctx, &b[0]); err != nil {
				return err
			}
		}
		if !before {
			//-----------------------------------------------
			// CASE 1c -  rus prior to b[0], match == false
			//-----------------------------------------------
			//      rus: @@@@@@@@@@@@
			//     b[0]:       ##########
			//   Result: @@@@@@@@@@@@####
			//-----------------------------------------------
			// Console("%s: Case 1c\n", funcname)
			b[0].DtStart = d2
			if err = UpdateRentableUseStatus(ctx, &b[0]); err != nil {
				return err
			}
		}
		if !after {
			//-----------------------------------------------
			// CASE 1d -  rus prior to b[0], match == false
			//-----------------------------------------------
			//      rus:     @@@@@@@@@@@@
			//     b[0]: ##########
			//   Result: ####@@@@@@@@@@@@
			//-----------------------------------------------
			// Console("%s: Case 1d\n", funcname)
			b[0].DtStop = d1
			if err = UpdateRentableUseStatus(ctx, &b[0]); err != nil {
				return err
			}
		}
		// Console("%s: Inserting %s UseStatus = %d\n", funcname, ConsoleDRange(&rus.DtStart, &rus.DtStop), rus.UseStatus)
		_, err = InsertRentableUseStatus(ctx, rus)
		return err
	}

	//------------------------------------------------------------------------
	// CASE 2  -  after simplification, there is overlap with two records
	//------------------------------------------------------------------------
	if len(b) == 2 {
		match0 := b[0].UseStatus == rus.UseStatus
		match1 := b[1].UseStatus == rus.UseStatus
		before := b[0].DtStart.Before(d1)
		after := b[1].DtStop.After(d2)
		// Console("%s: Case 2 and match0 = %t, match1 = %t\n", funcname, match0, match1)
		if match0 && match1 {
			// Case 2a
			// all are the same, merge them all into b[0], delete b[1]
			//  b[0:1]   ********* ************
			//  rus            *******
			//  Result   **********************
			// Console("%s: Case 2a All match\n", funcname)
			if !before {
				b[0].DtStart = d1
			}
			b[0].DtStop = b[1].DtStop
			if !after {
				b[0].DtStop = d2
			}
			if err = UpdateRentableUseStatus(ctx, &b[0]); err != nil {
				return err
			}
			return DeleteRentableUseStatus(ctx, b[1].RSID)
		}

		if !match0 && !match1 {
			// Case 2b
			// neither match. Update both b[0] and b[1], add new rus
			//  b[0:1]   @@@@@@@@@@************
			//  rus            #######
			//  Result   @@@@@@#######*********
			// Console("%s: Case 2b Both do not match\n", funcname)
			if d1.After(b[0].DtStart) {
				b[0].DtStop = d1
				if err = UpdateRentableUseStatus(ctx, &b[0]); err != nil {
					return err
				}
			}
			if d2.Before(b[1].DtStop) {
				b[1].DtStart = d2
			}
			if err = UpdateRentableUseStatus(ctx, &b[1]); err != nil {
				return err
			}
			_, err = InsertRentableUseStatus(ctx, rus)
			return err
		}

		if match0 && !match1 {
			// Case 2c
			// merge rus and b[0], update b[1]
			//  b[0:1]   @@@@@@@@@@************
			//  rus            @@@@@@@
			//  Result   @@@@@@@@@@@@@*********
			// Console("%s: Case 2c b[0] matches\n", funcname)
			b[0].DtStop = d2
			if err = UpdateRentableUseStatus(ctx, &b[0]); err != nil {
				return err
			}
			b[1].DtStart = d2
			return UpdateRentableUseStatus(ctx, &b[1])
		}

		if !match0 && match1 {
			// Case 2d
			// merge rus and b[1], update b[0]
			//  b[0:1]   @@@@@@@@@@************
			//  rus            *******
			//  Result   @@@@@@****************
			// Console("%s: Case 2d b[0] matches\n", funcname)
			b[1].DtStart = d1
			if err = UpdateRentableUseStatus(ctx, &b[1]); err != nil {
				return err
			}
			b[0].DtStop = d1
			return UpdateRentableUseStatus(ctx, &b[0])
		}

		// Console("%s: UNHANDLED CASE???\n", funcname)
	}

	return nil

}
