/*global
    parseInt, w2ui, getDepMeth, getReservation, $, app, getBUDfromBID, getCurrentBusiness, console,
    saveReservationForm, switchToReservationss, finishReservationsForm, reservationsUpdateRTList,
    getReservationInitRecord, reservationSrch, daysBetweenDates, switchToBookRes,
    getBookResInitRecord, resSaveCB, setToForm, setResUpdateRecordForUI,
    showReservationRentable, checkRentableAvailability, cancelReservation, getRTName,
    closeResUpdateDialog, UTCstringToLocaltimeString,applyLocaltimeDateOffset,
    newReservationRecord,feedbackMessage,number_format,
    ResTCCompare,ResTCDropRender,ResTCRender,resUsePickedTC,stringToDate,
    checkIn,checkOut,reservationLSIndicator,
*/

"use strict";


window.newReservationRecord = function() {
    var BID = getCurrentBID();
    var now = new Date();
    var res = {
        rdBID: BID,
        BUD: getBUDfromBID(BID),
        DtStart: w2uiDateControlString(now),
        DtStop: w2uiDateControlString(new Date(now.getFullYear(),now.getMonth(), 1+now.getDate())),
        Nights: 1,
        RLID: 0,
        RTRID: 0,
        rdRTID: 0,
        RID: 0,
        RAID: 0,
        TCID: 0,
        Amount: 0.0,
        Deposit: 0.0,
        DepASMID: 0,
        LeaseStatus: 0, // not leased
        RentableName: '',
        FirstName: '',
        UnspecifiedAdults: 0,
        UnspecifiedChildren: 0,
        LastName: '',
        IsCompany: false,
        CompanyName: '',
        Email: '',
        Phone: '',
        Street: '',
        City: '',
        Country: '',
        State: '',
        PostalCode: '',
        CCName: '',
        CCType: '',
        CCNumber: '',
        CCExpMonth: '',
        CCExpYear: '',
        ConfirmationCode: '',
        Comment: '',
    };
    return res;
};

// pvtReservation should be considered private to this file. It is managed
// by the functions in this file as the reservation being viewed and edited
// in the forms.
//------------------------------------------------------------------------------
var pvtReservation = {
    res: null,        // the reservation record.
    locked: true,     // the rentable / rentabletype / date details cannot be modified in the UI
    modified: false,  // indicates if the res has been modified from its original value
    datesValid: false,// true when loading existing RentableLeaseStatus or selecting from Availability list
};


