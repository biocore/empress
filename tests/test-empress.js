require(['jquery', 'BPTree', 'Empress', "util"], function($, BPTree, Empress, util) {
    $(document).ready(function() {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray without
        // effecting other test
        module('Empress' , {
            setup: function() {
                // tree comes from the following newick string
                // ((f,(e,d)c)b,a)root;
                var tree = new BPTree(
                    new Uint8Array([1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0]));
                var treeData = {
                    7: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false
                    },
                    6: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false
                    },
                    5: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false
                    },
                    4: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false
                    },
                    2: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false
                    },
                    3: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false
                    },
                    1: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false
                    }

                }
                this.empress = new Empress(tree, treeData, null,
                    null, null, null, null);
            },

            teardown: function() {
                this.empress = null;
            }
        });

        test('Test _projectObservations, all tips in obs', function() {
            var obs = {
                "g1" : new Set([2, 3]),
                "g2" : new Set([1]),
                "g3" : new Set([6])
            };
            var expectedResult = {
                "g1" : new Set([2,3,4]),
                "g2" : new Set([1]),
                "g3" : new Set([6]),
                "non-unique" : new Set([])
            };
            var result = this.empress._projectObservations(obs, true);
            console.log({"???": result})

            var groups = ["g1", "g2", "g3", "non-unique"];
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                var expectedArray = Array.from(expectedResult[group]);
                var resultArray = Array.from(result[group]);
                deepEqual(resultArray, expectedArray);
            }
        });

        test('Test _projectObservations, missing tips in obs', function() {
            var obs = {
                "g1" : new Set([2, 3]),
                "g2" : new Set([]),
                "g3" : new Set([6])
            };
            var expectedResult = {
                "g1" : new Set([2, 3, 4]),
                "g2" : new Set([]),
                "g3" : new Set([6]),
                "non-unique" : new Set([])
            };
            var result = this.empress._projectObservations(obs, true);
            console.log({"???": result})

            var groups = ["g1", "g2", "g3", "non-unique"];
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                var expectedArray = Array.from(expectedResult[group]);
                var resultArray = Array.from(result[group]);
                deepEqual(resultArray, expectedArray);
            }
        });
    });
});
