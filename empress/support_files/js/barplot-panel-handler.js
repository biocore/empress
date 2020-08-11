define(["underscore", "BarplotLayer", "Colorer"], function (
    _,
    BarplotLayer,
    Colorer
) {
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
        this.barplotCheckbox = document.getElementById("barplot-chk");
        this.addOptions = document.getElementById("barplot-add-options");
        this.addButton = document.getElementById("barplot-add-btn");
        this.updateButton = document.getElementById("barplot-update");
        this.layerContainer = document.getElementById(
            "barplot-layer-container"
        );
        this.availContent = document.getElementById(
            "barplot-available-content"
        );
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

        // Define behavior for turning barplots on/off (note that this is
        // different from the makeUnavailable() / makeAvailable() stuff -- the
        // barplot checkbox and the other things here are all contained within
        // this.availContent, and so should only be shown if the current layout
        // supports barplots).
        this.barplotCheckbox.onclick = function () {
            if (scope.barplotCheckbox.checked) {
                scope.layerContainer.classList.remove("hidden");
                scope.addOptions.classList.remove("hidden");
                scope.updateButton.classList.remove("hidden");
                scope.enabled = true;
                scope.empress.drawBarplots(scope.layers);
            } else {
                scope.layerContainer.classList.add("hidden");
                scope.addOptions.classList.add("hidden");
                scope.updateButton.classList.add("hidden");
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

        // To get things started off with, let's add a layer
        this.addLayer();
    }

    /**
     * Adds a new set of GUI components for a new barplot layer
     */
    BarplotPanel.prototype.addLayer = function () {
        var layerNum = this.layers.length + 1;
        var newLayer = new BarplotLayer(
            this.fmCols,
            this.smCols,
            this,
            this.layerContainer,
            layerNum
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
        if (_.contains(BarplotPanel.SUPPORTED_LAYOUTS, layout)) {
            this.markAvailable();
            return true;
        } else {
            this.markUnavailable();
            return false;
        }
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
     * Array containing the names of layouts compatible with barplots.
     */
    BarplotPanel.SUPPORTED_LAYOUTS = ["Rectangular"];

    return BarplotPanel;
});