// buildResUpdateElements creates the rid and reservation form to find
//------------------------------------------------------------------------------
window.buildResUpdateElements = function () {
    var formWidth = 800;  // controled by the table width of the form in the html file

    //------------------------------------------------------------------------
    //          resUpdateGrid
    //------------------------------------------------------------------------
    $().w2grid({
        name: 'resUpdateGrid',
        url: '/v1/reservation',
        multiSelect: false,
        show: {
            toolbar         : true,
            footer          : true,
            toolbarAdd      : true,   // indicates if toolbar add new button is visible
            toolbarDelete   : false,   // indicates if toolbar delete button is visible
            toolbarSave     : false,   // indicates if toolbar save button is visible
            selectColumn    : false,
            expandColumn    : false,
            toolbarEdit     : false,
            toolbarSearch   : true,
            toolbarInput    : true,
            searchAll       : true,
            toolbarReload   : false,
            toolbarColumns  : true,
        },
        columns: [
            {field: 'recid',            caption: 'recid',           size: '60px', hidden: true, sortable: true },
            {field: 'RLID',             caption: 'RLID',            size: '60px', hidden: true, sortable: true, style: 'text-align: right' },
            {field: 'RID',              caption: 'RID',             size: '60px', hidden: true, sortable: true, style: 'text-align: right' },
            {field: 'ConfirmationCode', caption: 'ConfirmationCode',size: '165px', hidden: false, sortable: true },
            {field: 'DtStart',          caption: 'DtStart',         size: '80px', hidden: false, sortable: true, style: 'text-align: center',
                render: function (record, index, col_index) {
                    if (record == undefined) {
                        return '';
                    }
                    var d = new Date(record.DtStart);
                    return dateFmtStr(d); // if non-recur assessment then do nothing
                },
            },
            {field: 'DtStop',           caption: 'DtStop',          size: '80px', hidden: false, sortable: true, style: 'text-align: center',
                render: function (record , index, col_index) {
                    if (record == undefined) {
                        return '';
                    }
                    var d = new Date(record.DtStop);
                    return dateFmtStr(d); // if non-recur assessment then do nothing
                },
            },
            {field: 'FirstName',        caption: 'FirstName',       size: '90px',  hidden: false, sortable: true },
            {field: 'LastName',         caption: 'LastName',        size: '90px',  hidden: false, sortable: true },
            {field: 'CompanyName',      caption: 'CompanyName',     size: '90px',  hidden: false, sortable: true },
            {field: 'IsCompany',        caption: 'IsCompany',       size: '90px',  hidden: true, sortable: true },
            {field: 'Email',            caption: 'Email',           size: '175px', hidden: false, sortable: true },
            {field: 'Phone',            caption: 'Phone',           size: '100px', hidden: false, sortable: true },
            {field: 'RentableName',     caption: 'Rentable Name',   size: '100px', hidden: false, sortable: true },
            {field: 'Name',             caption: 'Rentable Type',   size: '5%',    hidden: false, sortable: true },
        ],
        onAdd: function (/*event*/) {
            var yes_args = [this],
                no_callBack = function() {
                    return false;
                },
                yes_callBack = function(grid) {
                    app.last.grid_sel_recid = -1; // reset grid sel recid
                    grid.selectNone();
                    var BUD = getBUDfromBID(getCurrentBID());
                    getRentableTypes(BUD, 1, function() {
                        w2ui.availabilityGrid.clear(); // remove any contents from prior checks
                        w2ui.availabilityGrid.url = '';
                        w2ui.resUpdateForm.url = '';
                        w2ui.resUpdateForm.record = newReservationRecord();
                        pvtReservation.res = $.extend(true,{},w2ui.resUpdateForm.record); // deep copy
                        pvtReservation.locked = false;
                        pvtReservation.modified = false;
                        pvtReservation.datesValid = false;
                        setToForm('resUpdateForm','',formWidth,false,w2ui.resFormLayout);
                    });
                };
                form_dirty_alert(yes_callBack, no_callBack, yes_args); // warn user if form content has been changed
        },
        onClick: function(event) {
            event.onComplete = function () {
                var rec = w2ui.resUpdateGrid.get(event.recid);
                console.log('book RLID = ' + rec.RLID);
                // switchToResUpdate(rec.RLID);
                var BID = getCurrentBID();
                var BUD = getBUDfromBID(BID);
                getRentableTypes(BUD, 1, function() {
                    w2ui.availabilityGrid.clear(); // remove any contents from prior checks
                    w2ui.availabilityGrid.url = '';
                    var url = '/v1/reservation/' + BID + '/' + rec.RLID;
                    setToForm('resUpdateForm',url,formWidth,true,w2ui.resFormLayout);
                });
            };
        },
        onLoad: function() {
            var r = this.records;
            var s;
            for (var i = 0; i < r.length; i++) {
                s = UTCstringToLocaltimeString(r[i].DtStart);
                r[i].DtStart = s;
                s = UTCstringToLocaltimeString(r[i].DtStop);
                r[i].DtStop = s;
            }
        },
        onRequest: function(/*event*/) {
            w2ui.expenseGrid.postData = {searchDtStart: app.D1, searchDtStop: app.D2};
        },
        onRefresh: function(event) {
            event.onComplete = function() {
                if (app.active_grid == this.name) {
                    if (app.new_form_rec) {
                        this.selectNone();
                    }
                    else{
                        this.select(app.last.grid_sel_recid);
                    }
                }
            };
        }
    });

    addDateNavToToolbar('resUpdate');

    //------------------------------------------------------------------------
    // resFormLayout
    //
    //  top    = resUpdateForm
    //  main   = availabilityGrid
    //  bottom = resUpFormBtns
    //------------------------------------------------------------------------
    $().w2layout({
        name: 'resFormLayout',
        padding: 0,
        panels: [
            { type: 'left',    size: 0,     hidden: true,  content: 'left'    },
            { type: 'top',     size: '75%', hidden: false, content: 'top',    resizable: true, style: app.pstyle },
            { type: 'main',    size: '25%', hidden: false,  content: 'main',   resizable: true, style: app.pstyle },
            { type: 'preview', size: 0,     hidden: true,  content: 'preview' },
            { type: 'bottom',  size: '50px',hidden: false,  content: 'bottom', resizable: false, style: app.pstyle },
            { type: 'right',   size: 0,     hidden: true,  content: 'right',  resizable: true, style: app.pstyle }
        ]
    });

    //---------------------------------------------------------------------------------
    // finishResUpForm - load the layout properly.
    //  top    = resUpdateForm
    //  main   = availabilityGrid
    //  bottom = resUpFormBtns
    //---------------------------------------------------------------------------------
    window.finishResUpForm = function () {
        w2ui.resFormLayout.content('top', w2ui.resUpdateForm);
        w2ui.resFormLayout.content('main', w2ui.availabilityGrid);
        w2ui.resFormLayout.content('bottom', w2ui.resUpFormBtns);
    };

    //---------------------------------------------------------------------------------
    // SetResUpFormTitle - Set the form title to "New Reservation" if RLID == 0
    //  Otherwise, indicate the RLID in the title
    //---------------------------------------------------------------------------------
    function SetResUpFormTitle(f) {
        if (f.record.RLID > 0) {
            f.header = "Change Reservation (RLID " + f.record.RLID + ")";
        } else {
            f.header = "New Reservation";
        }
    }

    function ResUpHideSave() {
        $(w2ui.resUpFormBtns.box).find("button[name=save]").addClass("hidden");
    }
    function ResUpShowSave() {
        $(w2ui.resUpFormBtns.box).find("button[name=save]").removeClass("hidden");
    }
    function ResUpSetSaveButton() {
        switch (w2ui.resUpdateForm.record.LeaseStatus) {
            case 1:
                ResUpHideSave();
                break;
            case 2:
                ResUpShowSave();
                break;
        }
    }

    //---------------------------------------------------------------------------------
    // reservationLSIndicator - show the lease status:
    //
    //  0 = available
    //  1 = booked
    //  2 = reserved
    //---------------------------------------------------------------------------------
    window.reservationLSIndicator = function () {
        var a = "border-radius: 5px 5px 5px;padding: 5px;font-size:10pt;";
        var s;
        switch (w2ui.resUpdateForm.record.LeaseStatus) {
            case 0: // available
                s = "";
                break;
            case 1: // rented
                s = '<span style="background-color:#caffca;color:#008800;border: 2px solid #008800;'+a+'">ACTIVE</span>';
                break;
            case 2: // reserved
                s = '<span style="background-color:#ddddba;color:#606000;border: 2px solid #606000;'+a+'">BOOKED</span>';
                break;
            default:
                s = "??";
                break;
        }
        feedbackMessage("resupReservationBannerText",s);
    };

    //------------------------------------------------------------------------
    //          resUpdateForm
    //
    //    >>>>>>>>>   top    = resUpdateForm       <<<<<<<<<<<
    //                main   = availabilityGrid
    //                bottom = resUpFormBtns
    //------------------------------------------------------------------------
    $().w2form({
        name: 'resUpdateForm',
        style: 'border: 0px; background-color: transparent;',
        header: 'Change A Reservation',
        url: '/v1/reservation/',
        formURL: '/webclient/html/formresup.html',
        fields: [
            { field: 'BUD',                type: 'list',     required: false,  options: {items: app.businesses} },
            { field: 'RLID',               type: 'int',      required: false,  },
            { field: 'RTRID',              type: 'int',      required: false,  },
            { field: 'RTID',               type: 'int',      required: false,  },
            { field: 'rdRTID',             type: 'list',     required: false,  },
            { field: 'RID',                type: 'int',      required: false,  },
            { field: 'rdBID',              type: 'int',      required: false,  },
            { field: 'ConfirmationCode',   type: 'text',     required: false,  },
            { field: 'LeaseStatus',        type: 'int',      required: false,  },
            { field: 'DtStart',            type: 'date',     required: false,  },
            { field: 'DtStop',             type: 'date',     required: false,  },
            { field: 'Amount',             type: 'money',    required: false,  },
            { field: 'Deposit',            type: 'money',    required: false,  },
            { field: 'DepASMID',           type: 'int',      required: false,  },
            { field: 'Discount',           type: 'hidden',   required: false,  },
            { field: 'Nights',             type: 'int',      required: false,  },
            { field: 'UnspecifiedAdults',  type: 'int',      required: false,  },
            { field: 'UnspecifiedChildren',type: 'int',      required: false,  },
            { field: 'FirstName',          type: 'text',     required: true ,  },
            { field: 'LastName',           type: 'text',     required: true ,  },
            { field: 'Phone',              type: 'text',     required: false,  },
            { field: 'Email',              type: 'text',     required: false,  },
            { field: 'Street',             type: 'text',     required: false,  },
            { field: 'City',               type: 'text',     required: false,  },
            { field: 'State',              type: 'text',     required: false,  },
            { field: 'PostalCode',         type: 'text',     required: false,  },
            { field: 'CompanyName',        type: 'text',     required: false,  },
            { field: 'IsCompany',          type: 'checkbox', required: false,  },
            { field: 'CCName',             type: 'text',     required: false,  },
            { field: 'CCType',             type: 'text',     required: false,  },
            { field: 'CCNumber',           type: 'text',     required: false,  },
            { field: 'CCExpMonth',         type: 'text',     required: false,  },
            { field: 'CCExpYear',          type: 'text',     required: false,  },
            { field: 'Comment',            type: 'textarea', required: false,  },
            { field: 'LastModTime',        type: 'time',     required: false,  },
            { field: 'LastModBy',          type: 'int',      required: false,  },
            { field: 'CreateTS',           type: 'time',     required: false,  },
            { field: 'CreateBy',           type: 'int',      required: false,  },
            { field: 'PGName',             type: 'enum',     required: false,
                options: {
                    url:            '/v1/transactantsdettd/' + getCurrentBID(),
                    match:          'begins',
                    max:            1,
                    items:          [],
                    openOnFocus:    false,
                    maxDropWidth:   500,
                    maxDropHeight:  450,
                    renderItem:     ResTCRender,
                    renderDrop:     ResTCDropRender,
                    compare:        ResTCCompare,
                    onNew: function (event) {
                        $.extend(event.item, {
                            TCID: 0,
                        	FirstName: '',
                        	MiddleName: '',
                        	LastName: '',
                        	CompanyName: '',
                        	IsCompany: false,
                        	PrimaryEmail: '',
                        	SecondaryEmail: '',
                        	WorkPhone: '',
                        	CellPhone: '',
                        	Address: '',
                        	Address2: '',
                        	City: '',
                        	State: '',
                        	PostalCode: '',
                        } );
                    },
                    onRemove: function(event) {
                        // event.onComplete = function() {
                        //     var f = w2ui.bizDetailForm;
                        //     // reset BUD field related data when removed
                        //     f.record.ClassCode = 0;
                        //     f.record.CoCode = 0;
                        //     f.record.BUD = "";
                        //
                        //     // NOTE: have to trigger manually, b'coz we manually change the record,
                        //     // otherwise it triggers the change event but it won't get change (Object: {})
                        //     var event = f.trigger({ phase: 'before', target: f.name, type: 'change', event: event }); // event before
                        //     if (event.cancelled === true) return false;
                        //     f.trigger($.extend(event, { phase: 'after' })); // event after
                        // };
                    },
                },
            },
        ],
        toolbar: {
            items: [
                { id: 'checkIn',  type: 'button', caption: 'Check In', icon: "fas fa-sign-in-alt"},
                { id: 'checkOut', type: 'button', caption: 'Check Out', icon: "fas fa-sign-out-alt"},
                { id: 'spc',               type: 'spacer' },
                { id: 'cancelReservation', type: 'button', caption: 'Cancel Reservation', icon: "fas fa-ban"},
                { id: 'brk',               type: 'break' },
                { id: 'btnClose',          type: 'button', icon: 'fas fa-times' },
            ],
            onClick: function (event) {
                var f = w2ui.resUpdateForm;
                var r = f.record;
                switch(event.target) {
                case 'btnClose':
                    var no_callBack = function() { return false; },
                        yes_callBack = function() {
                            closeResUpdateDialog();
                        };
                    form_dirty_alert(yes_callBack, no_callBack);
                    break;
                case 'cancelReservation':
                    cancelReservation(r.RLID);
                    break;
                case 'checkIn':
                    checkIn(r.RLID);
                    break;
                case 'checkOut':
                    checkOut(r.RLID);
                    break;
                }
            },
        },
        onLoad: function(event) {
            // Need to add the BUD value...
            event.onComplete = function() {
                var f = this;
                var r = this.record;
                SetResUpFormTitle(f);
                reservationLSIndicator();
                r.BUD = getBUDfromBID(r.rdBID);
                var y = new Date(r.DtStart);
                r.DtStart = dateFmtStr(y);
                var x = new Date(r.DtStop);
                r.DtStop = dateFmtStr(x);
                f.record.Nights = daysBetweenDates(x,y);
                pvtReservation.res = $.extend(true, {}, r ); // deep copy
                pvtReservation.locked = true; // lock it by default
                pvtReservation.modified = false;
                pvtReservation.datesValid = true;
                f.get("PGName").options.url = '/v1/transactantsdettd/' + getCurrentBID();
            };
        },
        onRender: function(event) {
            setResUpdateRecordForUI(this);
            this.get("PGName").options.url = '/v1/transactantsdettd/' + getCurrentBID();
        },
        onRefresh: function(event) {
            SetResUpFormTitle(this);
            setResUpdateRecordForUI(this);
            showReservationRentable();
            reservationLSIndicator();
            this.get("PGName").options.url = '/v1/transactantsdettd/' + getCurrentBID();
        },
        onChange: function(event) {
            event.onComplete = function() {
                var x,y;
                var f = this;
                var r = f.record;
                var draw=false;
                var check=false;
                var extend=true;
                // console.log('event.target = ' + event.target);
                switch (event.target) {
                case "DtStart":
                    x = new Date(event.value_new);
                    y = new Date(r.DtStop);
                    x.setDate(x.getDate() + r.Nights);
                    r.DtStop = w2uiDateControlString(x);
                    draw = true;
                    extend = false; // must be selected from avalability list
                    check = true;
                    pvtReservation.datesValid = false;
                    break;
                case "DtStop":
                    x = new Date(event.value_new);
                    y = new Date(r.DtStart);
                    if (x <= y) {
                        x.setDate(x.getDate() - r.Nights);
                        r.DtStart = w2uiDateControlString(x);
                    }
                    x = new Date(r.DtStart);
                    y = new Date(r.DtStop);
                    r.Nights = daysBetweenDates(x,y);
                    draw = true;
                    extend = false; // must be selected from avalability list
                    check = true;
                    pvtReservation.datesValid = false;
                    break;
                case "Nights":
                    x = new Date(r.DtStart);
                    r.DtStart = w2uiDateControlString(x); // not sure why, but r.DtStart gets reformated
                    // y = new Date(r.DtStop);
                    x.setDate(x.getDate() + event.value_new);
                    r.DtStop = w2uiDateControlString(x);
                    draw = true;
                    extend = false; // must be selected from avalability list
                    check = true;
                    pvtReservation.datesValid = false;
                    break;
                case "rdRTID":
                    check = true;
                    pvtReservation.datesValid = false;
                    break;
                }
                //-----------------------------------------------------------------------
                // If the reservation is unlocked, copy info into  pvtReservation.res.
                // Exception:  if rdRTID was set to "any type"
                //-----------------------------------------------------------------------
                if (extend && !pvtReservation.locked && (event.target != "rdRTID" || (event.target == "rdRTID" && r.rdRTID > 0))) {
                    pvtReservation.res = $.extend(true,{},r);
                    showReservationRentable();
                }
                if (draw) {
                    f.refresh();
                }
                if (check) {
                    checkRentableAvailability();
                }
            };
        },
        onSubmit: function(target, data) {
            delete data.postData.record.LastModTime;
            delete data.postData.record.LastModBy;
            delete data.postData.record.CreateTS;
            delete data.postData.record.CreateBy;
            // modify form data for server request
            //getFormSubmitData(data.postData.record);
        },
    });
    //------------------------------------------------------------------------
    //    availabilityGrid
    //
    //                top    = resUpdateForm
    //    >>>>>>>>>   main   = availabilityGrid    <<<<<<<<<<<
    //                bottom = resUpFormBtns
    //------------------------------------------------------------------------
    $().w2grid({
        name: 'availabilityGrid',
        header: 'Rentables Available',
        multiSelect: false,
        show: {
            toolbar         : false,
            footer          : false,
            header          : true,
            toolbarAdd      : false,   // indicates if toolbar add new button is visible
            toolbarDelete   : false,   // indicates if toolbar delete button is visible
            toolbarSave     : false,   // indicates if toolbar save button is visible
            selectColumn    : false,
            expandColumn    : false,
            toolbarEdit     : false,
            toolbarSearch   : false,
            toolbarInput    : false,
            searchAll       : false,
            toolbarReload   : false,
            toolbarColumns  : false,
        },
        columns: [
            {field: 'recid',        caption: 'recid',              size: '40px',  hidden: true,  sortable: true },
            {field: 'BID',          caption: 'BID',                size: '60px',  hidden: true,  sortable: true, style: 'text-align: right'},
            {field: 'RID',          caption: 'RID',                size: '45px',  hidden: false, sortable: true, style: 'text-align: right'},
            {field: 'RentableName', caption: app.sRentable,        size: '150px', hidden: false, sortable: true, style: 'text-align: left'},
            {field: 'RTID',         caption: 'RTID',               size: '150px', hidden: false,  sortable: false,
                render: function(record/*, index, col_index*/) {
                    return getRTName(record.RTID);
                },
            },
            {field: 'DtStart',      caption: 'Check in',            size: '90px',  hidden: false, sortable: true, style: 'text-align: right',
                render: function(record/*, index, col_index*/) { return w2uiDateControlString(new stringToDate(record.DtStart)); },
            },
            {field: 'DtStop',       caption: 'Check out',             size: '90px',  hidden: false, sortable: true, style: 'text-align: right',
                render: function(record/*, index, col_index*/) { return w2uiDateControlString(new stringToDate(record.DtStop)); },
            },
            {
                field: 'Book',
                caption: "Book it",
                size: '55px',
                style: 'text-align: center',
                render: function (record/*, index, col_index*/) {
                    // SPECIAL CHECK FOR THIS REMOVE BUTTON
                    var html = "";
                    if (record.RID && record.RID > 0) {
                        html = '<i class="far fa-calendar-check fa-lg" style="color: #2A64A4; cursor: pointer;" title="make reservation"></i>';
                    }
                    return html;
                },
            }
        ],
        onClick: function(event) {
            event.onComplete = function () {
                var rec = w2ui.availabilityGrid.get(event.recid);
                // console.log('book RID = ' + rec.RID);
                var f = w2ui.resUpdateForm;
                var r = f.record;
                r.RID = rec.RID;
                r.RTID = rec.RTID;
                r.rdRTID = rec.RTID;
                r.RentableName = rec.RentableName;
                if (!pvtReservation.locked) {
                    pvtReservation.res = $.extend(true,{},r); // it's unlocked, copy to reservation
                    pvtReservation.modified = true;
                }
                showReservationRentable();
                f.refresh();
                return;
            };
        },
        onRequest: function(/*event*/) {
            w2ui.expenseGrid.postData = {searchDtStart: app.D1, searchDtStop: app.D2};
        },
        onRefresh: function(event) {
            event.onComplete = function() {
                if (app.active_grid == this.name) {
                    if (app.new_form_rec) {
                        this.selectNone();
                    }
                    else{
                        this.select(app.last.grid_sel_recid);
                    }
                }

                // if (event.target == 'monthfwd') {  // we do these tasks after monthfwd is refreshed so we know that the 2 date controls exist
                //     setDateControlsInToolbar('asms');
                //     w2ui.expenseGrid.postData = {searchDtStart: app.D1, searchDtStop: app.D2};
                // }
            };
        }
    });

    //------------------------------------------------------------------------
    //    resUpFormBtns
    //
    //                top    = resUpdateForm
    //                main   = availabilityGrid
    //    >>>>>>>>>   bottom = resUpFormBtns      <<<<<<<<<
    //------------------------------------------------------------------------
    $().w2form({
        name: 'resUpFormBtns',
        style: 'border: 0px; background-color: transparent;',
        formURL: '/webclient/html/formresupbtns.html',
        url: '',
        fields: [],
        actions: {
            save: function () {
                console.log("Book this res!");
                var BID = getCurrentBID();
                var BUD = getBUDfromBID(BID);
                var f = w2ui.resUpdateForm;
                var r = f.record;
                var rtid = r.rdRTID.id;
                r.LeaseStatus = 2; // 2 = Reserved
                r.rdRTID = rtid;
                if (typeof r.RID === "undefined") {
                    r.RID = 0;
                }

                if (r.RID == 0) {
                    f.error("You must select a specific " + app.sRentable);
                    return;
                }
                f.url = '/v1/reservation/' + BID + '/' + r.RLID;
                var d1 = applyLocaltimeDateOffset(new Date(r.DtStart));
                var d2 = applyLocaltimeDateOffset(new Date(r.DtStop));

                var res = $.extend(true,{},r);
                    res.DtStart = d1.toUTCString();
                    res.DtStop = d2.toUTCString();
                    res.rdRTID = rtid;
                var params = {cmd: "save", record: res};
                var dat = JSON.stringify(params);

                $.post(f.url, dat, null, "json")
                .done(function(data) {
                    if (data.status === "error") {
                        f.error(w2utils.lang(data.message));
                        return;
                    }
                    // closeResUpdateDialog();
                    // reload updated info...
                    w2ui.availabilityGrid.clear(); // remove any contents from prior checks
                    w2ui.availabilityGrid.url = '';
                    var url = '/v1/reservation/' + BID + '/' + data.recid;
                    setToForm('resUpdateForm',url,formWidth,true,w2ui.resFormLayout);
                })
                .fail(function(/*data*/){
                    f.error("Save Reservation failed.");
                    return;
                });
            },

            saveadd: function () {
                // saveRentableCore(finishRentableSaveAdd);
            }
        },
        onRefresh: function(event) {
            event.onComplete = function() {
                ResUpSetSaveButton();
            };
        },
    });
};


