define(["jquery", "underscore", "spectrum", "Colorer"], function (
    $,
    _,
    spectrum,
    Colorer
) {
    /**
     *
     * @class BarplotLayer
     *
     * Creates a layer in the barplot panel.
     *
     * @param {Empress} empress Instance of Empress, used to handle various
     *                          state things.
     * @param {BarplotPanel} barplotPanel Instance of BarplotPanel. A reference
     *                                    to this is kept around so we can
     *                                    notify the BarplotPanel if this layer
     *                                    is removed.
     * @param {HTMLElement} layerContainer DOM element to which the new layer's
     *                                     HTML should be added.
     * @param {Number} num The "number" of this layer. Layer 1 should be
     *                     the closest layer to the tips of the tree, and
     *                     so on.
     *
     * @return {BarplotLayer}
     * construct BarplotLayer
     */
    function BarplotLayer(empress, barplotPanel, layerContainer, num) {
        this.empress = empress;
        this.barplotPanel = barplotPanel;
        this.layerContainer = layerContainer;
        this.num = num;
        this.defaultColor = Colorer.getQIIMEColor(this.num - 1);
        this.initHTML();
    }

    BarplotLayer.prototype.initHTML = function () {
        var scope = this;
        var newDiv = document.createElement("div");
        this.layerContainer.appendChild(newDiv);

        // Add a <hr /> at the top of each layer. This is a nice way of
        // visually distinguishing layer UI elements.
        newDiv.appendChild(document.createElement("hr"));

        // Add a header to the layer -- it's named "Layer 1" if this is the
        // first layer, "Layer 2" if this is the second, etc.
        this.headerElement = newDiv.appendChild(document.createElement("h3"));
        this.updateHeader();

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
        dfltColorP.appendChild(dfltColorInput);
        // Register dfltColorInput as a color selector with spectrum.js
        $(dfltColorInput).spectrum(
            {
                color: this.defaultColor,
                change: function (c) {
                    scope.defaultColor = c.toHexString();
                }
            }
        );

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
        var chgColorCheckboxID = "barplot-layer-" + this.num + "-chgcolor-chk";
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

        // create default length settings
        var dfltLenP = innerDiv.appendChild(document.createElement("p"));
        dfltLenP.appendChild(document.createElement("label")).innerText =
            "Default length";
        var dfltLenInput = document.createElement("input");
        dfltLenInput.setAttribute("type", "number");
        dfltLenInput.classList.add("empress-input");
        dfltLenInput.value = 1;
        dfltLenP.appendChild(dfltLenInput);

        // create length-changing-by-metadata settings
        var chgLenP = innerDiv.appendChild(document.createElement("p"));
        // Add a label
        var chgLenLbl = document.createElement("label");
        chgLenLbl.innerText = "Scale length by...";
        chgLenP.appendChild(chgLenLbl);
        // Add the checkbox, taking care to use a certain ID
        var chgLenCheckbox = document.createElement("input");
        var chgLenCheckboxID = "barplot-layer-" + this.num + "-chglen-chk";
        chgLenCheckbox.id = chgLenCheckboxID;
        chgLenCheckbox.setAttribute("type", "checkbox");
        chgLenCheckbox.classList.add("empress-input");
        chgLenP.appendChild(chgLenCheckbox);
        // Assign the label's "for" attribute to point to the checkbox input
        chgLenLbl.setAttribute("for", chgLenCheckboxID);
        // Finally, add a selector. To match the other selectors in Empress, we
        // create this as a <select> within a <label> with
        // class="select-container".
        var chgLenSC = chgLenP.appendChild(document.createElement("label"));
        chgLenSC.classList.add("select-container");
        var chgLenFMFieldSelector = document.createElement("select");
        // Populate the selector with all of the feature metadata columns
        _.each(fmCols, function (c) {
            var opt = document.createElement("option");
            opt.innerText = opt.value = c;
            chgLenFMFieldSelector.appendChild(opt);
        });
        chgLenFMFieldSelector.disabled = true;
        chgLenSC.appendChild(chgLenFMFieldSelector);
        chgLenCheckbox.onclick = function () {
            if (chgLenCheckbox.checked) {
                chgLenFMFieldSelector.disabled = false;
            } else {
                chgLenFMFieldSelector.disabled = true;
                // TODO: set all barplots in this layer back to the default
                // length here
            }
        };

        // TODO: abstract ^^most of this stuff^^ into sep. functions rather
        // than one god function lol

        var rmP = innerDiv.appendChild(document.createElement("p"));
        var rmLbl = rmP.appendChild(document.createElement("label"));
        rmLbl.innerText = "Remove this layer";
        var rmBtn = rmP.appendChild(document.createElement("button"));
        rmBtn.innerText = "-";
        rmBtn.onclick = function () {
            scope.barplotPanel.removeLayer(scope.num);
            // Remove this layer's HTML
            newDiv.remove();
        };
    };

    BarplotLayer.prototype.updateHeader = function () {
        this.headerElement.innerText = "Layer " + this.num;
    };

    BarplotLayer.prototype.decrement = function () {
        this.num--;
        this.updateHeader();
    };

    return BarplotLayer;
});
