/*global w2ui,
    getFullName, getTCIDName, loadTransactantListingItem,
    initRAFlowAJAX, getRAFlowAllParts, getAllRAFlows, loadRADatesForm, loadRAPeopleForm,
    loadRAPetsGrid, loadRAVehiclesGrid, loadRABGInfoForm, loadRARentablesGrid,
    loadRAFeesTermsGrid, getRAFlowPartTypeIndex, loadTargetSection,
    getVehicleGridInitalRecord, getRentablesGridInitalRecord, getFeesTermsGridInitalRecord,
    getPetsGridInitalRecord, saveActiveCompData, loadRABGInfoForm, w2render,
    requiredFieldsFulFilled, getPetFormInitRecord
*/

"use strict";

// Next button handling
$(document).on('click', '#ra-form #next', function () {
    // get the current component (to be previous one)
    var active_comp = $(".ra-form-component:visible");

    // get the target component (to be active one)
    var target_comp = active_comp.next(".ra-form-component");

    // make sure that next component available so we can navigate onto it
    if (target_comp.length === 0) {
        return false;
    }

    // load target section
    loadTargetSection(target_comp.attr("id"), active_comp.attr("id"));
});

// Previous button handling
$(document).on('click', '#ra-form #previous', function () {
    // get the current component (to be previous one)
    var active_comp = $(".ra-form-component:visible");

    // get the target component (to be active one)
    var target_comp = active_comp.prev(".ra-form-component");

    // make sure that previous component available so we can navigate onto it
    if (target_comp.length === 0) {
        return false;
    }

    // load target section
    loadTargetSection(target_comp.attr("id"), active_comp.attr("id"));
});

// link click handling
$(document).on('click', '#ra-form #progressbar a', function () {
    var active_comp = $(".ra-form-component:visible");

    // load target form
    var target = $(this).closest("li").attr("data-target");
    target = target.split('#').join("");

    loadTargetSection(target, active_comp.attr("id"));

    // because of 'a' tag, return false
    return false;
});

// TODO: we should pass FlowID, flowPartID here in arguments
window.saveActiveCompData = function (record, partType) {

    var bid = getCurrentBID();

    var flowPartID;
    var flowParts = app.raflow.data[app.raflow.activeFlowID] || [];

    for (var i = 0; i < flowParts.length; i++) {
        if (partType == flowParts[i].PartType) {
            flowPartID = flowParts[i].FlowPartID;
        }
    }

    // temporary data
    var data = {
        "cmd": "save",
        "FlowPartID": flowPartID,
        "Flow": app.raflow.name,
        "FlowID": app.raflow.activeFlowID,
        "BID": bid,
        "PartType": partType,
        "Data": record,
    };

    return $.ajax({
        url: "/v1/flowpart/" + bid.toString() + "/0",
        method: "POST",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify(data),
        success: function (data) {
            if (data.status != "error") {
                console.log("data has been saved for: ", app.raflow.activeFlowID, ", partType: ", partType);
            } else {
                console.error(data.message);
            }
        },
        error: function (data) {
            console.log(data);
        },
    });
};

window.getRAFlowAllParts = function (FlowID) {
    var bid = getCurrentBID();

    $.ajax({
        url: "/v1/flow/" + bid.toString() + "/0",
        method: "POST",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({"cmd": "getFlowParts", "FlowID": FlowID}),
        success: function (data) {
            if (data.status != "error") {
                app.raflow.data[FlowID] = data.records;

                // show "done" mark on each li of navigation bar
                for (var comp in app.raFlowPartTypes) {
                    // if required fields are fulfilled then mark this slide as done
                    if (requiredFieldsFulFilled(comp)) {
                        // hide active component
                        $("#progressbar li[data-target='#" + comp + "']").addClass("done");
                    }

                    // reset w2ui component as well
                    if(RACompConfig[comp].w2uiComp in w2ui) {
                        // clear inputs
                        w2ui[RACompConfig[comp].w2uiComp].clear();
                    }
                }

                // mark first slide as active
                $(".ra-form-component#dates").show();
                $("#progressbar li[data-target='#dates']").removeClass("done").addClass("active");
                loadRADatesForm();

            } else {
                console.error(data.message);
            }
        },
        error: function (data) {
            console.log(data);
        },
    });
};

window.initRAFlowAJAX = function () {
    var bid = getCurrentBID();

    return $.ajax({
        url: "/v1/flow/" + bid.toString() + "/0",
        method: "POST",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({"cmd": "init", "flow": app.raflow.name}),
        success: function (data) {
            if (data.status != "error") {
                app.raflow.data[data.FlowID] = {};
            }
        },
        error: function (data) {
            console.log(data);
        },
    });
};

window.getRAFlowPartTypeIndex = function (partType) {
    var partTypeIndex = -1;
    if (app.raflow.activeFlowID && app.raflow.data[app.raflow.activeFlowID]) {
        for (var i = 0; i < app.raflow.data[app.raflow.activeFlowID].length; i++) {
            if (partType == app.raflow.data[app.raflow.activeFlowID][i].PartType) {
                partTypeIndex = i;
                break;
            }
        }
    }
    return partTypeIndex;
};