//---------------------------------------------------------------------------------
// showReservationRentable - use the supplied record on the resUpdateForm
//     as the rentable to use for this reservation. It always show
//     pvtReservation.res
//
// @params
//
// @return
//
//---------------------------------------------------------------------------------
window.showReservationRentable = function() {
    var r = pvtReservation.res;
    var s = '[ no rentable selected ]';
    feedbackMessage("reservationRentableName", (r.RID > 0 || r.RentableName.length > 0 ) ? r.RentableName : s);
    feedbackMessage("reservationRentableType", (typeof r.rdRTID  != undefined) ?getRTName(r.rdRTID) : '');

    s = r.ConfirmationCode;
    s += pvtReservation.modified ? '&nbsp;&nbsp; (will be changed on Save)' : '';
    feedbackMessage("resConfirmationCode",s);

    s  = '<button onclick="toggleReservationLock();" class="w2ui-btn">&nbsp;<i class="fas fa-lock';
    s += pvtReservation.locked ? '' : '-open';
    s += ' fa-2x" style="color:';
    s += pvtReservation.locked ? 'red' : 'green';
    s += ';"></i>&nbsp;</button>';
    feedbackMessage("rrReservationLock", s);

    var d1 = new Date(r.DtStart);
    var d2 = new Date(r.DtStop);
    feedbackMessage("reservationCheckIn", w2uiDateControlString(d1));
    feedbackMessage("reservationCheckOut", w2uiDateControlString(d2));

    feedbackMessage("resFirstName",r.FirstName);
    feedbackMessage("resLastName",r.LastName);
    feedbackMessage("resPhone",r.Phone);
    feedbackMessage("resEmail",r.Email);
    feedbackMessage("resStreet",r.Street);
    feedbackMessage("resCity",r.City);
    feedbackMessage("resState",r.State);
    feedbackMessage("resPostalCode",r.PostalCode);
    feedbackMessage("resComment",r.Comment);
    feedbackMessage("reservationCCType",r.CCType);
    feedbackMessage("reservationCCNumber",r.CCNumber);
    feedbackMessage("reservationCCName",r.CCName);
    feedbackMessage("reservationCCExpMonth",r.CCExpMonth);
    feedbackMessage("reservationCCExpYear",r.CCExpYear);

    feedbackMessage("reservationBaseRate", '<span style="position:relative; top:4;">$' + number_format(r.Amount,2)+"</span>" );
    feedbackMessage("reservationRateDiscounts", '$' + number_format(r.Discount,2) );

};

