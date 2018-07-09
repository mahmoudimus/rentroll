/*
common things for fees strcture!
*/

/* global
    w2utils, SetFormRecordFromData, GetFeeFormInitRecord,
    GetPetFeeLocalData, getVehicleFeeLocalData, GetRentableFeeLocalData,
    SetDataFromFormRecord, SetPetFeeLocalData, setVehicleFeeLocalData,
    SetRentableFeeLocalData, HideSliderContent, GetRentableLocalData
*/

"use strict";

// -------------------------------------------------------------------------------
// GetFeeFormInitRecord - returns a new object record for fee form
// -------------------------------------------------------------------------------
window.GetFeeFormInitRecord = function () {

    // for start and stop date
    var t = new Date(),
        nyd = new Date(new Date().setFullYear(new Date().getFullYear() + 1));

    // return new object
    return {
        recid:              0,
        TMPASMID:           0, // UNIQUE TEMPORARY ID
        ASMID:              0, // 0 MEANS NO ASSESSMENT
        ARID:               0,
        ARName:             "",
        ContractAmount:     0.0,
        RentCycle:          0,
        RentCycleText:      "",
        Start:              w2uiDateControlString(t),
        Stop:               w2uiDateControlString(nyd),
        AtSigningPreTax:    0.0,
        SalesTax:           0.0,
        // SalesTaxAmt:        0.0, // FUTURE RELEASE
        TransOccTax:        0.0,
        // TransOccAmt:        0.0, // FUTURE RELEASE
    };
};

// -------------------------------------------------------------------------------
// GetFeeFormFields - returns a clone of field definition list
//                     required by any fees form
// -------------------------------------------------------------------------------
window.GetFeeFormFields = function() {
    var fields = [
        {name: 'recid',             type: 'int',    required: false,    html: {page: 0, column: 0}},
        {name: 'TMPASMID',          type: 'int',    required: true,     html: {page: 0, column: 0}},
        {name: 'ASMID',             type: 'int',    required: true,     html: {page: 0, column: 0}},
        {name: 'ARID',              type: 'list',   required: true,     html: {page: 0, column: 0}, options: {items: [], selected: {}}},
        {name: 'ARName',            type: 'text',   required: true,     html: {page: 0, column: 0}},
        {name: 'ContractAmount',    type: 'money',  required: true,     html: {page: 0, column: 0}},
        {name: 'RentCycle',         type: 'int',    required: true,     html: {page: 0, column: 0}},
        {name: 'RentCycleText',     type: 'list',   required: false,    html: {page: 0, column: 0}, options: {items: app.cycleFreq}},
        {name: 'Start',             type: 'date',   required: true,     html: {page: 0, column: 0}},
        {name: 'Stop',              type: 'date',   required: true,     html: {page: 0, column: 0}},
        {name: 'AtSigningPreTax',   type: 'money',  required: true,     html: {page: 0, column: 0}},
        {name: 'SalesTax',          type: 'money',  required: true,     html: {page: 0, column: 0}},
        // {name: 'SalesTaxAmt',       type: 'money',  required: true,     html: {page: 0, column: 0}}, // FUTURE RELEASE
        {name: 'TransOccTax',       type: 'money',  required: true,     html: {page: 0, column: 0}},
        // {name: 'TransOccAmt',       type: 'money',  required: true,     html: {page: 0, column: 0}}, // FUTURE RELEASE
    ];

    // RETURN the clone
    return $.extend(true, [], fields);
};

