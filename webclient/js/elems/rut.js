/*global
    setDefaultFormFieldAsPreviousRecord, w2uiDateControlString, $, w2ui, app, getCurrentBusiness, parseInt, getBUDfromBID,
    getRentableTypes, setToForm, form_dirty_alert, console, getFormSubmitData, addDateNavToToolbar, setRentableLayout,
    getRentableInitRecord, saveRentableUseType, RentableEdits, addRentableUseType,
    w2uiDateTimeControlString,
*/
/*jshint esversion: 6 */

"use strict";

// buildRentableUseTypeElements - builds the Use Type interface elements
//---------------------------------------------------------------------------
window.buildRentableUseTypeElements = function () {
    //------------------------------------------------------------------------
    //          rentable Use Type Grid
    //------------------------------------------------------------------------
    $().w2grid({
        name: 'rentableUseTypeGrid',
        style: 'padding: 0px',
        // url: '/v1/rentableusetype',
        url: '',
        show: {
            header: false,
            toolbar: true,
            toolbarReload: false,
            toolbarColumns: false,
            toolbarSearch: true,
            toolbarAdd: true,
            toolbarDelete: false,
            toolbarSave: false,
            searchAll: true,
            footer: true,
            lineNumbers: false,
            selectColumn: false,
            expandColumn: false
        },
        columns: [
            {field: 'recid', caption: 'recid', hidden: true},
            {field: 'RID', caption: 'RID', hidden: true},
            {field: 'BID', caption: 'BID', hidden: true},
            {field: 'BUD', caption: 'BUD', hidden: true},
            {field: 'UTID', caption: 'UTID', size: '50px'},
            {
                field: 'UseType', caption: 'Use Type', size: '150px',
                editable: {type: 'select', align: 'left', items: app.RSUseTypeItems},
                render: function (record, index, col_index) {
                    var html = '';
                    for (var s in app.RSUseTypeItems) {
                        if (app.RSUseTypeItems[s].id == this.getCellValue(index, col_index)) {
                            html = app.RSUseTypeItems[s].text;
                        }
                    }
                    return html;
                },
            },
            {field: 'DtStart',   caption: 'DtStart',   size: "50%", sortable: true, style: 'text-align: right', editable: {type: 'date'}},
            {field: 'DtStop',    caption: 'DtStop',    size: "50%", sortable: true, style: 'text-align: right', editable: {type: 'date'}},
            {field: 'CreateBy',  caption: 'CreateBy',  hidden: true},
            {field: 'LastModBy', caption: 'LastModBy', hidden: true},
        ],
        onAdd: function (/*event*/) {
            addRentableUseType();
        },
        onLoad: function (event) {
            event.onComplete = function () {
                //------------------------------------------------------------------------
                // We need the URL to be active in case virtual scrolling is needed.
                // We will turn off the url when a local save is completed.
                //------------------------------------------------------------------------
                var BID = getCurrentBID();
                var RID = w2ui.rentableForm.record.RID;
                this.url = '/v1/rentableusetype/'+BID+'/'+RID;
                RentableEdits.UseTypeDataLoaded = true;
            };
        },
        onSave: function (event) {
            //------------------------------------------------------------------
            // Grid changes are saved locally. So we want no url when this funct
            // gets called due to a grid change. After the local save is complete
            // we put the url back so that if the virtual scrolling needs to call
            // the server it can.  The full save to disk is done when the user
            // presses the Save button, which is handled by a different function.
            //------------------------------------------------------------------
            this.url = '';  // no url for local save in the grid
            event.onComplete = function() { // see the onLoad comment ...
                var BID = getCurrentBID();
                var RID = w2ui.rentableForm.record.RID;
                this.url = '/v1/rentableusetype/'+BID+'/'+RID;
            };
        },
        onChange: function (event) {
            var g = this;
            var field = g.columns[event.column].field;
            var chgRec = g.get(event.recid);
            var changeIsValid = true;

            //------------------------------------
            // Put any validation checks here...
            //------------------------------------
            if (event.value_new == "" && (g.columns[event.column].field == "DtStop" || g.columns[event.column].field == "DtStart")) {
                changeIsValid = false;
            }

            //------------------------------------
            // DtStart must be prior to DtStop...
            //------------------------------------
            var DtStart, DtStop;
            if (field == "DtStop") {
                DtStart = new Date(g.records[event.index].DtStart);
                DtStop = new Date(event.value_new);
                if (DtStart > DtStop) {
                    changeIsValid = false;
                    g.error("DtStop date must be after DtStart. DtStop has been reset to its previous value.");
                }
            } else {
                DtStart = new Date(event.value_new);
                DtStop = new Date(g.records[event.index].DtStop);
                if (DtStart > DtStop) {
                    changeIsValid = false;
                    g.error("DtStart date must be before DtStop. DtStart has been reset to its previous value.");
                }
            }

            //---------------------------------------------------
            // Inform w2ui if the change is cancelled or not...
            //---------------------------------------------------
            event.isCancelled = !changeIsValid;

            event.onComplete = function () {
                //-------------------------------------------------------------------
                // 2/19/2019 sman - This save is used to save the data into the
                // grid's records.  We need to ensure that the grids URL is ''
                //-------------------------------------------------------------------
                if (!event.isCancelled) { // if event not cancelled then invoke save method
                    RentableEdits.UseTypeChgList.push({index: event.index, ID: g.records[event.index].UTID});
                    g.url = '';  // just ensure that no server service is called
                    this.save(); // save automatically locally
                }
            };
        }
    });
};

