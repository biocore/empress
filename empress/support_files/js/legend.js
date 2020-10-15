define(["jquery", "underscore", "util"], function ($, _, util) {
    /**
     *
     * @class Legend
     *
     * Creates a legend within a given HTML element. (You'll need to call
     * addCategoricalKey(), addContinuousKey(), or addLengthKey() to populate
     * the legend with data.)
     *
     * Currently, this legend is only designed to show color variation.
     * However, extending it to show other sorts of encodings -- for example,
     * length data in barplots -- would be doable.
     *
     * @param {HTMLElement} container DOM element to which this legend's HTML
     *                                will be added.
     *
     * @return {Legend}
     * @constructs Legend
     */
    function Legend(container) {
        /**
         * @type {HTMLElement}
         * Reference to the element containing the legend.
         * @private
         */
        this._container = container;

        /**
         * @type {String}
         * The "type" of the legend. Will be set when any of the
         * Legend.add*Key() functions is called to be one of "continuous",
         * "categorical", or "length". This will be null instead of a
         * String before any of the add*Key() functions is called and after
         * clear() is called.
         * @public
         */
        this.legendType = null;

        /**
         * @type {String}
         * Contains the current title text for the legend. Will be "" if
         * addTitle() hasn't been called yet / after clear() is called.
         * @public
         */
        this.title = "";

        /**
         * @type {Array}
         * Sorted categories shown in a categorical legend. Stored as a
         * class-level variable so it can be retrieved when exporting a
         * categorical legend to SVG.
         * @private
         */
        this._sortedCategories = [];

        /**
         * @type {Object}
         * Maps categories to hex colors. Same deal as with
         * this._sortedCategories -- we store this in order to make exporting
         * categorical legends easier.
         * @private
         */
        this._category2color = {};

        /**
         * @type {String}
         * Copy of the gradient SVG shown in a continous legend (just the
         * gradient stuff, not the <rect> / <text> stuff -- see the Colorer
         * object for details.) Used for exporting.
         * @private
         */
        this._gradientSVG = "";

        /**
         * @type {String}
         * Refers to the ID of the <linearGradient> used in a gradient for a
         * continuous legend. Helps with referring to this gradient within a
         * new containing element; used for exporting.
         * @private
         */
        this._gradientID = "";

        /**
         * @type {Boolean}
         * Whether or not a warning about non-numeric values missing from a
         * continuous legend is shown. Used for exporting.
         * @private
         */
        this._nonNumericWarningShown = false;

        /**
         * @type {String}
         * Representations of the min, mid (aka (min + max) / 2), and max
         * values used in a (continuous) legend. Used for exporting.
         * @private
         */
        this._minValStr = "";
        this._midValStr = "";
        this._maxValStr = "";

        /**
         * @type {Number}
         * The minimum and maximum value in a length legend. Used for
         * exporting.
         * @private
         */
        this._minLengthVal = null;
        this._maxLengthVal = null;
    }

    /**
     * Adds a title element to the legend container.
     *
     * Also updates this.title to equal the input text.
     *
     * @param {String} name Text to show in the title.
     */
    Legend.prototype.addTitle = function (name) {
        var titleDiv = this._container.appendChild(
            document.createElement("div")
        );
        titleDiv.classList.add("legend-title");
        titleDiv.innerText = name;
        this.title = name;
    };

    /**
     * Un-hides the legend.
     */
    Legend.prototype.unhide = function () {
        // If the container was previously hidden, un-hide it
        this._container.classList.remove("hidden");
    };

    /**
     * Displays a continuous color key.
     *
     * This function takes as input the gradient SVG to display, so it doesn't
     * do much actual work. (Colorer.assignContinuousScaledColors() does most
     * of the work here.)
     *
     * The creation of the SVG container was based on Emperor's code:
     * https://github.com/biocore/emperor/blob/00c73f80c9d504826e61ddcc8b2c0b93f344819f/emperor/support_files/js/color-view-controller.js#L54-L56
     *
     * @param {String} name Text to show in the legend title.
     * @param {Object} gradInfo Output of Colorer.getGradientInfo(). Please
     *                          see the docs of that function for details.
     * @param {Boolean} showNonNumericWarning If true, a warning will be shown
     *                                        below the gradient about some
     *                                        values being omitted from the
     *                                        gradient due to being
     *                                        non-numeric.
     */
    Legend.prototype.addContinuousKey = function (name, gradInfo) {
        this.clear();
        this.addTitle(name);

        // Save relevant data from the specified Colorer. We store these to
        // make life easier when exporting SVG for this legend.
        this._gradientSVG = gradInfo.gradientSVG;
        this._gradientID = gradInfo.gradientID;
        this._minValStr = gradInfo.minValStr;
        this._midValStr = gradInfo.midValStr;
        this._maxValStr = gradInfo.maxValStr;
        this._nonNumericWarningShown = gradInfo.missingNonNumerics;

        // We only save this to a local variable (not an attribute of the
        // class) since we only use it for the HTML representation of the
        // gradient, not for the SVG-exported representation of the gradient.
        var totalHTMLSVG = this._gradientSVG + gradInfo.pageSVG;

        // Apparently we need to use createElementNS() (not just
        // createElement()) for SVGs. I am not sure why this is the case, but
        // it made the SVG show up (before I added this, nothing was showing up
        // although the SVG worked if I saved it into a HTML document and
        // opened that in a browser). See
        // https://stackoverflow.com/a/17520712/10730311.
        // (According to https://stackoverflow.com/q/27854409/10730311, this
        // should work offline.)
        var containerSVG = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
        );
        containerSVG.setAttribute("width", "100%");
        containerSVG.setAttribute("height", "100%");
        containerSVG.setAttribute("style", "display: block; margin: auto;");
        // just kinda plop the combined SVG code into containerSVG's HTML
        containerSVG.innerHTML = totalHTMLSVG;
        this._container.appendChild(containerSVG);
        if (this._nonNumericWarningShown) {
            var warningP = document.createElement("p");
            warningP.innerText = Legend.CONTINUOUS_NON_NUMERIC_WARNING;
            warningP.classList.add("side-panel-notes");
            // All legends have white-space: nowrap; set to prevent color
            // labels from breaking onto the next line (which would look
            // funky). However, for this simple warning paragraph, we want it
            // to display like an ordinary paragraph (and have line breaks as
            // necessary to fit within the legend container). Hence why we
            // override the white-space setting for this element.
            warningP.setAttribute("style", "white-space: normal;");
            this._container.appendChild(warningP);
        }
        this.legendType = "continuous";
        this.unhide();
    };

    /**
     * Displays a categorical color key.
     *
     * Each key/value pair in the input color key is displayed in a separate
     * row in the legend. Pairs are sorted from top to bottom in the legend
     * using util.naturalSort() on the keys (this should match the way colors
     * are assigned).
     *
     * NOTE that this will assign values to this._sortedCategories and
     * this._category2color. (The values of these attributes are arbitrary when
     * you call another add*Key() function -- they're intended for internal
     * use within the Legend class.)
     *
     * @param {String} name Text to show in the legend title.
     * @param {Object} info Color key information. This should map unique
     *                      values (e.g. in sample or feature metadata) to
     *                      their assigned color, expressed in hex format.
     *
     * @throws {Error} If info has no keys. This check is done before anything
     *                 else is done in this function.
     */
    Legend.prototype.addCategoricalKey = function (name, info) {
        if (_.isEmpty(info)) {
            throw new Error(
                "Can't create a categorical legend when there are no " +
                    "categories in the info"
            );
        }
        this.clear();
        this.addTitle(name);
        this._sortedCategories = util.naturalSort(_.keys(info));
        this._category2color = info;
        var containerTable = document.createElement("table");
        // Remove border spacing, which seems to be a default for at least some
        // browsers. This prevents labels from appearing to the left of color
        // categories when scrolling the legend horizontally (it just looks
        // kinda ugly, so by smooshing the colors to the left of the legend we
        // avoid this problem).
        containerTable.setAttribute("style", "border-spacing: 0;");
        _.each(this._sortedCategories, function (key) {
            var newRow = containerTable.insertRow(-1);

            // Add a color box (could totally be replaced by e.g. a Spectrum
            // color picker in the future).
            var colorCell = newRow.insertCell(-1);
            colorCell.classList.add("category-color");
            colorCell.classList.add("frozen-cell");
            colorCell.setAttribute("style", "background: " + info[key] + ";");

            // Add a label for that color box.
            var labelCell = newRow.insertCell(-1);
            // We put the actual label text inside a <label> in the cell, not
            // just in the first layer of the cell. This is needed so that we
            // can have margins on this text: see
            // https://stackoverflow.com/a/26212545/10730311. (Applying
            // .gradient-label to the labelCell directly resulted in the
            // margin-left not being respected, hence this workaround.)
            var innerLabel = labelCell.appendChild(
                document.createElement("label")
            );
            innerLabel.classList.add("gradient-label");
            innerLabel.innerText = key;
            innerLabel.title = key;
        });
        this._container.appendChild(containerTable);
        this.legendType = "categorical";
        this.unhide();
    };

    /**
     * Displays information in the legend about barplot length scaling.
     *
     * This just shows a minimum and maximum value. It's not very fancy yet!
     *
     * @param {String} name Text to show in the legend title.
     * @param {Number} minVal Number to show next to a "Minimum" header.
     *                        This should be the minimum value in the field
     *                        that was used to perform length scaling.
     * @param {Number} maxVal Number to show next to a "Maximum" header.
     *                        This should be the maximum value in the field
     *                        that was used to perform length scaling.
     */
    Legend.prototype.addLengthKey = function (name, minVal, maxVal) {
        this.clear();
        this.addTitle(name);

        this._minLengthVal = minVal;
        this._maxLengthVal = maxVal;

        var infoTable = document.createElement("table");
        var minRow = infoTable.insertRow(-1);
        var minHeaderCell = minRow.insertCell(-1);
        minHeaderCell.innerText = "Minimum";
        minHeaderCell.classList.add("header-cell");
        var minValCell = minRow.insertCell(-1);
        minValCell.innerText = minVal;

        var maxRow = infoTable.insertRow(-1);
        var maxHeaderCell = maxRow.insertCell(-1);
        maxHeaderCell.innerText = "Maximum";
        maxHeaderCell.classList.add("header-cell");
        var maxValCell = maxRow.insertCell(-1);
        maxValCell.innerText = maxVal;

        this._container.append(infoTable);
        this.legendType = "length";
        this.unhide();
    };

    /**
     * Hides, and removes all child HTML elements from, the container.
     *
     * Code to remove all child elements taken from
     * https://developer.mozilla.org/en-US/docs/Web/API/Node/childNodes.
     */
    Legend.prototype.clear = function () {
        this._container.classList.add("hidden");
        $(this._container).empty();
        this.legendType = null;
        this.title = "";
        // We don't *need* to, but we clear a few potentially-large temporary
        // attributes to avoid keeping them in memory.
        // (All of these are only guaranteed to be meaningful if the legend
        // type is set -- since it is now null, we can clear them freely.)
        this._sortedCategories = [];
        this._category2color = {};
        this._gradientSVG = "";
    };

    /**
     * Returns true if the legend is currently being used, false otherwise.
     *
     * This is just a convenience function, to avoid users having to manually
     * check if legendType is null.
     *
     * @return {Boolean}
     */
    Legend.prototype.isActive = function () {
        return !_.isNull(this.legendType);
    };

    /**
     * Gets an SVG representation of the legend, along with some other details.
     *
     * Please see ExportUtil.exportLegendSVG() for details on the parameters to
     * this function.
     *
     * @param {Number} row Current row this legend will be created on. (Long
     *                     story short, if only one legend is getting exported
     *                     this should just be 1. This is used to determine the
     *                     vertical position of this legend and its elements in
     *                     a SVG image.)
     * @param {Number} unit Number used to scale all distances in the SVG.
     * @param {Number} lineHeight Result of multiplying unit by some factor.
     *                            Has to do with the distance between two text
     *                            lines.
     *
     * @return {Object} Contains four keys:
     *                  -svg: String containing the legend SVG
     *                  -rowsUsed: Number describing the number of rows used in
     *                             this legend (plus row)
     *                  -width: The width of the legend SVG
     *                  -height: The height of the legend SVG. Honestly, I
     *                   think this is slightly too large -- not sure what's
     *                   going on. At least things work right now!
     *
     * @throws {Error} If the current legend type does not have SVG export
     *                 supported. Currently only categorical legends can be
     *                 exported, but this will change soon.
     */
    Legend.prototype.exportSVG = function (row, unit, lineHeight) {
        var scope = this;

        // Style of the rect containing the legend SVG (in addition to the
        // global rect style applied below)
        var BGSTYLE = 'style="fill:#ffffff;"';

        // Font style for the legend title and entries. Should match what
        // Empress uses in its body CSS.
        // The context font apparently needs to be set as just "font", but
        // setting the actual text styles in the SVG that way seems to cause
        // some problems for Inkscape and GIMP's SVG importers (e.g. in
        // Inkscape it overrides the title font-weight, and in GIMP the entire
        // thing is ignored -- the font shows up as some small serif font). So
        // we set the context font and <style> font stuff different ways.
        var FONTSIZE = unit + "pt";
        var FONTFAM = "Arial,Helvetica,sans-serif";

        var FONT = FONTSIZE + " " + FONTFAM;

        // Used as a rough estimate about the consumed width by text strings.
        var tmpCanvas = document.createElement("canvas");
        var context = tmpCanvas.getContext("2d");
        // Fun fact: if you accidentally include a semicolon at the end of the
        // font then this will break context.measureText()! No idea why, but
        // that was a fun ten minutes.
        context.font = "bold " + FONT;

        // Figure out the rect's top Y position
        var topY = (row - 1) * lineHeight;

        // Set global styling for the SVG, cutting down a bit on redundant text
        // in the output SVG. (This is based on how the vertex/fragment shader
        // code in drawer.js is constructed as an array of strings.)
        var styleSVG = [
            "<style>",
            "text {",
            "font-family: " + FONTFAM + ";",
            "font-size: " + FONTSIZE + ";",
            "}",
            ".btext { font-weight: bold; }",
            ".blackborder { stroke: #000000; stroke-width: 1; }",
            "</style>",
        ].join("\n");

        // Add trailing newline to style SVG, since .join() doesn't add it
        styleSVG += "\n";

        // First, add the title to the inner legend SVG.
        // The x="50%" and text-anchor="middle" center the title over the
        // legend: solution from
        // https://stackoverflow.com/a/31522006/10730311.
        var innerSVG =
            '<text x="50%" y="' +
            row * lineHeight +
            '" text-anchor="middle" class="btext">' +
            this.title +
            "</text>\n";

        // Keep track of the number of rows used (including those already
        // represented in the input row parameter). Each branch of the if
        // statement below is responsible for updating this.
        var rowsUsed = row;
        // To start off: count the title line as a row used.
        rowsUsed++;

        // Keep track of the max-length line -- start off with the title as the
        // max, but this may change if a line below is longer
        var maxLineWidth = context.measureText(this.title).width;

        // Each branch of the if statement below is responsible for setting
        // the width and height.
        var width, height;

        if (this.legendType === "categorical") {
            // Go through each of the categories and add a row to the legend
            // SVG. (Since the legend type is categorical,
            // this._sortedCategories and this._category2color must be
            // defined.)
            _.each(this._sortedCategories, function (cat) {
                var color = scope._category2color[cat];
                maxLineWidth = Math.max(
                    maxLineWidth,
                    context.measureText(cat).width
                );
                var rowTopY = (rowsUsed - 1) * lineHeight + unit;
                // Add a square to the left of the label showing the color
                innerSVG +=
                    '<rect class="blackborder" x="0" y="' +
                    rowTopY +
                    '" width="' +
                    lineHeight +
                    '" height="' +
                    lineHeight +
                    '" style="fill:' +
                    color +
                    ';"/>\n';
                // Add text labelling the category. We set dominant-baseline
                // to "hanging" so that we can reference the top position of
                // the text, not the bottom position of the text. (The default
                // for <rect> is that y points to top, the default for <text>
                // is that y points to baseline. I don't know why...) Soln c/o
                // https://stackoverflow.com/a/45914139/10730311.
                // (GIMP's SVG importer doesn't seem to interpret this
                // correctly, but Inkscape can handle it ok. So this seems like
                // Not Our Problem.)
                innerSVG +=
                    '<text dominant-baseline="hanging" x="' +
                    (lineHeight + unit) +
                    '" y="' +
                    // The + unit / 2 is a crude way of vertically aligning
                    // this text with the color square in its row. (We know the
                    // font size is "unit", so we should be able to safely push
                    // the text down by unit / 2.)
                    (rowTopY + unit / 2) +
                    '">' +
                    cat +
                    "</text>\n";
                rowsUsed++;
            });

            // draw a rect behind, i.e. lower z-order, the legend title and
            // colored keys to visually group the legend. Also actually put
            // these elements into a group for easier manual editing.
            // rect shall have a certain padding, its height must exceed
            // the number of used text rows and width must be larger than
            // longest key text and/or legend title
            var numCats = this._sortedCategories.length;

            // The maximum line width is the max text width plus (in the likely
            // event that the max text width is from a category line, not from
            // the title line) the width of a color square (lineHeight) plus
            // the padding btwn. the color square and start of the text (unit)
            // plus some extra padding at the right-hand side (the other unit)
            width = maxLineWidth + lineHeight + 2 * unit;
            height = (numCats + 1) * lineHeight + unit;
        } else if (this.legendType === "continuous") {
            // Add linear gradient to SVG
            innerSVG += this._gradientSVG;

            // Define the height of the gradient -- let's say it takes up 10
            // rows (so this would look identically to drawing a categorical
            // legend for a field with 10 unique values).
            var gradientHeight = 10 * lineHeight;

            // Set analogously to rowTopY in the above branch
            var gradientTopY = (rowsUsed - 1) * lineHeight + unit;

            // Add a <rect> containing said gradient, which we have the luxury
            // of defining the dimensions of :D
            innerSVG +=
                '<rect x="0" y="' +
                gradientTopY +
                '" width="' +
                lineHeight +
                '" height="' +
                gradientHeight +
                '" fill="url(#' +
                this._gradientID +
                ')" />\n';

            rowsUsed += 10;

            // Add min/mid/max value text along the gradient
            var textLeftX = lineHeight + unit;

            // Max value text goes at the top of the gradient
            // (... For now, at least -- see
            // https://github.com/biocore/emperor/issues/782.)
            innerSVG +=
                '<text x="' +
                textLeftX +
                '" y="' +
                gradientTopY +
                '" dominant-baseline="hanging">' +
                this._maxValStr +
                "</text>\n";

            // Mid value text goes halfway through the gradient
            // The way to think about this is that this y-coordinate is the
            // average of two y-coords: the topmost y-coord on the gradient
            // (gradientTopY) and the bottommost y-coord on the gradient
            // (gradientTopY + gradientHeight). Once we average these, we can
            // just set the mid value to this y-coordinate (using
            // dominant-baseline="middle" to vertically align it here).
            var midY = (2 * gradientTopY + gradientHeight) / 2;
            innerSVG +=
                '<text x="' +
                textLeftX +
                '" y="' +
                midY +
                '" dominant-baseline="middle">' +
                this._midValStr +
                "</text>\n";

            // Min value text goes at the bottom of the gradient
            innerSVG +=
                '<text x="' +
                textLeftX +
                '" y="' +
                (gradientTopY + gradientHeight) +
                '" dominant-baseline="baseline">' +
                this._minValStr +
                "</text>\n";

            // Try to increase the maximum line width based on the values. (We
            // will account for the extra horizontal space of the gradient
            // rect's width later.)
            var valStrs = [this._maxValStr, this._midValStr, this._minValStr];
            _.each(valStrs, function (valStr) {
                maxLineWidth = Math.max(
                    maxLineWidth,
                    context.measureText(valStr).width
                );
            });

            // Similar to categorical legends: max line width is the max text
            // width plus (in event that max text width is from the min / mid /
            // max value, not from the title line) the text left x coordinate.
            // (We add on an extra unit so that there is some extra padding on
            // the right-hand side between the rightmost character and the
            // rect border.)
            width = maxLineWidth + textLeftX + unit;

            // And the height is just the height of the gradient plus the
            // height of the title row plus the unit padding contained in
            // gradientTopY.
            height = gradientHeight + lineHeight + unit;
        } else if (this.legendType === "length") {
            // We're basically simulating a table here, so just adding two
            // rows of text won't cut it.
            // First, figure out which header is bigger (it's probably gonna
            // be "Maximum " but may as well be safe for weird fonts), and set
            // this to be the left x-coordinate of the value text.
            var maxHeaderWidth = 0;
            _.each(["Minimum ", "Maximum "], function (headerText) {
                maxHeaderWidth = Math.max(
                    maxHeaderWidth,
                    context.measureText(headerText).width
                );
            });

            // Now, figure out which value is bigger. Used for updating the
            // max line width.
            var maxValWidth = 0;
            _.each([this._minLengthVal, this._maxLengthVal], function (text) {
                maxValWidth = Math.max(
                    maxValWidth,
                    context.measureText(text).width
                );
            });

            // Finally, add the rows in. It's four separate <text> tags to
            // accommodate funky positioning stuff.
            var minRowY = rowsUsed * lineHeight + unit;
            innerSVG +=
                '<text class="btext" x="' +
                unit +
                '" y="' +
                minRowY +
                '">Minimum</text>\n"';
            innerSVG +=
                '<text x="' +
                (unit + maxHeaderWidth) +
                '" y="' +
                minRowY +
                '">' +
                this._minLengthVal +
                "</text>\n";
            rowsUsed++;

            var maxRowY = rowsUsed * lineHeight + unit;
            innerSVG +=
                '<text class="btext" x="' +
                unit +
                '" y="' +
                maxRowY +
                '">Maximum</text>\n"';
            innerSVG +=
                '<text x="' +
                (unit + maxHeaderWidth) +
                '" y="' +
                maxRowY +
                '">' +
                this._maxLengthVal +
                "</text>\n";
            rowsUsed++;

            // Max header width, max value width, and left and right padding
            width = maxHeaderWidth + maxValWidth + 2 * unit;
            // Three lines (title, min row, max row) plus unit padding between
            // title and min row
            height = 3 * lineHeight + unit;
        } else {
            // Eventually, when we add support for exporting continuous /
            // length legends, this will only really happen if someone tries to
            // export a legend with an invalid legendType (e.g. null)
            throw new Error(
                "Only categorical legends can be exported right now."
            );
        }

        // Build up the output SVG based on everything we have.
        // We need to apply width to this SVG in order to be able to
        // center the legend titles using x="50%" (done up around the start
        // of this function); otherwise, the legend titles are centered
        // relative to the parent SVG (containing *all* legends), which looks
        // bad if multiple legends have different lengths (the smaller legend
        // titles will stick out of the border <rect>).
        var outputSVG = '<svg width="' + width + '">\n' + styleSVG;

        // Add a white rectangle behind the legend with a black border.
        outputSVG +=
            '<rect class="blackborder" x="0" y="' +
            topY +
            '" width="' +
            width +
            '" height="' +
            height +
            '" ' +
            BGSTYLE +
            " />\n";

        // Finally, add the interior of the legend SVG and close out the tag.
        outputSVG += innerSVG + "</svg>\n";

        return {
            svg: outputSVG,
            rowsUsed: rowsUsed,
            width: width,
            height: height,
        };
    };

    Legend.CONTINUOUS_NON_NUMERIC_WARNING =
        "Some value(s) in this field were missing and/or not numeric. " +
        "These value(s) have been left out of the gradient, and no bar(s) " +
        "have been drawn for them.";

    return Legend;
});