//---------------------------------------------------------------------------------
// toggleReservationLock - locks the reservation if it is unlocked. Unlocks it
//      if it is locked.
//
// @params
//
// @return
//
//---------------------------------------------------------------------------------
window.toggleReservationLock = function () {
    pvtReservation.locked = !pvtReservation.locked;
    if (!pvtReservation.locked) {
        var RID = pvtReservation.res.RID;
        var rdRTID = pvtReservation.res.rdRTID;
        var DtStart = pvtReservation.res.DtStart;
        var DtStop = pvtReservation.res.DtStop;
        pvtReservation.res = $.extend(true,{},w2ui.resUpdateForm.record);

        //-----------------------------------------------------------------
        // If reservation date/rid/rtid info is in unknown state
        // then set to the best known good info possible...
        //-----------------------------------------------------------------
        if (typeof w2ui.resUpdateForm.record.rdRTID == "object") {
            var x = w2ui.resUpdateForm.record.rdRTID.id;
            pvtReservation.res.rdRTID = x;
        }
        if (!pvtReservation.datesValid) {
            pvtReservation.res.RID = RID;
            pvtReservation.res.rdRTID = rdRTID;
            pvtReservation.res.DtStart = DtStart;
            pvtReservation.res.DtStop = DtStop;
        }
    }
    showReservationRentable();
};
//---------------------------------------------------------------------------------
// setResUpdateRecordForUI - changes the main view of the program to the
//                        Reservations form
//
// @params
//      f = the form
// @return
//
//---------------------------------------------------------------------------------
window.setResUpdateRecordForUI = function (f) {
    var r = f.record;
    var BID = getCurrentBID();
    var BUD = getBUDfromBID(BID);
    if (typeof f.get('rdRTID').options != "undefined") {
        f.get('rdRTID').options.items = app.rt_list[BUD];
    }
    if (typeof f.get('BUD').options != "undefined") {
        f.get('BUD').options.items = app.businesses;
    }
};

