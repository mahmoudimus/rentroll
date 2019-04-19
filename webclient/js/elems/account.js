/*global
    $, console, w2ui, w2confirm, app, getBUDfromBID, getCurrentBusiness, getParentAccounts,
    setToForm, form_dirty_alert, formRecDiffer, getFormSubmitData, delete_confirm_options,
    w2utils, formRefreshCallBack, setDefaultFormFieldAsPreviousRecord, exportGLAccounts, popupImportFileDialog,
    getAccountInitRecord, computeAmountRemaining, getARRulesInitRecord, renderReversalIcon, getBusinessAssessmentRules,
    getAsmsInitRecord, popupAsmRevMode, asmFormRASelect, updateGridPostDataDates,
    iafMessage,updateBUDFormList,

*/
"use strict";

window.getAccountInitRecord = function (BID, BUD, previousFormRecord){
    var y = new Date();

    var defaultFormData = {
        recid: 0,
        LID: 0,
        PLID: 0,
        BID: BID,
        BUD: BUD,
        RAID: 0,
        TCID: 0,
        GLNumber: '',
        Name: '',
        AcctType: '',
        // AllowPost: true,
        IsActive: 0, // 1<<0: 0=active, 1=inactive
        Description: '',
        LastModTime: y.toISOString(),
        LastModBy: 0,
    };

    // if it called after 'save and add another' action there previous form record is passed as Object
    // else it is null
    // if ( previousFormRecord ) {
    //     defaultFormData = setDefaultFormFieldAsPreviousRecord(
    //         [ 'Description'], // Fields to Reset
    //         defaultFormData,
    //         previousFormRecord
    //     );
    // }

    return defaultFormData;
};


