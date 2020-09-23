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
         * Sorted categories shown in the legend. Stored as a class-level
         * variable so it can be retrieved when exporting a categorical legend
         * to SVG.
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
     * do much actual work. (Colorer.getGradientSVG() does the work of
     * computing this.)
     *
     * The creation of the SVG container was based on Emperor's code:
     * https://github.com/biocore/emperor/blob/00c73f80c9d504826e61ddcc8b2c0b93f344819f/emperor/support_files/js/color-view-controller.js#L54-L56
     *
     * @param {String} name Text to show in the legend title.
     * @param {String} gradientSVG SVG defining a color gradient; will be shown
     *                             in the legend.
     * @param {Boolean} showNonNumericWarning If true, a warning will be shown
     *                                        below the gradient about some
     *                                        values being omitted from the
     *                                        gradient due to being
     *                                        non-numeric.
     */
    Legend.prototype.addContinuousKey = function (
        name,
        gradientSVG,
        showNonNumericWarning
    ) {
        this.clear();
        this.addTitle(name);
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
        // just kinda plop the SVG code into containerSVG's HTML
        containerSVG.innerHTML = gradientSVG;
        this._container.appendChild(containerSVG);
        if (showNonNumericWarning) {
            var warningP = document.createElement("p");
            warningP.innerText =
                "Some value(s) in this field were not " +
                "numeric. These value(s) have been left " +
                "out of the gradient, and no bar(s) " +
                "have been drawn for them.";
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
        var FONT = unit + "pt Arial,Helvetica,sans-serif";

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
        var legendSVG = [
            "<style>",
            ".title { font-weight: bold; }",
            "text { font: " + FONT + "; }",
            "rect { stroke: #000000; stroke-width: 1; }",
            "</style>",
        ].join("\n");

        var rowsUsed = row;
        if (this.legendType === "categorical") {
            var maxLineWidth = context.measureText(this.title).width;
            // First, add the title to the legend SVG.
            // The x="50%" and text-anchor="middle" center the title over the
            // legend: solution from
            // https://stackoverflow.com/a/31522006/10730311.
            legendSVG +=
                '<text x="50%" y="' +
                rowsUsed * lineHeight +
                '" text-anchor="middle" class="title">' +
                this.title +
                "</text>\n";
            rowsUsed++;
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
                legendSVG +=
                    '<rect x="0" y="' +
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
                legendSVG +=
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
            var width = maxLineWidth + lineHeight + unit;
            var height = (numCats + 1) * lineHeight + unit;
            var outputSVG =
                '<g>\n<rect x="0" y="' +
                topY +
                '" width="' +
                width +
                '" height="' +
                height +
                '" ' +
                BGSTYLE +
                " />\n" +
                legendSVG +
                "</g>\n";
            return {
                svg: outputSVG,
                rowsUsed: rowsUsed,
                width: width,
                height: height,
            };
        } else {
            // Eventually, when we add support for exporting continuous /
            // length legends, this will only really happen if someone tries to
            // export a legend with an invalid legendType (e.g. null)
            throw new Error(
                "Only categorical legends can be exported right now."
            );
        }
    };

    return Legend;
});