//---------------------------------------------------------------------------------
// checkRentableAvailability - pull together the info in the form, make a query
//     to the server to see what's available.
//
// @params
//     f = the form
// @return
//
//---------------------------------------------------------------------------------
window.checkRentableAvailability = function() {
    var BID = getCurrentBID();
    var BUD = getBUDfromBID(BID);
    var f = w2ui.resUpdateForm;
    var r = f.record;
    var dtStart = (typeof(r.DtStart) == "string") ? new Date(r.DtStart) : r.DtStart;
    var dtStop = (typeof(r.DtStop) == "string") ? new Date(r.DtStop) : r.DtStop;
    var req = {
        recid:          0,
        BID:            BID,
        BUD:            BUD,
        RTID:           r.rdRTID.id,
        Nights:         r.Nights,
        DtStart:        dtStart.toUTCString(),
        DtStop:         dtStop.toUTCString(),
    };
    w2ui.availabilityGrid.postData.record = req;
    w2ui.availabilityGrid.url = '/v1/available/'+BID;
    w2ui.availabilityGrid.reload();
    w2ui.availabilityGrid.header = 'Rentables (' + r.rdRTID.text + ') available ' + w2uiDateControlString(dtStart) + ' - ' + w2uiDateControlString(dtStop);
};

//---------------------------------------------------------------------------------
// getRTName - search for and return the rentable type name. return an empty string
//     if not found.
//
// @params
//     RTID = the RenttableType ID
//
// @return
//     the rentable type name or '' if not found
//---------------------------------------------------------------------------------
window.getRTName = function(RTID) {
    var BUD = getBUDfromBID(getCurrentBID());
    for (var i = 0; i < app.rt_list[BUD].length; i++) {
        if (app.rt_list[BUD][i].id == RTID) {
            return app.rt_list[BUD][i].text;
        }
    }
    return '';
};

