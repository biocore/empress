require(["jquery", "Empress", "UtilitiesForTesting"], function (
    $,
    Empress,
    UtilitiesForTesting
) {
    module("Barplot Panel Handler", {
        setup: function () {
            this.testData = UtilitiesForTesting.getTestData();
        },
    });

    test("Layout availability toggling: initialization", function () {
        // The default layout should influence whether the barplot panel's
        // "available" or "unavailable" content is shown. First, let's try the
        // unrooted layout, which doesn't support barplots.
        var empress = new Empress(
            this.testData.tree,
            this.testData.treeData,
            this.testData.tdToInd,
            this.testData.nameToKeys,
            this.testData.layoutToCoordSuffix,
            "Unrooted",
            this.testData.yrscf,
            this.testData.biom,
            this.testData.fmCols,
            this.testData.tm,
            this.testData.im,
            this.testData.canvas
        );
        ok(empress._barplotPanel.availContent.classList.contains("hidden"));
        notOk(
            empress._barplotPanel.unavailContent.classList.contains("hidden")
        );

        // And now let's try starting out in the rectangular layout, which
        // *does* support barplots.
        var empress2 = new Empress(
            this.testData.tree,
            this.testData.treeData,
            this.testData.tdToInd,
            this.testData.nameToKeys,
            this.testData.layoutToCoordSuffix,
            "Rectangular",
            this.testData.yrscf,
            this.testData.biom,
            this.testData.fmCols,
            this.testData.tm,
            this.testData.im,
            this.testData.canvas
        );
        notOk(empress2._barplotPanel.availContent.classList.contains("hidden"));
        ok(empress2._barplotPanel.unavailContent.classList.contains("hidden"));
    });
    test("Layout availability toggling post-initialization", function () {
        var empress = new Empress(
            this.testData.tree,
            this.testData.treeData,
            this.testData.tdToInd,
            this.testData.nameToKeys,
            this.testData.layoutToCoordSuffix,
            "Unrooted",
            this.testData.yrscf,
            this.testData.biom,
            this.testData.fmCols,
            this.testData.tm,
            this.testData.im,
            this.testData.canvas
        );
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
    test("Barplot layers default to feature metadata layers, but only if feature metadata is available", function () {
        var empressWithFM = new Empress(
            this.testData.tree,
            this.testData.treeData,
            this.testData.tdToInd,
            this.testData.nameToKeys,
            this.testData.layoutToCoordSuffix,
            "Unrooted",
            this.testData.yrscf,
            this.testData.biom,
            this.testData.fmCols,
            this.testData.tm,
            this.testData.im,
            this.testData.canvas
        );
        equal(empressWithFM._barplotPanel.layers[0].barplotType, "fm");

        var empressWithNoFM = new Empress(
            this.testData.tree,
            this.testData.treeData,
            this.testData.tdToInd,
            this.testData.nameToKeys,
            this.testData.layoutToCoordSuffix,
            "Unrooted",
            this.testData.yrscf,
            this.testData.biom,
            [],
            {},
            {},
            this.testData.canvas
        );
        equal(empressWithNoFM._barplotPanel.layers[0].barplotType, "sm");
    });
});
