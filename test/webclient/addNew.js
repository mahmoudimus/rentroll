"use strict";

var common = require("./common.js");
var w2ui_utils = require("./w2ui_utils.js");

exports.w2uiAddNewButtonTest = function (addNewButtonConfig) {
    var testCount = addNewButtonConfig.testCount;
    var testName = "w2ui add new button [{0}] test".format(addNewButtonConfig.form);

    casper.test.begin(testName, testCount, {
        //do basic setup first
        setUp: function (/*test*/) {
            //form name
            this.form = addNewButtonConfig.form;

            //grid name
            this.grid = addNewButtonConfig.grid;

            // //row number
            // this.row = addNewButtonConfig.row;

            //to open a grid
            this.sidebarID = addNewButtonConfig.sidebarID;

            //list of input fields
            this.inputFields = addNewButtonConfig.inputField;

            //list of input select fields
            this.inputSelectField = addNewButtonConfig.inputSelectField;

            //capture name
            this.capture = addNewButtonConfig.capture;

            //Button name and class
            this.buttonName = addNewButtonConfig.buttonName;

            casper.click("#" + w2ui_utils.getSidebarID(this.sidebarID));
            casper.log('[FormTest] [{0}] sidebar node clicked with ID: "{1}"'.format(this.grid, this.sidebarID), 'debug', logSpace);
        },

        test: function (test) {
            var that = this;

            casper.wait(common.waitTime, function clickAddNewButton() {
                //It will click table cell with the text 'Add New'
                casper.clickLabel("Add New", "td");
            });

            casper.wait(common.waitTime, function testRightPanel() {
                // common.capture(that.capture);

                // Right panel rendering
                test.assertExists("#" + w2ui_utils.getRightPanelID());

                // BUD Field Test
                test.assertSelectorExists(w2ui_utils.getBUDSelector());
                var businessUnitValue = casper.evaluate(function getBusinessUnit(bud_selector) {
                    return document.querySelector(bud_selector).value;
                }, w2ui_utils.getBUDSelector());

                if(businessUnitValue === "REX"){
                    test.assert(true, "Business Unit value is {0}.".format(businessUnitValue))
                }else {
                    test.assert(false, "Wrong Business unit");
                }

                var isBusinessUnitValueDisabled = casper.evaluate(function (bud_selector) {
                    return document.querySelector(bud_selector).disabled;
                }, w2ui_utils.getBUDSelector());

                test.assert(isBusinessUnitValueDisabled, "Disability of business unit field.");

                // Input fields test
                that.inputFields.forEach(function (inputFieldID) {
                    var inputFieldSelector = w2ui_utils.getInputFieldSelector(inputFieldID);
                    // test.assertExists(inputFieldSelector);

                    var isVisible = casper.evaluate(function inputFieldVisibility(inputFieldSelector) {
                        return isVisibleInViewPort(document.querySelector(inputFieldSelector));
                    }, inputFieldSelector);

                    test.assert(isVisible, "{0} input field is visible to remote screen.".format(inputFieldID));

                    var inputFieldValue = casper.evaluate(function (inputFieldSelector) {
                        return document.querySelector(inputFieldSelector).value;
                    }, inputFieldSelector);

                    if (inputFieldValue === "") {
                        test.assert(true, "{0} field is blank".format(inputFieldID));
                    }
                    else {
                        test.assert(false, "{0} field is not blank".format(inputFieldID));
                    }
                });

                // Dropdown Input fields test
                that.inputSelectField.forEach(function (inputSelectField) {
                    var inputSelectFieldSelector = w2ui_utils.getInputSelectFieldSelector(inputSelectField.fieldID);
                    // test.assertExists(inputSelectFieldSelector);

                    var isVisible = casper.evaluate(function selectFieldVisibility(selectField) {
                        return isVisibleInViewPort(document.querySelector(selectField));
                    }, inputSelectFieldSelector);

                    test.assert(isVisible, "{0} field is visible to remote screen".format(inputSelectField.fieldID));

                    var inputSelectFieldValue = casper.evaluate(function (inputSelectFieldSelector) {
                        return document.querySelector(inputSelectFieldSelector).value;
                    }, inputSelectFieldSelector);

                    if (inputSelectFieldValue === inputSelectField.value){
                        test.assert(true, "{0} have default value {1}".format(inputSelectField.fieldID, inputSelectField.value));
                    }else {
                        test.assert(false, "{0} have different default value.".format(inputSelectField.fieldID));
                    }
                });

                // Form Button rendering test
                that.buttonName.forEach(function (btnName) {
                    // test.assertExists(w2ui_utils.getW2UIButtonReferanceSelector(btnName));

                    var isVisible = casper.evaluate(function formButtonVisibility(btnNode) {
                        return isVisibleInViewPort(document.querySelector(btnNode));
                    }, w2ui_utils.getW2UIButtonReferanceSelector(btnName));

                    test.assert(isVisible, "[{0}] is visible to remote screen.".format(btnName));
                });



                // Form field rendering
                common.capture(that.capture);

                test.done();
            });
        }
    });
};