window.requiredFieldsFulFilled = function (compID) {
    var done = false;

    // if not active flow id then return
    if (app.raflow.activeFlowID === "") {
        console.log("no active flow ID");
        return done;
    }

    // get part type index for the component
    var partType = app.raFlowPartTypes[compID];
    var partTypeIndex = getRAFlowPartTypeIndex(partType);
    if (partTypeIndex === -1) {
        console.log("no index found this part type");
        return done;
    }

    var data;
    var validData = true;

    switch (compID) {
        case "dates":
            data = app.raflow.data[app.raflow.activeFlowID][partTypeIndex].Data;
            for (var dateKey in data) {
                // if anything else then break and mark as invalid
                if (!(typeof data[dateKey] === "string" && data[dateKey] !== "")) {
                    validData = false;
                    break;
                }
            }
            // if loop passed successfully then mark it as successfully
            done = validData;
            break;
        case "people":
            data = app.raflow.data[app.raflow.activeFlowID][partTypeIndex].Data;
            if (data.Users.length > 0 && data.Payors.length > 0) {
                done = true;
            }
            break;
        case "pets":
            data = app.raflow.data[app.raflow.activeFlowID][partTypeIndex].Data;
            if (data.length > 0) {
                done = true;
            }
            break;
        case "vehicles":
            data = app.raflow.data[app.raflow.activeFlowID][partTypeIndex].Data;
            if (data.length > 0) {
                done = true;
            }
            break;
        case "bginfo":
            // TODO(Akshay): Add for integer fields e.g., phone, gross wage.
            data = app.raflow.data[app.raflow.activeFlowID][partTypeIndex].Data;
            // list of fields which must have value and it's type string
            var listOfRequiredField = ["ApplicationDate", "MoveInDate",
                "ApartmentNo", "LeaseTerm", "ApplicantFirstName", "ApplicantMiddleName",
                "ApplicantLastName", "ApplicantBirthDate", "ApplicantSSN",
                "ApplicantDriverLicNo", "ApplicantTelephoneNo", "ApplicantEmailAddress",
                "NoPeople", "CurrentAddress", "CurrentLandLoardName", "CurrentLandLoardPhoneNo",
                "CurrentReasonForMoving", "ApplicantEmployer", "ApplicantPhone", "ApplicantAddress",
                "ApplicantPosition", "EmergencyContactName", "EmergencyContactPhone", "EmergencyContactAddress"];

            listOfRequiredField.forEach(function(field) {
                if (!data[field]) {
                    validData = false;
                    return false;
                }
            });

            done = validData;
            break;
        case "rentables":
            data = app.raflow.data[app.raflow.activeFlowID][partTypeIndex].Data;
            if (data.length > 0) {
                done = true;
            }
            break;
        case "feesterms":
            data = app.raflow.data[app.raflow.activeFlowID][partTypeIndex].Data;
            if (data.length > 0) {
                done = true;
            }
            break;
        case "final":
            break;
    }

    return done;
};

// load form according to target
window.loadTargetSection = function (target, activeCompID) {

    /*if ($("#progressbar li[data-target='#" + target + "']").hasClass("done")) {
        console.log("target has been saved", target);
    } else {}*/

    // if required fields are fulfilled then mark this slide as done
    if (requiredFieldsFulFilled(activeCompID)) {
        // hide active component
        $("#progressbar li[data-target='#" + activeCompID + "']").addClass("done");
    }

    // decide data based on type
    var data = null;
    switch (activeCompID) {
        case "dates":
            data = w2ui.RADatesForm.record;
            break;
        case "people":
            var i = getRAFlowPartTypeIndex(app.raFlowPartTypes.people);
            data = app.raflow.data[app.raflow.activeFlowID][i].Data;
            break;
        case "pets":
            data = w2ui.RAPetsGrid.records;
            break;
        case "vehicles":
            data = w2ui.RAVehiclesGrid.records;
            break;
        case "bginfo":
            data = w2ui.RABGInfoForm.record;
            break;
        case "rentables":
            data = w2ui.RARentablesGrid.records;
            break;
        case "feesterms":
            data = w2ui.RAFeesTermsGrid.records;
            break;
        case "final":
            data = null;
            break;
        default:
            alert("invalid active comp: ", activeCompID);
            return;
    }

    // get part type from the class index
    var partType = $("#progressbar li[data-target='#" + activeCompID + "']").index() + 1;
    if (data) {
        // save the content on server for active component
        saveActiveCompData(data, partType);
    }

    // hide active component
    $("#progressbar li[data-target='#" + activeCompID + "']").removeClass("active");
    $(".ra-form-component#" + activeCompID).hide();

    // show target component
    $("#progressbar li[data-target='#" + target + "']").removeClass("done").addClass("active");
    $(".ra-form-component#" + target).show();

    // hide previous navigation button if the target is in first section
    if ($(".ra-form-component#" + target).is($(".ra-form-component").first())) {
        $("#ra-form footer button#previous").addClass("disable");
    } else {
        $("#ra-form footer button#previous").removeClass("disable");
    }

    // hide next navigation button if the target is in last section
    if ($(".ra-form-component#" + target).is($(".ra-form-component").last())) {
        $("#ra-form footer button#next").addClass("disable");
    } else {
        $("#ra-form footer button#next").removeClass("disable");
    }

    // load the content in the component using loader function
    var targetLoader = RACompConfig[target].loader;
    if (typeof targetLoader === "function") {
        targetLoader();
        /*setTimeout(function() {
            var validateForm = compIDw2uiForms[activeCompID];
            if (typeof w2ui[validateForm] !== "undefined") {
                var issues = w2ui[validateForm].validate();
                if (!(Array.isArray(issues) && issues.length > 0)) {
                    // $("#progressbar li[data-target='#" + activeCompID + "']").addClass("done");
                }
            }
        }, 500);*/
    } else {
        console.log("unknown target from nav li: ", target);
    }
};

// -------------------------------------------------------------------------------
// Rental Agreement - Info Dates form
// -------------------------------------------------------------------------------
window.loadRADatesForm = function () {

    // if form is loaded then return
    if (!("RADatesForm" in w2ui)) {
        // dates form
        $().w2form({
            name: 'RADatesForm',
            header: 'Dates',
            style: 'border: 1px black solid; display: block;',
            focus: -1,
            formURL: '/webclient/html/formradates.html',
            fields: [
                {name: 'AgreementStart', type: 'date', required: true, html: {caption: "Term Start"}},
                {name: 'AgreementStop', type: 'date', required: true, html: {caption: "Term Stop"}},
                {name: 'RentStart', type: 'date', required: true, html: {caption: "Rent Start"}},
                {name: 'RentStop', type: 'date', required: true, html: {caption: "Rent Stop"}},
                {name: 'PossessionStart', type: 'date', required: true, html: {caption: "Possession Start"}},
                {name: 'PossessionStop', type: 'date', required: true, html: {caption: "Possession Stop"}}
            ],
            actions: {
                reset: function () {
                    this.clear();
                },
            },
            onRefresh: function (event) {
                var t = new Date(),
                    nyd = new Date(new Date().setFullYear(new Date().getFullYear() + 1));

                // set default values with start=current day, stop=next year day, if record is blank
                this.record.AgreementStart = this.record.AgreementStart || w2uiDateControlString(t);
                this.record.AgreementStop = this.record.AgreementStop || w2uiDateControlString(nyd);
                this.record.RentStart = this.record.RentStart || w2uiDateControlString(t);
                this.record.RentStop = this.record.RentStop || w2uiDateControlString(nyd);
                this.record.PossessionStart = this.record.PossessionStart || w2uiDateControlString(t);
                this.record.PossessionStop = this.record.PossessionStop || w2uiDateControlString(nyd);
            }
        });
    }

    // now render the form in specifiec targeted division
    $('#ra-form #dates').w2render(w2ui.RADatesForm);

    // load the existing data in dates component
    setTimeout(function () {
        var i = getRAFlowPartTypeIndex(app.raFlowPartTypes.dates);
        if (i >= 0 && app.raflow.data[app.raflow.activeFlowID][i].Data) {
            w2ui.RADatesForm.record = app.raflow.data[app.raflow.activeFlowID][i].Data;
            w2ui.RADatesForm.refresh();
        } else {
            w2ui.RADatesForm.clear();
        }
    }, 500);
};

