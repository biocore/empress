require(["jquery", "UtilitiesForTesting", "util", "chroma"], function (
    $,
    UtilitiesForTesting,
    util,
    chroma
) {
    $(document).ready(function () {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray
        // without affecting other tests.
        module("Empress", {
            setup: function () {
                this.empress = UtilitiesForTesting.getTestData(true).empress;
                this.empress._drawer.initialize();

                // Since layouts are now computed client-side which means
                // _treeData and _tdToInd are created on client-side. The test were
                // originally written when coordinates were calculated on python
                // side. Thus we need to set them back.
                this.empress._treeData = UtilitiesForTesting.getTestData(
                    false
                ).treeData;
                this.empress._tdToInd = UtilitiesForTesting.getTestData(
                    false
                ).tdToInd;
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
            for (node = 1; node <= 7; node++) {
                equal(this.empress.getX(node), coord++);
                equal(this.empress.getY(node), coord++);
            }

            this.empress._currentLayout = "Circular";
            for (node = 1; node <= 7; node++) {
                equal(this.empress.getX(node), coord++);
                equal(this.empress.getY(node), coord++);
            }

            this.empress._currentLayout = "Unrooted";
            for (node = 1; node <= 7; node++) {
                equal(this.empress.getX(node), coord++);
                equal(this.empress.getY(node), coord++);
            }
        });

        test("Test getNodeCoords", function () {
            // Note: node 6's name is null which means it will not be
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
            for (var node = 1; node <= 7; node++) {
                deepEqual(this.empress.getNodeInfo(node, "color"), [1.0, 0, 0]);
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
            for (var node = 1; node <= 7; node++) {
                if (redNodes.has(node)) {
                    deepEqual(this.empress.getNodeInfo(node, "color"), [
                        1.0,
                        0,
                        0,
                    ]);
                } else if (greeNodes.has(node)) {
                    deepEqual(this.empress.getNodeInfo(node, "color"), [
                        0,
                        1.0,
                        0,
                    ]);
                } else {
                    deepEqual(this.empress.getNodeInfo(node, "color"), [
                        0.75,
                        0.75,
                        0.75,
                    ]);
                }
            }
        });

        test("Test colorBySampleCat", function () {
            var cm = this.empress.colorBySampleCat(
                "f1",
                "discrete-coloring-qiime"
            );

            // Although Group "b" doesn't contain any unique features, we now
            // include all groups (regardless of whether or not they contain
            // unique features) in the color map and legend. Therefore, we
            // should see both "a" and "b" in the output of colorBySampleCat().
            // (_projectObservations() will still remove group "b", but this
            // shouldn't actually impact the display -- it'll just reduce the
            // size of its output slightly.)
            var groups = ["a", "b"];
            var resultGroups = util.naturalSort(Object.keys(cm));
            deepEqual(resultGroups, groups);

            // make sure nodes where assigned the correct color
            // note that gropu b does not have any unique nodes
            var aGroupNodes = new Set([1, 3]);
            for (var node = 1; node <= 7; node++) {
                if (aGroupNodes.has(node)) {
                    deepEqual(
                        this.empress.getNodeInfo(node, "color"),
                        chroma(cm.a).gl().slice(0, 3)
                    );
                } else {
                    deepEqual(this.empress.getNodeInfo(node, "color"), [
                        0.75,
                        0.75,
                        0.75,
                    ]);
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
            for (node = 1; node <= 7; node++) {
                if (group1.has(node)) {
                    deepEqual(
                        this.empress.getNodeInfo(node, "color"),
                        chroma(cm["1"]).gl().slice(0, 3),
                        "node: " + node
                    );
                } else if (group2.has(node)) {
                    deepEqual(
                        this.empress.getNodeInfo(node, "color"),
                        chroma(cm["2"]).gl().slice(0, 3),
                        "node: " + node
                    );
                } else {
                    deepEqual(this.empress.getNodeInfo(node, "color"), [
                        0.75,
                        0.75,
                        0.75,
                    ]);
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
            for (node = 1; node <= 7; node++) {
                if (group1.has(node)) {
                    deepEqual(
                        this.empress.getNodeInfo(node, "color"),
                        chroma(cm["1"]).gl().slice(0, 3),
                        "node: " + node
                    );
                } else if (group2.has(node)) {
                    deepEqual(
                        this.empress.getNodeInfo(node, "color"),
                        chroma(cm["2"]).gl().slice(0, 3),
                        "node: " + node
                    );
                } else {
                    deepEqual(this.empress.getNodeInfo(node, "color"), [
                        0.75,
                        0.75,
                        0.75,
                    ]);
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
            for (var node = 1; node <= 7; node++) {
                if (g1Nodes.has(node)) {
                    deepEqual(this.empress.getNodeInfo(node, "color"), [
                        1,
                        0,
                        0,
                    ]);
                } else if (g2Nodes.has(node)) {
                    deepEqual(this.empress.getNodeInfo(node, "color"), [
                        0,
                        1,
                        0,
                    ]);
                } else {
                    deepEqual(this.empress.getNodeInfo(node, "color"), [
                        0,
                        0,
                        1,
                    ]);
                }
            }
        });

        test("Test resetTree", function () {
            var e = this.empress; // used to shorten function calls
            var keys = Object.keys(e._treeData);
            e.resetTree();
            for (var node = 1; node < keys.length; node++) {
                deepEqual(e.getNodeInfo(node, "color"), e.DEFAULT_COLOR);
                equal(e.getNodeInfo(node, "isColored"), false);
                equal(e.getNodeInfo(node, "visible"), true);
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
                t1: [1, 2, 3],
                t2: [1, 3, 6],
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
            var i, node;
            for (node = 1; node <= this.empress._tree.size; node++) {
                if (collapsed.has(node)) {
                    deepEqual(
                        this.empress.getNodeInfo(node, "visible"),
                        false,
                        "Test: node " + node + " should be invisible"
                    );
                } else {
                    deepEqual(
                        this.empress.getNodeInfo(node, "visible"),
                        true,
                        "Test: node " + node + " should be visible"
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
            for (node = 1; node <= this.empress._tree.size; node++) {
                deepEqual(
                    this.empress.getNodeInfo(node, "visible"),
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
            this.empress._treeData[1] = [
                [1, 1, 1],
                false,
                true,
                0,
                1,
                1,
                0,
                0,
                1,
                0,
                0,
                0,
            ];
            this.empress._treeData[2] = [
                [1, 1, 1],
                false,
                true,
                1,
                1,
                1,
                -1,
                1,
                1,
                0,
                0,
                Math.PI / 4,
            ];
            this.empress._treeData[3] = [
                [1, 1, 1],
                false,
                true,
                -1,
                -1,
                1,
                1,
                -1,
                -1,
                0,
                0,
                (3 * Math.PI) / 4,
            ];
            this.empress._treeData[4] = [
                [1, 1, 1],
                false,
                true,
                0,
                5,
                5,
                0,
                0,
                5,
                0,
                0,
                0,
            ];

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
            this.empress._treeData[1] = [
                [1, 1, 1],
                false,
                true,
                0,
                1,
                1,
                0,
                0,
                1,
                0,
                0,
                Math.PI / 2,
            ];
            this.empress._treeData[2] = [
                [1, 1, 1],
                false,
                true,
                1,
                1,
                1,
                -1,
                1,
                1,
                0,
                0,
                Math.PI / 4,
            ];
            this.empress._treeData[3] = [
                [1, 1, 1],
                false,
                true,
                -1,
                1,
                1,
                1,
                -1,
                1,
                0,
                0,
                (3 * Math.PI) / 4,
            ];
            this.empress._treeData[4] = [
                [1, 1, 1],
                false,
                true,
                0,
                5,
                5,
                0,
                0,
                5,
                0,
                0,
                Math.PI / 2,
            ];

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
                grad: { 1: 1, 2: 2, 3: 2, 4: 0 },
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
                grad: { 1: 2, 2: 2, 3: 2, 4: 0 },
                traj: { t1: 2, t2: 2, t3: 2, t4: 0 },
            };
            deepEqual(values.fieldsMap, int4presence);

            //also testing root which should have all tips -> all samples
            var rootPresence = {
                f1: { a: 5, b: 2 },
                grad: { 1: 2, 2: 2, 3: 2, 4: 1 },
                traj: { t1: 2, t2: 2, t3: 2, t4: 1 },
            };
            var rootValues = e.computeIntSamplePresence(7, fields);
            deepEqual(rootValues.fieldsMap, rootPresence);
        });

        test("Test getUniqueFeatureMetadataInfo (method = tip)", function () {
            var f1Info = this.empress.getUniqueFeatureMetadataInfo("f1", "tip");
            deepEqual(f1Info.sortedUniqueValues, ["1", "2"]);
            // Tips 2 and 3 have a f1 value of 1
            deepEqual(
                new Set(f1Info.uniqueValueToFeatures["1"]),
                new Set([2, 3])
            );
            // Tips 1 and null have a f1 value of 2
            deepEqual(
                new Set(f1Info.uniqueValueToFeatures["2"]),
                new Set([1, 6])
            );
        });
        test("Test getUniqueFeatureMetadataInfo (method = all)", function () {
            var f1UniqueValues = ["1", "2"];
            var f1Info = this.empress.getUniqueFeatureMetadataInfo("f1", "all");
            deepEqual(f1Info.sortedUniqueValues, ["1", "2"]);
            // Tips 2 and 3, and the internal node(s) named "internal",
            // have a f1 value of 1
            deepEqual(
                new Set(f1Info.uniqueValueToFeatures["1"]),
                new Set([4, 5, 2, 3])
            );
            // Tips 1 and null have a f1 value of 2
            deepEqual(
                new Set(f1Info.uniqueValueToFeatures["2"]),
                new Set([1, 6])
            );
        });
        test("Test getUniqueFeatureMetadataInfo (invalid fm column)", function () {
            var scope = this;
            throws(function () {
                scope.empress.getUniqueFeatureMetadataInfo("f3", "tip");
            }, /Feature metadata column "f3" not present in data./);
        });
        test("Test getUniqueFeatureMetadataInfo (invalid method)", function () {
            var scope = this;
            throws(function () {
                scope.empress.getUniqueFeatureMetadataInfo(
                    "f1",
                    "i'm invalid!"
                );
            }, /F. metadata coloring method "i'm invalid!" unrecognized./);
        });
        test("Test _getNodeAngleInfo", function () {
            var scope = this;
            this.empress.updateLayout("Circular");
            var node = 1;
            // the halfAngleRange is 2pi / 4 (since there are 4 leaves in this
            // test tree), or equivalently pi / 2.
            var piover2 = Math.PI / 2;
            var angleInfo = this.empress._getNodeAngleInfo(node, piover2);
            equal(angleInfo.angle, 0);
            equal(angleInfo.lowerAngle.toFixed(5), -piover2.toFixed(5));
            equal(angleInfo.upperAngle.toFixed(5), piover2.toFixed(5));
            equal(angleInfo.angleCos, 1);
            equal(angleInfo.angleSin, 0);
            equal(angleInfo.lowerAngleCos.toFixed(5), 0);
            equal(angleInfo.lowerAngleSin.toFixed(5), -1);
            equal(angleInfo.upperAngleCos.toFixed(5), 0);
            equal(angleInfo.upperAngleSin.toFixed(5), 1);
            // Test that this throws an error if the tree is not in the
            // circular layout
            this.empress.updateLayout("Rectangular");
            // (Gotta escape the parens in the regex or else it breaks)
            throws(function () {
                scope.empress._getNodeAngleInfo(node, Math.PI / 2);
            }, /_getNodeAngleInfo\(\) called when not in circular layout/);
        });
        test("Test _addCircularBarCoords", function () {
            /**
             * Utility function for checking that an x or y value is what it
             * should be. See the comments later on in this test (before
             * iterating through coords) for details on how coordinates are
             * added in _addCircularBarCoords().
             *
             * The use of 200 and 100 (for the outer and inner radius,
             * respectively) and of 0 for the node angle, pi / 2 for the
             * half-angle range, etc. means that this function is hardcoded
             * for the test example demonstrated here. However, this could be
             * generalized to test _addCircularBarCoords() in more detail if
             * desired.
             *
             * @param {Number} fiveTupleIdx A 0-based number indicating which
             *                              [x, y, r, g, b] chunk in a coords
             *                              array the input value is from.
             * @param {Number} v A value in a coords array located at either
             *                   the x or y position in one of those 5-tuples.
             * @param {Boolean} isX truthy if this is supposed to be an
             *                      x-coordinate value, falsy if this is
             *                      supposed to be a y-coordinate value. The
             *                      only difference this makes here is whether
             *                      Polar -> Cartesian conversions are done
             *                      with r*cos(theta) or r*sin(theta) (the
             *                      former is for x, the latter is for y).
             *
             */
            var checkCoordVal = function (fiveTupleIdx, v, isX) {
                var trigFunc = isX ? Math.cos : Math.sin;
                var piover2 = Math.PI / 2;
                switch (fiveTupleIdx) {
                    case 0:
                    case 3:
                        // tL on the lower rectangle
                        UtilitiesForTesting.approxDeepEqual(
                            v,
                            200 * trigFunc(-piover2)
                        );
                        break;
                    case 1:
                    case 7:
                        // bL
                        UtilitiesForTesting.approxDeepEqual(
                            v,
                            200 * trigFunc(0)
                        );
                        break;
                    case 2:
                    case 5:
                    case 8:
                    case 11:
                        // bR
                        UtilitiesForTesting.approxDeepEqual(
                            v,
                            100 * trigFunc(0)
                        );
                        break;
                    case 4:
                        // tR on the lower rectangle
                        UtilitiesForTesting.approxDeepEqual(
                            v,
                            100 * trigFunc(-piover2)
                        );
                        break;
                    case 6:
                    case 9:
                        // tL on the upper rectangle
                        UtilitiesForTesting.approxDeepEqual(
                            v,
                            200 * trigFunc(piover2)
                        );
                        break;
                    case 10:
                        // tR on the upper rectangle
                        UtilitiesForTesting.approxDeepEqual(
                            v,
                            100 * trigFunc(piover2)
                        );
                        break;
                    default:
                        throw new Error(
                            "This should never happen: index " +
                                i +
                                " has a floor(i / 5) value of " +
                                floor
                        );
                }
            };
            var coords = ["preexisting thing in the array"];
            this.empress.updateLayout("Circular");
            var node = 1;
            var angleInfo = this.empress._getNodeAngleInfo(node, Math.PI / 2);
            // The [0.25, 0.5, 0.75] is the GL color we use. (Mostly chosen
            // here so that each R/G/B value is distinct; apparently this is a
            // weird shade of blue when you draw it.)
            this.empress._addCircularBarCoords(coords, 100, 200, angleInfo, [
                0.25,
                0.5,
                0.75,
            ]);
            // Each call of _addTriangleCoords() draws a rectangle with two
            // triangles. This involves adding 6 positions to coords, and since
            // positions take up 5 spaces in an array here (x, y, r, g, b),
            // and since _addCircularBarCoords() creates two rectangles (four
            // triangles), coords should contain 6*5 = 30 * 2 = 60 + 1 = 61
            // elements. (The + 1 is for the preexisting thing in the array --
            // it's in this test just to check that the input coords array
            // is appended to, not overwritten.)
            equal(coords.length, 61);

            // Check the actual coordinate values.
            // For reference, _addTriangleCoords() works by (given four
            // "corners", tL / tR / bL / bR) adding coordinate info for two
            // triangles:
            //
            //    tL--tR
            //    | \  |
            //    |  \ |
            //    bL--bR
            //
            // The position information for these two triangles are added to
            // coords in the following order. (This results in 6*5 = 30 values
            // being added to coords, since each of these positions has its
            // own x, y, r, g, b.)
            //
            // 1. tL -> bL -> bR
            // 2. tL -> tR -> bR
            //
            // And there are two rectangles (or quadrilaterals?) being drawn
            // in this function: one with tL and tR being on the lower angle,
            // and one with tL and tL and tR being on the upper angle.
            //
            //    0     1     2
            // 1. tL -> bL -> bR (t = lower angle)
            //    3     4     5
            // 2. tL -> tR -> bR (t = lower angle)
            //    6     7     8
            // 3. tL -> bL -> bR (t = upper angle)
            //    9     10    11
            // 4. tL -> tR -> bR (t = upper angle)
            //
            // Note that bL and bR remain consistent throughout all of the
            // triangles drawn: these are always at the same angle as the node
            // this bar is being drawn for.
            //
            // We consider "left" positions as those using the outer radius,
            // and "right" positions as those using the inner radius.
            // (Of course when you look at an opposite side of the circle left
            // and right'll be switched around. We just stick to this notation
            // here to make describing and testing this less difficult.)
            _.each(coords, function (v, i) {
                if (i === 0) {
                    equal(v, "preexisting thing in the array");
                } else {
                    // Which group of 5 elements (x, y, r, g, b) does this
                    // value fall in? We can figure this out by taking the
                    // floor of i / 5. The 0th 5-tuple is tL in the lower
                    // rectangle (covering [1, 5]), the 1th 5-tuple is bL in
                    // the lower rectangle (covering [6, 10]), etc.
                    // (This isn't necessary to compute for R / G / B values
                    // since those are going to be the same at every point, but
                    // this is needed for figuring out what the expected value
                    // should be for an x or y value. checkCoordVal() does the
                    // hard work in figuring that out.)
                    var floor = Math.floor(i / 5);
                    switch (i % 5) {
                        case 1:
                            // x coordinate
                            checkCoordVal(floor, v, true);
                            break;
                        case 2:
                            // y coordinate
                            checkCoordVal(floor, v, false);
                            break;
                        case 3:
                            // Red (constant)
                            equal(v, 0.25);
                            break;
                        case 4:
                            // Green (constant)
                            equal(v, 0.5);
                            break;
                        case 0:
                            // Blue (constant)
                            // Note that although coords[0] is divisible by 5,
                            // it shouldn't be 0.75 since it's filled in with a
                            // preexisting value.
                            equal(v, 0.75);
                            break;
                        default:
                            throw new Error(
                                "If this is encountered, something went " +
                                    "very wrong."
                            );
                    }
                }
            });
        });
        test("Test _addRectangularBarCoords", function () {
            var coords = [];
            var lx = 0;
            var rx = 1;
            var by = 2;
            var ty = 3;
            var color = [0.3, 0.8, 0.9];
            this.empress._addRectangularBarCoords(
                coords,
                lx,
                rx,
                by,
                ty,
                color
            );
            // Each point has 5 values (x, y, r, g, b) and there are 3
            // triangles (6 points) added, so the length of coords should now
            // be 6 * 5 = 30.
            equal(coords.length, 30);
            // We use a pared-down form of the iteration test used above in
            // testing _addCircularBarCoords(). This function is simpler (it
            // only calls _addTriangleCoords() once, so only one rectangle is
            // added), and there isn't a preexisting element in coords, so
            // checking things is much less involved.
            _.each(coords, function (v, i) {
                var floor = Math.floor(i / 5);
                switch (i % 5) {
                    case 0:
                        // x coordinate
                        // Same logic as in the circular bar coords test --
                        // which 5-tuplet of (x, y, r, g, b) is this
                        // x-coordinate present in? This will determine what it
                        // SHOULD be (i.e. if this 5-tuplet is supposed to be
                        // the "top left" of the rectangle being drawn, then
                        // its x-coordinate should be the left x-coordinate)
                        switch (floor) {
                            case 0:
                            case 1:
                            case 3:
                                // tL (0, 3) or bL (1)
                                equal(v, lx);
                                break;
                            default:
                                // bR (2, 5) or tR (4)
                                equal(v, rx);
                        }
                        break;
                    case 1:
                        // y coordinate
                        switch (floor) {
                            case 0:
                            case 3:
                            case 4:
                                // tL (0, 3) or tR (4)
                                equal(v, ty);
                                break;
                            default:
                                // bL (1) or bR (2, 5)
                                equal(v, by);
                        }
                        break;
                    case 2:
                        // Red (constant)
                        equal(v, 0.3);
                        break;
                    case 3:
                        // Green (constant)
                        equal(v, 0.8);
                        break;
                    case 4:
                        // Blue (constant)
                        equal(v, 0.9);
                        break;
                    default:
                        throw new Error(
                            "If this is encountered, something went " +
                                "very wrong."
                        );
                }
            });
        });
    });
});