// saveRentableUseType - creates a list of UseType entries that have
// been changed, then calls the webservice to save them.
//---------------------------------------------------------------------------
window.saveRentableUseType = function(BID,RID) {
    var list = [];
    var i;

    //------------------------------------------------
    // Build a list of IDs. that were edited...
    //------------------------------------------------
    for (i = 0; i < RentableEdits.UseTypeChgList.length; i++) {
        list[i] = RentableEdits.UseTypeChgList[i].ID;
    }

    //------------------------------------------------
    // Filter the list to the unique members...
    //------------------------------------------------
    var reclist = Array.from(new Set(list));

    //------------------------------------------------
    // If there's nothing in the list, we're done.
    // Set the promise to resolved and return.
    //------------------------------------------------
    if (reclist.length == 0) {
        return Promise.resolve('{"status": "success"}');
    }

    //------------------------------------------------
    // Find the records for each ID
    //------------------------------------------------
    var chgrec = [];
    var index = -1;
    var grid = w2ui.rentableUseTypeGrid;
    for (i = 0; i < reclist.length; i++) {
        //------------------------------------------------------------
        // reclist[i] is the id of the element we wnat to find...
        //------------------------------------------------------------
        for (var j = 0; j < grid.records.length; j++ ) {
            if (grid.records[j].UTID == reclist[i]) {
                index = j;
                break;
            }
        }
        //------------------------------------------------------------
        // if the ID could not be found resolve promis with an
        // error message.
        //------------------------------------------------------------
        if (index < 0) {
            var s='ERROR: could not find UTID = '+reclist[i];
            w2ui.rentablesGrid.error(s);  // place an error where we will be sure to see it
            return Promise.resolve('{"status": "error", "message": s}');
        }

        //------------------------------------------------------------
        //  This is the record we need to save.  Make any last-min
        //  changes...
        //------------------------------------------------------------
        var nrec = grid.records[index];
        if (typeof nrec.UseType == "string") {
            var ls = parseInt(nrec.UseType,10);
            nrec.UseType = ls;
        }
        if (nrec.UTID < 0) {
            nrec.UTID = 0;  // server needs UTID = 0 for new records
        }
        chgrec.push(nrec);
    }

    //------------------------------------------------------------
    //  Save the list of chgrecs to the server...
    //------------------------------------------------------------
    var params = {
        cmd: "save",
        selected: [],
        limit: 0,
        offset: 0,
        changes: chgrec,
        RID: w2ui.rentableForm.record.RID
    };

    var dat = JSON.stringify(params);
    var url = '/v1/rentableusetype/' + BID + '/' + w2ui.rentableForm.record.RID;

    return $.post(url, dat, null, "json")
    .done(function(data) {
        if (data.status === "success") {
            //------------------------------------------------------------------
            // Now that the save is complete, we can add the URL back to the
            // the grid so it can call the server to get updated rows. The
            // onLoad handler will reset the url to '' after the load completes
            // so that changes are done locally to gthe grid until the
            // rentableForm save button is clicked.
            //------------------------------------------------------------------
            RentableEdits.UseTypeChgList = []; // reset the change list now, because we've saved them
            w2ui.rentableUseTypeGrid.url = url;
        } else {
            w2ui.rentablesGrid.error('saveRentableUseType: ' + data.message);
        }
    })
    .fail(function(data){
        w2ui.rentablesGrid.error("Save RentableUseType failed." + data);
    });
};

// addRentableUseType - creates a new RentableUseType entry and adds it
// to the grid.
//
// @params
//
// @return
//---------------------------------------------------------------------------
window.addRentableUseType = function (/*event*/) {
    var BID = getCurrentBID();
    var BUD = getBUDfromBID(BID);
    var fr = w2ui.rentableForm.record;
    var g = w2ui.rentableUseTypeGrid;
    var ndStart;
    var basedOnListDate = false;

    //------------------------------------------------------------------------
    // Find lastest date among all market rate object's stopDate for new MR's
    // StartDate
    //------------------------------------------------------------------------
    if (g.records.length === 0) {
        ndStart = new Date();
    } else {
        basedOnListDate = true;
        g.records.forEach(function (rec) {
            if (ndStart === undefined) {
                ndStart = new Date(rec.DtStop);
            }
            if (rec.DtStop) {
                var rdStop = new Date(rec.DtStop);
                if (ndStart < rdStop) {
                    ndStart = rdStop;
                }
            }
        });
    }

    var newRec = {
        recid: g.records.length,
        BID: BID,
        BUD: BUD,
        RID: fr.RID,
        UTID: RentableEdits.UTID,
        UseType: 100,
        DtStart: dateFmtStr(ndStart),
        DtStop: "12/31/9999"
    };
    --RentableEdits.UTID;

    //------------------------------------------------------------------------
    // EDI does not apply to Use Status -- which is a datetime.  EDIT applies
    // to date-only Fields
    //------------------------------------------------------------------------
    if (EDIEnabledForBUD(BUD)) {
        if (basedOnListDate) {
            var d = ndStart;
            d.setDate(d.getDate()+1);
            newRec.DtStart = dateFmtStr(d);
        }
        newRec.DtStop = "12/30/9999";
    }
    var d1 = new Date(newRec.DtStart);
    var d2 = new Date(newRec.DtStop);
    if (d1 > d2) {
        newRec.DtStart = dateFmtStr(d1);
    }
    RentableEdits.UseTypeChgList.push({index: 0, ID: newRec.UTID});
    g.add(newRec,true); // the boolean forces the new row to be added at the top of the grid
};
