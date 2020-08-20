define(["underscore", "util"], function (_, util) {
    /**
     *
     * @class Legend
     *
     * Creates a legend within a given HTML element. (You'll need to call
     * addCategoricalKey() or addContinuousKey() to populate the legend with
     * data.)
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
        this._container = container;
    }

    /**
     * Adds a title element to the legend container.
     *
     * @param {String} name Text to show in the title.
     */
    Legend.prototype.addTitle = function (name) {
        var titleDiv = this._container.appendChild(
            document.createElement("div")
        );
        titleDiv.classList.add("legend-title");
        titleDiv.innerText = name;
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
        let sortedCategories = util.naturalSort(_.keys(info));
        var containerTable = document.createElement("table");
        // Remove border spacing, which seems to be a default for at least some
        // browsers. This prevents labels from appearing to the left of color
        // categories when scrolling the legend horizontally (it just looks
        // kinda ugly, so by smooshing the colors to the left of the legend we
        // avoid this problem).
        containerTable.setAttribute("style", "border-spacing: 0;");
        _.each(sortedCategories, function (key) {
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
        while (this._container.firstChild) {
            this._container.removeChild(this._container.firstChild);
        }
    };

    return Legend;
});
