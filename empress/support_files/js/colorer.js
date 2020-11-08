define(["chroma", "underscore", "util"], function (chroma, _, util) {
    /**
     * @class Colorer
     *
     * Creates a color object that will map values to colors from a pre-defined
     * color map.
     *
     * @param{String} color The color map to draw colors from.
     *                      This can be an id in Colorer.__Colormaps, or an
     *                      object mapping all elements in the values array to
     *                      hex colors (for example "#FF0000" for red).
     * @param{Array} values The values in a metadata field for which colors
     *                      will be generated.
     * @param{Boolean} useQuantScale Defaults to false. If true, this'll
     *                               attempt to scale colors linearly based on
     *                               their numeric values. (This will only be
     *                               used if the input color map is sequential
     *                               or diverging; if the color map is
     *                               discrete, then this will be ignored.)
     * @param{Number} gradientIDSuffix Defaults to 0. If useQuantScale is true
     *                                 and the color map is sequential or
     *                                 diverging, then the gradient SVG
     *                                 available from this Colorer will have
     *                                 any IDs within it suffixed with this
     *                                 number. This allows for the presence of
     *                                 multiple gradients on the same page
     *                                 without ID conflicts. (If the input
     *                                 color map is discrete and/or
     *                                 useQuantScale is false, then this will
     *                                 be ignored.)
     * @param{Boolean} reverse Defaults to false. If true, the color scale
     *                         will be reversed, with respect to its default
     *                         orientation.
     * @return{Colorer}
     * constructs Colorer
     */
    function Colorer(
        color,
        values,
        useQuantScale = false,
        gradientIDSuffix = 0,
        reverse = false
    ) {
        var scope = this;

        // Remove duplicate values and sort the values sanely
        this.sortedUniqueValues = util.naturalSort(_.uniq(values));

        this.color = color;
        this.reverse = reverse;

        // This object will describe a mapping of unique field values to colors
        this.__valueToColor = {};

        /*** Continuous-scaling-specific things ***/

        // We append a number to the gradient ID so that multiple gradients can
        // be present on the same page without overriding each other. (It's the
        // caller's responsibility to ensure that gradient ID suffixes are
        // unique, at least across Colorers created for continuous scaling.)
        this._gradientID = useQuantScale ? "Gradient" + gradientIDSuffix : null;

        // Will be set to a string containing just the SVG defining the
        // gradient (i.e. just the <defs>...</defs> stuff).
        this._gradientSVG = null;

        // Will be set to a string describing the <rect> containing the
        // gradient and the <text> representations of the min/mid/max values
        // alongside it. Used to display the gradient in the page HTML.
        this._pageSVG = null;

        // Will be set to strings describing the minimum, middle, and maximum
        // values along the gradient. Designed for use with this._gradientSVG
        // (so they can be scaled as needed for SVG exporting).
        this._minValStr = null;
        this._midValStr = null;
        this._maxValStr = null;

        // Will be set to true if there were any non-numeric elements included
        // in the input values that couldn't be assigned colors (controls
        // whether or not to show a warning)
        this._missingNonNumerics = false;

        /*** End continuous-scaling-specific things ***/

        // Based on the color map, container, type and the value of
        // useQuantScale, assign colors accordingly
        if (_.isObject(this.color)) {
            if (useQuantScale) {
                throw new Error(
                    "Quantitative scales are not supported for " +
                        "custom colormaps"
                );
            }

            // check that all values are present in the colormap
            var isValid = _.every(
                _.map(this.sortedUniqueValues, function (v) {
                    return scope.color[v] !== undefined;
                })
            );
            if (!isValid) {
                throw new Error(
                    "The custom colormap does not contain a " +
                        "mapping for all values"
                );
            }
            this.__valueToColor = this.color;
        } else if (Colorer.isColorMapDiscrete(this.color)) {
            this.assignDiscreteColors();
        } else {
            if (useQuantScale) {
                this.assignContinuousScaledColors();
            } else {
                this.assignOrdinalScaledColors();
            }
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
     *
     * @throws Error if this method is called when using a custom colormap.
     */
    Colorer.prototype.assignDiscreteColors = function () {
        if (_.isObject(this.color)) {
            throw new Error(
                "Cannot call assignDiscreteColors using a custom" + " colormap"
            );
        }

        var palette;
        if (this.color === Colorer.__QIIME_COLOR) {
            palette = Colorer.__qiimeDiscrete;
        } else {
            palette = chroma.brewer[this.color];
        }
        if (this.reverse) {
            palette = _.clone(palette);
            palette.reverse();
        }
        for (var i = 0; i < this.sortedUniqueValues.length; i++) {
            var modIndex = i % palette.length;
            this.__valueToColor[this.sortedUniqueValues[i]] = palette[modIndex];
        }
    };

    /**
     * Assigns colors from a sequential or diverging color palette (specified
     * by this.color) for every value in this.sortedUniqueValues, taking into
     * account only the relative positions of the values. This will populate
     * this.__valueToColor with this information.
     *
     * Note the "ordinal" in the function name. This does not take into account
     * the actual magnitudes of numbers in the data -- all that matters is the
     * order of the values (and thanks to our use of util.naturalSort() we know
     * that values interpretable as numbers will get sorted correctly).
     * So, as an example of that, the values [1, 2, 3, 100] will get assigned
     * the same colors as [1, 2, 3, 4] or [a, b, 1, 2] or [a, b, c, d].
     *
     * @throws Error if this method is called when using a custom colormap.
     */
    Colorer.prototype.assignOrdinalScaledColors = function () {
        if (_.isObject(this.color)) {
            throw new Error(
                "Cannot call assignOrdinalScaledColors using a " +
                    "custom colormap"
            );
        }

        if (this.sortedUniqueValues.length === 1) {
            // If there's only 1 unique value, set its color as the first in
            // the color map. This matches the behavior of Emperor.
            var onlyVal = this.sortedUniqueValues[0];
            var brewer = chroma.brewer[this.color];
            if (this.reverse) {
                this.__valueToColor[onlyVal] = brewer[brewer.length - 1];
            } else {
                this.__valueToColor[onlyVal] = brewer[0];
            }
        } else {
            // ... Otherwise, do normal interpolation -- the first value gets
            // the "first" color in the color map, the last value gets the
            // "last" color in the color map, and things in between are
            // interpolated. Chroma takes care of all of the hard work.
            var domain;
            var rangeMax = this.sortedUniqueValues.length - 1;
            if (this.reverse) {
                domain = [rangeMax, 0];
            } else {
                domain = [0, rangeMax];
            }
            var interpolator = chroma.scale(this.color).domain(domain);

            for (var i = 0; i < this.sortedUniqueValues.length; i++) {
                var val = this.sortedUniqueValues[i];
                this.__valueToColor[val] = interpolator(i);
            }
        }
    };

    /**
     * Assigns colors from a sequential or diverging color palette (specified
     * by this.color) for every value in this.sortedUniqueValues, taking into
     * account the magnitudes/etc. of the numeric values in
     * this.sortedUniqueValues. This will populate this.__valueToColor with
     * this information. This will also populate this._gradientSVG,
     * this._pageSVG, this._gradientID, this._missingNonNumerics,
     * this._minValStr, this._midValStr, and this._maxValStr.
     *
     * Non-numeric values will not be assigned a color.
     *
     * This code was based on ColorViewController.getScaledColors() in Emperor:
     * https://github.com/biocore/emperor/blob/b959aed7ffcb9fa3e4d019c6e93a1af3850564d9/emperor/support_files/js/color-view-controller.js#L398
     *
     * @throws Error if this method is called when using a custom colormap.
     */
    Colorer.prototype.assignContinuousScaledColors = function () {
        var scope = this;

        if (_.isObject(this.color)) {
            throw new Error(
                "Cannot call assignContinuousScaledColors using a" +
                    " custom colormap"
            );
        }
        var split = util.splitNumericValues(this.sortedUniqueValues);
        if (split.numeric.length < 2) {
            throw new Error("Category has less than 2 unique numeric values.");
        }
        var nums = _.map(split.numeric, parseFloat);
        var min = _.min(nums);
        var max = _.max(nums);
        var domain;
        if (this.reverse) {
            domain = [max, min];
        } else {
            domain = [min, max];
        }
        var interpolator = chroma.scale(this.color).domain(domain);
        _.each(split.numeric, function (n) {
            scope.__valueToColor[n] = interpolator(parseFloat(n));
        });
        // Figure out if we should show a warning message about missing /
        // non-numeric values to the user
        this._missingNonNumerics = split.nonNumeric.length > 0;

        // Create SVG describing the gradient: basically, we sample the color
        // map along the domain 101 times, and use these 101 colors to define
        // the <linearGradient /> for each integer percentage in the inclusve
        // range [0%, 100%]. See https://github.com/biocore/emperor/issues/788.
        var mid = (min + max) / 2;
        var stopColors = interpolator.colors(101);
        // Calling interpolator.colors() returns the colors in order relative
        // to the actual color map, which means that (if reverse is true) we
        // need to reverse the color map itself.
        if (this.reverse) {
            stopColors.reverse();
        }
        this._gradientSVG =
            '<defs><linearGradient id="' +
            this._gradientID +
            '" x1="0" x2="0" y1="1" y2="0">';
        for (var pos = 0; pos < stopColors.length; pos++) {
            // "stop" tags are written here as <stop .../>. This matches what
            // Emperor does, and also the example on MDN here:
            // https://developer.mozilla.org/en-US/docs/Web/SVG/Element/stop.
            // Weirdly, Chromium seems to convert these to <stop ...></stop>.
            // I thought at first that this was causing the gradients to not
            // show up, but that wasn't the problem -- it was not using
            // document.createElementNS(). Anyway, we keep things shorter for
            // now for consistency, but replacing '"/>' with '"></stop>' works
            // fine also.
            this._gradientSVG +=
                '<stop offset="' +
                pos +
                '%" stop-color="' +
                stopColors[pos] +
                '"/>';
        }
        this._gradientSVG += "</linearGradient></defs>\n";

        // Add a rect containing the gradient. This'll only be used in the
        // in-app representation of the gradient (not in the SVG export!)
        this._pageSVG =
            '<rect width="20" height="95%" fill="url(#' +
            this._gradientID +
            ')"/>\n';

        this._minValStr = min.toString();
        this._midValStr = mid.toString();
        this._maxValStr = max.toString();
        this._pageSVG +=
            '<text x="25" y="12px" font-family="sans-serif" ' +
            'font-size="12px" text-anchor="start">' +
            this._maxValStr +
            "</text>\n";
        this._pageSVG +=
            '<text x="25" y="50%" font-family="sans-serif" ' +
            'font-size="12px" text-anchor="start">' +
            this._midValStr +
            "</text>\n";
        this._pageSVG +=
            '<text x="25" y="95%" font-family="sans-serif" ' +
            'font-size="12px" text-anchor="start">' +
            this._minValStr +
            "</text>\n";
    };

    /**
     * Returns an Object containing gradient information for a Legend.
     *
     * The intent with this method is to make sure that the Legend holding a
     * gradient has all of the information needed to export a SVG of this
     * gradient (since this may involve rescaling or otherwise altering the
     * way the legend is displayed, we pass things besides the SVG).
     *
     * @return {Object} gradientInfo An Object with the following entries:
     *                               -gradientSVG: SVG String containing the
     *                                <defs> and <linearGradient> that define
     *                                the gradient.
     *                               -pageSVG: SVG String containing the <rect>
     *                                and <text>s that position the gradient
     *                                within a rectangle and place min / mid
     *                                / max value text along it. (This is used
     *                                for displaying the gradient in the
     *                                application interface, but not used for
     *                                exporting.)
     *                               -gradientID: String ID of the gradient
     *                                defined in gradientSVG.
     *                               -minValStr: String representation of the
     *                                minimum numeric value.
     *                               -midValStr: String representation of the
     *                                middle numeric value (halfway between the
     *                                min and max; not necessarily present
     *                                within the input data).
     *                               -midValStr: String representation of the
     *                                maximum numeric value.
     *                               -missingNonNumerics: Boolean describing
     *                                whether or not missing / non-numeric
     *                                values were provided to the Colorer.
     *                                (If true, a warning about this should
     *                                be shown in the legend about this.)
     */
    Colorer.prototype.getGradientInfo = function () {
        if (_.isNull(this._gradientSVG)) {
            throw new Error(
                "No gradient data defined for this Colorer; check that " +
                    "useQuantScale is true and that the selected color map " +
                    "is not discrete."
            );
        } else {
            return {
                gradientSVG: this._gradientSVG,
                pageSVG: this._pageSVG,
                gradientID: this._gradientID,
                minValStr: this._minValStr,
                midValStr: this._midValStr,
                maxValStr: this._maxValStr,
                missingNonNumerics: this._missingNonNumerics,
            };
        }
    };

    /**
     * Returns a mapping of unique field values to their corresponding colors,
     * where each color is in RGB number format.
     *
     * @return{Object} rgbMap An object mapping each item in
     *                 this.sortedUniqueValues to its assigned color. Each
     *                 color is represented by a number (see rgbToFloat()).
     */
    Colorer.prototype.getMapRGB = function () {
        return _.mapObject(this.__valueToColor, Colorer.hex2RGB);
    };

    /**
     * Compresses a color array of the form [red, green, blue], where each
     * element is in the range of [0, 255], into a single number.
     *
     * @param{Array} rgb The color array. The element in the array must in the
     *                   range of [0, 255].
     *
     * @return{Number} the compressed color to be used in WebGl shaders
     */
    Colorer.rgbToFloat = function (rgb) {
        return rgb[0] + rgb[1] * 256 + rgb[2] * 256 * 256;
    };

    /**
     * Converts an RGB color array (with values in the range [0, 255])
     * to an RGB GL array (with values in the range [0, 1]).
     *
     * @param {Array} rgbArray An array of the format [R, G, B], where each
     *                         element is in the range [0, 255].
     * @return {Array} glArray An array of the format [R, G, B], where each
     *                         element is in the range [0, 1].
     */
    Colorer.rgb2gl = function (rgbArray) {
        // The slice() removes the 4th element, an alpha channel.
        return chroma(rgbArray).gl().slice(0, 3);
    };

    /**
     * Uncompress a RGB color encoded as a float (eg the output of rgbToFloat).
     * This is the same function found in the WebGl shaders.
     * However, functions in WebGl shaders cannot be called by js functions and
     * vice versa.
     */
    Colorer.unpackColor = function (f) {
        var color = [];
        // red
        color[0] = f % 256.0;
        // green
        color[1] = ((f - color[0]) / 256.0) % 256.0;
        // blue
        color[2] = (f - color[0] - 256.0 * color[1]) / 65536.0;
        return color;
    };

    /**
     * Returns a mapping of unique field values to their corresponding colors,
     * where each color is in hex format.
     *
     * @return{Object} hexMap An object mapping each item in
     *                 this.sortedUniqueValues to its assigned color. Each
     *                 color is represented by a hex string like "#ff0000".
     */
    Colorer.prototype.getMapHex = function () {
        // Technically we already store colors in hex format, so we could just
        // return this.__valueToColor directly. However, JS is "call by
        // sharing," so this would allow a user to overwrite the values in the
        // returned object and thus mess with the Colorer internals. Hence why
        // we return a shallow copy of this.__valueToColor instead (the object
        // doesn't include other objects / arrays within it, so this should be
        // safe). See https://stackoverflow.com/a/5314911/10730311 for details.
        return _.clone(this.__valueToColor);
    };

    /**
     * Adds all available color maps to a select object.
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

    /**
     * Converts a hex color to an RGB float suitable for use with WebGL.
     *
     * @param {String} hexString
     * @return {Float} rgb
     * @classmethod
     */
    Colorer.hex2RGB = function (hexString) {
        var rgb = chroma(hexString).rgb();
        return Colorer.rgbToFloat(rgb);
    };

    /**
     * Returns the i-th hex color from the "Classic QIIME Colors" map, looping
     * around as needed.
     *
     * @param {Number} i Nonnegative integer
     * @return {String} Corresponding hex color
     * @throws {Error} If i is negative
     * @classmethod
     */
    Colorer.getQIIMEColor = function (i) {
        if (i < 0) {
            throw new Error("i must be nonnegative");
        }
        return Colorer.__qiimeDiscrete[i % Colorer.__qiimeDiscrete.length];
    };

    /**
     * Given a color map's ID, determines if it's a discrete color map or not.
     *
     * The ID should match the "id" property of one of the color map objects
     * within Colorer.__Colormaps.
     *
     * @param {String} colorMapID
     * @return {Boolean} true if the color map with a matching ID is discrete;
     *                   false otherwise.
     * @throws {Error} If no color map matches the ID.
     * @classmethod
     */
    Colorer.isColorMapDiscrete = function (colorMapID) {
        var colorMapObj = _.find(Colorer.__Colormaps, function (cm) {
            return cm.id === colorMapID;
        });
        // If no color map has the requested ID, then throw an error.
        // (e.g. "-- Discrete --"), then throw an error.
        if (_.isUndefined(colorMapObj)) {
            throw new Error(
                'Invalid color map ID "' + colorMapID + '" specified'
            );
        }
        return colorMapObj.type === Colorer.DISCRETE;
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
