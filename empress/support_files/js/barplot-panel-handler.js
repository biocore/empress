define([
    "jquery",
    "underscore",
    "spectrum",
    "chroma",
    "BarplotLayer",
    "Colorer",
    "util",
], function ($, _, spectrum, chroma, BarplotLayer, Colorer, util) {
    /**
     *
     * @class BarplotPanel
     *
     * Creates a tab for the barplot panel.
     *
     * @param {Empress} empress Instance of the main Empress object.
     *                          This is used to retrieve data and trigger
     *                          callbacks in a few places. (I tried to avoid
     *                          having this be a property of BarplotPanel, and
     *                          just have the callbacks be passed here, but
     *                          issues with "this" and scoping got to be too
     *                          hairy; see the "Using object methods as
     *                          callbacks/event handlers" section of
     *                          https://stackoverflow.com/a/20279485/10730311
     *                          for gritty details.)
     * @param {String} defaultLayout The name of the initial layout in Empress.
     *                               Used to determine whether to show the
     *                               "barplots available" or "barplots
     *                               unavailable" content from the start.
     *
     * @return {BarplotPanel}
     * construct BarplotPanel
     */
    function BarplotPanel(empress, defaultLayout) {
        var scope = this;

        this.empress = empress;
        this.fmCols = this.empress.getFeatureMetadataCategories();
        this.smCols = this.empress.getSampleCategories();

        // References to various DOM elements

        // Toggles the visibility of the barplot UI
        this.barplotCheckbox = document.getElementById("barplot-chk");

        // Controls for adding additional layers
        this.addOptions = document.getElementById("barplot-add-options");
        this.addButton = document.getElementById("barplot-add-btn");

        // Controls for re-drawing barplots
        this.updateOptions = document.getElementById("barplot-update-options");
        this.updateButton = document.getElementById("barplot-update");

        // Controls for adjusting the barplot borders
        this.borderContent = document.getElementById("barplot-border-content");
        this.borderCheckbox = document.getElementById("barplot-border-chk");
        this.borderOptions = document.getElementById("barplot-border-options");
        this.borderGapInput = document.getElementById("barplot-custom-gap");
        this.borderColorPicker = document.getElementById(
            "barplot-border-color"
        );
        this.borderLengthInput = document.getElementById(
            "barplot-border-length"
        );

        // Contains the UI of each of the barplot layers
        this.layerContainer = document.getElementById(
            "barplot-layer-container"
        );

        // Shown when the current layout supports barplots
        this.availContent = document.getElementById(
            "barplot-available-content"
        );

        // Shown when the current layout does not support barplots
        this.unavailContent = document.getElementById(
            "barplot-unavailable-content"
        );

        // The side panel template starts with the "unavailable" content
        // shown by default (since the current default layout is unrooted,
        // which doesn't support barplots), but this should be resilient
        // enough that changes to the default layout shouldn't break this.
        // Hence us checking this here anyway.
        this.updateLayoutAvailability(defaultLayout);

        // Whether or not this.barplotCheckbox is checked
        this.enabled = false;

        // Array of BarplotLayer objects, in order of first added to most
        // recently added
        this.layers = [];

        // Incremented by 1 whenever a new layer is added. Notably, this is
        // *not* changed when a layer is removed -- this allows us to assign
        // each layer a guaranteed-unique number, which is useful for creating
        // HTML elements with unique IDs where needed
        this.numLayersCreated = 0;

        // Define behavior for turning barplots on/off (note that this is
        // different from the makeUnavailable() / makeAvailable() stuff -- the
        // barplot checkbox and the other things here are all contained within
        // this.availContent, and so should only be shown if the current layout
        // supports barplots).
        this.barplotCheckbox.onclick = function () {
            if (scope.barplotCheckbox.checked) {
                scope.layerContainer.classList.remove("hidden");
                scope.borderContent.classList.remove("hidden");
                scope.addOptions.classList.remove("hidden");
                scope.updateOptions.classList.remove("hidden");
                scope.enabled = true;
                // We don't immediately draw barplots: see
                // https://github.com/biocore/empress/issues/343. The user has
                // to click "Update" first.
            } else {
                scope.layerContainer.classList.add("hidden");
                scope.borderContent.classList.add("hidden");
                scope.addOptions.classList.add("hidden");
                scope.updateOptions.classList.add("hidden");
                scope.enabled = false;
                scope.empress.undrawBarplots();
            }
        };

        // Define behavior for adding a new layer
        this.addButton.onclick = function () {
            scope.addLayer();
        };

        // And define behavior for how to add in barplots
        this.updateButton.onclick = function () {
            scope.empress.drawBarplots(scope.layers);
        };

        // By default, don't draw barplot borders (all barplot layers are right
        // next to each other).
        this.useBorders = false;

        // Borders (when enabled) default to white. (This is an RGB number.)
        this.borderColor = Colorer.rgbToFloat([255, 255, 255]);

        // ... and to having a length of whatever the default barplot layer
        // length divided by 10 is :)
        this.borderLength = BarplotLayer.DEFAULT_LENGTH / 10;

        // Initialize default spacing between tree and first barplot layer
        // as well as change behavior.
        this.distBtwnTreeAndBarplots =
            BarplotPanel.DEFAULT_DIST_BTWN_TREE_AND_BARPLOTS;
        this.borderGapInput.value = this.distBtwnTreeAndBarplots;
        $(this.borderGapInput).change(function () {
            var gapInput = util.parseAndValidateNum(scope.borderGapInput, 0);
            scope.distBtwnTreeAndBarplots = gapInput;
        });

        // Now, initialize the border options UI accordingly
        this.initBorderOptions();

        // When the "Add a border around barplot layers?" checkbox is checked,
        // toggle the visibility of the border options
        this.borderCheckbox.onclick = function () {
            if (scope.borderCheckbox.checked) {
                scope.borderOptions.classList.remove("hidden");
                scope.useBorders = true;
            } else {
                scope.borderOptions.classList.add("hidden");
                scope.useBorders = false;
            }
        };

        // To get things started off with, let's add a layer
        this.addLayer();
    }

    /**
     * Adds a new set of GUI components for a new barplot layer
     */
    BarplotPanel.prototype.addLayer = function () {
        var layerNum = this.layers.length + 1;
        this.numLayersCreated++;
        var newLayer = new BarplotLayer(
            this.fmCols,
            this.smCols,
            this,
            this.layerContainer,
            layerNum,
            this.numLayersCreated
        );
        this.layers.push(newLayer);
    };

    /**
     * Removes the layer with a given number. Note that layer numbers are
     * 1-indexed.
     */
    BarplotPanel.prototype.removeLayer = function (layerNum) {
        // Decrement the numbers of all layers following this layer in
        // this.layers, if present.
        // (Note that although we start at i = layerNum, we don't decrement the
        // number of the layer that is being removed. This is because layer
        // numbers are 1-indexed, so i = layerNum points to the layer
        // immediately after the layer that's being removed. Phew.)
        for (var i = layerNum; i < this.layers.length; i++) {
            this.layers[i].decrement();
        }
        this.layers.splice(layerNum - 1, 1);
    };

    /*
     * Sends layer information to Empress in order to draw barplots.
     */
    BarplotPanel.prototype.draw = function () {
        this.empress.drawBarplots(this.layers);
    };

    /**
     * Undraws barplots using Empress' undrawBarplots() function.
     */
    BarplotPanel.prototype.undraw = function () {
        this.empress.undrawBarplots();
    };

    /**
     * Alter the barplot panel's content based on the current layout.
     *
     * Either the "available" content (i.e. the actual barplot controls) or
     * "unavailable" content (i.e. a message saying "hey switch to
     * a supported layout please") will be shown, using the
     * BarplotPanel.SUPPORTED_LAYOUTS attribute as a guide.
     *
     * @param {String} layout Name of the current layout in Empress.
     * @return {Boolean} true if the current layout supports barplots; false
     *                   otherwise
     */
    BarplotPanel.prototype.updateLayoutAvailability = function (layout) {
        if (this.isLayoutSupported(layout)) {
            this.markAvailable();
            return true;
        } else {
            this.markUnavailable();
            return false;
        }
    };

    /**
     * Returns true if a given layout supports barplots, false otherwise.
     *
     * @param {String} layout Name of a layout (e.g. "Rectangular", "Circular",
     *                        "Unrooted")
     * @return {boolean} whether or not this layout supports barplots
     */
    BarplotPanel.prototype.isLayoutSupported = function (layout) {
        return _.contains(BarplotPanel.SUPPORTED_LAYOUTS, layout);
    };

    /**
     * Hides the "available" div and shows the "unavailable" div.
     *
     * This is intended to be used when the user switches to a layout that
     * doesn't support barplots.
     */
    BarplotPanel.prototype.markUnavailable = function () {
        this.unavailContent.classList.remove("hidden");
        this.availContent.classList.add("hidden");
    };

    /**
     * Hides the "unavailable" div and shows the "available" div.
     *
     * This is intended to be used when the user switches to a layout that
     * *does* support barplots!
     */
    BarplotPanel.prototype.markAvailable = function () {
        this.availContent.classList.remove("hidden");
        this.unavailContent.classList.add("hidden");
    };

    /**
     * Initializes the border options.
     *
     * This mostly includes setting up the color picker and adding a reasonable
     * default / minimum to the length input (to mimic the sort of properties
     * added to the barplot layer length inputs).
     */
    BarplotPanel.prototype.initBorderOptions = function () {
        var scope = this;

        // this.borderColor is always a RGB number, for the sake of everyone's
        // sanity. However, spectrum requires that the specified color is a hex
        // string: so we have to convert it to hex first here (only to later
        // convert it back to RGB on change events). Eesh!
        var borderColor = Colorer.unpackColor(this.borderColor);
        var startingColor = chroma.gl(...borderColor).hex();

        $(this.borderColorPicker).spectrum({
            color: startingColor,
            change: function (newColor) {
                scope.borderColor = Colorer.hex2RGB(newColor.toHexString());
            },
        });

        this.borderLengthInput.setAttribute("min", BarplotLayer.MIN_LENGTH);
        this.borderLengthInput.value = this.borderLength;
        $(this.borderLengthInput).change(function () {
            scope.borderLength = util.parseAndValidateNum(
                scope.borderLengthInput,
                BarplotLayer.MIN_LENGTH
            );
        });
    };

    /**
     * Returns an Array containing all active legends owned by barplot layers.
     *
     * This Array is ordered (it starts with the first barplot layer's legends,
     * then the second layer's legends, etc.). The ordering of legends within a
     * layer (e.g. color then length legends) is dependent on how
     * BarplotLayer.getLegends() works.
     *
     * @return {Array} Array of Legend objects
     */
    BarplotPanel.prototype.getLegends = function () {
        var legends = [];
        _.each(this.layers, function (layer) {
            legends.push(...layer.getLegends());
        });
        return legends;
    };

    /**
     * Array containing the names of layouts compatible with barplots.
     */
    BarplotPanel.SUPPORTED_LAYOUTS = ["Rectangular", "Circular"];

    /**
     * Default distance (in "barplot units," the same as used for barplot
     * lengths) between the farthest point on the tree and the start of the
     * first barplot layer.
     */
    BarplotPanel.DEFAULT_DIST_BTWN_TREE_AND_BARPLOTS = 10;

    return BarplotPanel;
});
