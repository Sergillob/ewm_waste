sap.ui.define([
    "sap/m/ObjectListItem"
], function (ObjectListItem) {
	//"use strict";
	return ObjectListItem.extend("sl.control.CustomObjectListItem", {
		metadata : {
			properties : {
        cant: {
					type: "Number",
					defaultValue: "0000"
         // id: "inputAddQuan"
				}
      },
			
            aggregations: {
                "editable": {
                  type: "sap.m.Input",
                  "multiple": false       
                },
                "label":{
                  type: "sap.m.Label",
                  "multiple": false
                }
              },
              defaultAggregation: "editable",

			events : {}
		},
	
		// Function called when your control should be rendered. Here you will write your HTML
		renderer : function (oRm, oControl) {
      
        sap.m.ObjectListItemRenderer.render(oRm,oControl); //use superclass renderer routine   
        oRm.write("<li");
        oRm.writeControlData(oControl); //  sets the UI5 ID to control and makes the controls eventable
        
       oRm.addClass(" sapMLIB sapMLIB-CTX sapMLIBShowSeparator sapMLIBTypeInactive sapMLIBFocusable sapMObjLItem sapMObjLListModeDiv ");
       
        oRm.writeClasses();
        oRm.write(">");
        oRm.write("<div");
        oRm.addClass("sapMLIBHighlight sapMLIBHighlightIndication05");
        oRm.writeClasses();
        oRm.write(">");
        oRm.write("</div>");
        oRm.renderControl(oControl.getAggregation("label"));
        oRm.renderControl(oControl.getAggregation("editable"));
        
        oRm.write("</li>");
           // oRm.openStart("tr", oControl.getId())
            //    .renderControl(oControl.getAggregation("editable"))
             //   //.openEnd()
             //   .close("tr");

           // oRm.write("<Input");
           // oRm.write(" value: " + oControl.getTitle());
           // oRm.write(">");
			//oRm.write(oControl.getTitle());
		//	oRm.write("</Input>");
        },

        setCant: function(sValue) {
          this.setProperty("cant", sValue, true);
          return this;
        },
    
        getCant: function() {
          return this.getProperty("cant");
        },
    

		// It is called by the framework while the constructor of an element is executed.
		// Custom Controls should override this hook to implement any necessary initialization.
	//	init : function () {},

		// This function is called before the rendering of the control is started.
		// Custom Controls should override this hook to implement any necessary actions before the rendering.
		//onBeforeRendering : function() {},

		// This function is called when the rendering of the control is completed.
		// Custom Controls should override this hook to implement any necessary actions after the rendering.
		//onAfterRendering : function() {},

		// It is called by the framework while the constructor of an element is executed.
		// Custom Controls should override this hook to implement any necessary cleanup.
		//exit : function () {}
	});
});