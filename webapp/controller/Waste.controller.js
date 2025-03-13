sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    'sap/ui/core/library',
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/ObjectListItem",
    "sap/m/Input",
    "sl/ewmwaste/control/CustomObjectListItem"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, coreLibrary, MessageBox, MessageToast, ObjectListItem, Input, CustomObjectListItem) {
        "use strict";

        if (sap.ushell.Container.attachLogoutEvent) {
            sap.ushell.Container.attachLogoutEvent(function () {
                //Cuando el usaurio hace log out no se limpiaba el sessionStorage ya que depende de si la pestaña del navegador está abierta o no. Con este evento lo forzamos
                sessionStorage.clear();
            });
        }

        let _aTasks = {};
        let atasksAux = {};
        let yaEscaneados = [];

        return Controller.extend("sl.ewmwaste.controller.Waste", {

            onInit: function () {

                _aTasks = {}; //Limpiamos las tareas al empezar

                this.obtenerAlmacen();

                jQuery.sap.delayedCall(500, this, function () {
                    this.getView().byId("inputAddTask").focus();
                });
                // this.Cantidad = 0;
                this.idDiferent = 0;
            },

            obtenerAlmacen: async function () {

                try {

                    //Chequeamos que almacen tiene permiso el usuario
                    await this._permisosUsuario();

                    let numAlmacen = sessionStorage.getItem("numAlmacen");

                    this.numAlmacen = numAlmacen;

                    if (this.numAlmacen === '2000') {
                        this.oModel = this.getOwnerComponent().getModel("SUDE");
                    } else {
                        this.oModel = this.getOwnerComponent().getModel("VFCA");
                    }


                } catch (err) {
                    console.log(err)
                }
            },

            _permisosUsuario: async function () {

                //Miramos si tenemos Almacen en la memoria del navegador
                let name = sessionStorage.getItem("almacen");
                let numAlm = sessionStorage.getItem("numAlmacen");

                if (name) {
                    let almacen = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("almacen");
                    let vtext = almacen + ': ' + name;
                    this.getView().byId("idTitleCap").setText(vtext);
                    //Devolvemos solo lo que está dentro del paréntesis
                    var numb = name.match(/\(([^)]+)\)/)[1]; //match(/\d/g);

                    return numAlm

                } else {
                    //Vamos a buscar el que tiene por defecto;
                    //Si tiene ROL ADMIN, pondremos el que tiene por defecto, si no lo tiene, solo debería tener 1, si tiene más damos error!!

                    let oModel = this.getOwnerComponent().getModel("permisosAlmacenes");
                    let vQuery = "/ZCDSEWM_WN_02";
                    let that = this;

                    sap.ui.core.BusyIndicator.show(0);
                    const oPromise = await new Promise((resolve, reject) => {

                        oModel.read(vQuery, {

                            success: function (oData, oResponse) {

                                sap.ui.core.BusyIndicator.hide();
                                resolve(oResponse.data.results[0].lgnum);
                                //Determinamos Visualización por Defecto
                                if (oResponse.data.results.length === 1) {
                                    //Solo hay 1 registro, lo visualizamos por defecto
                                    let sFormated = oResponse.data.results[0].descripcion + " (" + oResponse.data.results[0].almacen + ")";
                                    that.getView().byId("idTitleCap").setText(sFormated);
                                    //Lo pasamos a memoria
                                    sessionStorage.setItem("almacen", sFormated);
                                    sessionStorage.setItem("numAlmacen", oResponse.data.results[0].lgnum);
                                    return oResponse.data.results[0].lgnum

                                } else {
                                    //Si tiene el rol ZEWM_ADMIN, lo visualizamos por defecto
                                    const rolAdmin = oResponse.data.results.filter(element => element.rol === "ZEWM_ADMIN");
                                    if (rolAdmin.length > 0) {
                                        let sFormated = rolAdmin[0].descripcion + " (" + rolAdmin[0].almacen + ")";
                                        let sNumAlmacen = rolAdmin[0].lgnum;
                                        that.getView().byId("idTitleCap").setText(sFormated);
                                        //Lo pasamos a memoria
                                        sessionStorage.setItem("almacen", sFormated);
                                        sessionStorage.setItem("numAlmacen", sNumAlmacen);
                                        return rolAdmin[0].lgnum

                                    } else {
                                        //Pasamos a un array de 3 columnas (eliminamos el rol, que solo necesitábamos para el tema del ADMIN, almacén por defecto)
                                        let newArr = oResponse.data.results.map(function (val) {
                                            return {
                                                almacen: val.almacen,
                                                descripcion: val.descripcion,
                                                lgnum: val.lgnum
                                            }
                                        });
                                        //Eliminamos duplicidades
                                        let almacenFinal = newArr.filter(
                                            (person, index) => index === newArr.findIndex(
                                                other => person.almacen === other.almacen &&
                                                    person.descripcion === other.descripcion &&
                                                    person.lgnum === other.lgnum
                                            ));
                                        //Comprobamos si tiene 1 o más de un almacén
                                        if (almacenFinal.length > 1) {
                                            //ERROR!!!!
                                            let almacen = that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("almacen");
                                            let vtext = almacen + ': null ';
                                            that.getView().byId("idTitleCap").setText(vtext);
                                            var sMessage = that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errorVariosAlmacenes");
                                            MessageBox.error(sMessage);
                                            //Lo ponemos en un setTimeout para que le de tiempo de leer el mensaje
                                            //al usuario... 5 seg antes de navegar al FLP !!!
                                            setTimeout(function () {
                                                //Navegamos al Launchpad directamente
                                                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
                                                // Navigate back to FLP home
                                                //oCrossAppNavigator.hrefForExternal( { target : { shellHash : "#" } });
                                                oCrossAppNavigator.toExternal({
                                                    target: {
                                                        semanticObject: "#"
                                                    }
                                                });
                                            }, 5000);
                                        } else {
                                            //OK, visualizamos Almacén que tiene permiso
                                            let sFormated = almacenFinal[0].descripcion + " (" + almacenFinal[0].almacen + ")";
                                            that.getView().byId("idTitleCap").setText(sFormated);
                                            //Lo pasamos a memoria
                                            sessionStorage.setItem("almacen", sFormated);
                                            sessionStorage.setItem("numAlmacen", almacenFinal[0].lgnum);
                                            return almacenFinal[0].lgnum
                                        }
                                    }
                                }
                            },

                            error: function (oError) {
                                reject(oError);
                                sap.ui.core.BusyIndicator.hide();
                                that.getView().byId("idTitleCap").setText(null);
                            }

                        })

                    })
                }
            },

            onScan: function (oEvent) {

                let oInput = oEvent.getSource();
                oInput.setValue(this._formatScannedValue(oInput));
                this._onPressAddTask(oEvent);
            },

            _onPressAddTask: function (oEvent) {
                let oInputAddTask = this.getView().byId("inputAddTask");
                let sTaskDescription = oInputAddTask.getValue();

                let oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                let sSeleccionRadio;
                if (this.getView().byId("Rad1").getSelected()) {
                    sSeleccionRadio = 'P'; //Radiobuton seleccionado por Pallet (defecto)
                } else {
                    sSeleccionRadio = 'A'
                }; //Radiobuton selecionado por Artículo

                if (sTaskDescription) {
                    let that = this;

                    let filtre = "ZARTICLE_ID eq '" + sTaskDescription + "'" + "and LGNUM eq '" + this.numAlmacen + "'" + "and RAD eq '" + sSeleccionRadio + "'";

                    //Limpiamos auxiliar
                    atasksAux = {};

                    this.oModel.read("/CheckMaterialSet", {
                        urlParameters: {
                            "$filter": filtre

                        },

                        success: function (oData, oResponse) {
                            let sStatus;
                            let sTipo; // 'Error'; //'Warning'; //'Success';

                            let wa_yaescaneados = {};

                            //Chequeamos que el art escaneado no se haya escaneado antes                                 
                            let oArticleScanned = yaEscaneados.find(x => x.zarticle_id === oData.results[0].ZARTICLE_ID);

                            if (oArticleScanned) {

                                //Error message
                                let sError = oResourceBundle.getText("errorRepetido");
                                that.getView().byId("inputAddTask").setValue("");
                                MessageBox.error(sError);
                                jQuery.sap.delayedCall(500, that, function () {
                                    that.getView().byId("inputAddTask").focus();
                                });
                                return;
                            }


                            //Chequeamos que si se escanea por Pallet no lo hayamos escaneado antes
                            if (sSeleccionRadio === 'P') {
                                let oPalletScanned = yaEscaneados.find(x => x.zpallet_id === oData.results[0].ZPALLET_ID && x.rad === 'P');

                                if (oPalletScanned) {
                                    //Error message
                                    let sError = oResourceBundle.getText("errorRepetido2");
                                    that.getView().byId("inputAddTask").setValue("");
                                    MessageBox.error(sError);
                                    jQuery.sap.delayedCall(500, that, function () {
                                        that.getView().byId("inputAddTask").focus();
                                    });
                                    return;
                                }
                            }

                            //Chequeamos que si se escanea por Artículo no hayamos escaneado por Pallet antes que contenga ese artículo
                            if (sSeleccionRadio === 'A') {
                                let oPalletScanned = yaEscaneados.find(x => x.zpallet_id === oData.results[0].ZPALLET_ID && x.rad === 'P');

                                if (oPalletScanned) {
                                    //Error message
                                    let sError = oResourceBundle.getText("errorRepetido3");
                                    that.getView().byId("inputAddTask").setValue("");
                                    MessageBox.error(sError);
                                    jQuery.sap.delayedCall(500, that, function () {
                                        that.getView().byId("inputAddTask").focus();
                                    });
                                    return;
                                }
                            }

                            //Antes de visualizar por pantalla, debemos de actualizar la cantidad por si han escaneado por artículo y luego por pallet (y contiene el artículo escaneado)
                            if (sSeleccionRadio === 'P') {

                                //Buscamos si ese pallet_id está en ya_escaneados como artículo , tipo 'A'
                                //y le restamos la cantidad
                                yaEscaneados.forEach(x => {
                                    if ((x.zpallet_id === oData.results[0].ZPALLET_ID) && (x.rad === 'A')) {
                                        //Formateamos sin el punto de miles
                                        let smeters = oData.results[0].ZMETERS.replace(/\./g, '');
                                        let metersescan = x.zmeters.replace(/\./g, '');
                                        smeters = smeters - metersescan; //x.zmeters;
                                        // iSum += parseFloat(smeters);
                                        oData.results[0].ZMETERS = smeters.toLocaleString("de-DE"); //Ponemos el punto de miles

                                    }
                                });
                            }



                            let task = that._addTask(sTaskDescription, sSeleccionRadio);

                            //Guardamos array de artículos con su pallet ya escaneado
                            wa_yaescaneados = {
                                "zarticle_id": oData.results[0].ZARTICLE_ID,
                                "zpallet_id": oData.results[0].ZPALLET_ID,
                                "zmeters": oData.results[0].ZMETERS,
                                "rad": sSeleccionRadio,
                                "id": task.id
                            }
                            yaEscaneados.push(wa_yaescaneados);

                            oData.results.forEach(element => {

                                sTaskDescription = element.ZMATERIAL + " (" + element.ZMETERS + " M)";
                                atasksAux.idscan = sTaskDescription;
                                atasksAux.quan = element.ZMETERS;
                                if (sSeleccionRadio === 'P') {
                                    atasksAux.palet = "Pal: " + element.ZPALLET_ID;
                                    atasksAux.items = "Items: " + element.ITEMS;
                                }

                                // atasksAux.status = "Status: " + element.ZZSTOCK_TYPE; // + "( " + element.ZZSTOCKDESCR + " )";
                                atasksAux.id = task.id;
                                atasksAux.zrad = sSeleccionRadio;
                                atasksAux.zarticle_id = element.ZARTICLE_ID;
                                atasksAux.zpallet_id = element.ZPALLET_ID;

                                that._createListItem(atasksAux);
                            });

                            oInputAddTask.setValue("");

                            jQuery.sap.delayedCall(100, that, function () {
                                that.getView().byId("inputAddTask").focus();
                            });
                        },
                        error: function (oError) {
                            // sap.ui.core.BusyIndicator.hide();
                            let sMessage = oError.statusCode !== 500 &&
                                JSON.parse(oError.responseText).error.message.value &&
                                JSON.parse(oError.responseText).error.message.value !== "" ?
                                JSON.parse(oError.responseText).error.message.value :
                                oResourceBundle.getText("errorScan");
                            MessageBox.error(sMessage);
                            that.getView().byId("inputAddTask").setValue("");
                        }
                    });
                }
            },

            onPressPost: function (oEvent) {

                let sSeleccionRadio;
                if (this.getView().byId("Rad1").getSelected()) {
                    sSeleccionRadio = 'P'; //Radiobuton seleccionado por Pallet (defecto)
                } else {
                    sSeleccionRadio = 'A'; //Radiobuton selecionado por Artículo
                };

                let oModelScan = this.getView().getModel("Scans");

                //Recuperamos las cantidades entradas por pantalla y las añadimos al modelo "Scans"
                this.getView().byId("listTodo").getItems().forEach(element => {
                    //Para cada posición vamos a buscar el Custom data indice 4 que contiene el indice del id del input dinámico
                    let indice = element.getCustomData()[4].getProperty("value");
                    let cantidadEntrada = this.getView().byId(indice).getValue();
                    //Añadimos la cantidad al Modelo
                    //Primero buscamos a que articulo se lo tenemos que añadir
                    let articulo = element.getCustomData()[2].getProperty("value");

                    oModelScan.forEach(element => {
                        if (element.zarticle_id === articulo) {
                            //Si tiene punto de miles lo sacamos
                            cantidadEntrada = cantidadEntrada.replace(/\./g, '');
                            element.zcantidad = cantidadEntrada;
                        }
                    });
                });

                let oPage = this.getView().byId("page");
                oPage.setBusy(true);
                const string = JSON.stringify(oModelScan); // convert Object to a String
                let encodeString = btoa(string); // Base64 encode the String

                //var oModel = this.oModel; //this.getView().getModel();
                let oEntry = {
                    "Key": "X",
                    "Value": encodeString,
                    "LGNUM": this.numAlmacen,
                    "RAD": sSeleccionRadio
                };


                let oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                let that = this;
                this.oModel.create("/PostWasteSet", oEntry, {
                    success: function (oData, oResponse) {
                        oPage.setBusy(false);
                        //Limpiamos Tabla de scaneos (si todo ha ido bien)

                        _aTasks = {};
                        that._saveTasks();
                        yaEscaneados = [];
                        that.getView().byId("listTodo").destroyItems();
                        var oListTodo = that.getView().byId("listTodo");
                        var arr = oListTodo.getItems();
                        arr.forEach(element => {
                            that._deleteListItem(element);
                        });

                        let sMessage = oResourceBundle.getText("WasteOK");
                        MessageBox.success(sMessage);
                    },

                    error: function (oError) {
                        oPage.setBusy(false);
                        _aTasks = {};
                        that._saveTasks();
                        yaEscaneados = [];
                        that.getView().byId("listTodo").destroyItems();
                        var oListTodo = that.getView().byId("listTodo");
                        var arr = oListTodo.getItems();
                        arr.forEach(element => {
                            that._deleteListItem(element);
                        });
                        let sMessage = oError.statusCode !== 500 &&
                            JSON.parse(oError.responseText).error.message.value &&
                            JSON.parse(oError.responseText).error.message.value !== "" ?
                            JSON.parse(oError.responseText).error.message.value :
                            oResourceBundle.getText("WasteKO");
                        MessageBox.error(sMessage);
                    }
                });

            },

            onSelect1: function () {
                jQuery.sap.delayedCall(500, this, function () {
                    this.getView().byId("inputAddTask").focus();
                });
            },

            onSelect2: function () {
                jQuery.sap.delayedCall(500, this, function () {
                    this.getView().byId("inputAddTask").focus();
                });
            },

            onDeleteItem: function (oEvent) {
                this._deleteListItem(oEvent.getParameter("listItem"));
            },

            _formatScannedValue: function (oInput) {
                var sValue = oInput.getValue();
                //Etiquetas en general
                if (sValue && sValue.substring(0, 2) === "##") {
                    sValue = sValue.substring(2);
                }
                //Etiquetas cartones
                if (sValue.length === 32) {
                    sValue = sValue.substring(9, 25);
                } else if (sValue.length === 44) {
                    sValue = sValue.substring(28);
                } else if (sValue.charAt(0) === "(") {
                    if (sValue.length === 46) {
                        sValue = sValue.substring(30);
                    } else {
                        sValue = sValue.substring(38);
                    }
                } else if (sValue.charAt(0) === "]") {
                    var aSplit = sValue.split("10");
                    var iCount = 1;
                    var sAuxValue = aSplit[aSplit.length - iCount];
                    while (sAuxValue.length < 10) {
                        iCount++;
                        sAuxValue = aSplit[aSplit.length - iCount] + "10" + sAuxValue;
                    }
                    sValue = sAuxValue;
                } else if (sValue.length !== 16) {
                    var sAuxValue = sValue.substring(sValue.length - 10);
                    if (sAuxValue.length > 9) {
                        var sAux1Char = sAuxValue.charAt(0);
                        if (sAux1Char !== "1") {
                            var sAuxValue = sValue.substring(sValue.length - 11);
                        }
                        sValue = sAuxValue;
                    }
                }
                return sValue;
            },

            _addTask: function (sTaskDescription, radiobuton) {
                let id = Date.now();
                _aTasks[id] = {
                    id: id,
                    zarticle_id: sTaskDescription,
                    zradio: radiobuton
                };

                this._saveTasks();
                return _aTasks[id];
            },

            _deleteTask: function (id) {
                delete _aTasks[id];
                this._saveTasks();
            },

            _loadTasks: function () {
                //var json = localStorage.getItem("tasks");
                let json = {};
                try {
                    _aTasks = JSON.parse(json) || {};
                } catch (e) {
                    jQuery.sap.log.error(e.message);
                }
            },

            _saveTasks: function () {

                let result = [];
                let wa_result = {};
                let arr = Object.values(_aTasks);
                for (let index = 0; index < arr.length; index++) {

                    wa_result = {
                        "zarticle_id": arr[index].zarticle_id,
                        "zradio": arr[index].zradio
                    }
                    result.push(wa_result);
                }

                this.getView().setModel(result, "Scans");

            },

            _populateList: function () {
                for (var id in _aTasks) {
                    this._createListItem(_aTasks[id]);
                }
            },

            _createListItem: function (mTask) {

                //this.Cantidad = mTask.quan;

                this.idDiferent += 1;
                let oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

                let oListTodo = this.getView().byId("listTodo");

                if (mTask.zrad === 'A') {

                    let listItem = new CustomObjectListItem({
                        title: mTask.idscan,
                        numberState: sap.ui.core.ValueState.Success,
                        highlight: sap.ui.core.IndicationColor.Indication05,
                        intro: mTask.palet,
                        cant: mTask.quan

                    }).addAttribute(new sap.m.ObjectAttribute({
                        text: mTask.items
                    })).setLabel(new sap.m.Label({
                        text: oResourceBundle.getText("CantidadParaWaste") + ' : ',
                        design: "Bold",
                        width: '5em',
                        wraping: true,
                        showColon: true
                    }
                    )).setEditable(new sap.m.Input(this.getView().createId('id' + this.idDiferent), {
                        value: mTask.quan,
                        type: sap.m.InputType.Number,
                        description: '(M)',
                        fieldWidth: '8em'
                        /*  liveChange: function(event){
                             let value = event.getParameters("value");
                             //event.getSource().setValue(event.getSource().getValue());
                           //  this.getView().byId("idExtensionInput").setValue(value.newValue);
                             this.Cantidad = value.newValue;
                             this.value = value.newValue;
                             mTask.quan = value.newValue;
                        
                         }.bind(this) */
                    })).
                        data("id", mTask.id)
                        .data("rad", mTask.zrad).data("zarticle_id", mTask.zarticle_id).data("zpallet_id", mTask.zpallet_id).data("cant", 'id' + this.idDiferent);

                    oListTodo.addAggregation("items", listItem);
                }
                else {
                    let listItemPAL = new ObjectListItem({
                        title: mTask.idscan,
                        numberState: sap.ui.core.ValueState.Success,
                        highlight: sap.ui.core.IndicationColor.Indication05,
                        intro: mTask.palet,

                    }).addAttribute(new sap.m.ObjectAttribute({
                        text: mTask.items
                    })).
                        data("id", mTask.id).data("rad", mTask.zrad).data("zarticle_id", mTask.zarticle_id).data("zpallet_id", mTask.zpallet_id);

                    oListTodo.addAggregation("items", listItemPAL);
                }


            },

            _deleteListItem: function (oListItem) {
                var oListTodo = this.getView().byId("listTodo");
                var id = oListItem.data("id");
                let zarticle_id = oListItem.data("zarticle_id");
                let zpallet_id = oListItem.data("zpallet_id");
                //Lógica borrar todo si coincide id
                var oItems = oListItem.getParent().getItems();
                oItems.forEach(element => {
                    if (element.data("id") == id) {
                        oListTodo.removeAggregation("items", element);
                    }
                });
                //Borramos array yaEscaneados
                yaEscaneados = yaEscaneados.filter(x => x.id != id);
                this._deleteTask(id);
                //Borramos ids generados dinamicamente para el input de cantidad
                let idCust = oListItem.data("cant");
                this.getView().byId(idCust).destroy();
            },

            _handleChange: function (oEvent) {

                let ValueState = coreLibrary.ValueState;
                let oValidatedComboBox = oEvent.getSource(),
                    sSelectedKey = oValidatedComboBox.getSelectedKey(),
                    sValue = oValidatedComboBox.getValue();

                if (!sSelectedKey && sValue) {
                    oValidatedComboBox.setValueState(ValueState.Error);
                    let sErr = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errorStatus");
                    oValidatedComboBox.setValueStateText(sErr);
                } else {
                    oValidatedComboBox.setValueState(ValueState.None);
                    jQuery.sap.delayedCall(500, this, function () {
                        this.getView().byId("inputAddTask").focus();
                    });
                }
            }


        });
    });