// -------------------------------------------------------------------------------
// Rental Agreement - People form
// -------------------------------------------------------------------------------

//-----------------------------------------------------------------------------
// loadTransactantListingItem - adds transactant into categories list
// @params
//   transactantRec = an object assumed to have a FirstName, MiddleName, LastName,
//                    IsCompany, and CompanyName.
//   IsPayor        = flag to indicate payor or not
//   IsUser         = flag to indicate user or not
//   IsGuarantor    = flag to indicate guarantor or not
// @return - nothing
//-----------------------------------------------------------------------------
window.loadTransactantListingItem = function (transactantRec, IsPayor, IsUser, IsGuarantor) {

    var peoplePartIndex = getRAFlowPartTypeIndex(app.raFlowPartTypes.people);
    if (peoplePartIndex < 0) {
        alert("flow data could not be found");
        return false;
    }

    // check that "Payors", "Users", "Guarantors" keys do exist in Data of people
    var peopleTypeKeys = Object.keys(app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data);
    var payorsIndex = peopleTypeKeys.indexOf("Payors");
    var usersIndex = peopleTypeKeys.indexOf("Users");
    var guarantorsIndex = peopleTypeKeys.indexOf("Guarantors");
    if (payorsIndex < 0 || usersIndex < 0 || guarantorsIndex < 0) {
        alert("flow data could not be found");
        return false;
    }


    // listing item to be appended in ul
    var s = (transactantRec.IsCompany > 0) ? transactantRec.CompanyName : getFullName(transactantRec);
    if (transactantRec.TCID > 0) {
        s += ' (TCID: ' + String(transactantRec.TCID) + ')';
    }

    var peopleListingItem = '<li data-tcid="' + transactantRec.TCID + '">';
    peopleListingItem += '<span>' + s + '</span>';
    peopleListingItem += '<i class="remove-item fas fa-times-circle fa-xs"></i>';
    peopleListingItem += '</li>';

    var i, length, found = false;

    // add into payor list
    if (IsPayor) {
        // check for duplicacy
        found = false;
        length = app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Payors.length;
        for (i = length - 1; i >= 0; i--) {
            if (app.raflow.activeTransactant.TCID == app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Payors[i].TCID) {
                found = true;
                break;
            }
        }
        if (!(found)) {
            if (!($.isEmptyObject(app.raflow.activeTransactant))) {
                app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Payors.push(app.raflow.activeTransactant);
            }

            // if with this tcid element exists in DOM then not append
            if ($('#payor-list .people-listing li[data-tcid="' + transactantRec.TCID + '"]').length < 1) {
                $('#payor-list .people-listing').append(peopleListingItem);
            }
        }
    }

    // add into user list
    if (IsUser) {
        found = false;
        length = app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Users.length;
        for (i = length - 1; i >= 0; i--) {
            if (app.raflow.activeTransactant.TCID == app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Users[i].TCID) {
                found = true;
                break;
            }
        }
        if (!(found)) {
            if (!($.isEmptyObject(app.raflow.activeTransactant))) {
                app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Users.push(app.raflow.activeTransactant);
            }

            // if with this tcid element exists in DOM then not append
            if ($('#user-list .people-listing li[data-tcid="' + transactantRec.TCID + '"]').length < 1) {
                $('#user-list .people-listing').append(peopleListingItem);
            }
        }
    }

    // add into guarantor list
    if (IsGuarantor) {
        found = false;
        length = app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Guarantors.length;
        for (i = length - 1; i >= 0; i--) {
            if (app.raflow.activeTransactant.TCID == app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Guarantors[i].TCID) {
                found = true;
                break;
            }
        }
        if (!(found)) {
            if (!($.isEmptyObject(app.raflow.activeTransactant))) {
                app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Guarantors.push(app.raflow.activeTransactant);
            }

            // if with this tcid element exists in DOM then not append
            if ($('#guarantor-list .people-listing li[data-tcid="' + transactantRec.TCID + '"]').length < 1) {
                $('#guarantor-list .people-listing').append(peopleListingItem);
            }
        }
    }
};

//-----------------------------------------------------------------------------
// acceptTransactant - add transactant to the list of payor/user/guarantor
//
// @params
//   item = an object assumed to have a FirstName, MiddleName, LastName,
//          IsCompany, and CompanyName.
// @return - the name to render
//-----------------------------------------------------------------------------
window.acceptTransactant = function () {
    var IsPayor = w2ui.RAPeopleForm.record.Payor;
    var IsUser = w2ui.RAPeopleForm.record.User;
    var IsGuarantor = w2ui.RAPeopleForm.record.Guarantor;

    // if not set anything then alert the user to select any one of them
    if (!(IsPayor || IsUser || IsGuarantor)) {
        alert("Please, select the role");
        return false;
    }

    // load item in the DOM
    loadTransactantListingItem(w2ui.RAPeopleForm.record, IsPayor, IsUser, IsGuarantor);

    // clear the form
    app.raflow.activeTransactant = {};
    w2ui.RAPeopleForm.clear();

    // disable check boxes
    $(w2ui.RAPeopleForm.box).find("input[type=checkbox]").prop("disabled", true);
};

// remove people from the listing
$(document).on('click', '.people-listing .remove-item', function () {
    var tcid = parseInt($(this).closest('li').attr('data-tcid'));

    // get part type index
    var peoplePartIndex = getRAFlowPartTypeIndex(app.raFlowPartTypes.people);

    // remove entry from data
    if (peoplePartIndex >= 0) {
        // check that "Payors", "Users", "Guarantors" keys do exist in Data of people
        var peopleTypeKeys = Object.keys(app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data);
        var payorsIndex = peopleTypeKeys.indexOf("Payors");
        var usersIndex = peopleTypeKeys.indexOf("Users");
        var guarantorsIndex = peopleTypeKeys.indexOf("Guarantors");

        if (!(payorsIndex < 0 || usersIndex < 0 || guarantorsIndex < 0)) {
            var peopleType = $(this).closest('ul.people-listing').attr('data-people-type');
            var i, length;
            switch (peopleType) {
                case "payors":
                    length = app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Payors.length;
                    for (i = length - 1; i >= 0; i--) {
                        app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Payors.splice(i, 1);
                    }
                    break;
                case "users":
                    length = app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Users.length;
                    for (i = length - 1; i >= 0; i--) {
                        app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Users.splice(i, 1);
                    }
                    break;
                case "guarantors":
                    length = app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Guarantors.length;
                    for (i = length - 1; i >= 0; i--) {
                        app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Guarantors.splice(i, 1);
                    }
                    break;
            }
        }
    }


    $(this).closest('li').remove();
});

