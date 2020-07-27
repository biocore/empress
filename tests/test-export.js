require(["jquery", "BPTree", "Empress", "util", "BiomTable"], function (
    $,
    BPTree,
    Empress,
    util,
    BIOMTable
) {
    $(document).ready(function () {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray without
        // effecting other test
        module('Empress' , {
            setup: function() {
                var tree = new BPTree([14952], ['EmpressNode2', 'EmpressNode0', 'featA', 'featB', 'EmpressNode1', 'featC', 'featD']);

                var fmCols = [];

                var canvas = document.getElementById('tree-surface');

                var biom = new BIOMTable(
                  ['sample1', 'sample2', 'sample3','sample4'],
                  ['featA', 'featB', 'featC', 'featD'],
                  {sample1: 0, sample2: 1, sample3: 2, sample4: 3},
                  {featA: 0, featB: 1, featC: 2, featD: 3},
                  [[0,1],[0,1],[0,2,3],[0,2,3]],
                  ["collection_timestamp", "diseased", "facility", "genotype",
                   "host_body_habitat", "host_scientific_name",
                   "host_subject_id", "start_cohousing_timestamp",
                   "timepoint_title"],
                  [["sample4", "not applicable", "spf", "pax5", "not applicable", "not applicable", "not applicable", "not applicable", "1 month together in the same cage and condition"],
                   ["2017-08-07","not applicable","cf","pax5","not applicable","not applicable","not applicable","not applicable","1 month together in the same cage and condition"],
                   ["2017-03-06","not provided","spf","wt","UBERON:feces","Mus musculus","V155","2017-01-23 00:00:00","1 month together in the same cage and condition"],
                   ["2017-07-13","not provided","cf","wt","UBERON:feces","Mus musculus","V155","2017-01-23 00:00:00","10 month together"],
                  ]
                );
                this.empress = new Empress(
                    tree,
                    {"1": {"color": [0.75, 0.75, 0.75], "name": "featA", "sampVal": 1, "single_samp": false, "visible": true, "x2": 1741.6851629384719, "xc0": 402.0, "xc1": 3618.0, "xr": 4020.0000000000005, "y2": 2826.333871617878, "yc0": 0.0, "yc1": 0.0, "yr": -2010.0}, "2": {"color": [0.75, 0.75, 0.75], "name": "featB", "sampVal": 1, "single_samp": false, "visible": true, "x2": 1377.2695593522362, "xc0": 2.46154006628618e-14, "xc1": 9.84616026514472e-14, "xr": 1786.666666666667, "y2": -400.1577647228985, "yc0": 402.0, "yc1": 1608.0, "yr": -670.0}, "3": {"arcendangle": 0, "arcstartangle": 1.5707963267948966, "arcx0": 2.46154006628618e-14, "arcy0": 402.0, "color": [0.75, 0.75, 0.75], "highestchildyr": -670.0, "lowestchildyr": -2010.0, "name": "EmpressNode0", "sampVal": 1, "single_samp": false, "visible": true, "x2": 361.43313688781836, "xc0": 0.0, "xc1": 284.2569260369922, "xr": 446.66666666666674, "y2": 117.43674504609635, "yc0": 0.0, "yc1": 284.2569260369921, "yr": -1340.0}, "4": {"color": [0.75, 0.75, 0.75], "name": "featC", "sampVal": 1, "single_samp": false, "visible": true, "x2": -1067.9292802883006, "xc0": -804.0, "xc1": -1608.0, "xr": 1786.666666666667, "y2": -912.0977717351384, "yc0": 9.84616026514472e-14, "yc1": 1.969232053028944e-13, "yr": 670.0}, "5": {"color": [0.75, 0.75, 0.75], "name": "featD", "sampVal": 1, "single_samp": false, "visible": true, "x2": -2077.314837061528, "xc0": -1.476924039771708e-13, "xc1": -4.4307721193151247e-13, "xr": 2680.0000000000005, "y2": 455.2525229331336, "yc0": -804.0, "yc1": -2412.0000000000005, "yr": 2010.0}, "6": {"arcendangle": 3.141592653589793, "arcstartangle": 4.71238898038469, "arcx0": -1.476924039771708e-13, "arcy0": -804.0, "color": [0.75, 0.75, 0.75], "highestchildyr": 2010.0, "lowestchildyr": 670.0, "name": "EmpressNode1", "sampVal": 1, "single_samp": false, "visible": true, "x2": -722.8662737756372, "xc0": -0.0, "xc1": -568.5138520739844, "xr": 893.3333333333335, "y2": -234.87349009219304, "yc0": -0.0, "yc1": -568.5138520739843, "yr": 1340.0}, "7": {"color": [0.75, 0.75, 0.75], "highestchildyr": 1340.0, "lowestchildyr": -1340.0, "name": "EmpressNode2", "sampVal": 1, "single_samp": false, "visible": true, "x2": 0.0, "xc0": 0.0, "xc1": 0.0, "xr": 0.0, "y2": 0.0, "yc0": 0.0, "yc1": 0.0, "yr": 0.0}},
                    {"EmpressNode0": [3], "EmpressNode1": [6], "EmpressNode2": [7], "featA": [1], "featB": [2], "featC": [4], "featD": [5]},
                    {"Circular": "c1", "Rectangular": "r", "Unrooted": "2"},
                    'Unrooted',
                    biom,
                    fmCols,
                    null,
                    null,
                    null
                );
                this.empress._drawer = new Object();
                // without the below line, I get a out of bounds exception
                // is this the intended behavior? Wired if you have to set
                // this parameter
                this.empress._drawer.VERTEX_SIZE = 5;


                // for legend export
                var content =
                    '<div id="tip-color-key" class="legend hidden" disabled="true"></div><div id="node-color-key" class="legend" disabled="true"><div class="legend-title">collection_timestamp</div><div class="gradient-bar"><div class="category-color" style="background: #ff0000;"></div><label class="gradient-label" title="sample4">sample4</label></div><div class="gradient-bar"><div class="category-color" style="background: #0000ff;"></div><label class="gradient-label" title="2017-08-07">2017-08-07</label></div><div class="gradient-bar"><div class="category-color" style="background: #f27304;"></div><label class="gradient-label" title="2017-03-06">2017-03-06</label></div><div class="gradient-bar"><div class="category-color" style="background: #008000;"></div><label class="gradient-label" title="2017-07-13">2017-07-13</label></div></div><div id="clade-color-key" class="legend hidden" disabled="true"></div>';
                var doctype = document.implementation.createDocumentType(
                    "html",
                    "",
                    ""
                );
                this.dom_legend = document.implementation.createDocument(
                    "",
                    "html",
                    doctype
                );
                // duplicate content to test with two legends to be drawn
                this.dom_legend.documentElement.innerHTML = content + content;
            },

            teardown: function () {
                this.empress = null;
            },
        });

        count_svg_tags = function (svg_string) {
            var lines = svg_string.match(/[^\n]+/g);

            num_branches = 0;
            num_circles = 0;
            num_nonthickbranches = 0;
            num_noncoloredbranches = 0;
            for (i = 0; i < lines.length; i++) {
                if (lines[i].includes("<line ")) {
                    num_branches++;
                    if (lines[i].includes('style="stroke-width:1"')) {
                        num_nonthickbranches++;
                    }
                    if (
                        lines[i].includes('stroke="rgb(191.25,191.25,191.25)"')
                    ) {
                        num_noncoloredbranches++;
                    }
                }
                if (lines[i].includes("<circle ")) {
                    num_circles++;
                }
            }
            return [
                num_branches,
                num_circles,
                num_nonthickbranches,
                num_noncoloredbranches,
            ];
        };

        test("Test exportSvg, default layout", function () {
            [obs_svg, svg_viewbox] = this.empress.exportSvg();

            [
                num_branches,
                num_circles,
                num_nonthickbranches,
                num_noncoloredbranches,
            ] = count_svg_tags(obs_svg);

            deepEqual(num_branches, 6);
            deepEqual(num_nonthickbranches, 6); // all branches are NOT thickened
            deepEqual(num_noncoloredbranches, 6); // all branches are NOT colored
            deepEqual(num_circles, 1); // only root, since showTreeNodes is false
        });

        test("Test exportSvg, default layout + showTreeNodes", function () {
            this.empress._drawer.showTreeNodes = true;

            [obs_svg, svg_viewbox] = this.empress.exportSvg();

            [
                num_branches,
                num_circles,
                num_nonthickbranches,
                num_noncoloredbranches,
            ] = count_svg_tags(obs_svg);

            deepEqual(num_branches, 6);
            deepEqual(num_nonthickbranches, 6); // all branches are NOT thickened
            deepEqual(num_noncoloredbranches, 6); // all branches are NOT colored
            deepEqual(num_circles, 1 + 4); // 1 root and 4 tips
        });

        test("Test exportSvg, default layout + showTreeNodes: rectangular", function () {
            this.empress._drawer.showTreeNodes = true;
            this.empress._currentLayout = "Rectangular";

            [obs_svg, svg_viewbox] = this.empress.exportSvg();

            [
                num_branches,
                num_circles,
                num_nonthickbranches,
                num_noncoloredbranches,
            ] = count_svg_tags(obs_svg);

            deepEqual(num_branches, 9);
            deepEqual(num_nonthickbranches, 9); // all branches are NOT thickened
            deepEqual(num_noncoloredbranches, 9); // all branches are NOT colored
            deepEqual(num_circles, 1 + 4); // 1 root and 4 tips
        });

        test("Test exportSvg, default layout + showTreeNodes: circular", function () {
            this.empress._drawer.showTreeNodes = true;
            this.empress._currentLayout = "Circular";

            [obs_svg, svg_viewbox] = this.empress.exportSvg();

            [
                num_branches,
                num_circles,
                num_nonthickbranches,
                num_noncoloredbranches,
            ] = count_svg_tags(obs_svg);

            deepEqual(num_branches, 36);
            deepEqual(num_nonthickbranches, 36); // all branches are NOT thickened
            deepEqual(num_noncoloredbranches, 36); // all branches are NOT colored
            deepEqual(num_circles, 1 + 4); // 1 root and 4 tips
        });

        test("Test exportSvg, color by sample metadata", function () {
            this.empress._drawer.showTreeNodes = true;
            this.empress.colorBySampleCat(
                "diseased",
                "discrete-coloring-qiime"
            ); // color private features by sample-metadata and propagate buttom-up
            this.empress._currentLineWidth = 4; // draw colored branches thicker than normal
            [obs_svg, svg_viewbox] = this.empress.exportSvg();

            [
                num_branches,
                num_circles,
                num_nonthickbranches,
                num_noncoloredbranches,
            ] = count_svg_tags(obs_svg);

            deepEqual(num_branches, 6);
            deepEqual(num_nonthickbranches, 2);
            deepEqual(num_noncoloredbranches, 2);
            deepEqual(num_circles, 1 + 4); // 1 root and 4 tips
        });

        test("Test exportSvg, viewbox size", function () {
            [obs_svg, svg_viewbox] = this.empress.exportSvg();
            deepEqual(
                svg_viewbox,
                'viewBox="-2081.31494140625 -916.0977783203125 3827.0001220703125 3746.4317626953125"'
            );
        });

        test("Test exportSvg, viewbox size: circular with nodes", function () {
            this.empress._currentLayout = "Circular";
            this.empress._drawer.showTreeNodes = true;
            [obs_svg, svg_viewbox] = this.empress.exportSvg();
            deepEqual(svg_viewbox, 'viewBox="-1612 -2416 5234 4028"');
        });

        count_svg_tags_legend = function (svg_string) {
            var lines = svg_string.match(/[^\n]+/g);

            num_groups = 0;
            num_key_rects = 0;
            num_key_labels = 0;
            num_titles = 0;
            for (i = 0; i < lines.length; i++) {
                if (lines[i].includes("<rect ")) {
                    if (!lines[i].includes('ry="')) {
                        num_key_rects++;
                    }
                }
                if (lines[i].includes("<text ")) {
                    if (lines[i].includes("font-weight:bold")) {
                        num_titles++;
                    } else {
                        num_key_labels++;
                    }
                }
                if (lines[i].includes("<g>")) {
                    num_groups++;
                }
            }
            return [num_groups, num_key_rects, num_key_labels, num_titles];
        };

        test("Test exportSVG_legend, draw legend", function () {
            obs_legend = this.empress.exportSVG_legend(
                this.dom_legend.documentElement
            );
            [
                num_groups,
                num_key_rects,
                num_key_labels,
                num_titles,
            ] = count_svg_tags_legend(obs_legend);

            deepEqual(num_groups, 1 * 2);
            deepEqual(num_key_rects, 4 * 2);
            deepEqual(num_key_labels, 4 * 2);
            deepEqual(num_titles, 1 * 2);
        });
    });
});
