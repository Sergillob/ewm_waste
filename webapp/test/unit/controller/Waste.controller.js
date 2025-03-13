/*global QUnit*/

sap.ui.define([
	"sl/ewm_waste/controller/Waste.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Waste Controller");

	QUnit.test("I should test the Waste controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
