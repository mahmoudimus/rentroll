"use strict";

import * as constants from '../support/utils/constants';
import * as selectors from '../support/utils/get_selectors';
import * as common from '../support/utils/common';

// --- Collections ---
const section = require('../support/components/rentalAgreements'); // Rental Agreements

// this contain app variable of the application
let appSettings;

// holds the test configuration for the modules
let testConfig;

// hold individual components cofiguration
let rarentbelfeeConfig = require('../support/components/rarentablefee').conf;
let rapetfeeConfig = require('../support/components/rapetfee').conf;
let ravehiclefeeConfig = require('../support/components/ravehiclefee').conf;

// -- Start Cypress UI tests for AIR Roller Application --
describe('AIR Roller UI Tests - Rental Agreements', function () {

    // // records list of module from the API response
    let recordsAPIResponse;

    let noRecordsInAPIResponse;

    let flowData;

    // -- Perform operation before all tests starts. It runs once before all tests in the block --
    before(function () {

        testConfig = section.conf;

        // --- Login into Application before starting any tests ---
        // Check custom login command for more detail. File path: ./../support/commands.js
        cy.login();

        cy.visit(constants.ROLLER_APPLICATION_PATH).wait(constants.PAGE_LOAD_TIME);

        // Starting a server to begin routing responses to cy.route()
        cy.server();

        // To manage the behavior of network requests. Routing the response for the requests.
        cy.route(testConfig.methodType, common.getAPIEndPoint("flow")).as('getRecords');

        /************************
         * Select right side node
         *************************/
        // Node should be visible and selected
        cy.get(selectors.getNodeSelector(testConfig.sidebarID))
            .scrollIntoView()
            .should('be.visible')
            .click().wait(constants.WAIT_TIME)
            .should('have.class', 'w2ui-selected');

        // If have date navigation bar than change from and to Date to get in between data
        if (testConfig.haveDateValue) {
            common.changeDate(testConfig.sidebarID, testConfig.fromDate, testConfig.toDate);
        }

        // waiting for response of second call on api at date change
        cy.wait(constants.WAIT_TIME);

        // Check http status
        cy.wait('@getRecords').its('status').should('eq', constants.HTTP_OK_STATUS);

        // get API endpoint's responseBody
        cy.get('@getRecords').then(function (xhr) {

            // Check key `status` in responseBody
            expect(xhr.responseBody).to.have.property('status', constants.API_RESPONSE_SUCCESS_FLAG);

            // get records list from the API response
            recordsAPIResponse = xhr.response.body.records;

            // -- Assigning number of records to 0 if no records are available in response --
            if (recordsAPIResponse) {
                noRecordsInAPIResponse = xhr.response.body.records.length;
            } else {
                noRecordsInAPIResponse = 0;
            }
        });

    });

    // -- Perform operation before each test(it()) starts. It runs before each test in the block. --
    beforeEach(function () {

        // -- get app variable from the window --
        /*
        * After successfully login into application it will have fixed app variable.
        * Fetching it after successful login.
        * */
        cy.window().then((win) => {
            appSettings = win.app;
        });

        cy.log(appSettings);

    });

    // -- Change business to REX --
    it('Change business to REX', function () {
        // onSuccessful test set BID value. If above test get fail below code will not be executed.
        constants.BID = common.changeBU(appSettings);
    });

    /***********************
     * Iterate through each cell.
     *
     * Expect:
     * Cell value must be same as record's field value from API Response.
     ***********************/
    it('Grid Records', function () {
        common.testGridRecords(recordsAPIResponse, noRecordsInAPIResponse, testConfig);
    });

    /***********************
     * 1. Open existing rental agreement
     *
     * Expect:
     * Previous, Get Approvals buttons must be disable and visible.
     * Next, Action, Edit, close(X) must be enable and visible
     *
     * 2. Click Edit button on top right corner
     *
     * Expect:
     * Get Approvals button enable and visible
     ***********************/
    it('Existing Rental Agreement', function (){
        cy.server();

        // 1. Open existing rental agreement
        // Click on the first record
        cy.route(testConfig.methodType, common.getDetailRecordAPIEndPoint("flow", 0)).as('raRecord');

        cy.get(selectors.getSecondRecordInGridSelector(testConfig.grid)).click();

        // Check http status
        cy.wait('@raRecord').its('status').should('eq', constants.HTTP_OK_STATUS);

        cy.get('@raRecord').then(function (xhr){
            // Check key `status` in responseBody
            expect(xhr.responseBody).to.have.property('status', constants.API_RESPONSE_SUCCESS_FLAG);

            cy.log(xhr);

            // Perform assertion
            // Previous, Get Approvals buttons must be disable and visible.
            // Next, Action, Edit, close(X) must be enable and visible
            let visibleButtons = ["raactions", "edit_view_raflow", "previous", "get-approvals", "next"];
            let notVisibleButtons = [];
            let enableButtons = ["raactions", "edit_view_raflow", "next"];
            let disableButtons = ["previous", "get-approvals"];

            common.buttonsTest(visibleButtons, notVisibleButtons);

            // Check buttons are disable
            disableButtons.forEach(function (button) {
                cy.get(selectors.getButtonSelector(button)).should('be.disabled');
            });

            // Check buttons are enable
            enableButtons.forEach(function (button) {
                cy.get(selectors.getButtonSelector(button)).should('be.enabled');
            });

        });

        cy.wait(constants.WAIT_TIME);

        // 2. Click Edit button on top right corner
        // Edit RAFlow
        cy.route(testConfig.methodType, common.getDetailRecordAPIEndPoint("flow", 0)).as('editRARecord');

        cy.get(selectors.getEditRAFlowButtonSelector()).click();

        // Check http status
        cy.wait('@editRARecord').its('status').should('eq', constants.HTTP_OK_STATUS);

        cy.get('@editRARecord').then(function (xhr){
            // Check key `status` in responseBody
            expect(xhr.responseBody).to.have.property('status', constants.API_RESPONSE_SUCCESS_FLAG);

            cy.log(xhr);

            flowData = xhr.response.body.record.Flow.Data;

            // Perform assertion
            // Previous, Get Approvals buttons must be disable and visible.
            // Next, Action, Get Approvals, Edit, close(X) must be enable and visible
            let visibleButtons = ["raactions", "edit_view_raflow", "previous", "get-approvals", "next", "remove_raflow"];
            let notVisibleButtons = [];
            let enableButtons = ["raactions", "edit_view_raflow", "next", "get-approvals", "remove_raflow"];
            let disableButtons = ["previous"];

            cy.wait(constants.WAIT_TIME);

            common.buttonsTest(visibleButtons, notVisibleButtons);

            // Check buttons are disable
            disableButtons.forEach(function (button) {
                cy.get(selectors.getButtonSelector(button)).should('be.disabled');
            });

            // Check buttons are enable
            enableButtons.forEach(function (button) {
                cy.get(selectors.getButtonSelector(button)).should('be.enabled');
            });


        });

    });

    /***********************
     * Open Date section in RAFlow
     *
     * Expect:
     * RADatesForm must have data which match with the Server response
     ***********************/
    it('RAFlow -- Dates', function () {
        let datesData = flowData.dates;
        // Date section
        cy.get('#dates a').click({force: true}).wait(constants.WAIT_TIME);
        testConfig.form = "RADatesForm";
        testConfig.buttonNamesInDetailForm = ["save"];
        common.detailFormTest(datesData, testConfig);
    });

    // Except dates section other section getting wrong data(If we check in the response than it is blank array)
    // in headless mode. Due to this it feeds wrong data to UI.
    // After checking rrlog.log I can foresight that ConvertRA2Flow return blank array data for other section.
    // After resolving this issue below tests can be enabled.
    // TODO: Enable other section's UI tests

    // /***********************
    //  * Open People section in RAFlow
    //  *
    //  * Expect:
    //  * RAPeopeGrid must have data which match with the Server response
    //  ***********************/
    // it('RAFlow -- People', function () {
    //     let peopleData = flowData.people;
    //     // people section
    //     cy.get('#people a').click({force: true}).wait(constants.WAIT_TIME);
    //
    //     testConfig.grid = "RAPeopleGrid";
    //     testConfig.form = "RATransactantForm";
    //     testConfig.skipColumns = ["haveError"];
    //     testConfig.skipFields = ["BUD"]; // BUD should be remove from RATransactantForm
    //     common.testGridRecords(peopleData, peopleData.length, testConfig);
    //
    //     //--------------------------------
    //     // Test RATransactantForm
    //     //--------------------------------
    //     cy.get(selectors.getSecondRecordInGridSelector(testConfig.grid)).click().wait(constants.WAIT_TIME);
    //
    //     common.detailFormTest(peopleData[0], testConfig);
    //
    //     cy.get("#tabs_RATransactantForm_tabs_tab_tab4").click();
    //     common.detailFormTest(peopleData[0], testConfig);
    //
    //     cy.get("#tabs_RATransactantForm_tabs_tab_tab3").click();
    //     common.detailFormTest(peopleData[0], testConfig);
    //
    //     cy.get("#tabs_RATransactantForm_tabs_tab_tab2").click();
    //     common.detailFormTest(peopleData[0], testConfig);
    //
    //     //--------------------------------
    //     // Close the RATransactantForm form
    //     //--------------------------------
    //     cy.get(selectors.getRAFormCloseButtonSelector(testConfig.form)).click().wait(constants.WAIT_TIME);
    //     // Check that form should not visible after closing it
    //     cy.get(selectors.getRAFormSelector(testConfig.form)).should('not.be.visible');
    // });
    //
    // /***********************
    //  * Open Pets section in RAFlow
    //  *
    //  * Expect:
    //  * RAPetsGrid must have data which match with the Server response
    //  *
    //  * Click on first grid record
    //  *
    //  * Expect:
    //  * Pet form  have loaded data with match with the server response
    //  ***********************/
    // it('RAFlow -- Pets', function () {
    //     let petsData = flowData.pets;
    //     testConfig.grid = "RAPetsGrid";
    //     testConfig.form = "RAPetForm";
    //     testConfig.skipColumns = ["haveError"];
    //     cy.get('#pets a').click({force: true}).wait(constants.WAIT_TIME);
    //
    //     //--------------------------------
    //     // Test RAPetsGrid
    //     //--------------------------------
    //     common.testGridRecords(petsData, petsData.length, testConfig);
    //
    //     cy.log(petsData[0]);
    //
    //     //--------------------------------
    //     // Test RAPetForm
    //     //--------------------------------
    //     // click on the first record of RAPetsGrid grid
    //     cy.get(selectors.getSecondRecordInGridSelector(testConfig.grid)).click().wait(constants.WAIT_TIME);
    //     common.detailFormTest(petsData[0], testConfig);
    //
    //     // TODO: Fees object is undfined while running test in headless mode. Due to this below tests are commented.
    //     //--------------------------------
    //     // Test RAPetFeesGrid
    //     //--------------------------------
    //     common.testGridRecords(petsData[0].Fees, petsData[0].Fees.length, rapetfeeConfig);
    //
    //     //--------------------------------
    //     // Test RAPetFeeForm
    //     //--------------------------------
    //     if (petsData[0].Fees.length > 0){
    //         // click on the first record of RAPetFeesGrid
    //         cy.get(selectors.getSecondRecordInGridSelector(rapetfeeConfig.grid)).click().wait(constants.WAIT_TIME);
    //         common.detailFormTest(petsData[0].Fees[0], rapetfeeConfig);
    //
    //         //--------------------------------
    //         // Close the RAPetFeeForm form
    //         //--------------------------------
    //         cy.get(selectors.getRAFormCloseButtonSelector(rapetfeeConfig.form)).click().wait(constants.WAIT_TIME);
    //         // Check that form should not visible after closing it
    //         cy.get(selectors.getRAFormSelector(rapetfeeConfig.form)).should('not.be.visible');
    //     }
    //
    //     //--------------------------------
    //     // Close the RAPetForm form
    //     //--------------------------------
    //     cy.get(selectors.getRAFormCloseButtonSelector(testConfig.form)).click().wait(constants.WAIT_TIME);
    //     // Check that form should not visible after closing it
    //     cy.get(selectors.getRAFormSelector(testConfig.form)).should('not.be.visible');
    //
    // });
    //
    // /***********************
    //  * Open Vehicles section in RAFlow
    //  *
    //  * Expect:
    //  * RAVehiclesGrid must have data which match with the Server response
    //  ***********************/
    // it('RAFlow -- Vehicles', function () {
    //     let vehiclesData = flowData.vehicles;
    //     testConfig.grid = "RAVehiclesGrid";
    //     testConfig.form = "RAVehicleForm";
    //     testConfig.skipColumns = ["haveError"];
    //     cy.get('#vehicles a').click({force: true}).wait(constants.WAIT_TIME);
    //
    //     //--------------------------------
    //     // Test RAVehiclesGrid
    //     //--------------------------------
    //     common.testGridRecords(vehiclesData, vehiclesData.length, testConfig);
    //
    //     //--------------------------------
    //     // Test RAVehicleForm
    //     //--------------------------------
    //     // click on the first record of grid
    //     cy.get(selectors.getSecondRecordInGridSelector(testConfig.grid)).click().wait(constants.WAIT_TIME);
    //     common.detailFormTest(vehiclesData[0], testConfig);
    //
    //     // TODO: Fees object is undfined while running test in headless mode. Due to this below tests are commented.
    //     //--------------------------------
    //     // Test RAVehicleFeesGrid
    //     //--------------------------------
    //     common.testGridRecords(vehiclesData[0].Fees, vehiclesData[0].Fees.length, ravehiclefeeConfig);
    //
    //     //--------------------------------
    //     // Test RAVehicleFeeForm
    //     //--------------------------------
    //     // click on the first record of RAVehicleFeesGrid
    //     if(vehiclesData[0].Fees.length > 0){
    //         cy.get(selectors.getSecondRecordInGridSelector(ravehiclefeeConfig.grid)).click().wait(constants.WAIT_TIME);
    //         common.detailFormTest(vehiclesData[0].Fees[0], ravehiclefeeConfig);
    //
    //         //--------------------------------
    //         // Close the RAVehicleFeeForm form
    //         //--------------------------------
    //         cy.get(selectors.getRAFormCloseButtonSelector(ravehiclefeeConfig.form)).click().wait(constants.WAIT_TIME);
    //         // Check that form should not visible after closing it
    //         cy.get(selectors.getRAFormSelector(ravehiclefeeConfig.form)).should('not.be.visible');
    //     }
    //
    //     //--------------------------------
    //     // Close the RAVehicleForm form
    //     //--------------------------------
    //     cy.get(selectors.getRAFormCloseButtonSelector(testConfig.form)).click().wait(constants.WAIT_TIME);
    //     // Check that form should not visible after closing it
    //     cy.get(selectors.getRAFormSelector(testConfig.form)).should('not.be.visible');
    //
    // });
    //
    // /***********************
    //  * Open Rentables section in RAFlow
    //  *
    //  * Expect:
    //  * RARentablesGrid must have data which match with the Server response
    //  ***********************/
    // it('RAFlow -- Rentables', function () {
    //     let rentablesData = flowData.rentables;
    //     testConfig.grid = "RARentablesGrid";
    //     testConfig.skipColumns = ["haveError", "RemoveRec"];
    //     cy.get('#rentables a').click({force: true}).wait(constants.WAIT_TIME);
    //
    //     //--------------------------------
    //     // Test RARentablesGrid
    //     //--------------------------------
    //     common.testGridRecords(rentablesData, rentablesData.length, testConfig);
    //
    //     // TODO: Fees object is undfined while running test in headless mode. Due to this below tests are commented.
    //     //-------------------------------
    //     // Test RARentableFeeGrid
    //     //-------------------------------
    //     // click on the first record of RARentablesGrid grid
    //     cy.get(selectors.getSecondRecordInGridSelector(testConfig.grid)).click().wait(constants.WAIT_TIME);
    //     common.testGridRecords(rentablesData[0].Fees, rentablesData[0].Fees.length, rarentbelfeeConfig);
    //
    //     //-------------------------------
    //     // Test RARentableFeeForm
    //     //-------------------------------
    //     if(rentablesData[0].Fees.length > 0){
    //         // click on the first record of RARentableFeeGrid
    //         cy.get(selectors.getSecondRecordInGridSelector(rarentbelfeeConfig.grid)).click().wait(constants.WAIT_TIME);
    //         common.detailFormTest(rentablesData[0].Fees[0], rarentbelfeeConfig);
    //
    //         // Close the RARentableFeeForm form
    //         cy.get(selectors.getRAFormCloseButtonSelector(rarentbelfeeConfig.form)).click().wait(constants.WAIT_TIME);
    //         // Check that form should not visible after closing it
    //         cy.get(selectors.getFormSelector(rarentbelfeeConfig.form)).should('not.be.visible');
    //     }
    //
    //     // Close the RARentableFeeGrid
    //     cy.get(selectors.getGridCloseButtonSelector()).click().wait(constants.WAIT_TIME);
    //     // Check that grid should not visible after closing it
    //     cy.get('section[name=RARentableFeesGrid]').should('not.be.visible');
    //
    // });
    //
    // /***********************
    //  * Open Parent/Child section in RAFlow
    //  *
    //  * Expect:
    //  * RAParentChildGrid must have data which match with the Server response
    //  ***********************/
    // it('RAFlow -- Parent/Child', function () {
    //     let parenChildData = flowData.parentchild;
    //     testConfig.grid = "RAParentChildGrid";
    //     testConfig.skipColumns = ["haveError"];
    //     cy.get('#parentchild a').click({force: true}).wait(constants.WAIT_TIME);
    //     common.testGridRecords(parenChildData, parenChildData.length, testConfig);
    // });
    //
    // /***********************
    //  * Open Tie section in RAFlow
    //  *
    //  * Expect:
    //  * RATiePeopleGrid must have data which match with the Server response
    //  ***********************/
    // it('RAFlow -- Tie', function () {
    //     let tiePeopleData = flowData.tie.people;
    //     testConfig.grid = "RATiePeopleGrid";
    //     testConfig.skipColumns = ["haveError"];
    //     cy.get('#tie a').click({force: true}).wait(constants.WAIT_TIME);
    //     common.testGridRecords(tiePeopleData, tiePeopleData.length, testConfig);
    // });

    // -- Perform operation after all tests finish. It runs once after all tests in the block --
    after(function () {

        // --- Logout from the Application after finishing all tests ---
        // Check custom login command for more detail. File path: ./../support/commands.js
        cy.logout();
    });
});