// -------------------------------------------------------------------------------
// GetFeeGridColumns - returns a clone of column definition list
//                     required by any fees grid
// -------------------------------------------------------------------------------
window.GetFeeGridColumns = function() {
    var columns = [
        {
            field: 'recid',
            caption: 'recid',
            hidden: true
        },
        {
            field: 'TMPASMID',
            caption: 'TMPASMID',
            hidden: true
        },
        {
            field: 'ARID',
            caption: 'ARID',
            hidden: true
        },
        {
            field: 'ASMID',
            caption: 'ASMID',
            hidden: true
        },
        {
            field: 'ARName',
            caption: 'Account Rule',
            size: '100%'
        },
        {
            field: 'ContractAmount',
            caption: 'Contract<br>Amount',
            size: '100px',
            render: 'money'
        },
        {
            field: 'RentCycleText',
            caption: 'Rent Cycle',
            size: '100px',
            render: function (record/*, index, col_index*/) {
                var text = '';
                if (record) {
                    app.cycleFreq.forEach(function(itemText, itemIndex) {
                        if (record.RentCycle == itemIndex) {
                            text = itemText;
                            return false;
                        }
                    });
                }
                return text;
            },
        },
        {
            field: 'RentCycle',
            caption: 'Rent Cycle Index',
            hidden: true
        },
        {
            field: 'Start',
            caption: 'Start Date',
            hidden: true
        },
        {
            field: 'Stop',
            caption: 'Stop Date',
            hidden: true
        },
        {
            field: 'FeePeriod',
            caption: 'Fee Period',
            size: '100px',
            render: function(record) {
                var html = "";
                if (record) {
                    if (record.RentCycle === 0) {
                        return record.Start; // only show 1 date for non-recur
                    }
                    if (record.Start && record.Stop) {
                        html = record.Start + " - <br>" + record.Stop;
                    }
                }
                return html;
            }
        },
        {
            field: 'AtSigningPreTax',
            caption: 'At Signing<br>(pre-tax)',
            size: '100px',
            render: 'money'
        },
        {
            field: 'SalesTax',
            caption: 'Sales Tax',
            size: '100px',
            render: 'money'
        },
        /*{ // FUTURE RELEASE
            field: 'SalesTaxAmt',
            caption: 'Sales Tax Amt',
            size: '100px',
            render: 'money'
        },*/
        {
            field: 'TransOccTax',
            caption: 'Trans Occ Tax',
            size: '100px',
            render: 'money'
        },/*,
        { // FUTURE RELEASE
            field: 'TransOccAmt',
            caption: 'Trans Occ Amt',
            size: '100px',
            render: 'money'
        },*/
        {
            field: 'RowTotal',
            caption: 'Grand Total',
            size: '100px',
            style: 'text-align: right',
            render: function(record) {
                var html = "";
                var total = 0.0;
                if (record) {
                    if (record.AtSigningPreTax) {
                        total += record.AtSigningPreTax;
                    }
                    if (record.SalesTax) {
                        total += record.SalesTax;
                    }
                    if (record.TransOccTax) {
                        total += record.TransOccTax;
                    }

                    // make it bold
                    html = "<strong>" + w2utils.formatters.money(total) + "</strong>";
                }
                return html;
            }
        }
    ];

    // RETURN the clone
    return $.extend(true, [], columns);
};

// -------------------------------------------------------------------------------
// GetFeeFormToolbar - toolbar configured object for all fee form
// -------------------------------------------------------------------------------
window.GetFeeFormToolbar = function() {
    return {
        items: [
            { id: 'btnNotes', type: 'button', icon: 'far fa-sticky-note' },
            { id: 'bt3', type: 'spacer' },
            { id: 'btnClose', type: 'button', icon: 'fas fa-times'}
        ],
        onClick: function (event) {
            switch (event.target){
                case 'btnClose':
                    HideSliderContent(2);
                    break;
            }
        }
    };
};

// -------------------------------------------------------------------------------
// FeeFormOnRefreshHandler - handle the action on fee form refresh event
// -------------------------------------------------------------------------------
window.FeeFormOnRefreshHandler = function(feeForm) {

    // -- ARID -- //
    var ARIDSel = {};
    feeForm.get("ARID").options.items.forEach(function(item) {
        if (item.id == feeForm.record.ARID) {
            ARIDSel = {id: item.id, text: item.text};
        }
    });
    feeForm.get("ARID").options.selected = ARIDSel;

    // -- RENTCYCLE -- //
    var selectedRentCycle = app.cycleFreq[feeForm.record.RentCycle];
    var RentCycleTextSel = { id: selectedRentCycle, text: selectedRentCycle };
    feeForm.get("RentCycleText").options.selected = RentCycleTextSel;
    feeForm.record.RentCycleText = RentCycleTextSel;

    // -- START & STOP DATES -- //
    // if RentCycle is 0=nonrecur then disable Stop date field
    // and value should be same as Start
    if (feeForm.record.RentCycle === 0) {
        $(feeForm.box).find("input[name=Stop]").prop("disabled", true);
        $(feeForm.box).find("input[name=Stop]").w2field().set(feeForm.record.Start);
        feeForm.record.Stop = feeForm.record.Start;
    } else {
        $(feeForm.box).find("input[name=Stop]").prop("disabled", false);
    }
};

