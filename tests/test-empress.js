require([
    "jquery",
    "BPTree",
    "Empress",
    "BiomTable",
    "util",
    "chroma",
], function ($, BPTree, Empress, BiomTable, util, chroma) {
    $(document).ready(function () {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray
        // without affecting other tests.
        module("Empress", {
            setup: function () {
                // tree comes from the following newick string
                // ((1,(2,3)4)5,6)7;
                var tree = new BPTree(
                    new Uint8Array([1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0]),
                    [
                        "root",
                        "internal",
                        "1",
                        "internal",
                        "2",
                        "3",
                        "EmpressNode6",
                    ],
                    [7, 5, 1, 4, 2, 3, 6],
                    null
                );
                var layoutToCoordSuffix = {
                    Rectangular: "r",
                    Circular: "c1",
                    Unrooted: "2",
                };

                var nameToKeys = {
                    root: [7],
                    EmpressNode6: [6],
                    internal: [5, 4],
                    "2": [2],
                    "3": [3],
                    "1": [1],
                };
                // Note: the coordinates for each layout are "random". i.e.
                // they will not make an actual tree. They were created to
                // make testing easier.
                var treeData = {
                    7: {
                        color: [1.0, 1.0, 1.0],
                        xr: 13,
                        yr: 14,
                        xc1: 27,
                        yc1: 28,
                        x2: 41,
                        y2: 42,
                        name: "root",
                        visible: true,
                    },
                    6: {
                        color: [1.0, 1.0, 1.0],
                        xr: 11,
                        yr: 12,
                        xc1: 25,
                        yc1: 26,
                        x2: 39,
                        y2: 40,
                        name: "EmpressNode6",
                        visible: true,
                    },
                    5: {
                        color: [1.0, 1.0, 1.0],
                        xr: 9,
                        yr: 10,
                        xc1: 23,
                        yc1: 24,
                        x2: 37,
                        y2: 38,
                        name: "internal",
                        visible: true,
                    },
                    4: {
                        color: [1.0, 1.0, 1.0],
                        xr: 7,
                        yr: 8,
                        xc1: 21,
                        yc1: 22,
                        x2: 35,
                        y2: 36,
                        name: "internal",
                        visible: true,
                        angle: 0,
                    },
                    2: {
                        color: [1.0, 1.0, 1.0],
                        xr: 3,
                        yr: 4,
                        xc1: 17,
                        yc1: 18,
                        x2: 31,
                        y2: 32,
                        name: "2",
                        visible: true,
                        angle: 0.5,
                    },
                    3: {
                        color: [1.0, 1.0, 1.0],
                        xr: 5,
                        yr: 6,
                        xc1: 19,
                        yc1: 20,
                        x2: 33,
                        y2: 34,
                        name: "3",
                        visible: true,
                        angle: 1,
                    },
                    1: {
                        color: [1.0, 1.0, 1.0],
                        xr: 1,
                        yr: 2,
                        xc1: 15,
                        yc1: 16,
                        x2: 29,
                        y2: 30,
                        name: "1",
                        visible: true,
                    },
                };
                // data for the BiomTable object
                // (These IDs / indices aren't assigned in any particular
                // order; as long as it's consistent it doesn't matter.
                // However, setting fIDs in this way is convenient b/c it means
                // the index of feature "1" is 1, of "2" is 2, etc.)
                var sIDs = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];
                var fIDs = ["EmpressNode6", "1", "2", "3"];
                var sID2Idx = {
                    s1: 0,
                    s2: 1,
                    s3: 2,
                    s4: 3,
                    s5: 4,
                    s6: 5,
                    s7: 6,
                };
                var fID2Idx = {
                    EmpressNode6: 0,
                    "1": 1,
                    "2": 2,
                    "3": 3,
                };
                // See test-biom-table.js for details on this format. Briefly,
                // each inner array describes the feature indices present in a
                // sample.
                var tbl = [
                    [1, 2, 3],
                    [2, 3],
                    [0, 1, 3],
                    [2],
                    [0, 1, 2, 3],
                    [1, 2, 3],
                    [0],
                ];
                var smCols = ["f1", "grad", "traj"];
                var sm = [
                    ["a", "1", "t1"],
                    ["a", "2", "t1"],
                    ["a", "1", "t2"],
                    ["b", "2", "t2"],
                    ["a", "3", "t3"],
                    ["a", "3", "t3"],
                    ["b", "4", "t4"],
                ];
                var featureColumns = ["f1", "f2"];
                var tipMetadata = {
                    "1": ["2", "2"],
                    "2": ["1", "2"],
                    "3": ["1", "2"],
                    EmpressNode6: ["2", "2"],
                };
                var intMetadata = {
                    internal: ["1", "1"],
                };
                var biom = new BiomTable(
                    sIDs,
                    fIDs,
                    sID2Idx,
                    fID2Idx,
                    tbl,
                    smCols,
                    sm
                );
                var canvas = document.createElement("canvas");
                this.empress = new Empress(
                    tree,
                    treeData,
                    nameToKeys,
                    layoutToCoordSuffix,
                    "Unrooted",
                    biom,
                    featureColumns,
                    tipMetadata,
                    intMetadata,
                    canvas
                );
                this.empress._drawer.initialize();
            },

            teardown: function () {
                this.empress = null;
            },
        });

        test("Test getX/getY", function () {
            // The tree coordinates were defined in such way that, starting at
            // node 1, rectangular layout, and coord=1, a node's coords should
            // be (coord++, coord++)
            var coord = 1;
            var node;
            this.empress._currentLayout = "Rectangular";
            for (var i = 1; i <= 7; i++) {
                node = this.empress._treeData[i];
                equal(this.empress.getX(node), coord++);
                equal(this.empress.getY(node), coord++);
            }

            this.empress._currentLayout = "Circular";
            for (i = 1; i <= 7; i++) {
                node = this.empress._treeData[i];
                equal(this.empress.getX(node), coord++);
                equal(this.empress.getY(node), coord++);
            }

            this.empress._currentLayout = "Unrooted";
            for (i = 1; i <= 7; i++) {
                node = this.empress._treeData[i];
                equal(this.empress.getX(node), coord++);
                equal(this.empress.getY(node), coord++);
            }
        });

        test("Test computeNecessaryCoordsSize", function () {
            // add drawer information to empress
            // the only drawer info needed for computeNecessaryCoordsSize is
            // the size of each vertex which is 5 ([x, y, r, g, b])
            this.empress._drawer = {};
            this.empress._drawer.VERTEX_SIZE = 5;

            // Note: tree has 1 root, 4 tips, and 2 non-root internal nodes

            // rectangual layout needs one line for root, 4 lines for tips,
            // and 4 lines for non-root internal nodes (2 lines per non-root
            // internal node). Then each line is defined by 2 verticies and each
            // vertex has a size of 5
            var recLines = (1 + 4 + 2 * 2) * 2 * 5;
            this.empress._currentLayout = "Rectangular";
            equal(this.empress.computeNecessaryCoordsSize(), recLines);

            // circular layout needs 0 lines for root, 4 lines for tips, and
            // 32 lines for non-root internal nodes (16 lines per non-root
            // internal nodes). Then each line is defined by 2 verticies and each
            // vertex has a size of 5
            var circLines = (0 + 4 + 2 * 16) * 2 * 5;
            this.empress._currentLayout = "Circular";
            equal(this.empress.computeNecessaryCoordsSize(), circLines);

            //unrooted layout needs 0 lines for root, 4 lines for tips, and
            // 2 lines for non-root internal nodes. Then each lines is defined
            // by 2 verticies and each vertex has a size of 5.
            var unrootLines = (0 + 4 + 2) * 2 * 5;
            this.empress._currentLayout = "Unrooted";
            equal(this.empress.computeNecessaryCoordsSize(), unrootLines);
        });

        test("Test getNodeCoords", function () {
            // Note: node 6's name is EmpressNode6 which means it will not be
            // included in the getNodeCoords()
            // prettier-ignore
            var rectCoords = new Float32Array([
                1, 2, 0.75, 0.75, 0.75,
                3, 4, 0.75, 0.75, 0.75,
                5, 6, 0.75, 0.75, 0.75,
                7, 8, 0.75, 0.75, 0.75,
                9, 10, 0.75, 0.75, 0.75,
                13, 14, 0.75, 0.75, 0.75,
            ]);
            this.empress._currentLayout = "Rectangular";
            var empressRecCoords = this.empress.getNodeCoords();
            deepEqual(empressRecCoords, rectCoords);

            // prettier-ignore
            var circCoords = new Float32Array([
                15, 16, 0.75, 0.75, 0.75,
                17, 18, 0.75, 0.75, 0.75,
                19, 20, 0.75, 0.75, 0.75,
                21, 22, 0.75, 0.75, 0.75,
                23, 24, 0.75, 0.75, 0.75,
                27, 28, 0.75, 0.75, 0.75,
            ]);
            this.empress._currentLayout = "Circular";
            var empressCirCoords = this.empress.getNodeCoords();
            deepEqual(empressCirCoords, circCoords);

            // prettier-ignore
            var unrootCoords = new Float32Array([
                29, 30, 0.75, 0.75, 0.75,
                31, 32, 0.75, 0.75, 0.75,
                33, 34, 0.75, 0.75, 0.75,
                35, 36, 0.75, 0.75, 0.75,
                37, 38, 0.75, 0.75, 0.75,
                41, 42, 0.75, 0.75, 0.75,
            ]);
            this.empress._currentLayout = "Unrooted";
            var empressUnrootCoords = this.empress.getNodeCoords();
            deepEqual(empressUnrootCoords, unrootCoords);
        });

        test("Test colorSampleGroups, single group", function () {
            // Note: the group names for colorSampleGroup must be a color
            // hex string
            var sampleGroup = {
                FF0000: ["s1", "s2", "s7"],
            };
            this.empress.colorSampleGroups(sampleGroup);

            // the entire tree should be colored. sampleGroup contain all tips
            for (var i = 1; i <= 7; i++) {
                var node = this.empress._treeData[i];
                deepEqual(node.color, [1.0, 0, 0]);
            }
        });

        test("Test colorSampleGroups, mult group", function () {
            // Note: the group names for colorSampleGroup must be a color
            // hex string
            var sampleGroups = {
                FF0000: ["s4", "s7"],
                "00FF00": ["s1", "s2"],
            };

            // red nodes are the unique nodes in FFOOOO
            var redNodes = new Set([6]);
            // green nodes are the unique nodes in 00FF00
            var greeNodes = new Set([1, 3]);
            this.empress.colorSampleGroups(sampleGroups);
            for (var i = 1; i <= 7; i++) {
                var node = this.empress._treeData[i];
                if (redNodes.has(i)) {
                    deepEqual(node.color, [1.0, 0, 0]);
                } else if (greeNodes.has(i)) {
                    deepEqual(node.color, [0, 1.0, 0]);
                } else {
                    deepEqual(node.color, [0.75, 0.75, 0.75]);
                }
            }
        });

        test("Test _namesToKeys", function () {
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
                "root",
            ]);
            result = util.naturalSort(Array.from(result));
            deepEqual(result, allNodes);
        });

        test("Test colorBySampleCat", function () {
            var cm = this.empress.colorBySampleCat(
                "f1",
                "discrete-coloring-qiime"
            );

            // Group 'a' is the only group that contains unique features. Thus,
            // group b should be removed by _projectObservations
            var groups = ["a"];
            var resultGroups = util.naturalSort(Object.keys(cm));
            deepEqual(resultGroups, groups);

            // make sure nodes where assigned the correct color
            // note that gropu b does not have any unique nodes
            var aGroupNodes = new Set([1, 3]);
            for (var i = 1; i <= 7; i++) {
                var node = this.empress._treeData[i];
                if (aGroupNodes.has(i)) {
                    deepEqual(node.color, chroma(cm.a).gl().slice(0, 3));
                } else {
                    deepEqual(node.color, [0.75, 0.75, 0.75]);
                }
            }
        });

        test("Test colorByFeatureMetadata, tip only", function () {
            // make usre error is thrown when invalid color method is used
            throws(function () {
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
            var node;
            var group1 = new Set([2, 3, 4]);
            var group2 = new Set([1, 6]);
            for (var i = 1; i <= 7; i++) {
                node = this.empress._treeData[i];
                if (group1.has(i)) {
                    deepEqual(node.color, chroma(cm["1"]).gl().slice(0, 3));
                } else if (group2.has(i)) {
                    deepEqual(node.color, chroma(cm["2"]).gl().slice(0, 3));
                } else {
                    deepEqual(node.color, [0.75, 0.75, 0.75]);
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
                    deepEqual(node.color, chroma(cm["1"]).gl().slice(0, 3));
                } else if (group2.has(i)) {
                    deepEqual(node.color, chroma(cm["2"]).gl().slice(0, 3));
                } else {
                    deepEqual(node.color, [0.75, 0.75, 0.75]);
                }
            }
        });

        test("Test _projectObservations, all tips in obs", function () {
            var obs = {
                g1: new Set([2, 3]),
                g2: new Set([1]),
                g3: new Set([6]),
            };
            var expectedResult = {
                g1: new Set([2, 3, 4]),
                g2: new Set([1]),
                g3: new Set([6]),
            };
            var result = this.empress._projectObservations(obs, false);

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

        test("Test _projectObservations, missing tips in obs", function () {
            var obs = {
                g1: new Set([2, 3]),
                g2: new Set([]),
                g3: new Set([6]),
            };
            var expectedResult = {
                g1: new Set([2, 3, 4]),
                g3: new Set([6]),
            };
            var result = this.empress._projectObservations(obs, false);

            var groups = ["g1", "g3"];
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                var expectedArray = Array.from(expectedResult[group]);
                var resultArray = util.naturalSort(Array.from(result[group]));
                deepEqual(resultArray, expectedArray);
            }

            var columns = Object.keys(result);
            deepEqual(columns, groups);
        });

        test("Test _projectObservations, all tips are unique to group", function () {
            var obs = {
                g1: new Set([1, 2, 3, 6]),
                g2: new Set([]),
            };
            var expectedResult = {
                g1: new Set([1, 2, 3, 4, 5, 6, 7]),
            };
            var result = this.empress._projectObservations(obs, false);

            var groups = ["g1"];
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                var expectedArray = Array.from(expectedResult[group]);
                var resultArray = util.naturalSort(Array.from(result[group]));
                deepEqual(resultArray, expectedArray);
            }

            var columns = Object.keys(result);
            deepEqual(columns, groups);
        });

        test("Test _projectObservations ingore absent tips", function () {
            var obs = {
                g1: new Set([2]),
                g2: new Set([6]),
            };
            var expectedResult = {
                g1: new Set([2, 4, 5]),
                g2: new Set([6]),
            };
            var result = this.empress._projectObservations(obs, true);

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

        test("Test _projectObservations nothing is absent", function () {
            var obs = {
                g1: new Set([1, 2, 3]),
            };
            var expectedResult = {
                g1: new Set([1, 2, 3, 4, 5, 7]),
            };
            var result = this.empress._projectObservations(obs, true);

            var groups = ["g1"];
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                var expectedArray = Array.from(expectedResult[group]);
                var resultArray = util.naturalSort(Array.from(result[group]));
                deepEqual(resultArray, expectedArray);
            }

            var columns = Object.keys(result);
            deepEqual(columns, groups);
        });

        test("Test _projectObservations, no tips are present in any group", function () {
            var obs = {
                g1: new Set([]),
                g2: new Set([]),
            };
            var result = this.empress._projectObservations(obs, false);
            var expectedResult = [];
            var columns = Object.keys(result);
            deepEqual(columns, expectedResult);
        });

        test("Test _colorTree", function () {
            var g1Nodes = new Set([1, 2, 3]);
            var g2Nodes = new Set([4, 5, 6]);
            var g3Nodes = new Set([7]);
            var obs = {
                g1: g1Nodes,
                g2: g2Nodes,
                g3: g3Nodes,
            };
            var cm = {
                g1: [1, 0, 0],
                g2: [0, 1, 0],
                g3: [0, 0, 1],
            };
            this.empress._colorTree(obs, cm);
            for (var i = 1; i <= 7; i++) {
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

        test("Test resetTree", function () {
            var e = this.empress; // used to shorten function calls
            var keys = Object.keys(e._treeData);
            e.resetTree();
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                deepEqual(e._treeData[key].color, e.DEFAULT_COLOR);
                equal(e._treeData[key].isColored, false);
                equal(e._treeData[key].visible, true);
            }
            deepEqual(e._group, new Array(e._tree.size + 1).fill(-1));
        });

        test("Test getSampleCategories", function () {
            var categories = ["f1", "grad", "traj"];
            var result = this.empress.getSampleCategories();
            result = util.naturalSort(result);
            deepEqual(result, categories);
        });

        test("Test getAvailableLayouts", function () {
            var layouts = ["Circular", "Rectangular", "Unrooted"];
            var result = this.empress.getAvailableLayouts();
            result = util.naturalSort(result);
            deepEqual(result, layouts);
        });

        test("Test updateLayout", function () {
            // check if layout updates with valid layout
            this.empress.updateLayout("Circular");
            deepEqual(this.empress._currentLayout, "Circular");

            // check to make sure an error is thrown with invalid layout
            throws(function () {
                this.empress.updateLayout("bad_layout");
            });
        });

        test("Test getDefaultLayout", function () {
            deepEqual(this.empress.getDefaultLayout(), "Unrooted");
        });

        test("Test getUniqueSampleValues", function () {
            var f1Values = ["a", "b"];
            var result = util.naturalSort(
                this.empress.getUniqueSampleValues("f1")
            );
            deepEqual(result, f1Values);

            var gradValues = ["1", "2", "3", "4"];
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

        test("Test getGradientStep", function () {
            var expectedObs = {
                t1: ["1", "2", "3"],
                t2: ["EmpressNode6", "1", "3"],
            };
            var obs = this.empress.getGradientStep("grad", "1", "traj");
            var groups = Object.keys(obs);
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                obs[group] = util.naturalSort(obs[group]);
            }
            deepEqual(obs, expectedObs);
        });

        test("Test getFeatureMetadataCategories", function () {
            var columns = this.empress.getFeatureMetadataCategories();
            deepEqual(columns, ["f1", "f2"]);
        });

        test("Test centerLayoutAvgPoint", function () {
            // cache average point for all layouts
            this.empress._currentLayout = "Rectangular";
            this.empress.centerLayoutAvgPoint();
            this.empress._currentLayout = "Circular";
            this.empress.centerLayoutAvgPoint();
            this.empress._currentLayout = "Unrooted";
            this.empress.centerLayoutAvgPoint();

            // x coord for rectangular layout
            ok(
                Math.abs(this.empress.layoutAvgPoint.Rectangular[0] - 7) <=
                    1.0e-15
            );
            // y coor for rectangular layout
            ok(
                Math.abs(this.empress.layoutAvgPoint.Rectangular[1] - 8) <=
                    1.0e-15
            );

            // x coord for circular layout
            ok(
                Math.abs(this.empress.layoutAvgPoint.Circular[0] - 21) <=
                    1.0e-15
            );
            // y coor for circular layout
            ok(
                Math.abs(this.empress.layoutAvgPoint.Circular[1] - 22) <=
                    1.0e-15
            );

            // x coord for Unrooted layout
            ok(
                Math.abs(this.empress.layoutAvgPoint.Unrooted[0] - 35) <=
                    1.0e-15
            );
            // y coor for Unrooted layout
            ok(
                Math.abs(this.empress.layoutAvgPoint.Unrooted[1] - 36) <=
                    1.0e-15
            );
        });

        test("Test assignGroups", function () {
            // ((1,(2,3)4)5,6)7;
            var obs = {
                g1: new Set([1, 2, 3]),
                g2: new Set([5, 6]),
            };
            var exp = new Array(this.empress._tree.size + 1).fill(-1);

            // grab keys in order to match the same group assignment since
            // object keys do not guarentee an order
            var keys = Object.keys(obs);
            var groupNum = 0;
            for (var i in keys) {
                var nodes = [...obs[keys[i]]];
                for (var j in nodes) {
                    exp[nodes[j]] = groupNum;
                }
                groupNum++;
            }
            this.empress.assignGroups(obs);
            deepEqual(this.empress._group, exp);
        });

        test("Test collapseClades", function () {
            // red should be the only collapsible clade
            var obs = {
                red: new Set([2, 3, 4]),
                blue: new Set([1, 5, 6, 7]),
            };
            this.empress.assignGroups(obs);
            this.empress.collapseClades();

            // make sure .visible property of nodes in the collapsed is false
            var collapsed = new Set([2, 3]);
            var i;
            for (i = 1; i <= this.empress._tree.size; i++) {
                if (collapsed.has(i)) {
                    deepEqual(
                        this.empress._treeData[i].visible,
                        false,
                        "Test: node " + i + " should be invisible"
                    );
                } else {
                    deepEqual(
                        this.empress._treeData[i].visible,
                        true,
                        "Test: node " + i + " should be visible"
                    );
                }
            }

            // make sure the correct the correct collapsed clade buffer has the
            // correct shape.
            var collapseClades = [
                35,
                36,
                0.75,
                0.75,
                0.75,
                33,
                34,
                0.75,
                0.75,
                0.75,
                31,
                32,
                0.75,
                0.75,
                0.75,
                35,
                36,
                0.75,
                0.75,
                0.75,
                33,
                34,
                0.75,
                0.75,
                0.75,
                33,
                34,
                0.75,
                0.75,
                0.75,
            ];
            deepEqual(this.empress._collapsedCladeBuffer, collapseClades);

            // nothing should be collapsed.
            this.empress.resetTree();
            obs = {
                red: new Set([1, 2, 3]),
                blue: new Set([]),
            };
            cm = {
                red: [1, 0, 0],
                blue: [0, 0, 1],
            };
            this.empress._colorTree(obs, cm);
            this.empress.collapseClades();
            for (i = 1; i <= this.empress._tree.size; i++) {
                deepEqual(
                    this.empress._treeData[i].visible,
                    true,
                    "Test: node belongs to collapsed clade => invisible"
                );
            }

            // make sure nothing is in the buffer
            ok(this.empress._collapsedCladeBuffer.length == 0);
        });

        test("Test createCollapsedCladeShape", function () {
            // clade info: (Note: nodes are listed as postorder position)
            this.empress._collapsedClades[1] = {
                left: 2,
                right: 3,
                deepest: 4,
                color: [1, 1, 1],
            };

            // manual set coorindate of nodes to make testing easier
            this.empress._treeData[1] = {
                xr: 1,
                yr: 0,
                xc1: 0,
                yc1: 1,
                x2: 0,
                y2: 1,
                angle: 0,
            };
            this.empress._treeData[2] = {
                xr: 1,
                yr: -1,
                xc1: 1,
                yc1: 1,
                x2: 1,
                y2: 1,
                angle: Math.PI / 4,
            };
            this.empress._treeData[3] = {
                xr: 1,
                yr: 1,
                xc1: -1,
                yc1: -1,
                x2: -1,
                y2: -1,
                angle: (3 * Math.PI) / 4,
            };
            this.empress._treeData[4] = {
                xr: 5,
                yr: 0,
                xc1: 0,
                yc1: 5,
                x2: 0,
                y2: 5,
                angle: 0,
            };

            // check unrooted layout shape
            this.empress.createCollapsedCladeShape(1);
            var exp = [
                0,
                1,
                1,
                1,
                1,
                0,
                5,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                1,
                0,
                1,
                1,
                1,
                1,
                0,
                5,
                1,
                1,
                1,
                -1,
                -1,
                1,
                1,
                1,
            ];
            deepEqual(this.empress._collapsedCladeBuffer, exp);

            // check rectangular
            this.empress._collapsedCladeBuffer = [];
            this.empress._currentLayout = "Rectangular";
            this.empress.createCollapsedCladeShape(1);
            exp = [1, 0, 1, 1, 1, 5, -1, 1, 1, 1, 5, 1, 1, 1, 1];
            deepEqual(this.empress._collapsedCladeBuffer, exp);

            // check circular
            this.empress._collapsedCladeBuffer = [];
            this.empress._currentLayout = "Circular";
            exp = [];
            this.empress.createCollapsedCladeShape(1);
            var dangle = 0;
            var langle = Math.PI / 4;
            var rangle = (3 * Math.PI) / 4;
            var totalAngle, cos, sin, sX, sY;

            // This block finds (sX, sY) start point and total angle of the
            // sector
            x = 0;
            y = 5;
            totalAngle = rangle - langle;
            cos = Math.cos(langle - dangle);
            sin = Math.sin(langle - dangle);
            sX = x * cos - y * sin;
            sY = x * Math.sin(langle - dangle) + y * Math.cos(langle - dangle);

            // create 15 triangles to approximate sector
            var deltaAngle = totalAngle / 15;
            cos = Math.cos(deltaAngle);
            sin = Math.sin(deltaAngle);
            for (var line = 0; line < 15; line++) {
                // root of clade
                exp.push(...[0, 1, 1, 1, 1]);

                x = sX * cos - sY * sin;
                y = sX * sin + sY * cos;
                exp.push(...[x, y, 1, 1, 1]);

                cos = Math.cos((line + 1) * deltaAngle);
                sin = Math.sin((line + 1) * deltaAngle);
                x = sX * cos - sY * sin;
                y = sX * sin + sY * cos;
                exp.push(...[x, y, 1, 1, 1]);
            }
            deepEqual(this.empress._collapsedCladeBuffer, exp);
        });

        test("Test _collapseClade", function () {
            this.empress._collapseClade(4);
            var exp = {
                left: 2,
                right: 3,
                deepest: 3,
                length: 3,
                color: [0.75, 0.75, 0.75],
            };
            deepEqual(this.empress._collapsedClades[4], exp);

            this.empress._currentLayout = "Rectangular";
            this.empress._collapseClade(4);
            deepEqual(this.empress._collapsedClades[4], exp);

            this.empress._currentLayout = "Circular";
            this.empress._collapseClade(4);
            exp = {
                color: [0.75, 0.75, 0.75],
                deepest: 3,
                left: 2,
                length: 3,
                right: 3,
                sX: 26.262579448001144,
                sY: 8.442566004327599,
                totalAngle: 0.5,
            };
            deepEqual(this.empress._collapsedClades[4], exp);
        });

        test("Test getCladeNodes", function () {
            deepEqual(
                this.empress.getCladeNodes(5),
                [1, 2, 3, 4, 5],
                "valid node"
            );

            throws(function () {
                this.empress.getCladeNodes(-1);
            });
        });

        test("Test _isPointInClade", function () {
            // clade info: (Note: nodes are listed as postorder position)
            this.empress._collapsedClades[1] = {
                left: 2,
                right: 3,
                deepest: 4,
                color: [1, 1, 1],
            };

            // manual set coorindate of nodes to make testing easier
            this.empress._treeData[1] = {
                xr: 1,
                yr: 0,
                xc1: 0,
                yc1: 1,
                x2: 0,
                y2: 1,
                angle: Math.PI / 2,
            };
            this.empress._treeData[2] = {
                xr: 1,
                yr: -1,
                xc1: 1,
                yc1: 1,
                x2: 1,
                y2: 1,
                angle: Math.PI / 4,
            };
            this.empress._treeData[3] = {
                xr: 1,
                yr: 1,
                xc1: -1,
                yc1: 1,
                x2: -1,
                y2: 1,
                angle: (3 * Math.PI) / 4,
            };
            this.empress._treeData[4] = {
                xr: 5,
                yr: 0,
                xc1: 0,
                yc1: 5,
                x2: 0,
                y2: 5,
                angle: Math.PI / 2,
            };

            // check unrooted layout shape
            ok(this.empress._isPointInClade(1, [0, 2]));
            ok(!this.empress._isPointInClade(1, [0, -2]));

            this.empress._currentLayout = "Rectangular";
            ok(this.empress._isPointInClade(1, [2, 0]));
            ok(!this.empress._isPointInClade(1, [-2, 0]));

            this.empress._currentLayout = "Circular";
            this.empress.createCollapsedCladeShape(1);
            ok(this.empress._isPointInClade(1, [0, 2]));
            ok(!this.empress._isPointInClade(1, [0, -2]));
        });

        test("Test getName", function () {
            deepEqual(this.empress.getName(7), "root", "Should be root");
            throws(function () {
                this.empress.getName(-1);
            });
        });

        test("Test computeTipSamplePresence", function () {
            var e = this.empress;
            var fields = e._biom._smCols;
            var ctData = e.computeTipSamplePresence("2", fields);

            var lf2presence = {
                f1: { a: 4, b: 1 },
                grad: { "1": 1, "2": 2, "3": 2, "4": 0 },
                traj: { t1: 2, t2: 1, t3: 2, t4: 0 },
            };
            deepEqual(ctData, lf2presence);
        });

        test("Test computeIntSamplePresence", function () {
            var e = this.empress;
            var fields = e._biom._smCols;
            var values = e.computeIntSamplePresence(4, fields);

            var int4presence = {
                f1: { a: 5, b: 1 },
                grad: { "1": 2, "2": 2, "3": 2, "4": 0 },
                traj: { t1: 2, t2: 2, t3: 2, t4: 0 },
            };
            deepEqual(values.fieldsMap, int4presence);

            //also testing root which should have all tips -> all samples
            var rootPresence = {
                f1: { a: 5, b: 2 },
                grad: { "1": 2, "2": 2, "3": 2, "4": 1 },
                traj: { t1: 2, t2: 2, t3: 2, t4: 1 },
            };
            var rootValues = e.computeIntSamplePresence(7, fields);
            deepEqual(rootValues.fieldsMap, rootPresence);
        });
    });
});
