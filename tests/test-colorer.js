require([
    "jquery",
    "chroma",
    "underscore",
    "Colorer",
    "util",
    "UtilitiesForTesting",
], function ($, chroma, _, Colorer, util, UtilitiesForTesting) {
    $(document).ready(function () {
        module("Colorer");
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
            _.times(100, function (n) {
                hundredEles.push(String(n));
            });
            var discreteColorCount = 0;
            var colorer;
            var palette;
            var c;
            for (var i = 0; i < Colorer.__Colormaps.length; i++) {
                if (Colorer.__Colormaps[i].type === Colorer.DISCRETE) {
                    cid = Colorer.__Colormaps[i].id;
                    colorer = new Colorer(cid, hundredEles);
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
            // Test extreme values
            equal(colorer.__valueToColor["-5"], "#fff5f0");
            equal(colorer.__valueToColor["5"], "#67000d");
            // Test intermediate values
            equal(colorer.__valueToColor["1"], "#fdcab5");
            equal(colorer.__valueToColor["2"], "#fc8a6a");
            equal(colorer.__valueToColor["3"], "#f14432");
            equal(colorer.__valueToColor["4"], "#bc141a");
        });
        test("Test construction with a seq. color map and numeric + non-numeric values", function () {
            var eles = [
                "1",
                "2",
                "3",
                "10",
                "4",
                "5",
                "invalidlol",
                "nan",
                "NaN",
                "Infinity",
                "-Infinity",
                " ",
            ];
            var colorer = new Colorer("Viridis", eles);
            var sortedEles = util.naturalSort(eles);
            var interpolator = chroma
                .scale(chroma.brewer.Viridis)
                .domain([0, sortedEles.length - 1]);
            for (var i = 0; i < sortedEles.length; i++) {
                var val = sortedEles[i];
                equal(colorer.__valueToColor[val].hex(), interpolator(i).hex());
            }
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
            equal(colorer.__valueToColor["1"], "#de77ae");
            equal(colorer.__valueToColor["2"], "#fde0ef");
            equal(colorer.__valueToColor["3"], "#e6f5d0");
            equal(colorer.__valueToColor["4"], "#7fbc41");
        });
        test("Test construction with a div. color map, all numeric values, and reverse", function () {
            // Mostly same as the sequential + all numeric values test above,
            // but just with a Colorer.DIVERGING color map that is reversed.
            var eles = ["5", "2", "3", "1", "4", "-5"];
            var colorer = new Colorer("PiYG", eles, false, undefined, true);
            // Test extreme numeric values
            equal(colorer.__valueToColor["5"], "#8e0152");
            equal(colorer.__valueToColor["-5"], "#276419");
            // Test intermediate numeric values
            equal(colorer.__valueToColor["4"], "#de77ae");
            equal(colorer.__valueToColor["3"], "#fde0ef");
            equal(colorer.__valueToColor["2"], "#e6f5d0");
            equal(colorer.__valueToColor["1"], "#7fbc41");
        });
        test("Test construction with a div. color map, all numeric values, and useQuantScale = true", function () {
            var eles = ["5", "2", "3", "1", "4", "0", "-5"];
            var colorer = new Colorer("PiYG", eles, true);

            // Expected colors determined by trying
            // chroma.scale("PiYG").domain([-5,5])(n); where n = 0, 1, 2, etc.
            // (see the interactive docs at https://gka.github.io/chroma.js/ --
            // super useful for testing this)

            // Test extreme numeric values
            equal(colorer.__valueToColor["-5"], "#8e0152");
            equal(colorer.__valueToColor["5"], "#276419");
            // Test intermediate numeric values
            equal(colorer.__valueToColor["0"], "#f7f7f7");
            equal(colorer.__valueToColor["1"], "#e6f5d0");
            equal(colorer.__valueToColor["2"], "#b8e186");
            equal(colorer.__valueToColor["3"], "#7fbc41");
            equal(colorer.__valueToColor["4"], "#4d9221");
        });
        test("Test construction with a seq. color map, all numeric values, and useQuantScale = true", function () {
            var colorer = new Colorer(
                "Viridis",
                ["1", "0", "100", "3", "2"],
                true
            );
            hexmap = colorer.getMapHex();
            equal(_.keys(hexmap).length, 5);
            // As with above, expected colors determined by trying
            // chroma.scale(chroma.brewer.Viridis).domain([0, 100])(n);
            // Since we're using useQuantScale = true, the 100 value should
            // cause the "small" values' colors to be much closer to the start
            // of the color map (purple-ish) than if the 100 was a "4".
            // This differs from the scaling done when useQuantScale is false,
            // in which the magnitudes of numeric values are not used for
            // anything besides sorting.
            equal(hexmap["0"], "#440154");
            equal(hexmap["1"], "#440457");
            equal(hexmap["2"], "#45075a");
            equal(hexmap["3"], "#450a5c");
            equal(hexmap["100"], "#fee825");
        });
        test("Test construction with a seq. color map, all numeric values, useQuantScale = true, and reverse = true", function () {
            var colorer = new Colorer(
                "Viridis",
                ["1", "0", "100", "3", "2"],
                true,
                undefined,
                true
            );
            hexmap = colorer.getMapHex();
            equal(_.keys(hexmap).length, 5);
            // As with above, (reversed here) expected colors determined by
            // trying chroma.scale(chroma.brewer.Viridis).domain([100, 0])(n);
            equal(hexmap["0"], "#fee825");
            equal(hexmap["1"], "#f8e725");
            equal(hexmap["2"], "#f2e626");
            equal(hexmap["3"], "#ede626");
            equal(hexmap["100"], "#440154");
        });
        test("Test construction with a seq. color map, numeric + non-numeric values, and useQuantScale = true", function () {
            // Same as the above test but with an extra non-numeric thing
            // tossed in
            var colorer = new Colorer(
                "Viridis",
                ["1", "problematic", "0", "100", "3", "2"],
                true
            );
            hexmap = colorer.getMapHex();
            equal(_.keys(hexmap).length, 5);
            // Check that non-numeric values don't have a corresponding color
            // If we instead used a "nanColor" like Emperor did, then they'd
            // get assigned a constant color instead
            equal(hexmap["0"], "#440154");
            equal(hexmap["1"], "#440457");
            equal(hexmap["2"], "#45075a");
            equal(hexmap["3"], "#450a5c");
            equal(hexmap["100"], "#fee825");
        });
        test("Test Colorer.getMapRGB", function () {
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
                var expRGB = chroma(dark2palette[i]).rgb();
                // Convert expRGB from an array of 3 numbers in the range
                // [0, 255] to a float.
                var scaledExpRGB = Colorer.rgbToFloat(expRGB);

                var obsRGB = rgbMap[eles[i]];

                // Check that individual R/G/B components are correct
                equal(obsRGB, scaledExpRGB);
            }
        });
        test("Test rgbToFloat", function () {
            // check red
            var compressed = Colorer.rgbToFloat([1, 0, 0]);
            equal(compressed, 1, "check compressed red");

            // check green
            compressed = Colorer.rgbToFloat([0, 1, 0]);
            equal(compressed, 256, "check compressed green");

            // check blue
            compressed = Colorer.rgbToFloat([0, 0, 1]);
            equal(compressed, 256 * 256);
        });
        test("Test uncompress rgb", function () {
            var redColor = Colorer.rgbToFloat([1, 0, 0]);
            unpackedRed = Colorer.unpackColor(redColor);
            deepEqual(unpackedRed, [1, 0, 0], "unpacked red");

            var randColor = Colorer.rgbToFloat([47, 255, 52]);
            var unpackedRand = Colorer.unpackColor(randColor);
            deepEqual(unpackedRand, [47, 255, 52], "unpacked random");
        });
        test("Test Colorer.getMapHex", function () {
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
            equal(hexMap.abc, dark2palette[0]);
            equal(hexMap.def, dark2palette[1]);
            equal(hexMap.ghi, dark2palette[2]);
        });
        test("Test using a discrete color map and a single value", function () {
            var colorer = new Colorer("Set1", ["abc"]);
            equal(colorer.__valueToColor.abc, "#e41a1c");

            rgbmap = colorer.getMapRGB();
            equal(_.keys(rgbmap).length, 1);
            equal(_.keys(rgbmap)[0], "abc");

            equal(rgbmap.abc, 1841892);

            hexmap = colorer.getMapHex();
            equal(_.keys(hexmap).length, 1);
            equal(_.keys(hexmap)[0], "abc");
            equal(hexmap.abc, "#e41a1c");
        });
        test("Test using a sequential color map and a single value", function () {
            var colorer = new Colorer("Viridis", ["abc"]);
            // The first value in the color map (for viridis, dark purple)
            // should be used. This is also what Emperor does: see
            // https://github.com/biocore/emperor/blob/023b6ecb761c31cd7f60a2e38e418d71199eb4e1/emperor/support_files/js/color-view-controller.js#L309-L313
            equal(colorer.__valueToColor.abc, "#440154");

            rgbmap = colorer.getMapRGB();
            equal(_.keys(rgbmap).length, 1);
            equal(_.keys(rgbmap)[0], "abc");
            equal(rgbmap.abc, 5505348);

            hexmap = colorer.getMapHex();
            equal(_.keys(hexmap).length, 1);
            equal(_.keys(hexmap)[0], "abc");
            equal(hexmap.abc, "#440154");
        });
        test("Test using a sequential color map and a single value and reverse = true", function () {
            var colorer = new Colorer(
                "Viridis",
                ["abc"],
                undefined,
                undefined,
                true
            );
            // The last value in the color map (for viridis, yellow)
            // should be used.
            equal(colorer.__valueToColor.abc, "#fee825");

            rgbmap = colorer.getMapRGB();
            equal(_.keys(rgbmap).length, 1);
            equal(_.keys(rgbmap)[0], "abc");
            hexmap = colorer.getMapHex();
            equal(_.keys(hexmap).length, 1);
            equal(_.keys(hexmap)[0], "abc");
            equal(hexmap.abc, "#fee825");
        });
        test("Test that using a sequential / diverging color map with useQuantScale = true throws an error when there are < 2 unique numeric values", function () {
            throws(function () {
                new Colorer("RdBu", ["abc"], true);
            }, /Category has less than 2 unique numeric values./);
            throws(function () {
                new Colorer("Greys", ["0", "0", "0", "0", "0"], true);
            }, /Category has less than 2 unique numeric values./);
            throws(function () {
                new Colorer("Viridis", ["one", "two", "three"], true);
            }, /Category has less than 2 unique numeric values./);
        });
        test("Test that useQuantScale = true doesn't do anything if the color map is discrete", function () {
            // CVALDISCRETETEST
            var colorer = new Colorer("Paired", ["1", "2", "100", "abc"], true);
            hexmap = colorer.getMapHex();
            equal(_.keys(hexmap).length, 4);
            // Note that although "abc" is non-numeric it still gets assigned a
            // (normal) color
            equal(hexmap.abc, "#a6cee3");
            equal(hexmap["1"], "#1f78b4");
            equal(hexmap["2"], "#b2df8a");
            equal(hexmap["100"], "#33a02c");
        });
        test("Test discrete color map with reverse = true", function () {
            var colorer = new Colorer(
                "discrete-coloring-qiime",
                ["1", "2", "100", "abc"],
                false,
                undefined,
                true
            );
            hexmap = colorer.getMapHex();
            equal(_.keys(hexmap).length, 4);
            // Note that although "abc" is non-numeric it still gets assigned a
            // (normal) color
            equal(hexmap.abc, "#008080");
            equal(hexmap["1"], "#808000");
            equal(hexmap["2"], "#a54700");
            equal(hexmap["100"], "#00b6ff");
        });
        test("Test that useQuantScale = true works if only 2 numeric values", function () {
            var colorer = new Colorer(
                "Viridis",
                ["1", "2", "abc", "def", "ghi"],
                true
            );
            hexmap = colorer.getMapHex();
            equal(_.keys(hexmap).length, 2);
            // Non-numeric stuff doesn't have colors assigned
            // And the 2 numeric values get the extreme colors from the color
            // map
            equal(hexmap["1"], chroma.brewer.Viridis[0]);
            equal(
                hexmap["2"],
                chroma.brewer.Viridis[chroma.brewer.Viridis.length - 1]
            );
        });
        test("Test Colorer.getQIIMEColor", function () {
            // Check the first 3 colors
            deepEqual(Colorer.getQIIMEColor(0), "#ff0000");
            deepEqual(Colorer.getQIIMEColor(1), "#0000ff");
            deepEqual(Colorer.getQIIMEColor(2), "#f27304");
            // Check the last 3 colors
            deepEqual(Colorer.getQIIMEColor(21), "#a54700");
            deepEqual(Colorer.getQIIMEColor(22), "#808000");
            deepEqual(Colorer.getQIIMEColor(23), "#008080");
            // Check that it loops around as expected for a while
            // (it is definitely possible to test this more thoroughly /
            // elegantly but this should be fine)
            deepEqual(Colorer.getQIIMEColor(24), "#ff0000");
            deepEqual(Colorer.getQIIMEColor(25), "#0000ff");
            deepEqual(Colorer.getQIIMEColor(48), "#ff0000");
            deepEqual(Colorer.getQIIMEColor(49), "#0000ff");
            deepEqual(Colorer.getQIIMEColor(72), "#ff0000");
            deepEqual(Colorer.getQIIMEColor(73), "#0000ff");
            // Check that negative inputs cause problems
            throws(function () {
                Colorer.getQIIMEColor(-1);
            }, /i must be nonnegative/);
            // ... even negative inputs where (if it wasn't negative) something
            // would get "looped" around
            throws(function () {
                Colorer.getQIIMEColor(-24);
            }, /i must be nonnegative/);
        });
        test("Test Colorer.isColorMapDiscrete", function () {
            // Discrete
            ok(Colorer.isColorMapDiscrete("discrete-coloring-qiime"));
            ok(Colorer.isColorMapDiscrete("Paired"));
            ok(Colorer.isColorMapDiscrete("Accent"));
            ok(Colorer.isColorMapDiscrete("Dark2"));
            ok(Colorer.isColorMapDiscrete("Set1"));
            ok(Colorer.isColorMapDiscrete("Set2"));
            ok(Colorer.isColorMapDiscrete("Set3"));
            ok(Colorer.isColorMapDiscrete("Pastel1"));
            ok(Colorer.isColorMapDiscrete("Pastel2"));

            // Sequential
            notOk(Colorer.isColorMapDiscrete("Viridis"));
            notOk(Colorer.isColorMapDiscrete("Reds"));
            notOk(Colorer.isColorMapDiscrete("RdPu"));
            notOk(Colorer.isColorMapDiscrete("Oranges"));
            notOk(Colorer.isColorMapDiscrete("OrRd"));
            notOk(Colorer.isColorMapDiscrete("YlOrBr"));
            notOk(Colorer.isColorMapDiscrete("YlOrRd"));
            notOk(Colorer.isColorMapDiscrete("YlGn"));
            notOk(Colorer.isColorMapDiscrete("YlGnBu"));
            notOk(Colorer.isColorMapDiscrete("Greens"));
            notOk(Colorer.isColorMapDiscrete("GnBu"));
            notOk(Colorer.isColorMapDiscrete("Blues"));
            notOk(Colorer.isColorMapDiscrete("BuGn"));
            notOk(Colorer.isColorMapDiscrete("BuPu"));
            notOk(Colorer.isColorMapDiscrete("Purples"));
            notOk(Colorer.isColorMapDiscrete("PuRd"));
            notOk(Colorer.isColorMapDiscrete("PuBuGn"));
            notOk(Colorer.isColorMapDiscrete("Greys"));

            // Diverging
            notOk(Colorer.isColorMapDiscrete("Spectral"));
            notOk(Colorer.isColorMapDiscrete("RdBu"));
            notOk(Colorer.isColorMapDiscrete("RdYlGn"));
            notOk(Colorer.isColorMapDiscrete("RdYlBu"));
            notOk(Colorer.isColorMapDiscrete("RdGy"));
            notOk(Colorer.isColorMapDiscrete("PiYG"));
            notOk(Colorer.isColorMapDiscrete("BrBG"));
            notOk(Colorer.isColorMapDiscrete("PuOr"));
            notOk(Colorer.isColorMapDiscrete("PRGn"));

            // Wack
            throws(function () {
                Colorer.isColorMapDiscrete("birds-arent-real");
            }, /Invalid color map ID "birds-arent-real" specified/);
        });
        test("Test Colorer.hex2RGB", function () {
            // Red
            deepEqual(Colorer.hex2RGB("#ff0000"), 255);
            deepEqual(Colorer.hex2RGB("#f00"), 255);
            // Green
            deepEqual(Colorer.hex2RGB("#00ff00"), 65280);
            deepEqual(Colorer.hex2RGB("#0f0"), 65280);
            // Blue
            deepEqual(Colorer.hex2RGB("#0000ff"), 16711680);
            deepEqual(Colorer.hex2RGB("#00f"), 16711680);
            // Ugly fuchsia
            deepEqual(Colorer.hex2RGB("#f0f"), 16711935);
            // Black
            deepEqual(Colorer.hex2RGB("#000"), 0);
            deepEqual(Colorer.hex2RGB("#000000"), 0);
            // White
            deepEqual(Colorer.hex2RGB("#fff"), 16777215);
            deepEqual(Colorer.hex2RGB("#ffffff"), 16777215);

            // QIIME orange (third value in the Classic QIIME Colors map)
            equal(Colorer.hex2RGB("#f27304"), 291826);
            // QIIME purple (fifth color in the Classic QIIME Colors map)
            equal(Colorer.hex2RGB("#91278d"), 9250705);
        });
        test("Test Colorer.rgb2gl", function () {
            UtilitiesForTesting.approxDeepEqualMulti(
                Colorer.rgb2gl([255, 255, 255]),
                [1, 1, 1]
            );
            UtilitiesForTesting.approxDeepEqualMulti(
                Colorer.rgb2gl([0, 0, 0]),
                [0, 0, 0]
            );
            UtilitiesForTesting.approxDeepEqualMulti(
                Colorer.rgb2gl([64, 64, 64]),
                [0.25098, 0.25098, 0.25098]
            );
        });
        test("Test Colorer.getGradientInfo (just numeric values)", function () {
            var eles = ["0", "1", "2", "3", "4"];
            var colorer = new Colorer("Viridis", eles, true);
            var gradInfo = colorer.getGradientInfo();

            var ref = UtilitiesForTesting.getReferenceSVGs();
            equal(gradInfo.gradientSVG, ref[0]);
            equal(gradInfo.pageSVG, ref[1]);
            equal(gradInfo.minValStr, "0");
            equal(gradInfo.midValStr, "2");
            equal(gradInfo.maxValStr, "4");
            // The missingNonNumerics value should be false, since all of the
            // values we passed to Colorer are numeric
            notOk(gradInfo.missingNonNumerics);
        });
        test("Test Colorer.getGradientInfo (numeric + non-numeric values)", function () {
            var eles = ["0", "1", "2", "3", "asdf", "4"];
            var colorer = new Colorer("Viridis", eles, true);
            var gradInfo = colorer.getGradientInfo();

            var ref = UtilitiesForTesting.getReferenceSVGs();
            equal(gradInfo.gradientSVG, ref[0]);
            equal(gradInfo.pageSVG, ref[1]);
            equal(gradInfo.minValStr, "0");
            equal(gradInfo.midValStr, "2");
            equal(gradInfo.maxValStr, "4");
            // Main difference with previous test: non-numeric warning should
            // be used
            ok(gradInfo.missingNonNumerics);
        });
        test("Test Colorer.getGradientInfo (custom gradientIDSuffix)", function () {
            var eles = ["0", "1", "2", "3", "4"];
            var colorer = new Colorer("Viridis", eles, true, 5);
            var gradInfo = colorer.getGradientInfo();

            // The "Gradient0" IDs in the reference SVGs should be replaced
            // with "Gradient5". The split/join thing is a way of replacing one
            // sequence with another, since JS' standard library doesn't seem
            // to have an easy cross-browser-supported way to do this as of
            // writing: see https://stackoverflow.com/a/1145525/10730311.
            var repl = function (svgtext) {
                return svgtext.split("Gradient0").join("Gradient5");
            };

            var ref = UtilitiesForTesting.getReferenceSVGs();
            equal(gradInfo.gradientSVG, repl(ref[0]));
            equal(gradInfo.pageSVG, repl(ref[1]));
            equal(gradInfo.minValStr, "0");
            equal(gradInfo.midValStr, "2");
            equal(gradInfo.maxValStr, "4");
            notOk(gradInfo.missingNonNumerics);
        });
        test("Test Colorer.getGradientInfo (numeric + non-numeric values, reverse = true)", function () {
            var eles = ["0", "1", "2", "3", "asdf", "4"];
            var colorer = new Colorer("Viridis", eles, true, undefined, true);
            var gradInfo = colorer.getGradientInfo();
            ok(
                gradInfo.gradientSVG.includes(
                    '<stop offset="0%" stop-color="#fee825"/>'
                )
            );
            ok(
                gradInfo.gradientSVG.includes(
                    '<stop offset="100%" stop-color="#440154"/>'
                )
            );
            var ref = UtilitiesForTesting.getReferenceSVGs();
            equal(gradInfo.pageSVG, ref[1]);
            equal(gradInfo.minValStr, "0");
            equal(gradInfo.midValStr, "2");
            equal(gradInfo.maxValStr, "4");
            ok(gradInfo.missingNonNumerics);
        });
        test("Test Colorer.getGradientInfo (error: no gradient data)", function () {
            var expectedErrorRegex = /No gradient data defined for this Colorer; check that useQuantScale is true and that the selected color map is not discrete./;

            // Error case 1: useQuantScale is false
            var eles = ["0", "1", "2", "3", "4"];
            var colorer = new Colorer("Viridis", eles);
            throws(function () {
                colorer.getGradientInfo();
            }, expectedErrorRegex);

            // Error case 2: useQuantScale is true, but the color map is
            // discrete
            colorer = new Colorer("Paired", eles, true);
            throws(function () {
                colorer.getGradientInfo();
            }, expectedErrorRegex);

            // Error case 3: useQuantScale is false and the color map is
            // discrete
            colorer = new Colorer("Pastel2", eles);
            throws(function () {
                colorer.getGradientInfo();
            }, expectedErrorRegex);
        });
        test("Test Colorer with custom colormaps", function () {
            var eles = ["red", "green", "blue cheese"];
            var colormap = {
                red: "#FF0000",
                green: "#00FF00",
                "blue cheese": "#0000FF",
            };
            var colorer = new Colorer(colormap, eles);

            var expHexMap = colorer.getMapHex();
            equal(_.keys(expHexMap).length, 3);
            equal(expHexMap.red, "#FF0000");
            equal(expHexMap.green, "#00FF00");
            equal(expHexMap["blue cheese"], "#0000FF");

            // check that errors are raised when calling disallowed methods
            throws(function () {
                colorer.assignDiscreteColors();
            }, /Cannot call assignDiscreteColors using a custom colormap/);
            throws(function () {
                colorer.assignContinuousScaledColors();
            }, /Cannot call assignContinuousScaledColors using a custom colormap/);
            throws(function () {
                colorer.assignOrdinalScaledColors();
            }, /Cannot call assignOrdinalScaledColors using a custom colormap/);
        });
        test("Test Colorer with custom colormaps fails with missing values", function () {
            var eles = ["red", "green", "blue cheese"];
            var colormap = {
                red: "#FF0000",
                green: "#00FF00",
                blue: "#0000FF",
            };

            throws(function () {
                var colorer = new Colorer(colormap, eles);
            }, /The custom colormap does not contain a mapping for all values/);
        });
        test("Test Colorer with custom colormaps fails with quant scale", function () {
            var eles = ["red", "green", "blue cheese"];
            var colormap = {
                red: "#FF0000",
                green: "#00FF00",
                "blue cheese": "#0000FF",
            };

            throws(function () {
                var colorer = new Colorer(colormap, eles, true);
            }, /Quantitative scales are not supported for custom colormaps/);
        });
        test("Test custom domains with a valid domain", function () {
            var colorer = new Colorer(
                "RdBu",
                [-2, -1, 0, 1, 2.5],
                true,
                0,
                false,
                [-2.5, 2.5]
            );
            hexmap = colorer.getMapHex();
            equal(_.keys(hexmap).length, 5);
            // Expected colors determined by trying
            // chroma.scale(chroma.brewer.RdBu).domain([-2.5, 2.5])(n);
            equal(hexmap["-2"], "#b2182b");
            equal(hexmap["-1"], "#f4a582");
            equal(hexmap["0"], "#f7f7f7");
            equal(hexmap["1"], "#92c5de");
            equal(hexmap["2.5"], "#053061");
        });
        test("Test custom domains that don't overlap values", function () {
            // Silly thing that is technically allowed: the custom domain can
            // not overlap at all with the values. in that case, the values
            // will all either be equal to the lowest color (if the custom
            // domain is higher than them) or equal to the highest color (if
            // the custom domain is lower than them).
            var strVals = ["-2", "-1", "0", "1", "2.5"];
            var numVals = [-2, -1, 0, 1, 2.5];

            // Case 1: all the values are lower than the custom domain
            var colorer = new Colorer("RdBu", numVals, true, 0, false, [5, 10]);
            console.log(colorer);
            hexmap = colorer.getMapHex();
            equal(_.keys(hexmap).length, 5);
            for (i = 0; i < strVals.length; i++) {
                equal(hexmap[strVals[i]], "#67001f");
            }

            // Case 2: all the values are higher than the custom domain
            colorer = new Colorer("RdBu", numVals, true, 0, false, [-10, -5]);
            hexmap = colorer.getMapHex();
            equal(_.keys(hexmap).length, 5);
            for (i = 0; i < strVals.length; i++) {
                equal(hexmap[strVals[i]], "#053061");
            }
        });
        test("Test custom domains with invalid domains", function () {
            throws(function () {
                new Colorer("RdBu", [-2, -1, 0, 1, 2.5], true, 0, false, [1]);
            }, /Custom domain must have exactly 2 entries/);
            throws(function () {
                new Colorer("RdBu", [-2, -1, 0, 1, 2.5], true, 0, false, []);
            }, /Custom domain must have exactly 2 entries/);
            throws(function () {
                new Colorer("RdBu", [-2, -1, 0, 1, 2.5], true, 0, false, [
                    1,
                    2,
                    3,
                ]);
            }, /Custom domain must have exactly 2 entries/);
            throws(function () {
                new Colorer("RdBu", [-2, -1, 0, 1, 2.5], true, 0, false, [
                    NaN,
                    2,
                ]);
            }, /Custom domain entries must be finite nums/);
            throws(function () {
                new Colorer("RdBu", [-2, -1, 0, 1, 2.5], true, 0, false, [
                    1,
                    NaN,
                ]);
            }, /Custom domain entries must be finite nums/);
            throws(function () {
                new Colorer("RdBu", [-2, -1, 0, 1, 2.5], true, 0, false, [
                    null,
                    null,
                ]);
            }, /Custom domain entries must be finite nums/);
            throws(function () {
                new Colorer("RdBu", [-2, -1, 0, 1, 2.5], true, 0, false, [
                    null,
                    3,
                ]);
            }, /Custom domain entries must be finite nums/);
            throws(function () {
                new Colorer("RdBu", [-2, -1, 0, 1, 2.5], true, 0, false, [
                    3,
                    1,
                ]);
            }, /Custom domain min must be < max/);
            throws(function () {
                new Colorer("RdBu", [-2, -1, 0, 1, 2.5], true, 0, false, [
                    1,
                    1,
                ]);
            }, /Custom domain min must be < max/);
        });
    });
});
