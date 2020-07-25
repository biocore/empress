define(["underscore", "Colorer"], function (_, Colorer) {
    /**
     *
     * @class BarPlotPanel
     *
     * Creates a tab for the barplot panel.
     *
     * @param {Empress} empress Instance of Empress, used to handle various
     *                          state things.
     *
     * @return {BarplotPanel}
     * construct BarplotPanel
     */
    function BarplotPanel(empress) {
        var scope = this;
        this.empress = empress;
        this.layerDivEles = [];
        this.barplotCheckbox = document.getElementById("barplot-chk");
        this.addOptions = document.getElementById("barplot-add-options");
        this.addButton = document.getElementById("barplot-add-btn");
        this.layerContainer = document.getElementById(
            "barplot-layer-container"
        );
        this.barplotCheckbox.onclick = function () {
            if (scope.barplotCheckbox.checked) {
                scope.layerContainer.classList.remove("hidden");
                scope.addOptions.classList.remove("hidden");
            } else {
                scope.layerContainer.classList.add("hidden");
                scope.addOptions.classList.add("hidden");
                // TODO: do something to un-draw barplots here
            }
        };
        this.addButton.onclick = function () {
            scope.addLayer();
        }
        this.addLayer();
    }

    /**
     * Adds a new set of GUI components for a new barplot layer
     */
    BarplotPanel.prototype.addLayer = function () {
        var layerNum = this.layerDivEles.length + 1;
        var newDiv = document.createElement("div");
        this.layerContainer.appendChild(newDiv);
        this.layerDivEles.push(newDiv);

        // Add a <hr /> at the top of each layer. This is a nice way of
        // visually distinguishing layer UI elements.
        newDiv.appendChild(document.createElement("hr"));

        // Add a header to the layer -- it's named "Layer 1" if this is the
        // first layer, "Layer 2" if this is the second, etc.
        newDiv.appendChild(document.createElement("h3")).innerText =
            "Layer " + layerNum;

        // We're going to indent the remainder of the elements within this
        // layer.
        var innerDiv = newDiv.appendChild(document.createElement("div"));
        innerDiv.classList.add("indented");

        // Add default color stuff
        var dfltColorP = innerDiv.appendChild(document.createElement("p"));
        dfltColorP.appendChild(document.createElement("label")).innerText =
            "Default color";
        var dfltColorInput = document.createElement("input");
        dfltColorInput.setAttribute("type", "text");
        // TODO: register dfltColorInput as color selector with spectrum.js
        dfltColorP.appendChild(dfltColorInput);

        // Add a row containing a label, a checkbox, and a selector which opens
        // up a UI for coloring this layer's bars by feature metadata.
        //
        // Create the <p> within which this row will be contained
        var chgColorP = innerDiv.appendChild(document.createElement("p"));
        // Add a label
        var chgColorLbl = document.createElement("label");
        chgColorLbl.innerText = "Color by...";
        chgColorP.appendChild(chgColorLbl);
        // Add the checkbox, taking care to use a certain ID
        var chgColorCheckbox = document.createElement("input");
        var chgColorCheckboxID = "barplot-layer-" + layerNum + "-chgcolor-chk";
        chgColorCheckbox.id = chgColorCheckboxID;
        chgColorCheckbox.setAttribute("type", "checkbox");
        chgColorCheckbox.classList.add("empress-input");
        chgColorP.appendChild(chgColorCheckbox);
        // Assign the label's "for" attribute to point to the checkbox input
        chgColorLbl.setAttribute("for", chgColorCheckboxID);
        // Finally, add a selector. To match the other selectors in Empress, we
        // create this as a <select> within a <label> with
        // class="select-container".
        var chgColorSC = chgColorP.appendChild(document.createElement("label"));
        chgColorSC.classList.add("select-container");
        var chgColorFMFieldSelector = document.createElement("select");
        // Populate the selector with all of the feature metadata columns
        var fmCols = this.empress.getFeatureMetadataCategories();
        _.each(fmCols, function (c) {
            var opt = document.createElement("option");
            opt.innerText = opt.value = c;
            chgColorFMFieldSelector.appendChild(opt);
        });
        chgColorFMFieldSelector.disabled = true;
        chgColorSC.appendChild(chgColorFMFieldSelector);

        // Create color-changing details div
        // (this is indented another level)
        var colorDetailsDiv = innerDiv.appendChild(
            document.createElement("div")
        );
        colorDetailsDiv.classList.add("indented");
        colorDetailsDiv.classList.add("hidden");

        // Add a row for choosing the color map
        var colormapP = colorDetailsDiv.appendChild(
            document.createElement("p")
        );
        var colormapLbl = colormapP.appendChild(
            document.createElement("label")
        );
        colormapLbl.innerText = "Color Map";
        var colormapSC = colormapP.appendChild(document.createElement("label"));
        colormapSC.classList.add("select-container");
        var colormapSelector = document.createElement("select");
        Colorer.addColorsToSelect(colormapSelector);
        colormapSC.appendChild(colormapSelector);

        // Add a row for choosing the scale type
        var scaletypeP = colorDetailsDiv.appendChild(
            document.createElement("p")
        );
        var scaletypeLbl = scaletypeP.appendChild(
            document.createElement("label")
        );
        scaletypeLbl.innerText = "Scale Type";
        var scaletypeSC = scaletypeP.appendChild(
            document.createElement("label")
        );
        scaletypeSC.classList.add("select-container");
        var scaletypeSelector = document.createElement("select");
        // add categorical option
        var cOpt = document.createElement("option");
        cOpt.innerText = cOpt.value = "Categorical";
        scaletypeSelector.appendChild(cOpt);
        // add quantitative option
        var qOpt = document.createElement("option");
        qOpt.innerText = qOpt.value = "Quantitative";
        scaletypeSelector.appendChild(qOpt);
        scaletypeSC.appendChild(scaletypeSelector);

        // Alter visibility of the color-changing details when the "Color
        // by..." checkbox is clicked
        chgColorCheckbox.onclick = function () {
            if (chgColorCheckbox.checked) {
                colorDetailsDiv.classList.remove("hidden");
                chgColorFMFieldSelector.disabled = false;
            } else {
                colorDetailsDiv.classList.add("hidden");
                chgColorFMFieldSelector.disabled = true;
                // TODO: set all barplots in this layer back to the default
                // color here
            }
        };

        // TODO: create dflt length stuff
        // TODO: create length-changing row
        // TODO: create length-changing details div and UI stuff
        // TODO: create "add another layer" row and + btn.
        // TODO: create "remove this layer" row if layerNum > 1
        // TODO: abstract ^^most of this stuff^^ into sep. functions rather
        // than one god function lol
    };

    return BarplotPanel;
});