window.loadRAPeopleForm = function () {

    // have to list down all people into different categories
    var peoplePartIndex = getRAFlowPartTypeIndex(app.raFlowPartTypes.people);
    if (peoplePartIndex < 0) {
        alert("flow data could not be found");
        return false;
    }

    // check that "Payors", "Users", "Guarantors" keys do exist in Data of people
    var peopleTypeKeys = Object.keys(app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data);
    var payorsIndex = peopleTypeKeys.indexOf("Payors");
    var usersIndex = peopleTypeKeys.indexOf("Users");
    var guarantorsIndex = peopleTypeKeys.indexOf("Guarantors");
    if (!(payorsIndex < 0 || usersIndex < 0 || guarantorsIndex < 0)) { // valid then
        // load payors list
        app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Payors.forEach(function (item) {
            loadTransactantListingItem(item, true, false, false);
        });
        // load users list
        app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Users.forEach(function (item) {
            loadTransactantListingItem(item, false, true, false);
        });
        // load guarantors list
        app.raflow.data[app.raflow.activeFlowID][peoplePartIndex].Data.Guarantors.forEach(function (item) {
            loadTransactantListingItem(item, false, false, true);
        });
    }


    // if form is loaded then return
    if (!("RAPeopleForm" in w2ui)) {

        // people form
        $().w2form({
            name: 'RAPeopleForm',
            header: 'People',
            style: 'display: block;',
            formURL: '/webclient/html/formrapeople.html',
            focus: -1,
            fields: [
                {
                    name: 'Transactant', type: 'enum', required: true, html: {caption: "Transactant"},
                    options: {
                        url: '/v1/transactantstd/' + app.raflow.BID,
                        max: 1,
                        renderItem: function (item) {
                            // enable user-role checkboxes
                            $(w2ui.RAPeopleForm.box).find("input[type=checkbox]").prop("disabled", false);

                            // mark this as transactant as an active
                            app.raflow.activeTransactant = item;
                            var s = getTCIDName(item);
                            w2ui.RAPeopleForm.record.TCID = item.TCID;
                            w2ui.RAPeopleForm.record.FirstName = item.FirstName;
                            w2ui.RAPeopleForm.record.LastName = item.LastName;
                            w2ui.RAPeopleForm.record.MiddleName = item.MiddleName;
                            w2ui.RAPeopleForm.record.CompanyName = item.CompanyName;
                            w2ui.RAPeopleForm.record.IsCompany = item.IsCompany;
                            return s;
                        },
                        renderDrop: function (item) {
                            return getTCIDName(item);
                        },
                        compare: function (item, search) {
                            var s = getTCIDName(item);
                            s = s.toLowerCase();
                            var srch = search.toLowerCase();
                            var match = (s.indexOf(srch) >= 0);
                            return match;
                        },
                        onNew: function (event) {
                            //console.log('++ New Item: Do not forget to submit it to the server too', event);
                            $.extend(event.item, {FirstName: '', LastName: event.item.text});
                        },
                        onRemove: function (event) {
                            event.onComplete = function () {
                                // reset active Transactant to blank object
                                app.raflow.activeTransactant = {};

                                var f = w2ui.RAPeopleForm;
                                // reset payor field related data when removed
                                f.record.TCID = 0;

                                // NOTE: have to trigger manually, b'coz we manually change the record,
                                // otherwise it triggers the change event but it won't get change (Object: {})
                                var event = f.trigger({phase: 'before', target: f.name, type: 'change', event: event}); // event before
                                if (event.cancelled === true) return false;
                                f.trigger($.extend(event, {phase: 'after'})); // event after
                            };
                        }
                    },
                },
                {name: 'TCID', type: 'int', required: true, html: {caption: "TCID"}},
                {name: 'FirstName', type: 'text', required: true, html: {caption: "FirstName"}},
                {name: 'LastName', type: 'text', required: true, html: {caption: "LastName"}},
                {name: 'MiddleName', type: 'text', required: true, html: {caption: "MiddleName"}},
                {name: 'CompanyName', type: 'text', required: true, html: {caption: "CompanyName"}},
                {name: 'IsCompany', type: 'int', required: true, html: {caption: "IsCompany"}},
                {name: 'Payor', type: 'checkbox', required: true, html: {caption: "Payor"}},
                {name: 'User', type: 'checkbox', required: true, html: {caption: "User"}},
                {name: 'Guarantor', type: 'checkbox', required: true, html: {caption: "Guarantor"}},
            ],
            actions: {
                reset: function () {
                    this.clear();
                }
            }
        });
    }

    // load form in div
    $('#ra-form #people .form-container').w2render(w2ui.RAPeopleForm);

    // load the existing data in people component
    setTimeout(function () {
        var i = getRAFlowPartTypeIndex(app.raFlowPartTypes.people);
        if (i >= 0 && app.raflow.data[app.raflow.activeFlowID][i].Data) {
            // w2ui.RAPeopleForm.record = app.raflow.data[app.raflow.activeFlowID][i].Data;
            w2ui.RAPeopleForm.refresh();
        } else {
            w2ui.RAPeopleForm.clear();
        }
    }, 500);
};

window.getPetFormInitRecord = function (BID, BUD, previousFormRecord){
    var y = new Date();

    var defaultFormData = {
        recid: 0,
        PETID: 0,
        BID: BID,
        // BUD: BUD,
        Name: "",
        Breed: "",
        Type: "",
        Color: "",
        Weight: 0,
        NonRefundablePetFee: 0,
        RefundablePetDeposit: 0,
        ReccurringPetFee: 0,
        LastModTime: y.toISOString(),
        LastModBy: 0,
    };

    // if it called after 'save and add another' action there previous form record is passed as Object
    // else it is null
    if ( previousFormRecord ) {
        defaultFormData = setDefaultFormFieldAsPreviousRecord(
            [ 'Name', 'Breed', 'Type', 'Color', 'Weight',
              'NonRefundablePetFee', 'RefundablePetDeposit', 'ReccurringPetFee' ], // Fields to Reset
            defaultFormData,
            previousFormRecord
        );
    }

    return defaultFormData;
};

