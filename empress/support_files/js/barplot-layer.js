define(["jquery", "underscore", "spectrum", "Colorer", "util"], function (
    $,
    _,
    spectrum,
    Colorer,
    util
) {
    /**
     *
     * @class BarplotLayer
     *
     * Creates a layer in the barplot panel.
     *
     * @param {Array} fmCols Feature metadata columns.
     * @param {Array} smCols Sample metadata columns.
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
     * @constructs BarplotLayer
     */
    function BarplotLayer(fmCols, smCols, barplotPanel, layerContainer, num) {
        this.fmCols = fmCols;
        this.smCols = smCols;
        this.barplotPanel = barplotPanel;
        this.layerContainer = layerContainer;
        this.num = num;

        this.fmAvailable = this.fmCols.length > 0;

        // This should be "fm" if the barplot is for feature metadata; "sm" if
        // the barplot is for sample metadata. (The default is to use feature
        // metadata barplots, but if no feature metadata was passed to Empress
        // then we have no choice but to just draw sample metadata barplots for
        // everything.)
        this.barplotType = this.fmAvailable ? "fm" : "sm";

        // Various properties of the barplot layer state for feature metadata
        this.initialDefaultColorHex = Colorer.getQIIMEColor(this.num - 1);
        this.defaultColor = Colorer.hex2RGB(this.initialDefaultColorHex);
        this.colorByFM = false;
        this.colorByFMField = null;
        this.colorByFMColorMap = null;
        this.colorByFMScaleType = null;
        this.defaultLength = BarplotLayer.DEFAULT_LENGTH;
        this.scaleLengthByFM = false;
        this.scaleLengthByFMField = null;
        this.scaleLengthByFMMin = BarplotLayer.DEFAULT_MIN_LENGTH;
        this.scaleLengthByFMMax = BarplotLayer.DEFAULT_MAX_LENGTH;

        // Various properties of the barplot layer state for sample metadata
        this.colorBySMField = null;
        this.colorBySMColorMap = null;
        this.lengthSM = BarplotLayer.DEFAULT_LENGTH;

        // Initialize the HTML elements of this barplot layer
        this.headerElement = null;
        this.layerDiv = null;
        this.fmDiv = null;
        this.smDiv = null;
        this.initHTML();
    }

    BarplotLayer.prototype.initHTML = function () {
        var scope = this;
        this.layerDiv = document.createElement("div");
        this.layerContainer.appendChild(this.layerDiv);

        // Add a header to the layer -- it's named "Layer 1" if this is the
        // first layer, "Layer 2" if this is the second, etc.
        this.headerElement = this.layerDiv.appendChild(
            document.createElement("h3")
        );

        // Use of "text-align: center;" based on
        // https://stackoverflow.com/q/23663527/10730311.
        // (I forgot that was a thing.)
        this.headerElement.setAttribute("style", "text-align: center;");
        this.updateHeader();

        // Add UI elements for switching between feature and sample metadata
        // barplots for this layer (only if feature metadata is available;
        // otherwise, things will just default to sample metadata barplots.)
        if (this.fmAvailable) {
            var metadataChoiceP = this.layerDiv.appendChild(
                document.createElement("p")
            );
            var fmBtn = metadataChoiceP.appendChild(
                document.createElement("button")
            );
            var smBtn = metadataChoiceP.appendChild(
                document.createElement("button")
            );
            fmBtn.innerText = "Feature Metadata";
            smBtn.innerText = "Sample Metadata";
            // Center the feature and sample metadata buttons
            fmBtn.setAttribute("style", "margin: 0 auto;");
            smBtn.setAttribute("style", "margin: 0 auto;");
            // Since we default to feature metadata barplot layers, we mark the
            // feature metadata button as "selected" (a.k.a. we darken it a bit)
            fmBtn.classList.add("selected-metadata-choice");

            // We delay calling initFMDiv() (and initSMDiv(), although that
            // isn't in this block because it doesn't depend on feature
            // metadata being available) until after we create the
            // "type switching" choice buttons above. This is so that the
            // buttons are placed above the FM / SM divs in the page layout.
            this.initFMDiv();

            fmBtn.onclick = function () {
                if (scope.barplotType !== "fm") {
                    scope.smDiv.classList.add("hidden");
                    scope.fmDiv.classList.remove("hidden");
                    fmBtn.classList.add("selected-metadata-choice");
                    smBtn.classList.remove("selected-metadata-choice");
                    scope.barplotType = "fm";
                }
            };
            smBtn.onclick = function () {
                if (scope.barplotType !== "sm") {
                    scope.fmDiv.classList.add("hidden");
                    scope.smDiv.classList.remove("hidden");
                    smBtn.classList.add("selected-metadata-choice");
                    fmBtn.classList.remove("selected-metadata-choice");
                    scope.barplotType = "sm";
                }
            };
        }

        this.initSMDiv();
        // Add a row of UI elements that supports removing this layer
        var rmP = this.layerDiv.appendChild(document.createElement("p"));
        var rmLbl = rmP.appendChild(document.createElement("label"));
        rmLbl.innerText = "Remove this layer";
        var rmBtn = rmP.appendChild(document.createElement("button"));
        rmBtn.innerText = "-";
        rmBtn.id = "barplot-layer-" + this.num + "-remove-button";
        rmLbl.setAttribute("for", rmBtn.id);
        rmBtn.onclick = function () {
            scope.barplotPanel.removeLayer(scope.num);
            // Remove this layer's HTML
            scope.layerDiv.remove();
        };

        // Add a <hr /> at the bottom of each layer. This is a nice way of
        // visually distinguishing layer UI elements.
        this.layerDiv.appendChild(document.createElement("hr"));
    };

    BarplotLayer.prototype.initFMDiv = function () {
        var scope = this;
        this.fmDiv = this.layerDiv.appendChild(document.createElement("div"));
        if (this.barplotType !== "fm") {
            this.fmDiv.classList.add("hidden");
        }

        // Add default color stuff
        var dfltColorP = document.createElement("p");
        var dfltColorLbl = dfltColorP.appendChild(
            document.createElement("label")
        );
        dfltColorLbl.innerText = "Default color";
        var dfltColorInput = document.createElement("input");
        dfltColorInput.setAttribute("type", "text");
        dfltColorInput.id = "barplot-layer-" + this.num + "-dfltcolor-input";
        dfltColorLbl.setAttribute("for", dfltColorInput.id);
        dfltColorP.appendChild(dfltColorInput);
        // Register dfltColorInput as a color selector with spectrum.js
        $(dfltColorInput).spectrum({
            color: this.initialDefaultColorHex,
            change: function (newColor) {
                // To my knowledge, there isn't a straightforward way of
                // getting an RGB array out of the "TinyColor" values passed in
                // by Spectrum: see
                // https://bgrins.github.io/spectrum#details-acceptedColorInputs
                scope.defaultColor = Colorer.hex2RGB(newColor.toHexString());
            },
        });

        // Add a row containing a label, a checkbox, and a selector which opens
        // up a UI for coloring this layer's bars by feature metadata.
        //
        // Create the <p> within which this row will be contained
        var chgColorP = this.fmDiv.appendChild(document.createElement("p"));
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
        _.each(this.fmCols, function (c) {
            var opt = document.createElement("option");
            opt.innerText = opt.value = c;
            chgColorFMFieldSelector.appendChild(opt);
        });
        chgColorFMFieldSelector.disabled = true;
        chgColorSC.appendChild(chgColorFMFieldSelector);

        // Create color-changing details div
        // (this is indented another level)
        var colorDetailsDiv = this.fmDiv.appendChild(
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
        colormapSelector.id = "barplot-layer-" + this.num + "fm-colormap";
        colormapLbl.setAttribute("for", colormapSelector.id);

        // Add a row for choosing the scale type (i.e. whether to use
        // continuous coloring or not)
        // This mimics Emperor's "Continuous values" checkbox
        var continuousValP = colorDetailsDiv.appendChild(
            document.createElement("p")
        );
        var continuousValLbl = continuousValP.appendChild(
            document.createElement("label")
        );
        continuousValLbl.innerText = "Continuous values?";
        var continuousValCheckbox = continuousValP.appendChild(
            document.createElement("input")
        );
        continuousValCheckbox.id =
            "barplot-layer-" + this.num + "-fmcolor-continuous-chk";
        continuousValCheckbox.setAttribute("type", "checkbox");
        continuousValCheckbox.classList.add("empress-input");
        continuousValLbl.setAttribute("for", continuousValCheckbox.id);
        // Hide the "Continuous values?" stuff by default, since the default
        // colormap is discrete
        continuousValP.classList.add("hidden");

        // Alter visibility of the color-changing details when the "Color
        // by..." checkbox is clicked
        $(chgColorCheckbox).change(function () {
            if (chgColorCheckbox.checked) {
                colorDetailsDiv.classList.remove("hidden");
                chgColorFMFieldSelector.disabled = false;
                scope.colorByFM = true;
                scope.colorByFMField = chgColorFMFieldSelector.value;
                scope.colorByFMColorMap = colormapSelector.value;
                scope.colorByFMContinuous = continuousValCheckbox.checked;
                // Hide the default color row (since default colors
                // aren't used when f.m. coloring is enabled)
                dfltColorP.classList.add("hidden");
            } else {
                colorDetailsDiv.classList.add("hidden");
                chgColorFMFieldSelector.disabled = true;
                scope.colorByFM = false;
                dfltColorP.classList.remove("hidden");
                // TODO: set all barplots in this layer back to the default
                // color here
            }
        });

        this.fmDiv.appendChild(dfltColorP);

        $(chgColorFMFieldSelector).change(function () {
            scope.colorByFMField = chgColorFMFieldSelector.value;
        });
        $(colormapSelector).change(function () {
            scope.colorByFMColorMap = colormapSelector.value;
            // Hide the "Continuous values?" row based on the selected
            // colormap's type. This matches how Emperor's ColorViewController
            // hides/shows its "Continuous values" elements.
            if (Colorer.isColorMapDiscrete(scope.colorByFMColorMap)) {
                continuousValP.classList.add("hidden");
            } else {
                continuousValP.classList.remove("hidden");
            }
        });
        $(continuousValCheckbox).change(function () {
            scope.colorByFMContinuous = continuousValCheckbox.checked;
        });

        // create default length settings
        var dfltLenP = document.createElement("p");
        var dfltLenLbl = dfltLenP.appendChild(document.createElement("label"));
        dfltLenLbl.innerText = "Default length";
        var dfltLenInput = document.createElement("input");
        dfltLenInput.setAttribute("type", "number");
        dfltLenInput.setAttribute("min", BarplotLayer.MIN_LENGTH);
        dfltLenInput.classList.add("empress-input");
        dfltLenInput.value = this.defaultLength;
        dfltLenInput.id = "barplot-layer-" + this.num + "-dfltlen-input";
        dfltLenLbl.setAttribute("for", dfltLenInput.id);
        $(dfltLenInput).change(function () {
            scope.defaultLength = util.parseAndValidateNum(
                dfltLenInput,
                BarplotLayer.MIN_LENGTH
            );
        });
        dfltLenP.appendChild(dfltLenInput);

        // create length-changing-by-metadata settings
        var chgLenP = this.fmDiv.appendChild(document.createElement("p"));
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
        _.each(this.fmCols, function (c) {
            var opt = document.createElement("option");
            opt.innerText = opt.value = c;
            chgLenFMFieldSelector.appendChild(opt);
        });
        chgLenFMFieldSelector.disabled = true;
        chgLenSC.appendChild(chgLenFMFieldSelector);

        var lenDetailsDiv = this.fmDiv.appendChild(
            document.createElement("div")
        );
        lenDetailsDiv.classList.add("indented");
        lenDetailsDiv.classList.add("hidden");
        // Add min len stuff
        var minLenP = document.createElement("p");
        var minLenLbl = minLenP.appendChild(document.createElement("label"));
        minLenLbl.innerText = "Minimum length";
        var minLenInput = document.createElement("input");
        minLenInput.setAttribute("type", "number");
        minLenInput.setAttribute("min", BarplotLayer.MIN_LENGTH);
        minLenInput.classList.add("empress-input");
        minLenInput.value = BarplotLayer.DEFAULT_MIN_LENGTH;
        $(minLenInput).change(function () {
            scope.scaleLengthByFMMin = util.parseAndValidateNum(
                minLenInput,
                BarplotLayer.MIN_LENGTH
            );
        });
        minLenP.appendChild(minLenInput);
        minLenInput.id = "barplot-layer-" + this.num + "fm-minlen-input";
        minLenLbl.setAttribute("for", minLenInput.id);

        // Add max len stuff
        var maxLenP = document.createElement("p");
        var maxLenLbl = maxLenP.appendChild(document.createElement("label"));
        maxLenLbl.innerText = "Maximum length";
        var maxLenInput = document.createElement("input");
        maxLenInput.setAttribute("type", "number");
        maxLenInput.setAttribute("min", BarplotLayer.MIN_LENGTH);
        maxLenInput.classList.add("empress-input");
        maxLenInput.value = BarplotLayer.DEFAULT_MAX_LENGTH;
        $(maxLenInput).change(function () {
            scope.scaleLengthByFMMax = util.parseAndValidateNum(
                maxLenInput,
                BarplotLayer.MIN_LENGTH
            );
        });
        maxLenP.appendChild(maxLenInput);
        maxLenInput.id = "barplot-layer-" + this.num + "fm-maxlen-input";
        maxLenLbl.setAttribute("for", maxLenInput.id);

        lenDetailsDiv.appendChild(minLenP);
        lenDetailsDiv.appendChild(maxLenP);

        $(chgLenCheckbox).change(function () {
            if (chgLenCheckbox.checked) {
                chgLenFMFieldSelector.disabled = false;
                scope.scaleLengthByFM = true;
                // TODO rather than setting this here, have it be set to the
                // first value in the selector on initialization
                scope.scaleLengthByFMField = chgLenFMFieldSelector.value;
                dfltLenP.classList.add("hidden");
                lenDetailsDiv.classList.remove("hidden");
            } else {
                chgLenFMFieldSelector.disabled = true;
                scope.scaleLengthByFM = false;
                dfltLenP.classList.remove("hidden");
                lenDetailsDiv.classList.add("hidden");
                // TODO: set all barplots in this layer back to the default
                // length here
            }
        });
        $(chgLenFMFieldSelector).change(function () {
            scope.scaleLengthByFMField = chgLenFMFieldSelector.value;
        });

        this.fmDiv.appendChild(dfltLenP);

        // TODO: reuse code, e.g. for adding feature metadata col
        // info to a selector (duplicated btwn color and length stuff)
    };

    BarplotLayer.prototype.initSMDiv = function () {
        var scope = this;
        this.smDiv = this.layerDiv.appendChild(document.createElement("div"));
        if (this.barplotType !== "sm") {
            this.smDiv.classList.add("hidden");
        }

        var chgFieldP = this.smDiv.appendChild(document.createElement("p"));
        // Add a label
        var chgFieldLbl = document.createElement("label");
        chgFieldLbl.innerText = "Show sample info for...";
        chgFieldP.appendChild(chgFieldLbl);
        // Finally, add a selector. To match the other selectors in Empress, we
        // create this as a <select> within a <label> with
        // class="select-container".
        var chgFieldSC = chgFieldP.appendChild(document.createElement("label"));
        chgFieldSC.classList.add("select-container");
        var chgFieldSMFieldSelector = document.createElement("select");
        // Populate the selector with all of the sample metadata columns
        _.each(this.smCols, function (c) {
            var opt = document.createElement("option");
            opt.innerText = opt.value = c;
            chgFieldSMFieldSelector.appendChild(opt);
        });
        chgFieldSMFieldSelector.id =
            "barplot-layer-" + this.num + "-chgsmfield";
        chgFieldLbl.setAttribute("for", chgFieldSMFieldSelector.id);
        chgFieldSC.appendChild(chgFieldSMFieldSelector);

        // Add a row for choosing the color map
        var colormapP = this.smDiv.appendChild(document.createElement("p"));
        var colormapLbl = colormapP.appendChild(
            document.createElement("label")
        );
        colormapLbl.innerText = "Color Map";
        var colormapSC = colormapP.appendChild(document.createElement("label"));
        colormapSC.classList.add("select-container");
        var colormapSelector = document.createElement("select");
        Colorer.addColorsToSelect(colormapSelector);
        colormapSC.appendChild(colormapSelector);
        colormapSelector.id = "barplot-layer-" + this.num + "sm-colormap";
        colormapLbl.setAttribute("for", colormapSelector.id);

        var lenP = this.smDiv.appendChild(document.createElement("p"));
        var lenLbl = lenP.appendChild(document.createElement("label"));
        lenLbl.innerText = "Length";
        var lenInput = lenP.appendChild(document.createElement("input"));
        lenInput.setAttribute("type", "number");
        lenInput.setAttribute("min", BarplotLayer.MIN_LENGTH);
        lenInput.classList.add("empress-input");
        lenInput.value = this.defaultLength;
        lenInput.id = "barplot-layer-" + this.num + "-smlength-input";
        lenLbl.setAttribute("for", lenInput.id);

        // TODO initialize defaults more sanely
        this.colorBySMField = chgFieldSMFieldSelector.value;
        this.colorBySMColorMap = colormapSelector.value;
        $(chgFieldSMFieldSelector).change(function () {
            scope.colorBySMField = chgFieldSMFieldSelector.value;
        });
        $(colormapSelector).change(function () {
            scope.colorBySMColorMap = colormapSelector.value;
        });
        $(lenInput).change(function () {
            scope.lengthSM = util.parseAndValidateNum(
                lenInput,
                BarplotLayer.MIN_LENGTH
            );
        });
    };

    BarplotLayer.prototype.updateHeader = function () {
        this.headerElement.innerText = "Layer " + this.num;
    };

    BarplotLayer.prototype.decrement = function () {
        this.num--;
        this.updateHeader();
    };

    BarplotLayer.MIN_LENGTH = 0;
    BarplotLayer.DEFAULT_LENGTH = 100;
    BarplotLayer.DEFAULT_MIN_LENGTH = 1;
    BarplotLayer.DEFAULT_MAX_LENGTH = 100;

    return BarplotLayer;
});
