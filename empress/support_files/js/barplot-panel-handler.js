define(["underscore", "BarplotLayer", "Colorer"], function (
    _,
    BarplotLayer,
    Colorer
) {
    /**
     *
     * @class BarPlotPanel
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
            this.layerContainer,
            layerNum
        );
        this.layers.push(newLayer);
    };

    return BarplotPanel;
});