//---------------------------------------------------------------------------------
// cancelReservation - cancel the supplied RLID
//
// @params
//     RLID = the Reservation ID
//
// @return
//
//---------------------------------------------------------------------------------
window.cancelReservation = function(RLID) {
    // console.log("cancel RLID = " + RLID);
    var rtF = w2ui.resUpdateForm;

    // extend rest of the options
    var dlg_options = $.extend(true, {}, delete_confirm_options);
    dlg_options.msg = "<p>Are you sure you want to cancel this reservation?</p>";

    // confirm before deactivate
    w2confirm(dlg_options)
    .yes(function() {
        var rtG = w2ui.resUpdateForm;
        var rec = rtF.record;
        var RTID = rec.rdRTID.id;
        rec.rdRTID = RTID;
        var params = {cmd: 'delete', formname: rtF.resUpdateForm, record: rec };
        var dat = JSON.stringify(params);
        var url = '/v1/reservation/1/' + rtF.record.RLID;

        // deactivate rentable type request
        $.post(url, dat, null, "json")
        .done(function(data) {
            if (data.status === "error") {
                return;
            }

            w2ui.toplayout.hide('right',true);
            w2ui.resUpdateGrid.render();
        })
        .fail(function(data){
            rtF.error("Failed to cancel reservation: " + data);
            return;
        });
    })
    .no(function() {
        return;
    });

};

