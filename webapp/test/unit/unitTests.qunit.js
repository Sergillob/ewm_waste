/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"sl/ewm_waste/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