window.loadRAPetsGrid = function () {
    // if form is loaded then return
    if (!("RAPetsGrid" in w2ui)) {

        // pet form
        $().w2form({
            name    : 'RAPetForm',
            header  : 'Add Pet information',
            style   : 'border: 0px; background-color: transparent;display: block;',
            formURL : '/webclient/html/formrapets.html',
            toolbar : {
                items: [
                    { id: 'bt3', type: 'spacer' },
                    { id: 'btnClose', type: 'button', icon: 'fas fa-times'}
                ],
                onClick: function (event) {
                    switch (event.target){
                        case 'btnClose':
                            $("#component-form-instance-container").hide();
                            $("#component-form-instance-container #form-instance").empty();
                            break;
                    }
                }
            },
            fields  : [
                { field: 'recid', type: 'int', required: false, html: { caption: 'recid', page: 0, column: 0 } },
                { field: 'BID', type: 'int', hidden: true, html: { caption: 'BID', page: 0, column: 0 } },
                // { field: 'BUD', type: 'text', hidden: false, html: { caption: 'BUD', page: 0, column: 0 } },
                { field: 'PETID', type: 'int', hidden: false, html: { caption: 'PETID', page: 0, column: 0 } },
                { field: 'Name', type: 'text', required: true},
                { field: 'Breed', type: 'text', required: true},
                { field: 'Type', type: 'text', required: true},
                { field: 'Color', type: 'text', required: true},
                { field: 'Weight', type: 'int', required: true},
                { field: 'NonRefundablePetFee', type: 'money', required: false},
                { field: 'RefundablePetDeposit', type: 'money', required: false},
                { field: 'ReccurringPetFee', type: 'money', required: false},
                { field: 'LastModTime', type: 'time', required: false, html: { caption: 'LastModTime', page: 0, column: 0 } },
                { field: 'LastModBy', type: 'int', required: false, html: { caption: 'LastModBy', page: 0, column: 0 } },
            ],
            actions: {
                save: function() {
                    var form = this;
                    var errors = form.validate();
                    if (errors.length > 0) return;
                    var record = $.extend(true, { recid: w2ui.RAPetsGrid.records.length + 1 }, form.record);
                    var recordsData = $.extend(true, [], w2ui.RAPetsGrid.records);
                    recordsData.push(record);

                    // save this records in json Data
                    saveActiveCompData(recordsData, app.raFlowPartTypes.pets)
                    .done(function(data) {
                        if (data.status === 'success') {
                            w2ui.RAPetsGrid.add(record);
                            form.clear();

                            // close the form
                            $("#component-form-instance-container").hide();
                            $("#component-form-instance-container #form-instance").empty();
                        } else {
                            form.message(data.message);
                        }
                    })
                    .fail(function(data) {
                        console.log("failure " + data);
                    });
                },
                saveadd: function() {
                    var BID = getCurrentBID(),
                        BUD = getBUDfromBID(BID);

                    var form = this;
                    var errors = form.validate();
                    if (errors.length > 0) return;
                    var record = $.extend(true, { recid: w2ui.RAPetsGrid.records.length + 1 }, form.record);
                    var recordsData = $.extend(true, [], w2ui.RAPetsGrid.records);
                    recordsData.push(record);

                    // save this records in json Data
                    saveActiveCompData(recordsData, app.raFlowPartTypes.pets)
                    .done(function(data) {
                        if (data.status === 'success') {
                            w2ui.RAPetsGrid.add(record);
                            var record = getPetFormInitRecord(BID, BUD, form.record);
                            form.record = record;
                            form.refresh();
                        } else {
                            form.message(data.message);
                        }
                    })
                    .fail(function(data) {
                        console.log("failure " + data);
                    });
                },
                delete: function() {
                    alert("delete");
                },
            },
        });

        // pets grid
        $().w2grid({
            name: 'RAPetsGrid',
            header: 'Pets',
            show: {
                toolbar         : true,
                footer          : true,
                toolbarAdd      : true   // indicates if toolbar add new button is visible
            },
            style: 'border: 1px solid black; display: block;',
            columns: [
                {
                    field: 'recid',
                    hidden: true
                },
                {
                    field: 'PETID',
                    hidden: true
                },
                {
                    field: 'BID',
                    hidden: true
                },
                /*{
                    field: 'BUD',
                    hidden: true
                },*/
                {
                    field: 'Name',
                    caption: 'Name',
                    size: '150px',
                },
                {
                    field: 'Type',
                    caption: 'Type',
                    size: '80px',
                },
                {
                    field: 'Breed',
                    caption: 'Breed',
                    size: '80px',
                },
                {
                    field: 'Color',
                    caption: 'Color',
                    size: '80px',
                },
                {
                    field: 'Weight',
                    caption: 'Weight',
                    size: '80px',
                },
                {
                    field: 'DtStart',
                    caption: 'DtStart',
                    size: '100px',
                },
                {
                    field: 'DtStop',
                    caption: 'DtStop',
                    size: '100px',
                },
                {
                    field: 'NonRefundablePetFee',
                    caption: 'NonRefundable<br>PetFee',
                    size: '70px',
                    render: 'money',
                },
                {
                    field: 'RefundablePetDeposit',
                    caption: 'Refundable<br>PetDeposit',
                    size: '70px',
                    render: 'money',
                },
                {
                    field: 'RecurringPetFee',
                    caption: 'Recurring<br>PetFee',
                    size: '70px',
                    render: 'money',
                },
            ],
            onChange: function (event) {
                event.onComplete = function () {
                    this.save();
                };
            },
            onAdd: function (/*event*/) {
                var BID = getCurrentBID(),
                    BUD = getBUDfromBID(BID);

                $("#component-form-instance-container").show();
                var record = getPetFormInitRecord(BID, BUD, null);
                w2ui.RAPetForm.record = record;
                w2ui.RAPetForm.refresh();

                $("#component-form-instance-container #form-instance").w2render(w2ui.RAPetForm);
            }
        });
    }

    // now load grid in division
    $('#ra-form #pets').w2render(w2ui.RAPetsGrid);

    // load the existing data in pets component
    setTimeout(function () {
        var i = getRAFlowPartTypeIndex(app.raFlowPartTypes.pets);
        if (i >= 0 && app.raflow.data[app.raflow.activeFlowID][i].Data) {
            w2ui.RAPetsGrid.records = app.raflow.data[app.raflow.activeFlowID][i].Data;
            w2ui.RAPetsGrid.refresh();
        } else {
            w2ui.RAPetsGrid.clear();
        }
    }, 500);

};

