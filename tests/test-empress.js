require(["jquery", "BPTree", "Empress", "BiomTable", "util", "chroma"], function($, BPTree, Empress, BiomTable, util, chroma) {
    $(document).ready(function() {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray without
        // effecting other test
        module('Empress' , {
            setup: function() {
                // tree comes from the following newick string
                // ((1,(2,3)4)5,6)7;
                var tree = new BPTree(
                    new Uint8Array([1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0]),
                    null, null, null));
                var layoutToCoordSuffix = {
                    "Rectangular": "r",
                    "Circular": "c2",
                    "Unrooted": "2"
                };

                var nameToKeys = {
                    "root": [7],
                    "EmpressNode6": [6],
                    "internal": [5, 4],
                    "2": [2],
                    "3": [3],
                    "1": [1]
                };
                // Note: the coordinates for each layout are "random". i.e.
                // they will not make an actual tree. They were created to
                // make testing easier.
                var treeData = {
                    7: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false,
                        "xr": 13,
                        "yr": 14,
                        "xc2": 27,
                        "yc2": 28,
                        "x2": 41,
                        "y2": 42,
                        "name": "root",
                        "inSample": true,
                        "visible": true
                    },
                    6: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false,
                        "xr": 11,
                        "yr": 12,
                        "xc2": 25,
                        "yc2": 26,
                        "x2": 39,
                        "y2": 40,
                        "name": "EmpressNode6",
                        "inSample": true,
                        "visible": true
                    },
                    5: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false,
                        "xr": 9,
                        "yr": 10,
                        "xc2": 23,
                        "yc2": 24,
                        "x2": 37,
                        "y2": 38,
                        "name": "internal",
                        "inSample": true,
                        "visible": true
                    },
                    4: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false,
                        "xr": 7,
                        "yr": 8,
                        "xc2": 21,
                        "yc2": 22,
                        "x2": 35,
                        "y2": 36,
                        "name": "internal",
                        "inSample": true,
                        "visible": true
                    },
                    2: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false,
                        "xr": 3,
                        "yr": 4,
                        "xc2": 17,
                        "yc2": 18,
                        "x2": 31,
                        "y2": 32,
                        "name": "2",
                        "inSample": true,
                        "visible": true
                    },
                    3: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false,
                        "xr": 5,
                        "yr": 6,
                        "xc2": 19,
                        "yc2": 20,
                        "x2": 33,
                        "y2": 34,
                        "name": "3",
                        "inSample": true,
                        "visible": true
                    },
                    1: {
                        "color":[1.0, 1.0, 1.0],
                        "inSample": false,
                        "xr": 1,
                        "yr": 2,
                        "xc2": 15,
                        "yc2": 16,
                        "x2": 29,
                        "y2": 30,
                        "name": "1",
                        "inSample": true,
                        "visible": true
                    }

                }
                var obs = {
                    "s1": ["1", "2", "3"],
                    "s2": ["2", "3"],
                    "s3": ["1", "3", "EmpressNode6"],
                    "s4": ["2"],
                    "s5": ["1", "2", "3", "EmpressNode6"],
                    "s6": ["1", "2", "3"],
                    "s7": ["EmpressNode6"]
                };
                var samp = {
                    "s1": {
                        "f1": "a",
                        "grad": 1,
                        "traj": "t1"
                    },
                    "s2": {
                        "f1": "a",
                        "grad": 2,
                        "traj": "t1"
                    },
                    "s3": {
                        "f1": "a",
                        "grad": 1,
                        "traj": "t2"
                    },
                    "s4": {
                        "f1": "b",
                        "grad": 2,
                        "traj": "t2"
                    },
                    "s5": {
                        "f1": "a",
                        "grad": 3,
                        "traj": "t3"
                    },
                    "s6": {
                        "f1": "a",
                        "grad": 3,
                        "traj": "t3"
                    },
                    "s7": {
                        "f1": "b",
                        "grad": 4,
                        "traj": "t4"
                    }
                };
                var types = {
                    "f1": "o",
                    "grad": "n",
                    "traj": "o"
                }
                var featureColumns = ["f1", "f2"];
                var tipMetadata = {
                    "1": {
                        "f1": 2,
                        "f2": 2
                    },
                    "2": {
                        "f1": 1,
                        "f2": 2
                    },
                    "3": {
                        "f1": 1,
                        "f2": 2
                    },
                    "EmpressNode6": {
                        "f1": 2,
                        "f2": 2
                    }
                }
                var intMetadata = {
                    "internal": {
                        "f1": 1,
                        "f2": 1
                    }
                }
                var biom = new BiomTable(obs, samp, types);
                var canvas = document.createElement("canvas");
                this.empress = new Empress(tree, treeData, nameToKeys,
                    layoutToCoordSuffix, "Unrooted",
                    biom, featureColumns, tipMetadata, intMetadata, canvas);
                this.empress._drawer.initialize();
            },

            teardown: function() {
                this.empress = null;
            }
        });

        test("Test getX/getY", function(){
            // The tree coordinates were defined in such way that, starting at
            // node 1, rectangular layout, and coord=1, a nodes coords should
            // be (coord++, coord++)
            var coord = 1;

            this.empress._currentLayout = "Rectangular";
            for (var i=1; i <=7; i++) {
                var node = this.empress._treeData[i];
                equal(this.empress.getX(node), coord++);
                equal(this.empress.getY(node), coord++);
            }

            this.empress._currentLayout = "Circular";
            for (var i=1; i <=7; i++) {
                var node = this.empress._treeData[i];
                equal(this.empress.getX(node), coord++);
                equal(this.empress.getY(node), coord++);
            }

            this.empress._currentLayout = "Unrooted";
            for (var i=1; i <=7; i++) {
                var node = this.empress._treeData[i];
                equal(this.empress.getX(node), coord++);
                equal(this.empress.getY(node), coord++);
            }
        });

         test("Test computeNecessaryCoordsSize", function() {
            // add drawer information to empress
            // the only drawer info needed for computeNecessaryCoordsSize is
            // the size of each vertex which is 5 ([x, y, r, g, b])
            this.empress._drawer = new Object();
            this.empress._drawer.VERTEX_SIZE = 5;

            // Note: tree has 1 root, 4 tips, and 2 non-root internal nodes

            // rectangual layout needs one line for root, 4 lines for tips,
            // and 4 lines for non-root internal nodes (2 lines per non-root
            // internal node). Then each line is defined by 2 verticies and each
            // vertex has a size of 5
            var recLines = (1 + 4 + 2*2) * 2 * 5
            this.empress._currentLayout = "Rectangular";
            equal(this.empress.computeNecessaryCoordsSize(), recLines);

            // circular layout needs 0 lines for root, 4 lines for tips, and
            // 32 lines for non-root internal nodes (16 lines per non-root
            // internal nodes). Then each line is defined by 2 verticies and each
            // vertex has a size of 5
            var circLines = (0 + 4 + 2*16) * 2 * 5;
            this.empress._currentLayout = "Circular";
            equal(this.empress.computeNecessaryCoordsSize(), circLines);

            //unrooted layout needs 0 lines for root, 4 lines for tips, and
            // 2 lines for non-root internal nodes. Then each lines is defined
            // by 2 verticies and each vertex has a size of 5.
            var unrootLines = (0 + 4 + 2) * 2 * 5;
            this.empress._currentLayout = "Unrooted";
            equal(this.empress.computeNecessaryCoordsSize(), unrootLines);
         });

         test("Test getNodeCoords", function() {
            // Note: node 6's name is EmpressNode6 which means it will not be
            // included in the getNodeCoords()
            var rectCoords = new Float32Array([
                1, 2, 1.0, 1.0, 1.0,
                3, 4, 1.0, 1.0, 1.0,
                5, 6, 1.0, 1.0, 1.0,
                7, 8, 1.0, 1.0, 1.0,
                9, 10, 1.0, 1.0, 1.0,
                13, 14, 1.0, 1.0, 1.0
            ]);
            this.empress._currentLayout = "Rectangular";
            var empressRecCoords = this.empress.getNodeCoords();
            deepEqual(empressRecCoords, rectCoords);

            var circCoords = new Float32Array([
                15, 16, 1.0, 1.0, 1.0,
                17, 18, 1.0, 1.0, 1.0,
                19, 20, 1.0, 1.0, 1.0,
                21, 22, 1.0, 1.0, 1.0,
                23, 24, 1.0, 1.0, 1.0,
                27, 28, 1.0, 1.0, 1.0,
            ]);
            this.empress._currentLayout = "Circular";
            var empressCirCoords = this.empress.getNodeCoords();
            deepEqual(empressCirCoords, circCoords);

            var unrootCoords = new Float32Array([
                29, 30, 1.0, 1.0, 1.0,
                31, 32, 1.0, 1.0, 1.0,
                33, 34, 1.0, 1.0, 1.0,
                35, 36, 1.0, 1.0, 1.0,
                37, 38, 1.0, 1.0, 1.0,
                41, 42, 1.0, 1.0, 1.0,
            ]);
            this.empress._currentLayout = "Unrooted";
            var empressUnrootCoords = this.empress.getNodeCoords();
            deepEqual(empressUnrootCoords, unrootCoords);
         });

         test("Test setNonSampleBranchVisibility", function() {
            // set node 6's inSample=false,  this means node 6's visible
            // should be the opposite of the input to
            // setNonSampleBranchVisibility
            this.empress._treeData[6].inSample=false;

            // pass in false
            // Note: this means node 6's visible should be true
            this.empress.setNonSampleBranchVisibility(false);
            for(var i = 1; i <7; i++) {
                var node = this.empress._treeData[i];
                equal(node.visible, true);
            }

            // pass in true
            // Note: this means node 6's visible should be false
            this.empress.setNonSampleBranchVisibility(true);
            for(var i = 1; i <7; i++) {
                var node = this.empress._treeData[i];
                if (i !== 6) {
                    equal(node.visible, true);
                } else {
                    equal(node.visible, false);
                }
            }
         });

         test("Test colorSampleIDs", function() {
            var samples = ["s2","s7"];
            var defaultColor = [1.0, 1.0, 1.0];
            var color = [0.5, 0.6, 0.7];
            this.empress.colorSampleIDs(samples, color);

            // Note: 1 does not belong to s2 or s7 so it should not be colored
            //       which means the color should not be projected up to node 5
            var cNodes = new Set([2, 3, 4, 6]);
            for (var i = 1; i <= 7; i++) {
                var node = this.empress._treeData[i];
                if (cNodes.has(i)) {
                    deepEqual(node.color, color);
                } else {
                    deepEqual(node.color, defaultColor);
                }
            }
         });

         test("Test colorSampleGroups, single group", function() {
            // Note: the group names for colorSampleGroup must be a color
            // hex string
            var sampleGroup = {
                "FF0000": ["s1", "s2", "s7"]
            };
            this.empress.colorSampleGroups(sampleGroup);

            // the entire tree should be colored the samples in sampleGroup
            // contain all tips
            for (var i = 1; i <=7; i++) {
                var node = this.empress._treeData[i];
                deepEqual(node.color, [1.0, 0, 0]);
            }
         });

         test("Test colorSampleGroups, mult group", function() {
            // Note: the group names for colorSampleGroup must be a color
            // hex string
            var sampleGroups = {
                "FF0000": ["s4", "s7"],
                "00FF00": ["s1", "s2"]
            }

            // red nodes are the unique nodes in FFOOOO
            var redNodes = new Set([6]);
            // green nodes are the unique nodes in 00FF00
            var greeNodes = new Set([1, 3]);
            this.empress.colorSampleGroups(sampleGroups);
            for (var i = 1; i <=7; i++) {
                var node = this.empress._treeData[i];
                if (redNodes.has(i)) {
                    deepEqual(node.color, [1.0, 0, 0]);
                } else if(greeNodes.has(i)) {
                    deepEqual(node.color, [0, 1.0, 0]);
                } else {
                    deepEqual(node.color, [1.0, 1.0, 1.0]);
                }
            }
         });

         test("Test _namesToKeys", function() {
            var internalKeys = [4, 5, 7];
            var result = this.empress._namesToKeys(["root", "internal"]);
            result = util.naturalSort(Array.from(result));
            deepEqual(result, internalKeys);

            var tip = [1];
            result = this.empress._namesToKeys(["1"]);
            result = util.naturalSort(Array.from(result));
            deepEqual(result, tip);

            var allNodes = [1, 2, 3, 4, 5, 6, 7];
            result = this.empress._namesToKeys([
                "1",
                "2",
                "3",
                "internal",
                "EmpressNode6",
                "root"
            ]);
            result = util.naturalSort(Array.from(result));
            deepEqual(result, allNodes)
         });

         test("Test colorBySampleCat", function() {
            var cm = this.empress.colorBySampleCat(
                "f1",
                "discrete-coloring-qiime"
            );

            // make sure only a and b are valid groups as 'a' and 'b' are
            // the only values in 'f1'
            var groups = ["a", "b"];
            var resultGroups = util.naturalSort(Object.keys(cm));
            deepEqual(resultGroups, groups);

            // make sure all three groups have different colors

            // "a" group
            var groupCm = cm["a"];
            notDeepEqual(cm["b"], cm);

            // "b" group
            var groupCm = cm["b"];
            notDeepEqual(cm["a"], cm);

            // make sure nodes where assigned the correct color
            // note that gropu b does not have any unique nodes
            var aGroupNodes = new Set([1, 3]);
            for (var i = 1; i<=7; i++) {
                var node = this.empress._treeData[i];
                if (aGroupNodes.has(i)) {
                    deepEqual(
                        node.color,
                        chroma(cm["a"]).gl().slice(0, 3)
                    );
                }  else {
                    deepEqual(node.color, [1.0, 1.0, 1.0]);
                }
            }

         });

        test("Test colorByFeatureMetadata, tip only", function() {
            // make usre error is thrown when invalid color method is used
            throws(function() {
                this.empress.colorByFeatureMetadata(null, null, "badInput");
            });

            // test 'tip' only method

            // get color map
            var cm = this.empress.colorByFeatureMetadata(
                "f1",
                "discrete-coloring-qiime",
                "tip"
            );
            var groups = ["1", "2"];

            // make sure '1' and '2' are the only gropus
            var resultGroups = util.naturalSort(Object.keys(cm));
            deepEqual(resultGroups, groups);

            // make sure nodes were assigned correct color
            var group1 = new Set([2, 3, 4]);
            var group2 = new Set([1, 6]);
            for (var i = 1; i <= 7; i++) {
                var node = this.empress._treeData[i];
                if (group1.has(i)) {
                    deepEqual(
                        node.color,
                        chroma(cm["1"]).gl().slice(0, 3)
                    );
                } else if (group2.has(i)) {
                    deepEqual(
                        node.color,
                        chroma(cm["2"]).gl().slice(0, 3)
                    );
                } else {
                    deepEqual(node.color, [1.0, 1.0, 1.0]);
                }
            }

            // test 'all' method

            cm = this.empress.colorByFeatureMetadata(
                "f2",
                "discrete-coloring-qiime",
                "all"
            );
            resultGroups = util.naturalSort(Object.keys(cm));
            deepEqual(resultGroups, groups);

            // Note: 'all' method does not use propagtion
            //       if propagtion was used, then 4, 5 would belong to group2
            group1 = new Set([4, 5]);
            group2 = new Set([1, 2, 3, 6]);
            for (i = 1; i <= 7; i++) {
                node = this.empress._treeData[i];
                if (group1.has(i)) {
                    deepEqual(
                        node.color,
                        chroma(cm["1"]).gl().slice(0, 3)
                    );
                } else if (group2.has(i)) {
                    deepEqual(
                        node.color,
                        chroma(cm["2"]).gl().slice(0, 3)
                    );
                } else {
                    deepEqual(node.color, [1.0, 1.0, 1.0]);
                }
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

        test("Test _colorTree", function() {
            var g1Nodes = new Set([1, 2, 3]);
            var g2Nodes = new Set([4, 5, 6]);
            var g3Nodes = new Set([7]);
            var obs = {
                "g1": g1Nodes,
                "g2": g2Nodes,
                "g3": g3Nodes
            };
            var cm = {
                "g1": [1, 0, 0],
                "g2": [0, 1, 0],
                "g3": [0, 0, 1]
            }
            this.empress._colorTree(obs, cm);
            for (var i =1; i<=7; i++) {
                var node = this.empress._treeData[i];
                if (g1Nodes.has(i)) {
                    deepEqual(node.color, [1, 0, 0]);
                } else if (g2Nodes.has(i)) {
                    deepEqual(node.color, [0, 1, 0]);
                } else {
                    deepEqual(node.color, [0, 0, 1]);
                }
            }
        });

        test("Test resetTree", function() {
            var e = this.empress; // used to shorten funciton calls
            var keys  = Object.keys(e._treeData);
            e.resetTree();
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                deepEqual(e._treeData[key].color, e.DEFAULT_COLOR);
                equal(e._treeData[key].inSample, false);
                equal(e._treeData[key].sampleColored, false);
                equal(e._treeData[key].visible, true);
            }
        });

        test("Test getSampleCategories", function() {
            var categories = ["f1", "grad", "traj"];
            var result = this.empress.getSampleCategories();
            result = util.naturalSort(result);
            deepEqual(result, categories);
        });

        test("Test getAvailableLayouts", function(){
            var layouts = ["Circular", "Rectangular", "Unrooted"];
            var result = this.empress.getAvailableLayouts();
            result = util.naturalSort(result);
            deepEqual(result, layouts);
        });

        test("Test updateLayout", function() {
            // check if layout updates with valid layout
            this.empress.updateLayout("Circular");
            deepEqual(this.empress._currentLayout, "Circular");

            // check to make sure an error is thrown with invalid layout
            throws(function() {this.empress.updateLayout("bad_layout");});
        });

        test("Test getDefaultLayout", function(){
            deepEqual(this.empress.getDefaultLayout(), "Unrooted");
        });

        test("Test getUniqueSampleValues", function() {
            var f1Values = ["a", "b"];
            var result = util.naturalSort(
                this.empress.getUniqueSampleValues("f1")
            );
            deepEqual(result, f1Values);

            var gradValues = [1, 2, 3, 4];
            result = util.naturalSort(
                this.empress.getUniqueSampleValues("grad")
            );
            deepEqual(result, gradValues);

            var trajValues = ["t1", "t2", "t3", "t4"];
            result = util.naturalSort(
                this.empress.getUniqueSampleValues("traj")
            );
            deepEqual(result, trajValues);
        });

        test("Test getGradientStep", function() {
            var expectedObs = {
                "t1": ["1", "2", "3"],
                "t2": ["EmpressNode6", "1", "3"]
            }
            var obs = this.empress.getGradientStep("grad", 1, "traj");
            var groups = Object.keys(obs);
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                obs[group] = util.naturalSort(obs[group]);
            }
            deepEqual(obs, expectedObs)
        });

        test("Test getFeatureMetadataCategories", function() {
            var expectedColumns = ["f1", "f2"];
            var columns = util.naturalSort(
                this.empress.getFeatureMetadataCategories());
            deepEqual(columns, expectedColumns);
        });

        test("Test centerLayoutAvgPoint", function() {
            // cache average point for all layouts
            this.empress._currentLayout = "Rectangular";
            this.empress.centerLayoutAvgPoint();
            this.empress._currentLayout = "Circular";
            this.empress.centerLayoutAvgPoint();
            this.empress._currentLayout = "Unrooted";
            this.empress.centerLayoutAvgPoint();

            // x coord for rectangular layout
            ok(
                Math.abs(this.empress.layoutAvgPoint["Rectangular"][0] - 7)
                <= 1.0e-15)
            // y coor for rectangular layout
            ok(
                Math.abs(this.empress.layoutAvgPoint["Rectangular"][1] - 8)
                <= 1.0e-15)

            // x coord for circular layout
            ok(
                Math.abs(this.empress.layoutAvgPoint["Circular"][0] - 21)
                <= 1.0e-15)
            // y coor for circular layout
            ok(
                Math.abs(this.empress.layoutAvgPoint["Circular"][1] - 22)
                <= 1.0e-15)

            // x coord for Unrooted layout
            ok(
                Math.abs(this.empress.layoutAvgPoint["Unrooted"][0] - 35)
                <= 1.0e-15)
            // y coor for Unrooted layout
            ok(
                Math.abs(this.empress.layoutAvgPoint["Unrooted"][1] - 36)
                <= 1.0e-15)

        });
    });
});
