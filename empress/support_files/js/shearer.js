define(["underscore", "util", "TreeController"], function (
    _,
    util,
    TreeController
) {
    function Layer(
        fCol,
        fVals,
        container,
        chkBxClickFunction,
        removeClickFunction
    ) {
        this.fCol = fCol;
        this.fVals = fVals;
        this.container = container;
        this.layerDiv = null;

        var scope = this;

        // create layer div
        this.layerDiv = document.createElement("div");
        this.container.appendChild(this.layerDiv);

        // create checkbox legend div
        var chkBoxLegendDiv = document.createElement("div");
        this.layerDiv.appendChild(chkBoxLegendDiv);
        chkBoxLegendDiv.classList.add("shear-layer-legend");
        chkBoxLegendDiv.classList.add("legend");

        // create chckbox legend title
        var legendTitle = document.createElement("div");
        chkBoxLegendDiv.appendChild(legendTitle);
        legendTitle.innerText = this.fCol;
        legendTitle.classList.add("legend-title");

        // create chcbox div
        var legendChkBoxs = document.createElement("div");
        chkBoxLegendDiv.appendChild(legendChkBoxs);

        // create checkboxes
        var table = document.createElement("table");
        legendChkBoxs.appendChild(table);
        _.each(this.fVals, function (val) {
            var row = document.createElement("tr");

            // add checkbox
            var dataCheck = document.createElement("td");
            var input = document.createElement("INPUT");
            input.setAttribute("type", "checkbox");
            input.checked = true;
            input.onchange = function () {
                chkBxClickFunction(!input.checked, scope.fCol, val);
            };
            dataCheck.appendChild(input);
            row.appendChild(dataCheck);

            // add checkbox label
            var dataLabel = document.createElement("td");
            dataLabel.innerText = val;
            row.appendChild(dataLabel);

            // add row to table
            table.appendChild(row);
        });

        // create remove container
        var removeContainer = document.createElement("p");
        this.layerDiv.appendChild(removeContainer);

        // create remove label
        var removeLabel = document.createElement("label");
        removeLabel.innerText = "Remove this layer";
        removeContainer.appendChild(removeLabel);

        // create remove button
        var removeButton = document.createElement("button");
        removeButton.innerText = "-";
        removeButton.onclick = function () {
            removeClickFunction(scope.fCol);
            scope.layerDiv.remove();
            scope.layerDiv = null;
        };
        removeContainer.appendChild(removeButton);

        // create border line
        this.layerDiv.appendChild(document.createElement("hr"));
    }

    function Model(empress, container) {
        this.empress = empress;
        this.layers = new Map();
        this.shearMap = new Map();
        this.container = container;
        this.observers = [];
    }

    Model.prototype.addLayer = function (fCol) {
        var fVals = this.empress.getUniqueFeatureMetadataInfo(fCol, "tip")
            .sortedUniqueValues;
        var layer = new Layer(
            fCol,
            fVals,
            this.container,
            (add, col, val) => {
                Model.addRemoveShearItem(this, add, col, val);
            },
            (col) => {
                Model.removeLayer(this, col);
            }
        );
        this.layers.set(fCol, layer);
    };

    Model.prototype.getShearItem = function (fCol) {
        return this.shearMap.get(fCol);
    };

    Model.prototype.hasLayer = function (fCol) {
        return this.layers.has(fCol);
    };

    Model.prototype.notify = function () {
        this.empress.shear(this.shearMap);
        this.empress.drawTree();
        _.each(this.observers, function (obs) {
            obs.shearUpdate();
        });
    };

    Model.prototype.registerObserver = function (obs) {
        this.observers.push(obs);
    };

    Model.addRemoveShearItem = function (model, remove, col, val) {
        if (remove) {
            Model.addShearItem(model, col, val);
        } else {
            Model.removeShearItem(model, col, val);
        }
    };

    Model.removeLayer = function (model, fCol) {
        model.layers.delete(fCol);
        model.shearMap.delete(fCol);
        model.notify();
    };

    Model.addShearItem = function (model, fCol, fVal) {
        if (model.shearMap.has(fCol)) {
            model.shearMap.get(fCol).push(fVal);
        } else {
            model.shearMap.set(fCol, [fVal]);
        }
        model.notify();
    };

    Model.removeShearItem = function (model, fCol, fVal) {
        var items = model.getShearItem(fCol);
        if (items === undefined) {
            return;
        }
        var index = items.indexOf(fVal);
        if (index > -1) {
            items.splice(index, 1);
        }
        model.notify();
    };

    function Controller(empress, container) {
        this.model = new Model(empress, container);
    }

    Controller.prototype.addLayer = function (fCol) {
        if (!this.model.hasLayer(fCol)) {
            this.model.addLayer(fCol);
        }
    };

    Controller.prototype.registerObserver = function (obs) {
        this.model.registerObserver(obs);
    };

    function Shearer(empress, fCols) {
        this.fCols = fCols;
        this.shearSelect = document.getElementById("shear-feature-select");
        this.addLayerButton = document.getElementById("shear-add-btn");
        this.shearContainer = document.getElementById("shear-legends");
        this.controller = new Controller(empress, this.shearContainer);

        var scope = this;
        _.each(this.fCols, function (col) {
            var opt = document.createElement("option");
            opt.innerText = col;
            opt.value = col;
            scope.shearSelect.appendChild(opt);
        });

        this.addLayerButton.onclick = function () {
            scope.controller.addLayer(scope.shearSelect.value);
        };
    }

    Shearer.prototype.registerObserver = function (obs) {
        this.controller.registerObserver(obs);
    };

    return Shearer;
});