//---------------------------------------------------------------------------------
// checkIn - check in the supplied RLID
//
// @params
//     RLID = the Reservation ID
//
// encodeRequest '{"cmd":"get","selected":[],"limit":100,"offset":0,"record":{"recid":0,"BID":1,"BUD":"REX","RLID":34,"TZOffset":420}}'
// dojsonPOST "http://localhost:8270/v1/checkin/1/34" "request" "${TFILES}0"  "checkIn-reservation"

// @return
//
//---------------------------------------------------------------------------------
window.checkIn = function(RLID) {
    console.log("CheckIn RLID = " + RLID);
    var rtF = w2ui.resUpdateForm;
    var dt = new Date();
    var rec = {
        TZOffset: dt.getTimezoneOffset(),
    };
    // if (typeof rec.rdRTID != "undefined") {
    //     if (typeof rec.rdRTID.id != "undefined") {
    //         var RTID = rec.rdRTID.id;
    //         rec.rdRTID = RTID;
    //     }
    // }
    var params = {cmd: 'get', formname: rtF.resUpdateForm, record: rec };
    var dat = JSON.stringify(params);
    var url = '/v1/checkin/1/' + rtF.record.RLID;

    // deactivate rentable type request
    $.post(url, dat, null, "json")
    .done(function(data) {
        if (data.status === "error") {
            rtF.error("Failed to checkin reservation: " + data.message);
            return;
        }
        w2ui.toplayout.hide('right',true);
        w2ui.resUpdateGrid.render();
        var rec  = rtF.record;
        var name = rec.IsCompany ? rec.CompanyName : rec.FirstName + " " + rec.LastName;
        w2popup.open({
            title: "Check-in Successful",
            body: '<div class="w2ui-centered">Successfully checked in ' + name + '<br>Check In: ' + rec.DtStart + '<br>Check Out: ' + rec.DtStop,
        });
    })
    .fail(function(data){
        rtF.error("Failed to checkin reservation: " + data.message);
        return;
    });
};

//---------------------------------------------------------------------------------
// checkOut - check in the supplied RLID
//
// @params
//     RLID = the Reservation ID
//
// @return
//
//---------------------------------------------------------------------------------
window.checkOut = function(RLID) {
    console.log("cancel RLID = " + RLID);
};

//---------------------------------------------------------------------------------
// closeResUpdateDialog - closes the form
//
// @params
//
// @return
//
//---------------------------------------------------------------------------------
window.closeResUpdateDialog = function() {
    w2ui.toplayout.hide('right',true);
    w2ui.resUpdateGrid.render();
};
