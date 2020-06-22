require(["jquery", "BPTree", "Empress", "util"], function($, BPTree, Empress, util) {
    $(document).ready(function() {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray without
        // effecting other test
        module('Empress' , {
            setup: function() {
                // tree comes from the following newick string
                // ((1,(2,3)4)5,6)7;
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
                    null, null, null, null, null, null, null);
            },

            teardown: function() {
                this.empress = null;
            }
        });

        test("Test _projectObservations, all tips in obs", function() {
            var obs = {
                "g1" : new Set([2, 3]),
                "g2" : new Set([1]),
                "g3" : new Set([6])
            };
            var expectedResult = {
                "g1" : new Set([2,3,4]),
                "g2" : new Set([1]),
                "g3" : new Set([6]),
            };
            var result = this.empress._projectObservations(obs);

            var groups = ["g1", "g2", "g3"];
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                var expectedArray = Array.from(expectedResult[group]);
                var resultArray = util.naturalSort(Array.from(result[group]));
                deepEqual(resultArray, expectedArray);
            }

            var columns = Object.keys(result);
            deepEqual(columns, groups);
        });

        test("Test _projectObservations, missing tips in obs", function() {
            var obs = {
                "g1" : new Set([2, 3]),
                "g2" : new Set([]),
                "g3" : new Set([6])
            };
            var expectedResult = {
                "g1" : new Set([2, 3, 4]),
                "g2" : new Set([]),
                "g3" : new Set([6])
            };
            var result = this.empress._projectObservations(obs);

            var groups = ["g1", "g2", "g3"];
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                var expectedArray = Array.from(expectedResult[group]);
                var resultArray = util.naturalSort(Array.from(result[group]));
                deepEqual(resultArray, expectedArray);
            }

            var columns = Object.keys(result);
            deepEqual(columns, groups);
        });

        test("Test _projectObservations, all tips are unique to group", function() {
            var obs = {
                "g1": new Set([1, 2, 3, 6]),
                "g2": new Set([])
            };
            var expectedResult = {
                "g1": new Set([1, 2, 3, 4, 5, 6, 7]),
                "g2": new Set([])
            };
            var result = this.empress._projectObservations(obs);

            var groups = ["g1", "g2"];
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                var expectedArray = Array.from(expectedResult[group]);
                var resultArray = util.naturalSort(Array.from(result[group]));
                deepEqual(resultArray, expectedArray);
            }

            var columns = Object.keys(result);
            deepEqual(columns, groups);
        });

        test("Test _projectObservations, no tips are present in any group", function() {
            var obs = {
                "g1": new Set([]),
                "g2": new Set([])
            };
            var expectedResult = {
                "g1": new Set([]),
                "g2": new Set([])
            };
            var result = this.empress._projectObservations(obs);

            var groups = ["g1", "g2"];
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                var expectedArray = Array.from(expectedResult[group]);
                var resultArray = util.naturalSort(Array.from(result[group]));
                deepEqual(resultArray, expectedArray);
            }

            var columns = Object.keys(result);
            deepEqual(columns, groups);
        });
    });
});
