define(["chroma"], function(chroma) {
    // class globals closure variables
    var DISCRETE = "Discrete";
    var SEQUENTIAL = "Sequential";
    var DIVERGING = "Diverging";
    var HEADER = "Header";

    /**
     * @class Colorer
     *
     * Creates a color object that will map values to colors from a pre-defined
     * color map. The color object uses draws from a range of values defined by
     * [min, max] and assigns a color based on where the value falls within the
     * range.
     *
     * @param{Object} color The color map to draw colors from.
     * @param{Object} min The minimum value.
     * @param{Object} max The maximum value.
     *
     * @return{Colorer}
     * constructs Colorer
     */
    function Colorer(color, min, max) {
        if (color === Colorer.__QIIME_COLOR) {
            this.__colorer = chroma.scale(Colorer.__qiimeDiscrete);
        } else {
            this.__colorer = chroma.scale(color);
        }
        this.__colorer.domain([min, max]);
    }

    /**
     * Returns an rgb array with values in the range of [0,1].
     *
     * @param{Number} color A number in the range [min,max]
     *
     * @return{Object} An rgb array
     */
    Colorer.prototype.getColorRGB = function(color) {
        return this.__colorer(color)
            .rgb()
            .map(x => x / 256);
    };

    /**
     * Returns an rgb hex string.
     *
     * @param{Number} color A number in the range [min,max]
     *
     * @return{Object} An rgb hex string
     */
    Colorer.prototype.getColorHex = function(color) {
        return this.__colorer(color).hex();
    };

    /**
     * Adds all available color maps to the select object.
     *
     * @param{Object} sel The select object to add color map options to.
     * @classmethod
     */
    Colorer.addColorsToSelect = function(sel) {
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
        "#008080"
    ];

    // Used to create color select option and chroma.brewer
    //Modified from:
    //https://github.com/biocore/emperor/blob/
    //     027aa16f1dcf9536cd2dd9c9800ece5fc359ecbc/emperor/
    //     support_files/js/color-view-controller.js#L573-L613
    Colorer.__Colormaps = [
        { name: "-- Discrete --", type: HEADER },
        {
            id: "discrete-coloring-qiime",
            name: "Classic QIIME Colors",
            type: DISCRETE
        },
        { id: "Paired", name: "Paired", type: DISCRETE },
        { id: "Accent", name: "Accent", type: DISCRETE },
        { id: "Dark2", name: "Dark", type: DISCRETE },
        { id: "Set1", name: "Set1", type: DISCRETE },
        { id: "Set2", name: "Set2", type: DISCRETE },
        { id: "Set3", name: "Set3", type: DISCRETE },
        { id: "Pastel1", name: "Pastel1", type: DISCRETE },
        { id: "Pastel2", name: "Pastel2", type: DISCRETE },

        { name: "-- Sequential --", type: HEADER },
        { id: "Viridis", name: "Viridis", type: SEQUENTIAL },
        { id: "Reds", name: "Reds", type: SEQUENTIAL },
        { id: "RdPu", name: "Red-Purple", type: SEQUENTIAL },
        { id: "Oranges", name: "Oranges", type: SEQUENTIAL },
        { id: "OrRd", name: "Orange-Red", type: SEQUENTIAL },
        { id: "YlOrBr", name: "Yellow-Orange-Brown", type: SEQUENTIAL },
        { id: "YlOrRd", name: "Yellow-Orange-Red", type: SEQUENTIAL },
        { id: "YlGn", name: "Yellow-Green", type: SEQUENTIAL },
        { id: "YlGnBu", name: "Yellow-Green-Blue", type: SEQUENTIAL },
        { id: "Greens", name: "Greens", type: SEQUENTIAL },
        { id: "GnBu", name: "Green-Blue", type: SEQUENTIAL },
        { id: "Blues", name: "Blues", type: SEQUENTIAL },
        { id: "BuGn", name: "Blue-Green", type: SEQUENTIAL },
        { id: "BuPu", name: "Blue-Purple", type: SEQUENTIAL },
        { id: "Purples", name: "Purples", type: SEQUENTIAL },
        { id: "PuRd", name: "Purple-Red", type: SEQUENTIAL },
        { id: "PuBuGn", name: "Purple-Blue-Green", type: SEQUENTIAL },
        { id: "Greys", name: "Greys", type: SEQUENTIAL },

        { name: "-- Divergin --", type: HEADER },
        { id: "Spectral", name: "Spectral", type: DIVERGING },
        { id: "RdBu", name: "Red-Blue", type: DIVERGING },
        { id: "RdYlGn", name: "Red-Yellow-Green", type: DIVERGING },
        { id: "RdYlBu", name: "Red-Yellow-Blue", type: DIVERGING },
        { id: "RdGy", name: "Red-Grey", type: DIVERGING },
        { id: "PiYG", name: "Pink-Yellow-Green", type: DIVERGING },
        { id: "BrBG", name: "Brown-Blue-Green", type: DIVERGING },
        { id: "PuOr", name: "Purple-Orange", type: DIVERGING },
        { id: "PRGn", name: "Purple-Green", type: DIVERGING }
    ];
    return Colorer;
});
