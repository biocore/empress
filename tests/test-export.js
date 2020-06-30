require(["jquery", "BPTree", "Empress", "util", 'BiomTable'], function($, BPTree, Empress, util, BIOMTable) {
    $(document).ready(function() {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray without
        // effecting other test
        module('Empress' , {
            setup: function() {
                var tArr = new Uint8Array([1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0]);
                var tree = new BPTree(tArr, ['EmpressNode2', 'EmpressNode0', 'featA', 'featB', 'EmpressNode1', 'featC', 'featD']);

                var fmCols = [];

                var canvas = document.getElementById('tree-surface');

                var biom = new BIOMTable(
                  {'sample1': ['featA', 'featB'], 'sample2': ['featA', 'featB'], 'sample3': ['featA', 'featC', 'featD'], 'sample4': ['featA', 'featC', 'featD']},
                  {"sample1": {"collection_timestamp": "sample4", "diseased": "not applicable", "facility": "spf", "genotype": "pax5", "host_body_habitat": "not applicable", "host_scientific_name": "not applicable", "host_subject_id": "not applicable", "start_cohousing_timestamp": "not applicable", "timepoint_title": "1 month together in the same cage and condition"}, "sample2": {"collection_timestamp": "2017-08-07", "diseased": "not applicable", "facility": "cf", "genotype": "pax5", "host_body_habitat": "not applicable", "host_scientific_name": "not applicable", "host_subject_id": "not applicable", "start_cohousing_timestamp": "not applicable", "timepoint_title": "1 month together in the same cage and condition"}, "sample3": {"collection_timestamp": "2017-03-06", "diseased": "not provided", "facility": "spf", "genotype": "wt", "host_body_habitat": "UBERON:feces", "host_scientific_name": "Mus musculus", "host_subject_id": "V155", "start_cohousing_timestamp": "2017-01-23 00:00:00", "timepoint_title": "1 month together in the same cage and condition"}, "sample4": {"collection_timestamp": "2017-07-13", "diseased": "not provided", "facility": "cf", "genotype": "wt", "host_body_habitat": "UBERON:feces", "host_scientific_name": "Mus musculus", "host_subject_id": "V155", "start_cohousing_timestamp": "2017-01-23 00:00:00", "timepoint_title": "10 month together"}},
                  {"collection_timestamp": "o", "diseased": "o", "facility": "o", "genotype": "o", "host_body_habitat": "o", "host_scientific_name": "o", "host_subject_id": "o", "start_cohousing_timestamp": "o", "timepoint_title": "o"}
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
                this.empress._drawer.VERTEX_SIZE = 5;
            },

            teardown: function() {
                this.empress = null;
            }
        });

        test("Test exportSvg, count graphical elements", function() {
            obs_svg = this.empress.exportSvg();

            var lines = obs_svg.match(/[^\n]+/g);
            num_branches = 0;
            num_circles = 0;
            for (i = 0; i < lines.length; i++) {
                if (lines[i].includes("<line ")) {
                    num_branches++;
                }
                if (lines[i].includes("<circle ")) {
                  num_circles++;
                }
            }
            deepEqual(num_branches, 6);
            deepEqual(num_circles, 1);  // only root
        });
    });
});