// -------------------------------------------------------------------------------
// Rental Agreement - Vehicles Grid
// -------------------------------------------------------------------------------
window.getVehicleGridInitalRecord = function (BID, gridLen) {
    var t = new Date(),
        nyd = new Date(new Date().setFullYear(new Date().getFullYear() + 1));

    return {
        recid: gridLen,
        VID: 0,
        BID: BID,
        TCID: 0,
        VIN: "",
        Type: "",
        Make: "",
        Model: "",
        Color: "",
        LicensePlateState: "",
        LicensePlateNumber: "",
        ParkingPermitNumber: "",
        DtStart: w2uiDateControlString(t),
        DtStop: w2uiDateControlString(nyd),
    };
};

window.loadRAVehiclesGrid = function () {
    // if form is loaded then return
    if (!("RAVehiclesGrid" in w2ui)) {

        // Add vehicle information form
        $().w2form({
            name: 'RAVehicleForm',
            header: 'Add Vehicle form',
            formURL: '/webclient/html/formravehicles.html',
            toolbar:{
                items: [
                    { id: 'bt3', type: 'spacer' },
                    { id: 'btnClose', type: 'button', icon: 'fas fa-times'}
                ],
                onClick: function (event) {
                    switch (event.target){
                        case 'btnClose':
                            $("#component-form-instance-container").hide();
                            $("#component-form-instance-container #form-instance").empty();
                            break;
                    }
                }
            },
            fields : [
                { field: 'recid', type: 'int', required: false, html: { caption: 'recid', page: 0, column: 0 } },
                { field: 'Type', type: 'text', required: true},
                { field: 'Make', type: 'text', required: true},
                { field: 'Model', type: 'text', required: true},
                { field: 'Color', type: 'text', required: true},
                { field: 'Year', type: 'text', required: true},
                { field: 'LicPlateState', type: 'text', required: true},
                { field: 'LicPlateNo', type: 'text', required: true},
                { field: 'VIN', type: 'text', required: true},
                { field: 'PermitNo', type: 'text', required: true},
                { field: 'PermitFee', type: 'text', required: true},
                { field: 'LastModTime', type: 'time', required: false, html: { caption: 'LastModTime', page: 0, column: 0 } },
                { field: 'LastModBy', type: 'int', required: false, html: { caption: 'LastModBy', page: 0, column: 0 } },
            ],
            actions : {
                saveadd: function () {

                },
                save: function () {
                    var form = this;
                    var errors = form.validate();
                    if (errors.length > 0) return;
                    var record = $.extend(true, { recid: w2ui.RAVehiclesGrid.records.length + 1 }, form.record);
                    var recordsData = $.extend(true, [], w2ui.RAVehiclesGrid.records);
                    recordsData.push(record);

                    // save this records in json Data
                    saveActiveCompData(recordsData, app.raFlowPartTypes.pets)
                        .done(function(data) {
                            if (data.status === 'success') {
                                w2ui.RAVehiclesGrid.add(record);
                                form.clear();

                                // close the form
                                $("#component-form-instance-container").hide();
                                $("#component-form-instance-container #form-instance").empty();
                            } else {
                                form.message(data.message);
                            }
                        })
                        .fail(function(data) {
                            console.log("failure " + data);
                        });
                }
            }
        });

        // vehicles grid
        $().w2grid({
            name: 'RAVehiclesGrid',
            header: 'Vehicles',
            show: {
                toolbar         : true,
                footer          : true,
                toolbarAdd      : true   // indicates if toolbar add new button is visible
            },
            style: 'border: 1px solid black; display: block;',
            columns: [
                {
                    field: 'recid',
                    hidden: true,
                },
                {
                    field: 'VID',
                    hidden: true
                },
                {
                    field: 'BID',
                    hidden: true
                },
                {
                    field: 'TCID',
                    hidden: true
                },
                {
                    field: 'Type',
                    caption: 'Type',
                    size: '80px',
                    editable: {type: 'text'}
                },
                {
                    field: 'VIN',
                    caption: 'VIN',
                    size: '80px',
                    editable: {type: 'text'}
                },
                {
                    field: 'Make',
                    caption: 'Make',
                    size: '80px',
                    editable: {type: 'text'}
                },
                {
                    field: 'Model',
                    caption: 'Model',
                    size: '80px',
                    editable: {type: 'text'}
                },
                {
                    field: 'Color',
                    caption: 'Color',
                    size: '80px',
                    editable: {type: 'text'}
                },
                {
                    field: 'LicensePlateState',
                    caption: 'License Plate<br>State',
                    size: '100px',
                    editable: {type: 'text'}
                },
                {
                    field: 'LicensePlateNumber',
                    caption: 'License Plate<br>Number',
                    size: '100px',
                    editable: {type: 'text'}
                },
                {
                    field: 'ParkingPermitNumber',
                    caption: 'Parking Permit <br>Number',
                    size: '100px',
                    editable: {type: 'text'}
                },
                {
                    field: 'DtStart',
                    caption: 'DtStart',
                    size: '100px',
                    editable: {type: 'date'}
                },
                {
                    field: 'DtStop',
                    caption: 'DtStop',
                    size: '100px',
                    editable: {type: 'date'}
                },
            ],
            onChange: function (event) {
                event.onComplete = function () {
                    this.save();
                };
            },
            onAdd: function (/*event*/) {
                $("#component-form-instance-container").show();
                $("#component-form-instance-container #form-instance").w2render(w2ui.RAVehicleForm);
            }
        });
    }

    // now load grid in target division
    $('#ra-form #vehicles').w2render(w2ui.RAVehiclesGrid);

    // load the existing data in vehicles component
    setTimeout(function () {
        var i = getRAFlowPartTypeIndex(app.raFlowPartTypes.vehicles);
        if (i >= 0 && app.raflow.data[app.raflow.activeFlowID][i].Data) {
            w2ui.RAVehiclesGrid.records = app.raflow.data[app.raflow.activeFlowID][i].Data;
            w2ui.RAVehiclesGrid.refresh();
        } else {
            w2ui.RAVehiclesGrid.clear();
        }
    }, 500);
};

