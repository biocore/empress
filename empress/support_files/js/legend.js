define(["underscore", "util"], function (_, util) {
    /**
     *
     * @class Legend
     *
     * Creates a legend within a given HTML element. (You'll need to call
     * addColorKey() to populate the legend with data.)
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
     * Populates the legend to represent a color key.
     *
     * @param {String} name Text to show in the legend title.
     * @param {Object} info Color key information. This should map unique
     *                      values (e.g. in sample or feature metadata) to
     *                      their assigned color, expressed in hex format.
     * @param {Boolean} isContinuous Whether or not to display a continuous
     *                               (gradient) or categorical color key.
     */
    Legend.prototype.addColorKey = function (name, info, isContinuous) {
        if (name) {
            var titleDiv = this._container.appendChild(
                document.createElement("div")
            );
            titleDiv.classList.add("legend-title");
            titleDiv.innerText = name;
        }
        if (isContinuous) {
            this.__addContinuousKey(info);
        } else {
            this.__addCategoricalKey(info);
        }
        // If the container was previously hidden, un-hide it
        this._container.classList.remove("hidden");
    };

    /**
     * Displays a continuous color key.
     * @param {Object} info - key information
     */
    Legend.prototype.__addContinuousKey = function (info) {
        // create key container
        let div = document.createElement("div");
        div.classList.add("gradient-bar");

        // min label
        let component = document.createElement("label");
        component.classList.add("gradient-label");
        component.innerHTML = this.__formatNumLabel(info.min[0]);
        div.appendChild(component);

        // color gradient
        component = document.createElement("div");
        component.classList.add("gradient-color");
        component.setAttribute(
            "style",
            "background: linear-gradient(to right, " +
                info.min[1] +
                " 0%, " +
                info.max[1] +
                " 100%);"
        );
        div.appendChild(component);

        // max label
        component = document.createElement("label");
        component.classList.add("gradient-label");
        component.innerHTML = this.__formatNumLabel(info.max[0]);
        div.appendChild(component);

        container.appendChild(div);
    };

    /**
     * Displays a categorical color key.
     *
     * Each key/value pair in the input color key is displayed in a separate
     * row in the legend. Pairs are sorted from top to bottom in the legend
     * using util.naturalSort() on the keys (this should match the way colors
     * are assigned).
     *
     * @param {Object} info Color key to represent in the legend.
     */
    Legend.prototype.__addCategoricalKey = function (info) {
        var scope = this;
        let sortedCategories = util.naturalSort(_.keys(info));
        _.each(sortedCategories, function (key) {
            // create a container row for each color / text pair
            let div = document.createElement("div");
            div.classList.add("gradient-bar");

            // Add a color box (could totally be replaced by e.g. a Spectrum
            // color picker in the future)
            let component = document.createElement("div");
            component.classList.add("category-color");
            component.setAttribute("style", "background: " + info[key] + ";");
            div.appendChild(component);

            // Add a label for that color box
            var label = document.createElement("label");
            label.classList.add("gradient-label");
            label.innerText = key;
            label.title = key;
            div.appendChild(label);

            scope._container.appendChild(div);
        });
    };

    /**
     * Format a number that is to be displayed in a label.
     *
     * @param {number} num - number to be formatted
     * @returns {string} formatted number
     */
    Legend.prototype.__formatNumLabel = function (num) {
        return num.toPrecision(4).replace(/\.?0+$/, "");
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