window.buildAccountElements = function() {

    //------------------------------------------------------------------------
    //          accountsGrid
    //------------------------------------------------------------------------
    $().w2grid({
        name: 'accountsGrid',
        url: '/v1/GLAccounts',
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
            toolbarSearch   : false,
            toolbarInput    : true,
            searchAll       : false,
            toolbarReload   : true,
            toolbarColumns  : true,
        },
        toolbar: {
            items: [
                { type: 'break' },
                { type: 'button', id: 'export', caption: 'Export', icon: 'fas fa-download' },
                { type: 'button', id: 'import', caption: 'Import', icon: 'fas fa-upload' }
            ],
            onClick: function(event) {
                event.onComplete = function() {
                    // export function
                    if(event.target == "export") {
                        exportGLAccounts();
                    }

                    // import function
                    if(event.target == "import") {
                        popupImportFileDialog();
                    }
                };
            }
        },
        columns: [
            {field: 'recid',    caption: 'recid',     size: '80px', sortable: false, hidden: true},
            {field: 'LID',      caption: 'LID',       size: '50px', sortable: false, hidden: true},
            {field: 'PLID',     caption: 'PLID',      size: '50px', sortable: false, hidden: true},
            {field: 'BID',      caption: 'BID',       size: '40px', sortable: false, hidden: true},
            {field: 'GLNumber', caption: 'GL Number', size: '100px', sortable: true},
            {field: 'Name',     caption: 'Name',      size: '450px', sortable: true},
            {field: 'IsActive', caption: 'Is Active',    size: '90px', sortable: true,
                render: function (record/*, index, col_index*/) {
                    if (typeof record === "undefined") {
                        return;
                    }
                    var html = "No";
                    if (record.IsActive) {
                        html = "Yes";
                    }
                    return html;
                },
            },
            {field: 'AcctType', caption: 'AcctType', size: '150px', sortable: true},
        ],
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
        },
        onClick: function(event) {
            event.onComplete = function() {
                var yes_args = [this, event.recid],
                    no_args = [this],
                    no_callBack = function(grid) {
                        grid.select(app.last.grid_sel_recid);
                        return false;
                    },
                    yes_callBack = function(grid, recid) {
                        app.last.grid_sel_recid = parseInt(recid);

                        // keep highlighting current row in any case
                        grid.select(app.last.grid_sel_recid);

                        var x = getCurrentBusiness();
                        var BID=parseInt(x.value);
                        var BUD = getBUDfromBID(BID);
                        var rec = grid.get(recid);

                        // get latest gl accounts first
                        getParentAccounts(rec.BID, rec.LID)
                        .done(function(data) {
                            if (data.status != 'success') {
                                w2ui.accountForm.message(data.message);
                                w2ui.toplayout.content('right', w2ui.accountForm);
                                w2ui.toplayout.show('right', true);
                                w2ui.toplayout.sizeTo('right', 700);
                                return;
                            }
                            else {
                                w2ui.accountForm.get("PLID").options.items = app.parent_accounts[BUD];
                                updateBUDFormList(w2ui.accountForm);
                                setToForm('accountForm', '/v1/account/' + rec.BID + '/' + rec.LID, 400, true);
                            }
                        })
                        .fail(function(/*data*/) {
                            console.log("unable to get gl accounts list");
                            return;
                        });
                    };

                // warn user if form content has been changed
                form_dirty_alert(yes_callBack, no_callBack, yes_args, no_args);
            };
        },
        onAdd: function (/*event*/) {
            var yes_args = [this],
                no_callBack = function() {
                    return false;
                },
                yes_callBack = function(grid) {
                    // reset grid sel recid
                    app.last.grid_sel_recid = -1;
                    grid.selectNone();

                    var x = getCurrentBusiness();
                    var BID=parseInt(x.value);
                    var BUD = getBUDfromBID(BID);
                    getParentAccounts(BID, 0)
                   .done(function(data) {
                        if (data.status != 'success') {
                            w2ui.accountForm.message(data.message);
                            w2ui.toplayout.content('right', w2ui.accountForm);
                            w2ui.toplayout.show('right', true);
                            w2ui.toplayout.sizeTo('right', 700);
                            return;
                        } else {
                            var record = getAccountInitRecord(BID, BUD, null);
                            updateBUDFormList(w2ui.accountForm);
                            w2ui.accountForm.get("PLID").options.items = app.parent_accounts[BUD];
                            w2ui.accountForm.record = record;
                            // NOTE: even inside "setToForm", form is refreshing but header isn't updating,
                            // so need to call here once before
                            w2ui.accountForm.refresh();
                            setToForm('accountForm', '/v1/account/' + BID + '/0', 400);
                        }
                    })
                    .fail( function() {
                        console.log('unable to get GLAccounts');
                        return;
                    });
                };

                // warn user if form content has been changed
                form_dirty_alert(yes_callBack, no_callBack, yes_args);
        },
    });

    //------------------------------------------------------------------------
    //          Account Form
    //------------------------------------------------------------------------
    $().w2form({
        name: 'accountForm',
        header: 'Account Detail',
        url: '/v1/account',
        style: 'border: 0px; background-color: transparent;display: block;',
        formURL: '/webclient/html/formacct.html',
        fields: [
            { field: "recid",       required: false,    type: 'int',        html: { caption: "recid", page: 0, column: 0 } },
            { field: "LID",         required: false,    type: 'int',        html: { caption: "LID", page: 0, column: 0 } },
            { field: 'PLID',        required: false,    type: 'list',       options: { items: [], selected: {}, maxDropHeight: 200 } },
            { field: "BID",         required: false,    type: 'int',        html: { caption: "BID", page: 0, column: 0 } },
            { field: "BUD",         required: false,     type: 'list',       options: { items: app.businesses, maxDropHeight: 350 }, html: { caption: "BUD", page: 0, column: 0 } },
            { field: "RAID",        required: false,    type: 'int',        html: { caption: "RAID", page: 0, column: 0 } },
            { field: "TCID",        required: false,    type: 'int',        html: { caption: "TCID", page: 0, column: 0 } },
            { field: "GLNumber",    required: true,     type: 'text',       html: { caption: "GLNumber", page: 0, column: 0 } },
            { field: "Name",        required: true,     type: 'text',       html: { caption: "Name", page: 0, column: 0 } },
            { field: "AcctType",    required: true,     type: 'list',       options: { items: app.qbAcctType, selected: {}, maxDropHeight: 350 }, html: { caption: "Account Type", page: 0, column: 0 } },
            // { field: "AllowPost",   required: true,     type: 'checkbox',   html: { caption: "AllowPost", page: 0, column: 0 } },
            { field: 'IsActive',    required: true,     type: 'checkbox',   html: { page: 0, column: 0 } },
            { field: "Description", required: false,    type: 'text',       html: { caption: "Description", page: 0, column: 0 } },
            { field: "LastModTime", required: false,    type: 'time',       html: { caption: "LastModTime", page: 0, column: 0 } },
            { field: "LastModBy",   required: false,    type: 'int',        html: { caption: "LastModBy", page: 0, column: 0 } },
            { field: "CreateTS",    required: false,    type: 'time',       html: { caption: "LastModTime", page: 0, column: 0 } },
            { field: "CreateBy",    required: false,    type: 'int',        html: { caption: "LastModBy", page: 0, column: 0 } },
        ],
        toolbar: {
            items: [
                { id: 'btnNotes', type: 'button', icon: 'far fa-sticky-note' },
                { id: 'bt3', type: 'spacer' },
                { id: 'btnClose', type: 'button', icon: 'fas fa-times' },
            ],
            onClick: function(event) {
                switch(event.target) {
                    case 'btnClose':
                        var no_callBack = function() { return false; },
                            yes_callBack = function() {
                                w2ui.toplayout.hide('right',true);
                                w2ui.accountsGrid.render();
                            };
                        form_dirty_alert(yes_callBack, no_callBack);
                        break;
                }
            }
        },
        onChange: function(event) {
            event.onComplete = function() {
                // formRecDiffer: 1=current record, 2=original record, 3=diff object
                var diff = formRecDiffer(this.record, app.active_form_original, {});
                // if diff == {} then make dirty flag as false, else true
                if ($.isPlainObject(diff) && $.isEmptyObject(diff)) {
                    app.form_is_dirty = false;
                } else {
                    app.form_is_dirty = true;
                }
            };
        },
        onSubmit: function(target, data) {
            delete data.postData.record.LastModTime;
            delete data.postData.record.LastModBy;
            delete data.postData.record.CreateTS;
            delete data.postData.record.CreateBy;
            // modify form data for server request
            getFormSubmitData(data.postData.record);
            data.postData.record.IsActive = int_to_bool(data.postData.record.IsActive);
        },
        actions: {
            saveadd: function() {
                var f = this,
                    grid = w2ui.accountsGrid,
                    x = getCurrentBusiness(),
                    r = f.record,
                    BID=parseInt(x.value),
                    BUD=getBUDfromBID(BID);

                // clean dirty flag of form
                app.form_is_dirty = false;
                // clear the grid select recid
                app.last.grid_sel_recid  =-1;

                // select none if you're going to add new record
                grid.selectNone();

                f.save({}, function (data) {
                    if (data.status == 'error') {
                        console.log('ERROR: '+ data.message);
                        return;
                    }

                    f.get("PLID").options.selected = r.PLID[0];

                    // JUST RENDER THE GRID ONLY
                    grid.render();

                    // add new empty record and just refresh the form, don't need to do CLEAR form
                    var record = getAccountInitRecord(BID, BUD, f.record);

                    w2ui.accountForm.get("PLID").options.items = app.parent_accounts[BUD];
                    f.record = record;
                    f.header = "Edit Account Details (new)"; // have to provide header here, otherwise have to call refresh method twice to get this change in form
                    f.url = '/v1/account/' + BID+'/0/';
                    f.refresh();
                });
            },
            save: function() {
                var f = this,
                    tgrid = w2ui.accountsGrid;

                f.save({}, function (data) {
                    if (data.status == 'error') {
                        console.log('ERROR: '+ data.message);
                        return;
                    }
                    w2ui.toplayout.hide('right',true);
                    tgrid.render();
                });
            },
            delete: function() {

                var form = this;

                w2confirm(delete_confirm_options)
                .yes(function() {
                    var tgrid = w2ui.accountsGrid;
                    var params = {cmd: 'delete', formname: form.name, LID: form.record.LID };
                    var dat = JSON.stringify(params);

                    // delete Depository request
                    $.post(form.url, dat, null, "json")
                    .done(function(data) {
                        if (data.status === "error") {
                            form.error(w2utils.lang(data.message));
                            return;
                        }

                        w2ui.toplayout.hide('right',true);
                        tgrid.remove(app.last.grid_sel_recid);
                        tgrid.render();
                    })
                    .fail(function(/*data*/){
                        form.error("Delete Account failed.");
                        return;
                    });
                })
                .no(function() {
                    return;
                });
            },
        },
        onRefresh: function(event) {
            event.onComplete = function() {
                var f = w2ui.accountForm,
                    r = f.record,
                    BUD = getBUDfromBID(r.BID),
                    header = "Edit Account Details ({0})",
                    PLIDSel = {},
                    acctTypeSel = {};

                // PLID selected
                app.parent_accounts[BUD].forEach(function(item) {
                    if (r.PLID == item.id) {
                        $.extend(PLIDSel, item);
                    }
                });

                // accttype selected
                app.qbAcctType.forEach(function(item) {
                    if (r.AcctType == item) {
                        $.extend(acctTypeSel, {id: item, text: item});
                    }
                });

                // $("#accountForm").find('input[name=PLID]').data("selected", PLIDSel).change();
                // Reference: http://jsfiddle.net/vtoah4t5/7/
                // $("#accountForm").find('input[name=PLID]').w2field('list',{
                //     items: PLIDList,
                //     selected: PLIDSel,
                // }).data("selected", PLIDSel).change();

                f.get("PLID").options.selected = PLIDSel;
                f.get("AcctType").options.selected = acctTypeSel;

                formRefreshCallBack(f, "LID", header);
            };
        },
    });

};