// -------------------------------------------------------------------------------
// Rental Agreement - Background info form
// -------------------------------------------------------------------------------
window.loadRABGInfoForm = function () {

    // if form is loaded then return
    if (!("RABGInfoForm" in w2ui)) {

        // background info form
        $().w2form({
            name: 'RABGInfoForm',
            header: 'Background Information',
            style: 'border: 1px solid black; display: block;',
            formURL: '/webclient/html/formrabginfo.html',
            focus: -1,
            fields: [
                {field: 'ApplicationDate', type: 'date', required: true},
                {field: 'MoveInDate', type: 'date', required: true},
                {field: 'ApartmentNo', type: 'alphanumeric', required: true}, // Apartment number
                {field: 'LeaseTerm', type: 'text', required: true}, // Lease term
                {field: 'ApplicantFirstName', type: 'text', required: true},
                {field: 'ApplicantMiddleName', type: 'text', required: true},
                {field: 'ApplicantLastName', type: 'text', required: true},
                {field: 'ApplicantBirthDate', type: 'date', required: true}, // Date of births of applicants
                {field: 'ApplicantSSN', type: 'text', required: true}, // Social security number of applicants
                {field: 'ApplicantDriverLicNo', type: 'text', required: true}, // Driving licence number of applicants
                {field: 'ApplicantTelephoneNo', type: 'text', required: true}, // Telephone no of applicants
                {field: 'ApplicantEmailAddress', type: 'email', required: true}, // Email Address of applicants
                {field: 'CoApplicantFirstName', type: 'text'},
                {field: 'CoApplicantMiddleName', type: 'text'},
                {field: 'CoApplicantLastName', type: 'text'},
                {field: 'CoApplicantBirthDate', type: 'date'}, // Date of births of co-applicants
                {field: 'CoApplicantSSN', type: 'text'}, // Social security number of co-applicants
                {field: 'CoApplicantDriverLicNo', type: 'text'}, // Driving licence number of co-applicants
                {field: 'CoApplicantTelephoneNo', type: 'text'}, // Telephone no of co-applicants
                {field: 'CoApplicantEmailAddress', type: 'email'}, // Email Address of co-applicants
                {field: 'NoPeople', type: 'int', required: true}, // No. of people occupying apartment
                {field: 'CurrentAddress', type: 'text', required: true}, // Current Address
                {field: 'CurrentLandLoardName', type: 'text', required: true}, // Current landlord's name
                {field: 'CurrentLandLoardPhoneNo', type: 'text', required: true}, // Current landlord's phone number
                {field: 'CurrentLengthOfResidency', type: 'int', required: true}, // Length of residency at current address
                {field: 'CurrentReasonForMoving', type: 'text', required: true}, // Reason of moving from current address
                {field: 'PriorAddress', type: 'text'}, // Prior Address
                {field: 'PriorLandLoardName', type: 'text'}, // Prior landlord's name
                {field: 'PriorLandLoardPhoneNo', type: 'text'}, // Prior landlord's phone number
                {field: 'PriorLengthOfResidency', type: 'int'}, // Length of residency at Prior address
                {field: 'PriorReasonForMoving', type: 'text'}, // Reason of moving from Prior address
                {field: 'Evicted', type: 'checkbox', required: false}, // have you ever been Evicted
                {field: 'Convicted', type: 'checkbox', required: false}, // have you ever been Arrested or convicted of a crime
                {field: 'Bankruptcy', type: 'checkbox', required: false}, // have you ever been Declared Bankruptcy
                {field: 'ApplicantEmployer', type: 'text', required: true},
                {field: 'ApplicantPhone', type: 'text', required: true},
                {field: 'ApplicantAddress', type: 'text', required: true},
                {field: 'ApplicantPosition', type: 'text', required: true},
                {field: 'ApplicantGrossWages', type: 'money', required: true},
                {field: 'CoApplicantEmployer', type: 'text'},
                {field: 'CoApplicantPhone', type: 'text'},
                {field: 'CoApplicantAddress', type: 'text'},
                {field: 'CoApplicantPosition', type: 'text'},
                {field: 'CoApplicantGrossWages', type: 'money'},
                {field: 'Comment', type: 'text'}, // In an effort to accommodate you, please advise us of any special needs
                {field: 'EmergencyContactName', type: 'text', required: true}, // Name of emergency contact
                {field: 'EmergencyContactPhone', type: 'text', required: true}, // Phone number of emergency contact
                {field: 'EmergencyContactAddress', type: 'text', required: true} // Address of emergency contact
            ],
            actions: {
                reset: function () {
                    this.clear();
                }
                /*save: function () {
                    this.save();
                }*/
            }
        });
    }

    // now load form in div
    $('#ra-form #bginfo').w2render(w2ui.RABGInfoForm);

    // load the existing data in people component
    setTimeout(function () {
        var i = getRAFlowPartTypeIndex(app.raFlowPartTypes.bginfo);
        if (i >= 0 && app.raflow.data[app.raflow.activeFlowID][i].Data) {
            w2ui.RABGInfoForm.record = app.raflow.data[app.raflow.activeFlowID][i].Data;
            w2ui.RABGInfoForm.refresh();
        } else {
            w2ui.RABGInfoForm.clear();
        }
    }, 500);
};

// -------------------------------------------------------------------------------
// Rental Agreement - Rentables Grid
// -------------------------------------------------------------------------------
window.getRentablesGridInitalRecord = function (BID, gridLen) {
    return {
        recid: gridLen,
        RID: 0,
        BID: BID,
        RTID: 0,
        RentableName: "",
        ContractRent: 0.0,
        ProrateAmt: 0.0,
        TaxableAmt: 0.0,
        SalesTax: 0.0,
        TransOCC: 0.0,
    };
};