// -------------------------------------------------------------------------------
// FeeFormOnChangeHandler - handle the action on fee form change event
// -------------------------------------------------------------------------------
window.FeeFormOnChangeHandler = function(feeForm, field, newValue) {
    switch(field) {
    case "RentCycleText":
        if (newValue) {
            app.cycleFreq.forEach(function(itemText, itemIndex) {
                if (newValue.text == itemText) {
                    feeForm.record.RentCycle = itemIndex;
                    return false;
                }
            });
            feeForm.refresh();
        }
        break;
    case "ARID":
        if (newValue) {
            var BID = getCurrentBID();

            // find account rules based on selected new value
            var arItem = {};
            app.raflow.arList[BID].forEach(function(item) {
                if (newValue.id == item.ARID) {
                    arItem = item;
                    return false;
                }
            });

            // update form record based on selected account rules item
            feeForm.record.ContractAmount = arItem.DefaultAmount;
            feeForm.record.ARName = newValue.text;

            // check for non-recurring cycle flag
            if (arItem.FLAGS&0x40 != 0) { // then it is set to non-recur flag
                // It indicates that rule follow non recur charge
                // feeForm.record.RentCycleText = app.cycleFreq[0];
                feeForm.record.RentCycle = 0;
            } else {
                var RID = app.raflow.last.RID,
                    localRData = GetRentableLocalData(RID);

                // feeForm.record.RentCycleText = app.cycleFreq[localRData.RentCycle];
                feeForm.record.RentCycle = localRData.RentCycle;
            }

            // select rentcycle as well
            var selectedRentCycle = app.cycleFreq[feeForm.record.RentCycle];
            var rentCycleW2UISel = { id: selectedRentCycle, text: selectedRentCycle };
            feeForm.get("RentCycleText").options.selected = rentCycleW2UISel;
            feeForm.record.RentCycleText = rentCycleW2UISel;
            feeForm.refresh();

            // When RentCycle is Norecur then disable the RentCycle list field.
            var isDisabled = feeForm.record.RentCycleText.text === app.cycleFreq[0];
            $(feeForm.box).find("#RentCycleText").prop("disabled", isDisabled);
        }
        break;
    }
};

// -------------------------------------------------------------------------------
// SetFeeFormRecordFromFeeData - sets form record from given data
//
// It sets data from local raflow only for fields which are defined in form
// definition
// -------------------------------------------------------------------------------
window.SetFeeFormRecordFromFeeData = function(TMPID, TMPASMID, flowPart) {
    var form,
        data = {}; // for referenced typed variable --  undefined will not work

    switch(flowPart) {
        case "pets":
            form = w2ui.RAPetFeeForm;
            if (TMPASMID === 0) {
                data = GetFeeFormInitRecord();
            } else {
                data = GetPetFeeLocalData(TMPID, TMPASMID);
            }
            SetFormRecordFromData(true, form, data);
            break;
        case "vehicles":
            form = w2ui.RAVehicleFeeForm;
            if (TMPASMID === 0) {
                data = GetFeeFormInitRecord();
            } else {
                data = getVehicleFeeLocalData(TMPID, TMPASMID);
            }
            SetFormRecordFromData(true, form, data);
            break;
        case "rentables":
            form = w2ui.RARentableFeeForm;
            if (TMPASMID === 0) {
                data = GetFeeFormInitRecord();
            } else {
                data = GetRentableFeeLocalData(TMPID, TMPASMID);
            }
            SetFormRecordFromData(true, form, data);
            break;
        default:
            return false;
    }
};

// -------------------------------------------------------------------------------
// SetFeeDataFromFeeFormRecord - sets form record from given data
//
// It sets data from local raflow only for fields which are defined in form
// definition
// -------------------------------------------------------------------------------
window.SetFeeDataFromFeeFormRecord = function(TMPID, TMPASMID, flowPart) {
    var form,
        data = {};

    switch(flowPart) {
        case "pets":
            form = w2ui.RAPetFeeForm;
            if (TMPASMID !== 0) {
                data = GetPetFeeLocalData(TMPID, TMPASMID);
            }

            // set modified data from form record
            data = SetDataFromFormRecord(TMPASMID, true, form, data);

            // set data locally
            SetPetFeeLocalData(TMPID, TMPASMID, data);

            break;
        case "vehicles":
            form = w2ui.RAVehicleFeeForm;
            if (TMPASMID !== 0) {
                data = getVehicleFeeLocalData(TMPID, TMPASMID);
            }

            // set modified data from form record
            data = SetDataFromFormRecord(TMPASMID, true, form, data);

            // set data locally
            setVehicleFeeLocalData(TMPID, TMPASMID, data);

            break;
        case "rentables":
            form = w2ui.RARentableFeeForm;
            if (TMPASMID !== 0) {
                data = GetRentableFeeLocalData(TMPID, TMPASMID);
            }

            // set modified data from form record
            data = SetDataFromFormRecord(TMPASMID, true, form, data);

            // set data locally
            SetRentableFeeLocalData(TMPID, TMPASMID, data);

            break;
        default:
            return false;
    }
};