// exportGLAccounts downloads csv file containing all accounts info
window.exportGLAccounts = function () {
    var x = getCurrentBusiness(),
        BID=parseInt(x.value);

    var downloadURL = "/v1/exportaccounts/" + BID + "/";
    $.ajax({
        url: downloadURL,
        type: 'GET',
        success: function() {
            downloadMediaFromURL(downloadURL);
        }
    });
};

// popupImportFileDialog invoked when user wants to import file of accounts
window.popupImportFileDialog = function () {

//class="w2ui-select"
    var BizSelHTML = '<select id="importGLAcctsBizSel" style="cursor: default; width: 100%; outline: none; opacity: 1; margin: 0px; border: 1px solid transparent; padding: 4px 4px 4px 0px;">';
    for (var i = 0; i < app.BizMap.length; i++) {
        var BUD = app.BizMap[i].BUD;
        BizSelHTML += '<option value="' + BUD + '">' + BUD + '</option>';
    }
    BizSelHTML += '</select>';

    w2popup.open({
        title     : 'Import Accounts',
        body      : '<div class="w2ui-centered">' +
            '<div class="w2ui-field"><label>GLAccounts file: </label><div><input type="file" name="acct_import_file" class="w2ui-input" style="cursor: default; width: 100%; outline: none; opacity: 1; margin: 0px; border: 1px solid transparent; padding: 4px 4px 4px 0px; background-color: transparent;" /></div></div>' +
//            '<div class="w2ui-field"><label>Business Unit: </label><div>' + BizSelHTML + '</div></div>' +
            '</div>',
        buttons   : '<button class="w2ui-btn" onclick="importAccountsFile();" >Import</button>',
        width     : 500,
        height    : 300,
        overflow  : 'hidden',
        color     : '#333',
        speed     : '0.3',
        opacity   : '0.5',
        modal     : true,
        showClose : true,
        onOpen: function(event) {
            $("select[id=importGLAcctsBizSel]").val(""); //onOpen reset selection
        }
    });
};

