require(["jquery", "chroma", "Colorer"], function ($, chroma, Colorer) {
    $(document).ready(function () {
        test("Test that default QIIME colors are correct", function () {
            // I copied this in from https://github.com/biocore/emperor/blob/659b62a9f02a6423b6258c814d0e83dbfd05220e/emperor/support_files/js/color-view-controller.js#L624,
            // so this lets us guarantee that (at least in terms of the default
            // discrete color values) Emperor and Empress are consistent >:)
            var exp_qiime_colors = [
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
            for (var i = 0; i < exp_qiime_colors.length; i++) {
                equal(Colorer.__qiimeDiscrete[i], exp_qiime_colors[i]);
            }
        });
        test("Test construction with all discrete color maps", function () {
            var discreteColorCount = 0;
            for (var i = 0; i < Colorer.__Colormaps.length; i++) {
                if (Colorer.__Colormaps[i].type === Colorer.DISCRETE) {
                    cid = Colorer.__Colormaps[i].id;
                    colorer = new Colorer(cid);
                    if (cid === Colorer.__QIIME_COLOR) {
                        equal(colorer.__colorArray, Colorer.__qiimeDiscrete);
                    } else {
                        equal(colorer.__colorArray, chroma.brewer[cid]);
                    }
                    discreteColorCount++;
                }
            }
            // Sanity check: make sure we actually tested the expected number
            // of discrete color maps (if not, we have a problem)
            equal(discreteColorCount, 9);
        });
        test("Test Colorer.getColorRGB()", function () {
            // This was taken from the chroma.js website, but the Dark2 palette
            // is of course c/o colorbrewer2.org
            var dark2palette = [
                "#1b9e77",
                "#d95f02",
                "#7570b3",
                "#e7298a",
                "#66a61e",
                "#e6ab02",
                "#a6761d",
                "#666666",
            ];
            c = new Colorer("Dark2");
            // Test that "looping" works correctly -- for the example of Dark2,
            // which has 8 colors, once we get to index = 8 things loop around
            // back to the first color
            for (var i = 0; i < 3 * dark2palette.length; i++) {
                var expRGB = chroma(
                    dark2palette[i % dark2palette.length]
                ).rgb();
                // Convert expRGB from an array of 3 numbers in the range
                // [0, 255] to an array of 3 numbers in the range [0, 1] scaled
                // proportionally.
                var scaledExpRGB = expRGB.map(function (x) {
                    return x / 255;
                });

                var obsRGB = c.getColorRGB(i);

                // Check that the R/G/B components are all equal
                for (var v = 0; v < 3; v++) {
                    equal(obsRGB[v], scaledExpRGB[v]);
                }
            }
        });
    });
});
