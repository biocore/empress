require([
    "jquery",
    "underscore",
    "spectrum",
    "Empress",
    "BarplotLayer",
    "UtilitiesForTesting",
    "Colorer",
], function (
    $,
    _,
    spectrum,
    Empress,
    BarplotLayer,
    UtilitiesForTesting,
    Colorer
) {
    module("Barplots", {
        setup: function () {
            // Clear any prior layer HTML stuff so as to not mess up other
            // barplot tests. This is a gross solution; we need to do this
            // because the barplot panel doesn't have any logic to clear any
            // existing HTML when it's created, since only one barplot panel
            // should be created during the normal usage of Empress.
            $("#barplot-layer-container").empty();
            this.testData = UtilitiesForTesting.getTestData();
            this.initTestEmpress = function () {
                return new Empress(
                    this.testData.tree,
                    this.testData.biom,
                    this.testData.fmCols,
                    this.testData.tm,
                    this.testData.im,
                    this.testData.canvas
                );
            };
        },
    });

    test("Barplot panel is initialized with one layer", function () {
        var empress = this.initTestEmpress();
        equal(empress._barplotPanel.layers.length, 1);
    });
    test("Layout availability toggling: initialization (default unrooted layout)", function () {
        // The default layout should influence whether the barplot panel's
        // "available" or "unavailable" content is shown. As of writing, the
        // default layout will always be Unrooted.
        var empress = this.initTestEmpress("Unrooted");
        ok(empress._barplotPanel.availContent.classList.contains("hidden"));
        notOk(
            empress._barplotPanel.unavailContent.classList.contains("hidden")
        );
    });
    test("Layout availability toggling post-initialization", function () {
        var empress = this.initTestEmpress("Unrooted");
        // We need to call this in order to make updateLayout() work.
        // Otherwise, things start breaking -- see
        // https://github.com/biocore/empress/pull/320 for context.
        empress.initialize();

        // After updating the layout to something that supports barplots, the
        // barplot "available content" should now be shown.
        empress.updateLayout("Rectangular");
        notOk(empress._barplotPanel.availContent.classList.contains("hidden"));
        ok(empress._barplotPanel.unavailContent.classList.contains("hidden"));

        // ... And going back to a not-compatible-with-barplots layout should
        // switch back to the unavailable content.
        empress.updateLayout("Unrooted");
        ok(empress._barplotPanel.availContent.classList.contains("hidden"));
        notOk(
            empress._barplotPanel.unavailContent.classList.contains("hidden")
        );
    });
    test("Barplot panel border option initialization (incl. initBorderOptions)", function () {
        var empress = this.initTestEmpress();

        deepEqual(empress._barplotPanel.borderColor, 16777215);

        // Color picker should correctly default to white
        var obsColor = $(empress._barplotPanel.borderColorPicker)
            .spectrum("get")
            .toHexString();
        deepEqual(obsColor, "#ffffff");

        // Test that the border length defaults to 1/10 the default barplot
        // layer length (previously it was 1/2 of this, but we made the default
        // barplot layer length a lot thicker so I'm changing this accordingly)
        var expBorderLen = BarplotLayer.DEFAULT_LENGTH / 10;
        deepEqual(empress._barplotPanel.borderLength, expBorderLen);

        // Test that the border length input's default value and minimum value
        // are set properly
        // (The +s convert things to numbers, since value / getAttribute()
        // seem to just provide Strings [e.g. "10"].)
        deepEqual(
            +empress._barplotPanel.borderLengthInput.value,
            +expBorderLen
        );
        deepEqual(
            +empress._barplotPanel.borderLengthInput.getAttribute("min"),
            +BarplotLayer.MIN_LENGTH
        );
    });
    test("Barplot layers default to feature metadata layers, but only if feature metadata is available", function () {
        // (Sample metadata should always be available. (... That is, until we
        // support visualizing a tree without table / sample metadata info.)
        var empressWithFM = this.initTestEmpress();
        equal(empressWithFM._barplotPanel.layers[0].barplotType, "fm");

        var empressWithNoFM = new Empress(
            this.testData.tree,
            this.testData.biom,
            [],
            {},
            {},
            this.testData.canvas
        );
        equal(empressWithNoFM._barplotPanel.layers[0].barplotType, "sm");
    });
    test("No barplot panel created if Empress has no feature or sample metadata", function () {
        var empWithNoMetadata = new Empress(
            this.testData.tree,
            null,
            [],
            {},
            {},
            this.testData.canvas
        );
        equal(empWithNoMetadata._barplotPanel, null);
        var empWithFM = new Empress(
            this.testData.tree,
            null,
            this.testData.fmCols,
            this.testData.tm,
            this.testData.im,
            this.testData.canvas
        );
        notEqual(empWithFM._barplotPanel, null);
        var empWithSM = new Empress(
            this.testData.tree,
            this.testData.biom,
            [],
            {},
            {},
            this.testData.canvas
        );
        notEqual(empWithSM._barplotPanel, null);
    });
    test("Barplot layers only have metadata toggling buttons if Empress has both feature and sample metadata", function () {
        var empress = this.initTestEmpress();
        // In the one layer in the barplot panel, there should be a row of
        // feature / sample metadata toggling buttons (one of which should be
        // selected). We use the presence of this selected button's class to
        // check that these toggling buttons exist; this is kind of hacky, but
        // it's a quick way to do this.
        equal(
            $(empress._barplotPanel.layerContainer).find(
                ".selected-metadata-choice"
            ).length,
            1
        );
        $("#barplot-layer-container").empty();

        // If only one type of metadata was provided to Empress, then don't
        // bother showing the metadata toggling buttons.
        var empWithJustFM = new Empress(
            this.testData.tree,
            null,
            this.testData.fmCols,
            this.testData.tm,
            this.testData.im,
            this.testData.canvas
        );
        equal(
            $(empWithJustFM._barplotPanel.layerContainer).find(
                ".selected-metadata-choice"
            ).length,
            0
        );
        $("#barplot-layer-container").empty();

        var empWithJustSM = new Empress(
            this.testData.tree,
            this.testData.biom,
            [],
            {},
            {},
            this.testData.canvas
        );
        equal(
            $(empWithJustSM._barplotPanel.layerContainer).find(
                ".selected-metadata-choice"
            ).length,
            0
        );
    });
    test("BarplotPanelHandler.addLayer", function () {
        var scope = this;
        var empress = this.initTestEmpress();

        // Add on two layers
        empress._barplotPanel.addLayer();
        equal(empress._barplotPanel.layers.length, 2);
        empress._barplotPanel.addLayer();
        equal(empress._barplotPanel.layers.length, 3);

        // Check that each layer was provided correct information
        _.each(empress._barplotPanel.layers, function (layer, i) {
            // Basic information about the visualization -- should be the same
            // across every layer
            deepEqual(layer.fmCols, scope.testData.fmCols);
            deepEqual(layer.smCols, empress._barplotPanel.smCols);
            deepEqual(layer.barplotPanel, empress._barplotPanel);
            deepEqual(layer.layerContainer, empress._barplotPanel.layerContainer);
            // Check that the "num" and "unique num" of each barplot layer were
            // assigned correctly. Since no layers have been removed, these
            // numbers should be identical.
            deepEqual(layer.num, i + 1);
            deepEqual(layer.uniqueNum, i + 1);
            // Check that each layer's header says "Layer N" (N = layer.num)
            deepEqual(layer.headerElement.innerText, "Layer " + (i + 1));
        });
    });
    test("BarplotPanelHandler.removeLayer", function () {
        var empress = this.initTestEmpress();
        empress._barplotPanel.addLayer();
        equal(empress._barplotPanel.layers.length, 2);
        empress._barplotPanel.addLayer();
        equal(empress._barplotPanel.layers.length, 3);

        // Remove the second of the three layers
        empress._barplotPanel.removeLayer(2);
        // Check that now there are only two layers
        equal(empress._barplotPanel.layers.length, 2);
        // Check that layer 1's number stayed the same, while layer 3's number
        // was decremented
        equal(empress._barplotPanel.layers[0].num, 1);
        equal(empress._barplotPanel.layers[1].num, 2);
        // Check that layer 1's header stayed the same, while layer 3's header
        // was decremented along with its number
        equal(
            empress._barplotPanel.layers[0].headerElement.innerText,
            "Layer 1"
        );
        equal(
            empress._barplotPanel.layers[1].headerElement.innerText,
            "Layer 2"
        );
        // Check that the *unique numbers* of each layer remained the same
        // (so that the HTML elements created for each layer will have distinct
        // IDs)
        equal(empress._barplotPanel.layers[0].uniqueNum, 1);
        equal(empress._barplotPanel.layers[1].uniqueNum, 3);

        // Try adding on a new layer. It should be named "Layer 3" (and have a
        // number of 3), but its unique number should be 4 -- since it's the
        // fourth layer created thus far, ignoring all removal operations.
        empress._barplotPanel.addLayer();
        equal(empress._barplotPanel.layers.length, 3);

        // Verify all the layers' numbers / headers / unique numbers correct
        // (Layer 1 and 2 (previously Layer 3) shouldn't have changed, but we
        // might as well verify they don't break when we add a new layer after
        // them.)
        equal(empress._barplotPanel.layers[0].num, 1);
        equal(empress._barplotPanel.layers[1].num, 2);
        equal(empress._barplotPanel.layers[2].num, 3);
        equal(
            empress._barplotPanel.layers[0].headerElement.innerText,
            "Layer 1"
        );
        equal(
            empress._barplotPanel.layers[1].headerElement.innerText,
            "Layer 2"
        );
        equal(
            empress._barplotPanel.layers[2].headerElement.innerText,
            "Layer 3"
        );
        equal(empress._barplotPanel.layers[0].uniqueNum, 1);
        equal(empress._barplotPanel.layers[1].uniqueNum, 3);
        // This is the most important check -- the newest layer should have a
        // distinct unique number.
        equal(empress._barplotPanel.layers[2].uniqueNum, 4);
    });
    test("BarplotLayer initialization: state matches UI", function () {
        var empress = this.initTestEmpress();
        var layer1 = empress._barplotPanel.layers[0];
        // initTestEmpress() passes in feature metadata, so barplots should
        // default to feature metadata
        equal(layer1.barplotType, "fm");
        // Default color (for feature metadata barplots) defaults to red,
        // a.k.a. the first "Classic QIIME Colors" color
        equal(layer1.initialDefaultColorHex, "#ff0000");
        equal(layer1.defaultColor, 255);

        // Default length defaults to, well, DEFAULT_LENGTH
        equal(layer1.defaultLength, BarplotLayer.DEFAULT_LENGTH);

        // Check feature metadata coloring defaults. By default, feature
        // metadata coloring isn't used -- a just-created feature metadata
        // barplot doesn't have any color or length encodings.
        notOk(layer1.colorByFM);
        equal(layer1.colorByFMField, empress._barplotPanel.fmCols[0]);
        equal(layer1.colorByFMColorMap, "discrete-coloring-qiime");
        notOk(layer1.colorByFMColorReverse);
        notOk(layer1.colorByFMContinuous);
        ok(layer1.colorByFMColorMapDiscrete);

        // Check feature metadata length-scaling defaults
        notOk(layer1.scaleLengthByFM);
        equal(layer1.scaleLengthByFMField, empress._barplotPanel.fmCols[0]);
        equal(layer1.scaleLengthByFMMin, BarplotLayer.DEFAULT_MIN_LENGTH);
        equal(layer1.scaleLengthByFMMax, BarplotLayer.DEFAULT_MAX_LENGTH);

        // Check sample metadata barplot defaults
        equal(layer1.colorBySMField, empress._barplotPanel.smCols[0]);
        equal(layer1.colorBySMColorMap, "discrete-coloring-qiime");
        notOk(layer1.colorBySMColorReverse);
        equal(layer1.lengthSM, BarplotLayer.DEFAULT_LENGTH);
    });
    test("Empress.getBarplotData() throws error if layout doesn't support barplots", function () {
        var empress = this.initTestEmpress();
        empress._barplotPanel.addLayer();
        throws(function () {
            empress.getBarplotData();
        }, /Non-barplot-supporting layout 'Unrooted' in use./);
    });
    test('"Freebies": barplot borders aren\'t drawn when the border color matches the background color', function () {
        var empress = this.initTestEmpress();
        empress.initialize();
        empress.updateLayout("Rectangular");
        // By default, the border color should default to the background color
        // -- so we get freebies by default.
        empress._barplotPanel.borderCheckbox.click();
        var data = empress.getBarplotData(empress.getBarplotLayers());
        // For each bar in the rectangular layout, six (x, y, rgb) groups are
        // added to the coords array for each tip's bar: this is due to how
        // Empress._addRectangularBarCoords() / _addTriangleCoords() works.
        // Since there are four tips in the test tree, we then expect to see
        // exactly 72 values in the coords array:    4  *     6      *    3.
        //                                        (tips) (xyr groups) (x,y,rgb)
        deepEqual(data.coords.length, 72);

        // When we change the barplot border color, we should no longer get
        // freebies -- now we add on two full extra bars for each tip.
        empress._barplotPanel.borderColor = Colorer.rgbToFloat([0, 0, 0]);
        var data2 = empress.getBarplotData(empress.getBarplotLayers());
        // Each barplot border layer takes up the same amount of elements in
        // coords as a "normal" layer. So we should see 72 * 3 = 216 elements.
        deepEqual(data2.coords.length, 216);

        // Check that resetting the border color to white re-enables "freebies"
        // (...less stuff to draw.)
        empress._barplotPanel.borderColor = Colorer.rgbToFloat([255, 255, 255]);
        var data3 = empress.getBarplotData(empress.getBarplotLayers());
        deepEqual(data3.coords.length, 72);
    });
    // TODO: Test that interacting with various elements of the BarplotLayer UI
    // also changes the BarplotLayer state. Testing this shouldn't really be
    // that difficult, it'll just be kind of tedious.
});
