define(["chroma", "underscore", "util"], function (chroma, _, util) {
    /**
     * @class Colorer
     *
     * Creates a color object that will map values to colors from a pre-defined
     * color map.
     *
     * @param{String} color The color map to draw colors from.
     *                      This should be an id in Colorer.__Colormaps.
     * @param{Array} values The values in a metadata field for which colors
     *                      will be generated.
     *
     * @return{Colorer}
     * constructs Colorer
     */
    function Colorer(color, values) {
        // Remove duplicate values and sort the values sanely
        this.sortedUniqueValues = util.naturalSort(_.uniq(values));

        this.color = color;

        // This object will describe a mapping of unique field values to colors
        this.__valueToColor = {};

        // Figure out what "type" of color map has been selected (should be one
        // of discrete, sequential, or diverging)
        this.selectedColorMap = _.find(Colorer.__Colormaps, function (cm) {
            return cm.id === color;
        });

        // Based on the determined color map type, assign colors accordingly
        if (this.selectedColorMap.type === Colorer.DISCRETE) {
            this.assignDiscreteColors();
        } else if (
            this.selectedColorMap.type === Colorer.SEQUENTIAL ||
            this.selectedColorMap.type === Colorer.DIVERGING
        ) {
            this.assignScaledColors();
        } else {
            throw new Error("Invalid color map " + this.color + " specified");
        }
    }

    /**
     * Assigns colors from a discrete color palette (specified by this.color)
     * for every value in this.sortedUniqueValues. This will populate
     * this.__valueToColor with this information.
     *
     * This will "loop around" as needed in order to generate colors; for
     * example, if the color palette has 10 colors and there are 15 elements in
     * this.sortedUniqueValues, the last 5 of those 15 elements will be
     * assigned the first 5 colors from the color palette.
     */
    Colorer.prototype.assignDiscreteColors = function () {
        var palette;
        if (this.color === Colorer.__QIIME_COLOR) {
            palette = Colorer.__qiimeDiscrete;
        } else {
            palette = chroma.brewer[this.color];
        }
        for (var i = 0; i < this.sortedUniqueValues.length; i++) {
            var modIndex = i % palette.length;
            this.__valueToColor[this.sortedUniqueValues[i]] = palette[modIndex];
        }
    };

    /**
     * Assigns colors from a sequential or diverging color palette (specified
     * by this.color) for every value in this.sortedUniqueValues. This will
     * populate this.__valueToColor with this information.
     *
     * If there aren't at least two numeric values in this.sortedUniqueValues,
     * this will set every value with Colorer.NANCOLOR and alert the user with
     * a warning message. Otherwise, this will properly scale numeric values
     * according to the color map (while setting non-numeric values to
     * Colorer.NANCOLOR).
     */
    Colorer.prototype.assignScaledColors = function () {
        // set up a closure so we can update this.__valueToColor within the
        // functions below
        var thisColorer = this;

        // Get list of only numeric values, and see if it's possible for us
        // to do scaling with these values or not
        var split = util.splitNumericValues(this.sortedUniqueValues);

        if (split.numeric.length < 2) {
            // We don't have enough numeric values to do any sort of
            // "scaling," so instead we just color everything gray
            _.each(this.sortedUniqueValues, function (val) {
                thisColorer.__valueToColor[val] = Colorer.NANCOLOR;
            });
            alert(
                "The selected color map (" +
                    this.selectedColorMap.name +
                    ") cannot be used with this field. Continuous " +
                    "coloration requires at least 2 numeric values in " +
                    "the field."
            );
        } else {
            // We can do scaling! Nice.
            // convert objects to numbers so we can map them to a color
            var numbers = _.map(split.numeric, parseFloat);
            var min = _.min(numbers);
            var max = _.max(numbers);

            var interpolator = chroma
                .scale(chroma.brewer[this.color])
                .domain([min, max]);

            // Color all the numeric values
            _.each(split.numeric, function (element) {
                thisColorer.__valueToColor[element] = interpolator(+element).hex();
            });
            // Gray out non-numeric values
            _.each(split.nonNumeric, function (element) {
                thisColorer.__valueToColor[element] = Colorer.NANCOLOR;
            });
        }
    };

    Colorer.prototype.getMapRGB = function () {
        return _.mapObject(this.__valueToColor, function (color) {
            // chroma(color).gl() returns an array with four components (RGBA
            // instead of RGB). The slice() here strips off the final
            // (transparency) element, which causes problems with Empress'
            // drawing code
            return chroma(color).gl().slice(0, 3);
        });
    };

    Colorer.prototype.getMapHex = function () {
        return this.__valueToColor;
    };

    /**
     * Adds all available color maps to the select object.
     *
     * @param{Object} sel The select object to add color map options to.
     * @classmethod
     */
    Colorer.addColorsToSelect = function (sel) {
        // The color map selector
        for (var i = 0; i < Colorer.__Colormaps.length; i++) {
            var map = Colorer.__Colormaps[i];
            var opt = document.createElement("option");
            opt.innerHTML = map.name;
            opt.value = map.id;

            if (map.type == "Header") {
                opt.disabled = true;
            }
            sel.appendChild(opt);
        }
    };

    Colorer.DISCRETE = "Discrete";
    Colorer.SEQUENTIAL = "Sequential";
    Colorer.DIVERGING = "Diverging";
    Colorer.HEADER = "Header";

    // taken from the qiime/colors.py module; a total of 24 colors
    /** @private */
    Colorer.__QIIME_COLOR = "discrete-coloring-qiime";
    Colorer.__qiimeDiscrete = [
        "#ff0000",
        "#0000ff",
        "#f27304",
        "#008000",
        "#91278d",
        "#ffff00",
        "#7cecf4",
        "#f49ac2",
        "#5da09e",
        "#6b440b",
        "#808080",
        "#f79679",
        "#7da9d8",
        "#fcc688",
        "#80c99b",
        "#a287bf",
        "#fff899",
        "#c49c6b",
        "#c0c0c0",
        "#ed008a",
        "#00b6ff",
        "#a54700",
        "#808000",
        "#008080",
    ];

    // This is also the default "nanColor" for Emperor. (We could make this
    // configurable if desired.)
    Colorer.NANCOLOR = "#64655d";

    // Used to create color select option and chroma.brewer
    //Modified from:
    //https://github.com/biocore/emperor/blob/
    //     027aa16f1dcf9536cd2dd9c9800ece5fc359ecbc/emperor/
    //     support_files/js/color-view-controller.js#L573-L613
    Colorer.__Colormaps = [
        { name: "-- Discrete --", type: Colorer.HEADER },
        {
            id: "discrete-coloring-qiime",
            name: "Classic QIIME Colors",
            type: Colorer.DISCRETE,
        },
        { id: "Paired", name: "Paired", type: Colorer.DISCRETE },
        { id: "Accent", name: "Accent", type: Colorer.DISCRETE },
        { id: "Dark2", name: "Dark", type: Colorer.DISCRETE },
        { id: "Set1", name: "Set1", type: Colorer.DISCRETE },
        { id: "Set2", name: "Set2", type: Colorer.DISCRETE },
        { id: "Set3", name: "Set3", type: Colorer.DISCRETE },
        { id: "Pastel1", name: "Pastel1", type: Colorer.DISCRETE },
        { id: "Pastel2", name: "Pastel2", type: Colorer.DISCRETE },

        { name: "-- Sequential --", type: Colorer.HEADER },
        { id: "Viridis", name: "Viridis", type: Colorer.SEQUENTIAL },
        { id: "Reds", name: "Reds", type: Colorer.SEQUENTIAL },
        { id: "RdPu", name: "Red-Purple", type: Colorer.SEQUENTIAL },
        { id: "Oranges", name: "Oranges", type: Colorer.SEQUENTIAL },
        { id: "OrRd", name: "Orange-Red", type: Colorer.SEQUENTIAL },
        { id: "YlOrBr", name: "Yellow-Orange-Brown", type: Colorer.SEQUENTIAL },
        { id: "YlOrRd", name: "Yellow-Orange-Red", type: Colorer.SEQUENTIAL },
        { id: "YlGn", name: "Yellow-Green", type: Colorer.SEQUENTIAL },
        { id: "YlGnBu", name: "Yellow-Green-Blue", type: Colorer.SEQUENTIAL },
        { id: "Greens", name: "Greens", type: Colorer.SEQUENTIAL },
        { id: "GnBu", name: "Green-Blue", type: Colorer.SEQUENTIAL },
        { id: "Blues", name: "Blues", type: Colorer.SEQUENTIAL },
        { id: "BuGn", name: "Blue-Green", type: Colorer.SEQUENTIAL },
        { id: "BuPu", name: "Blue-Purple", type: Colorer.SEQUENTIAL },
        { id: "Purples", name: "Purples", type: Colorer.SEQUENTIAL },
        { id: "PuRd", name: "Purple-Red", type: Colorer.SEQUENTIAL },
        { id: "PuBuGn", name: "Purple-Blue-Green", type: Colorer.SEQUENTIAL },
        { id: "Greys", name: "Greys", type: Colorer.SEQUENTIAL },

        { name: "-- Diverging --", type: Colorer.HEADER },
        { id: "Spectral", name: "Spectral", type: Colorer.DIVERGING },
        { id: "RdBu", name: "Red-Blue", type: Colorer.DIVERGING },
        { id: "RdYlGn", name: "Red-Yellow-Green", type: Colorer.DIVERGING },
        { id: "RdYlBu", name: "Red-Yellow-Blue", type: Colorer.DIVERGING },
        { id: "RdGy", name: "Red-Grey", type: Colorer.DIVERGING },
        { id: "PiYG", name: "Pink-Yellow-Green", type: Colorer.DIVERGING },
        { id: "BrBG", name: "Brown-Blue-Green", type: Colorer.DIVERGING },
        { id: "PuOr", name: "Purple-Orange", type: Colorer.DIVERGING },
        { id: "PRGn", name: "Purple-Green", type: Colorer.DIVERGING },
    ];
    return Colorer;
});
