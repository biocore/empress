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
     * @param {Empress} empress Instance of Empress, used to handle various
     *                          state things.
     *
     * @return {BarplotPanel}
     * construct BarplotPanel
     */
    function BarplotPanel(empress) {
        var scope = this;
        this.empress = empress;

        // References to various DOM elements
        this.barplotCheckbox = document.getElementById("barplot-chk");
        this.addOptions = document.getElementById("barplot-add-options");
        this.addButton = document.getElementById("barplot-add-btn");
        this.layerContainer = document.getElementById(
            "barplot-layer-container"
        );

        // Array of BarplotLayer objects, in order of first added to most
        // recently added
        this.layers = [];

        // Define behavior for turning barplots on/off
        this.barplotCheckbox.onclick = function () {
            if (scope.barplotCheckbox.checked) {
                scope.layerContainer.classList.remove("hidden");
                scope.addOptions.classList.remove("hidden");
            } else {
                scope.layerContainer.classList.add("hidden");
                scope.addOptions.classList.add("hidden");
                // TODO: do something to un-draw barplots here
            }
        };

        // Define behavior for adding a new layer
        this.addButton.onclick = function () {
            scope.addLayer();
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
            this.empress,
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
        // TODO: actually un-draw this layer...
    };

    return BarplotPanel;
});
