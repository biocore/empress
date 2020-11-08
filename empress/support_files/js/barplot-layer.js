define([
    "jquery",
    "underscore",
    "spectrum",
    "Colorer",
    "Legend",
    "util",
], function ($, _, spectrum, Colorer, Legend, util) {
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
     *                     so on. Shown in the title of this layer in the UI.
     * @param {Number} uniqueNum An arbitrary number. This can be any number,
     *                           so long as it is guaranteed to be unique to
     *                           this barplot layer (no other layer on the page
     *                           should have this as its unique number).
     *                           Used when assigning IDs to HTML
     *                           elements within this layer -- this ensures
     *                           that one layer's elements don't trump another
     *                           layer's elements. (This should not be the same
     *                           thing as num above, unless the way that works
     *                           is changed in the future! Consider the case
     *                           where there are three layers, and Layer 1 is
     *                           removed. Now, Layer 3's "num" will be
     *                           decremented so that it is named Layer 2 --
     *                           but its HTML elements (at least those assigned
     *                           IDs) will still have uniqueNum in their IDs,
     *                           so if the next layer added also has 3 for its
     *                           uniqueNum, things are going to break.)
     *
     * @return {BarplotLayer}
     * @constructs BarplotLayer
     */
    function BarplotLayer(
        fmCols,
        smCols,
        barplotPanel,
        layerContainer,
        num,
        uniqueNum
    ) {
        this.fmCols = fmCols;
        this.smCols = smCols;
        this.barplotPanel = barplotPanel;
        this.layerContainer = layerContainer;
        this.num = num;
        this.uniqueNum = uniqueNum;

        this.colorLegend = null;
        this.lengthLegend = null;

        this.fmAvailable = this.fmCols.length > 0;
        this.smAvailable = this.smCols.length > 0;

        // If neither feature nor sample metadata information are available,
        // barplots are not possible.
        if (!this.fmAvailable && !this.smAvailable) {
            throw new Error("No feature or sample metadata columns available");
        }

        // This should be "fm" if the barplot is for feature metadata; "sm" if
        // the barplot is for sample metadata. (The default is to use feature
        // metadata barplots, but if no feature metadata was passed to Empress
        // then we have no choice but to just draw sample metadata barplots for
        // everything.)
        this.barplotType = this.fmAvailable ? "fm" : "sm";

        // Various properties of the barplot layer state for feature metadata
        //
        // NOTE that the default color defaults to the (this.num)th "Classic
        // QIIME Colors" color. The fact that we use this.num and not
        // this.uniqueNum for this is a tradeoff; it ensures consistency (even
        // if the user's added and removed hundreds of layers, a new Layer 1
        // will always default to red, a new Layer 2 will always default to
        // blue, etc.) at the cost of some possible silliness (it's possible
        // to, say, add two layers, remove the first, and then add another one;
        // and now both Layer 1 and Layer 2 will have their default color as
        // blue). Shouldn't really impact most users anyway.
        this.initialDefaultColorHex = Colorer.getQIIMEColor(this.num - 1);
        this.defaultColor = Colorer.hex2RGB(this.initialDefaultColorHex);
        this.colorByFM = false;
        this.colorByFMField = null;
        this.colorByFMColorMap = null;
        this.colorByFMColorReverse = false;
        this.colorByFMContinuous = false;
        this.colorByFMColorMapDiscrete = true;
        this.defaultLength = BarplotLayer.DEFAULT_LENGTH;
        this.scaleLengthByFM = false;
        this.scaleLengthByFMField = null;
        this.scaleLengthByFMMin = BarplotLayer.DEFAULT_MIN_LENGTH;
        this.scaleLengthByFMMax = BarplotLayer.DEFAULT_MAX_LENGTH;

        // Various properties of the barplot layer state for sample metadata
        this.colorBySMField = null;
        this.colorBySMColorMap = null;
        this.colorBySMColorReverse = false;
        this.lengthSM = BarplotLayer.DEFAULT_LENGTH;

        // Initialize the HTML elements of this barplot layer
        this.headerElement = null;
        this.layerDiv = null;
        this.fmDiv = null;
        this.smDiv = null;
        this.colorLegendDiv = null;
        this.lengthLegendDiv = null;
        this.initHTML();
    }

    /**
     * Initializes the HTML for this barplot layer.
     */
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
        var fmBtn, smBtn;
        if (this.fmAvailable && this.smAvailable) {
            var metadataChoiceP = this.layerDiv.appendChild(
                document.createElement("p")
            );
            fmBtn = metadataChoiceP.appendChild(
                document.createElement("button")
            );
            smBtn = metadataChoiceP.appendChild(
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
        }

        // We delay calling initFMDiv() / initSMDiv() until after we create the
        // "type switching" choice buttons above. This is so that the
        // buttons are placed above the FM / SM divs in the page layout.
        if (this.fmAvailable) {
            this.initFMDiv();
        }
        if (this.smAvailable) {
            this.initSMDiv();
        }
        this.initLegendDiv();

        // We don't set the callbacks until fmDiv / smDiv are created, although
        // I doubt anyone would be able to click on these buttons fast enough
        // to break things anyway
        if (this.fmAvailable && this.smAvailable) {
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
        // Add a row of UI elements that supports removing this layer
        var rmP = this.layerDiv.appendChild(document.createElement("p"));
        var rmLbl = rmP.appendChild(document.createElement("label"));
        rmLbl.innerText = "Remove this layer";
        var rmBtn = rmP.appendChild(document.createElement("button"));
        rmBtn.innerText = "-";
        rmBtn.id = "barplot-layer-" + this.uniqueNum + "-remove-button";
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

    /**
     * Initializes the feature metadata <div> for this barplot layer.
     *
     * This should only be called if the visualization was provided feature
     * metadata.
     */
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
        dfltColorInput.id =
            "barplot-layer-" + this.uniqueNum + "-dfltcolor-input";
        dfltColorLbl.setAttribute("for", dfltColorInput.id);
        dfltColorP.appendChild(dfltColorInput);
        // Register dfltColorInput as a color selector with spectrum.js
        $(dfltColorInput).spectrum({
            color: this.initialDefaultColorHex,
            change: function (newColor) {
                // To my knowledge, there isn't a straightforward way of
                // getting an RGB number out of the "TinyColor" values passed in
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
        var chgColorCheckboxID =
            "barplot-layer-" + this.uniqueNum + "-chgcolor-chk";
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
        colormapSelector.id =
            "barplot-layer-" + this.uniqueNum + "-fm-colormap";
        colormapLbl.setAttribute("for", colormapSelector.id);

        // Add a row for choosing whether the color scale should
        // be reversed
        var reverseColormapP = colorDetailsDiv.appendChild(
            document.createElement("p")
        );
        var reverseColormapLbl = reverseColormapP.appendChild(
            document.createElement("label")
        );
        reverseColormapLbl.innerText = "Reverse Color Map";
        var reverseColormapCheckbox = reverseColormapP.appendChild(
            document.createElement("input")
        );
        reverseColormapCheckbox.id =
            "barplot-layer-" + this.uniqueNum + "-fmcolor-reverse-chk";
        reverseColormapCheckbox.setAttribute("type", "checkbox");
        reverseColormapCheckbox.classList.add("empress-input");
        reverseColormapLbl.setAttribute("for", reverseColormapCheckbox.id);

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
            "barplot-layer-" + this.uniqueNum + "-fmcolor-continuous-chk";
        continuousValCheckbox.setAttribute("type", "checkbox");
        continuousValCheckbox.classList.add("empress-input");
        continuousValLbl.setAttribute("for", continuousValCheckbox.id);
        // Hide the "Continuous values?" stuff by default, since the default
        // colormap is discrete
        continuousValP.classList.add("hidden");

        // Initialize defaults to match the UI defaults (e.g. the default
        // feature metadata field for coloring is the first in the selector)
        this.colorByFMField = chgColorFMFieldSelector.value;
        this.colorByFMColorMap = colormapSelector.value;
        this.colorByFMColorReverse = reverseColormapCheckbox.checked;
        // Alter visibility of the color-changing details when the "Color
        // by..." checkbox is clicked
        $(chgColorCheckbox).change(function () {
            if (chgColorCheckbox.checked) {
                colorDetailsDiv.classList.remove("hidden");
                chgColorFMFieldSelector.disabled = false;
                scope.colorByFM = true;
                scope.colorByFMField = chgColorFMFieldSelector.value;
                scope.colorByFMColorMap = colormapSelector.value;
                scope.colorByFMColorReverse = reverseColormapCheckbox.checked;
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
                scope.colorByFMColorMapDiscrete = true;
            } else {
                continuousValP.classList.remove("hidden");
                scope.colorByFMColorMapDiscrete = false;
            }
        });
        $(reverseColormapCheckbox).change(function () {
            scope.colorByFMColorReverse = reverseColormapCheckbox.checked;
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
        dfltLenInput.id = "barplot-layer-" + this.uniqueNum + "-dfltlen-input";
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
        var chgLenCheckboxID =
            "barplot-layer-" + this.uniqueNum + "-chglen-chk";
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
        minLenInput.id = "barplot-layer-" + this.uniqueNum + "-fm-minlen-input";
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
        maxLenInput.id = "barplot-layer-" + this.uniqueNum + "-fm-maxlen-input";
        maxLenLbl.setAttribute("for", maxLenInput.id);

        lenDetailsDiv.appendChild(minLenP);
        lenDetailsDiv.appendChild(maxLenP);

        this.scaleLengthByFMField = chgLenFMFieldSelector.value;
        $(chgLenCheckbox).change(function () {
            if (chgLenCheckbox.checked) {
                chgLenFMFieldSelector.disabled = false;
                scope.scaleLengthByFM = true;
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

    /**
     * Initializes the sample metadata <div> for this barplot layer.
     */
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
            "barplot-layer-" + this.uniqueNum + "-chgsmfield";
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
        colormapSelector.id =
            "barplot-layer-" + this.uniqueNum + "-sm-colormap";
        colormapLbl.setAttribute("for", colormapSelector.id);

        // Add a row for choosing whether the color scale should
        // be reversed
        var reverseColormapP = this.smDiv.appendChild(
            document.createElement("p")
        );
        var reverseColormapLbl = reverseColormapP.appendChild(
            document.createElement("label")
        );
        reverseColormapLbl.innerText = "Reverse Color Map";
        var reverseColormapCheckbox = reverseColormapP.appendChild(
            document.createElement("input")
        );
        reverseColormapCheckbox.id =
            "barplot-layer-" + this.uniqueNum + "-smcolor-reverse-chk";
        reverseColormapCheckbox.setAttribute("type", "checkbox");
        reverseColormapCheckbox.classList.add("empress-input");
        reverseColormapLbl.setAttribute("for", reverseColormapCheckbox.id);

        var lenP = this.smDiv.appendChild(document.createElement("p"));
        var lenLbl = lenP.appendChild(document.createElement("label"));
        lenLbl.innerText = "Length";
        var lenInput = lenP.appendChild(document.createElement("input"));
        lenInput.setAttribute("type", "number");
        lenInput.setAttribute("min", BarplotLayer.MIN_LENGTH);
        lenInput.classList.add("empress-input");
        lenInput.value = this.defaultLength;
        lenInput.id = "barplot-layer-" + this.uniqueNum + "-smlength-input";
        lenLbl.setAttribute("for", lenInput.id);

        // TODO initialize defaults more sanely
        this.colorBySMField = chgFieldSMFieldSelector.value;
        this.colorBySMColorMap = colormapSelector.value;
        this.colorBySMColorReverse = reverseColormapCheckbox.checked;
        $(chgFieldSMFieldSelector).change(function () {
            scope.colorBySMField = chgFieldSMFieldSelector.value;
        });
        $(colormapSelector).change(function () {
            scope.colorBySMColorMap = colormapSelector.value;
        });
        $(reverseColormapCheckbox).change(function () {
            scope.colorBySMColorReverse = reverseColormapCheckbox.checked;
        });
        $(lenInput).change(function () {
            scope.lengthSM = util.parseAndValidateNum(
                lenInput,
                BarplotLayer.MIN_LENGTH
            );
        });
    };

    /**
     * Initializes a <div> for this barplot layer that'll contain legends.
     */
    BarplotLayer.prototype.initLegendDiv = function () {
        this.colorLegendDiv = document.createElement("div");
        this.colorLegendDiv.classList.add("hidden");
        this.colorLegendDiv.classList.add("legend");
        this.colorLegendDiv.classList.add("barplot-layer-legend");
        this.colorLegend = new Legend(this.colorLegendDiv);
        this.layerDiv.appendChild(this.colorLegendDiv);

        this.lengthLegendDiv = document.createElement("div");
        this.lengthLegendDiv.classList.add("hidden");
        this.lengthLegendDiv.classList.add("legend");
        this.lengthLegendDiv.classList.add("barplot-layer-legend");
        this.lengthLegend = new Legend(this.lengthLegendDiv);
        this.layerDiv.appendChild(this.lengthLegendDiv);

        // TODO: if possible, making the legend text selectable (overriding
        // the unselectable-text class on the side panel) would be nice, so
        // users can do things like highlight and copy category names.
        // Understandable if this isn't easily doable, though.
    };

    /**
     * Populates the legend with information about the current coloring
     * selection.
     *
     * This is currently called by the Empress object when drawing barplots; so
     * the legend is only updated when the "Update" button is pressed, rather
     * than whenever one of the UI elements changes. Restructuring things so
     * this class creates the Colorer is possible, but would likely require
     * this class having a reference to the Empress object.
     *
     * @param {Colorer} colorer Instance of a Colorer object defining the
     *                          current color selection for this barplot.
     */
    BarplotLayer.prototype.populateColorLegend = function (colorer) {
        var isFM = this.barplotType === "fm";
        var title;
        if (isFM) {
            title = this.colorByFMField;
        } else {
            title = this.colorBySMField;
        }
        // Show a categorical legend *unless* the barplot is for feature
        // metadata and the "Continuous values" checkbox is visible and checked
        if (
            isFM &&
            this.colorByFMContinuous &&
            !this.colorByFMColorMapDiscrete
        ) {
            this.colorLegend.addContinuousKey(title, colorer.getGradientInfo());
        } else {
            this.colorLegend.addCategoricalKey(title, colorer.getMapHex());
        }
    };

    /**
     * Clears this layer's color legend.
     *
     * This is used when no color encoding is used for this layer -- this can
     * happen when the layer is for feature metadata, but the "Color by..."
     * checkbox is unchecked.
     *
     * NOTE that this is called even if the legend is already "cleared" --
     * either this or populateColorLegend() is called once for every layer
     * every time the barplots are redrawn. It'd be possible to try to save the
     * state of the legend to avoid re-clearing / populating it, but I really
     * doubt that this will be a bottleneck (unless there are, like, 1000
     * barplot layers at once).
     */
    BarplotLayer.prototype.clearColorLegend = function () {
        this.colorLegend.clear();
    };

    /**
     * Populates the legend with information about the current length scaling
     * in use.
     *
     * The circumstances in which this function is called are similar to those
     * of populateColorLegend().
     *
     * @param {Number} minVal Minimum numeric value of the field used for
     *                        length scaling.
     * @param {Number} maxVal Maximum numeric value of the field used for
     *                        length scaling.
     * @throws {Error} If the current barplotType is not "fm". (Length scaling
     *                 isn't supported for sample metadata barplots yet.)
     */
    BarplotLayer.prototype.populateLengthLegend = function (minVal, maxVal) {
        var title;
        if (this.barplotType === "fm") {
            title = this.scaleLengthByFMField;
            this.lengthLegend.addLengthKey(title, minVal, maxVal);
        } else {
            throw new Error(
                "Length encoding is not supported for sample metadata " +
                    "barplots yet."
            );
        }
    };

    /**
     * Clears this layer's length legend.
     *
     * This is used when no length scaling is used for this layer -- this will
     * (currently) always be the case for a sample metadata barplot layer.
     *
     * The circumstances in which this function is called are similar to those
     * of clearColorLegend() (so, for example, this is called for each layer
     * every time the barplots are updated; it's an inefficiency, but probably
     * not a large one).
     */
    BarplotLayer.prototype.clearLengthLegend = function () {
        this.lengthLegend.clear();
    };

    /**
     * Returns an Array containing all of the active legends in this layer.
     *
     * Currently, this just returns the color legend and length legends
     * (assuming both are in use), since those are the only legends barplot
     * layers own. However, if more sorts of encodings could be used at the
     * same time (e.g. encoding bars' color, length, and ... opacity, I
     * guess?), then this Array should be expanded.
     *
     * Inactive legends (e.g. the length legend, if no length encoding is in
     * effect) will be excluded from the Array. However, if all legends are
     * active, the order in the Array will always be color then length.
     *
     * @return {Array} Array of Legend objects
     */
    BarplotLayer.prototype.getLegends = function () {
        var containedLegends = [this.colorLegend, this.lengthLegend];
        return _.filter(containedLegends, function (legend) {
            return legend.isActive();
        });
    };

    /**
     * Updates the text in the layer's header based on the layer's number.
     *
     * Since the layer's number can change (e.g. when a layer with a lower
     * number than it is removed), this function may be called many times
     * throughout a layer's lifespan.
     */
    BarplotLayer.prototype.updateHeader = function () {
        this.headerElement.innerText = "Layer " + this.num;
    };

    /**
     * Lowers this layer's number by 1 and calls this.updateHeader().
     *
     * This should be called when a layer with a lower number than this layer's
     * number is removed. For example, if there are three layers (1, 2, 3), and
     * layer 2 is removed, then layer 3 should be decremented to layer 2 --
     * since it's now the second, rather than the third, layer.
     *
     * (Critically, this does NOT decrement this layer's "unique number". This
     * is intentional.)
     */
    BarplotLayer.prototype.decrement = function () {
        this.num--;
        this.updateHeader();
    };

    /**
     * @type{Number}
     * The minimum length used for all of the length inputs: i.e. no length
     * entered by the user can be below this. This could conceivably be
     * increased to 1 or another small positive value, but it should probably
     * stay at 0 so that 0 can be used as the minimum length for length
     * scaling. (In any case, this should NOT be set to a negative number!
     * That'll break things.)
     * @public
     */
    BarplotLayer.MIN_LENGTH = 0;

    /**
     * @type{Number}
     * The default length used for the "Default length" input for feature
     * metadata barplots and for the "Length" input for sample metadata
     * barplots. (NOTE: this length, as with the other length values here,
     * isn't in any particular units like pixels. A length of 100 will look
     * somewhat different on two trees with drastically different sizes;
     * however, from testing, it seems like a reasonable default.)
     * @public
     */
    BarplotLayer.DEFAULT_LENGTH = 100;

    /**
     * @type {Number}
     * The default length used for the "Minimum length" input for length
     * scaling in feature metadata barplots.
     * @public
     */
    BarplotLayer.DEFAULT_MIN_LENGTH = 1;

    /**
     * @type {Number}
     * The default length used for the "Maximum length" input for length
     * scaling in feature metadata barplots.
     * @public
     */
    BarplotLayer.DEFAULT_MAX_LENGTH = 100;

    return BarplotLayer;
});
