require([
    "jquery",
    "chroma",
    "underscore",
    "Colorer"
], function (
    $,
    chroma,
    _,
    Colorer
) {
    $(document).ready(function () {
        module('Colorer');
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
            // Generate an array with 100 unique elements
            var hundredEles = [];
            _.times(100, function(n) { hundredEles.push(String(n)); });
            var discreteColorCount = 0;
            var colorer;
            var palette;
            var c;
            for (var i = 0; i < Colorer.__Colormaps.length; i++) {
                if (Colorer.__Colormaps[i].type === Colorer.DISCRETE) {
                    cid = Colorer.__Colormaps[i].id;
                    var colorer = new Colorer(cid, hundredEles);
                    var palette;
                    if (cid === Colorer.__QIIME_COLOR) {
                        palette = Colorer.__qiimeDiscrete;
                    } else {
                        palette = chroma.brewer[cid];
                    }
                    for (c = 0; c < 100; c++) {
                        // Check that the "looping" is done properly
                        equal(
                            colorer.__valueToColor[hundredEles[c]],
                            palette[c % palette.length]
                        );
                    }
                    discreteColorCount++;
                }
            }
            // Sanity check: make sure we actually tested the expected number
            // of discrete color maps (if not, we have a problem)
            equal(discreteColorCount, 9);
        });
        test("Test construction with a seq. color map and all numeric values", function () {
            var eles = ["5", "2", "3", "1", "4", "-5"];
            var colorer = new Colorer("Reds", eles);
            // Test extreme numeric values
            equal(colorer.__valueToColor["-5"], "#fff5f0");
            equal(colorer.__valueToColor["5"], "#67000d");
            // Test intermediate numeric values
            equal(colorer.__valueToColor["1"], "#f14432");
            equal(colorer.__valueToColor["2"], "#d92623");
            equal(colorer.__valueToColor["3"], "#bc141a");
            equal(colorer.__valueToColor["4"], "#990c13");
        });
        test("Test construction with a seq. color map and numeric + non-numeric values", function() {
            var eles = [
                "1", "2", "3", "10", "4", "5", "invalidlol", "nan", "NaN",
                "Infinity", "-Infinity", " "
            ];
            var colorer = new Colorer("Viridis", eles);
            // Test that extreme numeric values are properly set
            // (... and also that the values are being sorted correctly)
            equal(colorer.__valueToColor["1"], "#440154");
            equal(colorer.__valueToColor["10"], "#fee825");
            // Test that intermediate numeric values are properly set.
            // The expected values were obtained by manual testing using
            // Chroma.js' interactive docs at https://gka.github.io/chroma.js,
            // e.g. chroma.scale(chroma.brewer.Viridis).domain([1, 10])(2);
            equal(colorer.__valueToColor["2"], "#482373");
            equal(colorer.__valueToColor["3"], "#414286");
            equal(colorer.__valueToColor["4"], "#365d8d");
            equal(colorer.__valueToColor["5"], "#2b778f");
            // Test that non-numeric values were assigned a gray "NANCOLOR"
            // ... which is, by default, #64655d
            equal(colorer.__valueToColor["invalidlol"], "#64655d");
            equal(colorer.__valueToColor["nan"], "#64655d");
            equal(colorer.__valueToColor["NaN"], "#64655d");
            equal(colorer.__valueToColor["Infinity"], "#64655d");
            equal(colorer.__valueToColor["-Infinity"], "#64655d");
            equal(colorer.__valueToColor[" "], "#64655d");
        });
        test("Test construction with a seq. color map and < 2 numeric values", function () {
            // Try one number
            var eles = ["asdf", "lol", "1", "yeah just one number here folks"];
            var colorer = new Colorer("Viridis", eles);
            _.each(eles, function(ele) {
                equal(colorer.__valueToColor[ele], "#64655d");
            });
            // Now try with 0 numeric values completely
            var eles2 = ["asdf", "lol", "yeah zero numbers here folks"];
            var colorer2 = new Colorer("Viridis", eles2);
            _.each(eles2, function(ele2) {
                equal(colorer2.__valueToColor[ele2], "#64655d");
            });
        });
        test("Test construction with a div. color map and all numeric values", function () {
            // Mostly same as the sequential + all numeric values test above,
            // but just with a Colorer.DIVERGING color map. Verifies that both
            // "types" of color maps are treated analogously.
            var eles = ["5", "2", "3", "1", "4", "-5"];
            var colorer = new Colorer("PiYG", eles);
            // Test extreme numeric values
            equal(colorer.__valueToColor["-5"], "#8e0152");
            equal(colorer.__valueToColor["5"], "#276419");
            // Test intermediate numeric values
            equal(colorer.__valueToColor["1"], "#e6f5d0");
            equal(colorer.__valueToColor["2"], "#b8e186");
            equal(colorer.__valueToColor["3"], "#7fbc41");
            equal(colorer.__valueToColor["4"], "#4d9221");
        });
        test("Test Colorer.getMapRGB()", function () {
            var eles = ["abc", "def", "ghi"];
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
            c = new Colorer("Dark2", eles);
            var rgbMap = c.getMapRGB();
            for (var i = 0; i < 3; i++) {
                var expRGB = chroma(
                    dark2palette[i % dark2palette.length]
                ).rgb();
                // Convert expRGB from an array of 3 numbers in the range
                // [0, 255] to an array of 3 numbers in the range [0, 1] scaled
                // proportionally.
                var scaledExpRGB = expRGB.map(function (x) {
                    return x / 255;
                });
                var obsRGB = rgbMap[eles[i]];
                // Check that individual R/G/B components are correct
                for (var v = 0; v < 3; v++) {
                    equal(obsRGB[v], scaledExpRGB[v]);
                }
            }
        });
        test("Test Colorer.getMapHex()", function () {
            var eles = ["abc", "def", "ghi"];
            // Analogous to the getColorRGB() test above but simpler
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
            c = new Colorer("Dark2", eles);
            var hexMap = c.getMapHex();
            equal(hexMap["abc"], dark2palette[0]);
            equal(hexMap["def"], dark2palette[1]);
            equal(hexMap["ghi"], dark2palette[2]);
        });
    });
});