// simple error message box for the import dialog...
window.iafMessage = function(s) {
    w2popup.message({
        width:   400,
        height:  250,
        body:    '<div class="w2ui-centered">' + s + '</div>',
        buttons: '<button class="w2ui-btn" onclick="w2popup.message()">Ok</button>'
    });
};

// importAccountsFile request to server for importing accounts file
window.importAccountsFile = function () {
    var x = getCurrentBusiness(),
        BID=parseInt(x.value),
        BUD = getBUDfromBID(BID);

    var chosenBUD = $("select[id=importGLAcctsBizSel]").val();

    var importURL = "/v1/importaccounts/" + BID + "/";
    var formData = new FormData();
    var file = $("input[name=acct_import_file]")[0].files[0];

    if (typeof file == "undefined") {
        iafMessage("Please select a file to import");
        return false;
    }

    if (file.size < 1) {
        iafMessage("The file you selected is empty");
        return false;
    }
    // .csv extension check
    var splitParts = file.name.split(".");
    var ext = splitParts[splitParts.length - 1];
    if (ext.toLowerCase() != "csv") {
        iafMessage('The file you selected has is of type ".' + ext + '" but it needs to be of type ".csv"');
        return false;
    }
    formData.append("GLAccountFile", file);
    formData.append("BUD", chosenBUD);

    $.ajax({
        url: importURL,
        type: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        dataType: "json",
        success: function (response) {
            if (response.status == "success") {
                $("select[id=importGLAcctsBizSel]").val("");
                $("input[name=acct_import_file]").val("");
                w2popup.close();
                w2ui.accountsGrid.reload(); // load the updated accounts
            } else if (response.status == "error") {
                iafMessage(response.message);
            }
        },
        // Type: Function( jqXHR jqXHR, String textStatus, String errorThrown )
        //       A function to be called if the request fails. The function
        //       receives three arguments: The jqXHR (in jQuery 1.4.x,
        //       XMLHttpRequest) object, a string describing the type of error
        //       that occurred and an optional exception object, if one
        //       occurred. Possible values for the second argument (besides
        //       null) are "timeout", "error", "abort", and "parsererror". When
        //       an HTTP error occurs, errorThrown receives the textual portion
        //       of the HTTP status, such as "Not Found" or "Internal Server
        //       Error." As of jQuery 1.5, the error setting can accept an
        //       array of functions. Each function will be called in turn.
        //       Note: This handler is not called for cross-domain script and
        //       cross-domain JSONP requests.
        error: function(xhr,status,error) {
            iafMessage("ajax post failed: " + status);
        }
   });
   return true;
};