window.loadRARentablesGrid = function () {
    // if form is loaded then return
    if (!("RARentablesGrid" in w2ui)) {

        // rentables grid
        $().w2grid({
            name: 'RARentablesGrid',
            header: 'Rentables',
            show: {
                toolbar: true,
                footer: true,
            },
            style: 'border: 1px solid black; display: block;',
            toolbar: {
                items: [
                    {id: 'add', type: 'button', caption: 'Add Record', icon: 'w2ui-icon-plus'}
                ],
                onClick: function (event) {
                    var bid = getCurrentBID();
                    if (event.target == 'add') {
                        var inital = getRentablesGridInitalRecord(bid, w2ui.RARentablesGrid.records.length);
                        w2ui.RARentablesGrid.add(inital);
                    }
                }
            },
            columns: [
                {
                    field: 'recid',
                    hidden: true,
                },
                {
                    field: 'RID',
                    hidden: true
                },
                {
                    field: 'BID',
                    hidden: true
                },
                {
                    field: 'RTID',
                    hidden: true
                },
                {
                    field: 'RentableName',
                    caption: 'Rentable',
                    size: '350px',
                    editable: {type: 'text'}
                },
                {
                    field: 'ContractRent',
                    caption: 'At Signing',
                    size: '100px',
                    render: 'money',
                    editable: {type: 'money'}
                },
                {
                    field: 'ProrateAmt',
                    caption: 'Prorate',
                    size: '100px',
                    render: 'money',
                    editable: {type: 'money'}
                },
                {
                    field: 'TaxableAmt',
                    caption: 'Taxable Amt',
                    size: '100px',
                    render: 'money',
                    editable: {type: 'money'}
                },
                {
                    field: 'SalesTax',
                    caption: 'Sales Tax',
                    size: '100px',
                    render: 'money',
                    editable: {type: 'money'}
                },
                {
                    field: 'TransOCC',
                    caption: 'Trans OCC',
                    size: '100px',
                    render: 'money',
                    editable: {type: 'money'}
                }
            ],
            onChange: function (event) {
                event.onComplete = function () {
                    this.save();
                };
            }
        });
    }

    // now load grid in division
    $('#ra-form #rentables').w2render(w2ui.RARentablesGrid);

    // load the existing data in rentables component
    setTimeout(function () {
        var i = getRAFlowPartTypeIndex(app.raFlowPartTypes.rentables);
        if (i >= 0 && app.raflow.data[app.raflow.activeFlowID][i].Data) {
            w2ui.RARentablesGrid.records = app.raflow.data[app.raflow.activeFlowID][i].Data;
            w2ui.RARentablesGrid.refresh();
        } else {
            w2ui.RARentablesGrid.clear();
        }
    }, 500);
};


// -------------------------------------------------------------------------------
// Rental Agreement - Fees Terms Grid
// -------------------------------------------------------------------------------
window.getFeesTermsGridInitalRecord = function (BID, gridLen) {
    return {
        recid: gridLen,
        RID: 0,
        BID: BID,
        RTID: 0,
        RentableName: "",
        FeeName: "",
        Amount: 0.0,
        Cycle: 6,
        SigningAmt: 0.0,
        ProrateAmt: 0.0,
        TaxableAmt: 0.0,
        SalesTax: 0.0,
        TransOCC: 0.0,
    };
};

window.loadRAFeesTermsGrid = function () {
    // if form is loaded then return
    if (!("RAFeesTermsGrid" in w2ui)) {

        // feesterms grid
        $().w2grid({
            name: 'RAFeesTermsGrid',
            header: 'FeesTerms',
            show: {
                toolbar: true,
                footer: true,
            },
            style: 'border: 1px solid black; display: block;',
            toolbar: {
                items: [
                    {id: 'add', type: 'button', caption: 'Add Record', icon: 'w2ui-icon-plus'}
                ],
                onClick: function (event) {
                    var bid = getCurrentBID();
                    if (event.target == 'add') {
                        var inital = getFeesTermsGridInitalRecord(bid, w2ui.RAFeesTermsGrid.records.length);
                        w2ui.RAFeesTermsGrid.add(inital);
                    }
                }
            },
            columns: [
                {
                    field: 'recid',
                    hidden: true,
                },
                {
                    field: 'RID',
                    hidden: true
                },
                {
                    field: 'BID',
                    hidden: true
                },
                {
                    field: 'RTID',
                    hidden: true
                },
                {
                    field: 'RentableName',
                    caption: 'Rentable',
                    size: '180px',
                    editable: {type: 'text'}
                },
                {
                    field: 'FeeName',
                    caption: 'Fee',
                    size: '120px',
                    editable: {type: 'text'}
                },
                {
                    field: 'Amount',
                    caption: 'Amount',
                    size: '80px',
                    render: 'money',
                    editable: {type: 'money'}
                },
                {
                    field: 'Cycle',
                    caption: 'Cycle',
                    size: '80px',
                    editable: {type: 'int'}
                },
                {
                    field: 'SigningAmt',
                    caption: 'At Signing',
                    size: '80px',
                    render: 'money',
                    editable: {type: 'money'}
                },
                {
                    field: 'ProrateAmt',
                    caption: 'Prorate',
                    size: '80px',
                    render: 'money',
                    editable: {type: 'money'}
                },
                {
                    field: 'TaxableAmt',
                    caption: 'Taxable Amt',
                    size: '80px',
                    render: 'money',
                    editable: {type: 'money'}
                },
                {
                    field: 'SalesTax',
                    caption: 'Sales Tax',
                    size: '80px',
                    render: 'money',
                    editable: {type: 'money'}
                },
                {
                    field: 'TransOCC',
                    caption: 'Trans OCC',
                    size: '80px',
                    render: 'money',
                    editable: {type: 'money'}
                }
            ],
            onChange: function (event) {
                event.onComplete = function () {
                    this.save();
                };
            }
        });
    }

    // load grid in division
    $('#ra-form #feesterms').w2render(w2ui.RAFeesTermsGrid);

    // load the existing data in feesterms component
    setTimeout(function () {
        var i = getRAFlowPartTypeIndex(app.raFlowPartTypes.feesterms);
        if (i >= 0 && app.raflow.data[app.raflow.activeFlowID][i].Data) {
            w2ui.RAFeesTermsGrid.records = app.raflow.data[app.raflow.activeFlowID][i].Data;
            w2ui.RAFeesTermsGrid.refresh();
        } else {
            w2ui.RAFeesTermsGrid.clear();
        }
    }, 500);
};

// RACompConfig for each section
var RACompConfig = {
    "dates": {
        loader: loadRADatesForm,
        w2uiComp: "RADatesForm",
    },
    "people": {
        loader: loadRAPeopleForm,
        w2uiComp: "RAPeopleForm",
    },
    "pets": {
        loader: loadRAPetsGrid,
        w2uiComp: "RAPetsGrid",
    },
    "vehicles": {
        loader: loadRAVehiclesGrid,
        w2uiComp: "RAVehiclesGrid",
    },
    "bginfo": {
        loader: loadRABGInfoForm,
        w2uiComp: "RABGInfoForm",
    },
    "rentables": {
        loader: loadRARentablesGrid,
        w2uiComp: "RARentablesGrid",
    },
    "feesterms": {
        loader: loadRAFeesTermsGrid,
        w2uiComp: "RAFeesTermsGrid",
    },
    "final": {
        loader: null,
        w2uiComp: "",
    },
};
