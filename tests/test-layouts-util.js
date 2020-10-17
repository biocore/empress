require([
    "jquery",
    "underscore",
    "ByteArray",
    "BPTree",
    "LayoutsUtil",
    "UtilitiesForTesting",
], function ($, _, ByteArray, BPTree, LayoutsUtil, UtilitiesForTesting) {
    $(document).ready(function () {
        module("Layout Utilities", {
            setup: function () {
                // Save a bunch of extra typing
                this.eq = UtilitiesForTesting.approxDeepEqualMulti;

                // In Newick format: "(((a:1,e:2)f:1,b:2)g:1,(c:1,d:3)h:2)i:1;"
                this.tree = new BPTree(
                    new Uint8Array([
                        1,
                        1,
                        1,
                        1,
                        0,
                        1,
                        0,
                        0,
                        1,
                        0,
                        0,
                        1,
                        1,
                        0,
                        1,
                        0,
                        0,
                        0,
                    ]),
                    ["", "a", "e", "f", "b", "g", "c", "d", "h", "i"],
                    [null, 1.0, 2.0, 1.0, 2.0, 1.0, 1.0, 3.0, 2.0, 1.0],
                    null
                );

                // In Newick format: "((b:2)a:1)root:100;"
                this.straightLineTree = new BPTree(
                    new Uint8Array([1, 1, 1, 0, 0, 0]),
                    ["", "b", "a", "root"],
                    ["", 2.0, 1.0, 100.0],
                    null
                );

                // In Newick format: "((b:2)a:1)root;"
                this.noRootLength = new BPTree(
                    new Uint8Array([1, 1, 1, 0, 0, 0]),
                    ["", "b", "a", "root"],
                    ["", 2.0, 1.0, null],
                    null
                );

                // In Newick format: "((d:4,c:3)b:2,a:1)root:1;"
                this.circLayoutTestTree = new BPTree(
                    new Uint8Array([1, 1, 1, 0, 1, 0, 0, 1, 0, 0]),
                    ["", "d", "c", "b", "a", "root"],
                    ["", 4.0, 3.0, 2.0, 1.0, 1.0],
                    null
                );

                // In Newick format: "(a:1, b:2)root:3;"
                this.twoTipTree = new BPTree(
                    new Uint8Array([1, 1, 0, 1, 0, 0]),
                    ["", "a", "b", "root"],
                    ["", 1, 2, 3],
                    null
                );
            },

            teardown: function () {
                this.bpArray = null;
                this.tree = null;
                this.straightLineTree = null;
                this.noRootLength = null;
            },
        });

        test("Test rectangular layout (none and descending leaf sorting)", function () {
            var obs = LayoutsUtil.rectangularLayout(
                this.tree,
                1,
                1,
                false,
                "none",
                false
            );
            /* Why do these coordinates look like this?
             *
             * There are a few steps to the layout.
             *
             * 1. Compute initial y-coordinates of layout: tips are assigned to
             *    y=0, y=1, y=2, ... up to y=|tips|, and internal nodes are
             *    positioned at the average of their childrens' y-positions.
             *
             * 2. Compute initial x-coordinates of layout: root starts at x=0,
             *    and each child C with parent P is assigned
             *    x = P.x + C.branch_length.
             *    (...those aren't real attribute names, this is pseudocode)
             *
             * 3. Coordinates are shifted so that the root node is at (0, 0).
             *    So every node's x-coordinate is subtracted by the root (i)'s
             *    x=0 (this does nothing), and every node's y-coordinate is
             *    subtracted by the root's y=2.375.
             */

            // The output arrays are in postorder.
            // (empty space), a, e, f, b, g, c, d, h, i (root)
            var exp = {
                highestChildYr: [
                    undefined,
                    undefined,
                    undefined,
                    -1.375,
                    undefined,
                    -0.375,
                    undefined,
                    undefined,
                    1.625,
                    1.125,
                ],
                lowestChildYr: [
                    undefined,
                    undefined,
                    undefined,
                    -2.375,
                    undefined,
                    -1.875,
                    undefined,
                    undefined,
                    0.625,
                    -1.125,
                ],
                xCoord: [0, 3, 4, 2, 3, 1, 3, 5, 2, 0],
                yCoord: [
                    0,
                    -2.375,
                    -1.375,
                    -1.875,
                    -0.375,
                    -1.125,
                    0.625,
                    1.625,
                    1.125,
                    0,
                ],
                yScalingFactor: 0.25,
            };
            deepEqual(obs, exp);

            // Coincidentally, the output is the same between none and
            // descending leaf sorting for this particular tree...
            obs2 = LayoutsUtil.rectangularLayout(
                this.tree,
                1,
                1,
                false,
                "descending",
                false
            );
            deepEqual(obs2, exp);
        });

        test("Test rectangular layout (ascending leaf sorting)", function () {
            var obs = LayoutsUtil.rectangularLayout(
                this.tree,
                1,
                1,
                false,
                "ascending",
                false
            );
            // Initial y-coords:
            // c, d, b, a, e
            // 0, 1, 2, 3, 4
            //
            // f = a+e / 2 = 3.5
            // g = f+b / 2 = 2.75
            // h = d+c / 2 = 0.5
            // i = h+g / 2 = 1.625
            //
            // Initial x-coords:
            // i, g, f, e, a, b, h, d, c
            // 0, 1, 2, 4, 3, 3, 2, 5, 3
            //
            // So all y-coords are subtracted by 1.625, and all x-coords are
            // subtracted by 0 (nothing happens).
            //
            // The output arrays are in postorder.
            // (empty space), a, e, f, b, g, c, d, h, i (root)
            var exp = {
                highestChildYr: [
                    undefined,
                    undefined,
                    undefined,
                    2.375,
                    undefined,
                    1.875,
                    undefined,
                    undefined,
                    -0.625,
                    1.125,
                ],
                lowestChildYr: [
                    undefined,
                    undefined,
                    undefined,
                    1.375,
                    undefined,
                    0.375,
                    undefined,
                    undefined,
                    -1.625,
                    -1.125,
                ],
                xCoord: [0, 3, 4, 2, 3, 1, 3, 5, 2, 0],
                yCoord: [
                    0,
                    1.375,
                    2.375,
                    1.875,
                    0.375,
                    1.125,
                    -1.625,
                    -0.625,
                    -1.125,
                    0.0,
                ],
                yScalingFactor: 0.25,
            };
            deepEqual(obs, exp);
        });

        test("Test straightline tree rectangular layout", function () {
            var obs = LayoutsUtil.rectangularLayout(
                this.straightLineTree,
                1,
                1,
                false,
                "none",
                false
            );

            var exp = {
                highestChildYr: [undefined, undefined, 0, 0],
                lowestChildYr: [undefined, undefined, 0, 0],
                xCoord: [0, 3, 1, 0],
                yCoord: [0, 0, 0, 0],
                yScalingFactor: 1,
            };
            deepEqual(obs, exp);
        });

        test("Test straightline tree rectangular layout: ignoreLengths", function () {
            var obs = LayoutsUtil.rectangularLayout(
                this.straightLineTree,
                1,
                1,
                true,
                "none",
                false
            );

            // The only difference in output is that the one tip node in the
            // tree (at postorder position 1) is at x = 2, not x = 3.
            var exp = {
                highestChildYr: [undefined, undefined, 0, 0],
                lowestChildYr: [undefined, undefined, 0, 0],
                xCoord: [0, 2, 1, 0],
                yCoord: [0, 0, 0, 0],
                yScalingFactor: 1,
            };
            deepEqual(obs, exp);
        });

        test("Test missing root length rectangular layout", function () {
            var obs = LayoutsUtil.rectangularLayout(
                this.noRootLength,
                1,
                1,
                false,
                "none",
                false
            );

            var exp = {
                highestChildYr: [undefined, undefined, 0, 0],
                lowestChildYr: [undefined, undefined, 0, 0],
                xCoord: [0, 3, 1, 0],
                yCoord: [0, 0, 0, 0],
                yScalingFactor: 1,
            };
            deepEqual(obs, exp);
        });

        test("Test circular layout", function () {
            var obs = LayoutsUtil.circularLayout(
                this.circLayoutTestTree,
                5,
                5,
                false,
                "none",
                false
            );
            // Check that there isn't extra junk included in obs' output
            // (so we'll know that the 9 keys within obs we check are the
            // *only* keys in obs)
            deepEqual(_.keys(obs).length, 9, "Amount of keys is correct");

            // Check starting positions. Recall that the first elements here
            // are meaningless (these arrays are 1-indexed), and that the
            // remaining (0, 0)s are from nodes a, b, and the root -- all of
            // which "originate" at (0, 0) because they're either immediate
            // descendants of the root node or the root node itself.
            //
            // Should be equal to (total radius to parent node)*cos(node angle)
            // e.g. tip "d"'s parent node is b, which has a total radius from
            // the root of 2. The angle d was assigned is 0, so d's x0 position
            // is 2*cos(0) = 2*1 = 2.
            this.eq(obs.x0, [0, 2, -1, 0, 0, 0], "x0");
            // Should be equal to (total radius to parent node)*sin(node angle)
            this.eq(obs.y0, [0, 0, 1.7321, 0, 0, 0], "y0", 1e-4);

            // Check ending positions.
            // Should be equal to (total radius to node)*cos(node angle).
            this.eq(obs.x1, [0, 6, -2.5, 1, -0.5, 0], "x1");
            // Should be equal to (total radius to node)*sin(node angle).
            this.eq(obs.y1, [0, 0, 4.3301, 1.7321, -0.866, 0], "y1", 1e-4);

            // Check angles. There are just 3 tips so they get assigned
            // multiples of (2pi / 3) (that is: 0, 2pi/3, and 4pi/3). The lone
            // non-root internal node is given an angle of the average of its
            // child angles (i.e. 0 and 2pi/3, so just pi/3). And finally, the
            // root gets an angle of 0 (but the root's angle isn't used for
            // anything anyway).
            this.eq(
                obs.angle,
                [0, 0, (2 * Math.PI) / 3, Math.PI / 3, (4 * Math.PI) / 3, 0],
                "angle"
            );

            // Check arc start points. Only b should have any arc information;
            // the remaining nodes are either tips or the root.
            // Should be equal to
            // (total radius to b = 2) * op(largest child angle of b = 2pi/3),
            // where "op" is cos() for x and sin() for y.
            this.eq(obs.arcx0, [0, 0, 0, -1, 0, 0], "arcx0");
            this.eq(obs.arcy0, [0, 0, 0, 1.7321, 0, 0], "arcy0", 1e-4);
            // Check arc start and end angles. We've defined the "start" angle
            // to be the largest angle of an internal node's children, and the
            // "end" angle to be the smallest angle of these children.
            // In the case of b, it just has two children (with angles 2pi/3
            // and 0), so determining this is pretty straightforward...
            this.eq(
                obs.arcStartAngle,
                [0, 0, 0, (2 * Math.PI) / 3, 0, 0],
                "arc start angle"
            );
            this.eq(obs.arcEndAngle, [0, 0, 0, 0, 0, 0], "arc end angle");
        });
        test("Test circular layout preserves branch lengths", function () {
            var obs = LayoutsUtil.circularLayout(
                this.circLayoutTestTree,
                1,
                1,
                false,
                "none",
                false
            );
            // We skip root since we don't care about its length.
            for (var postI = 1; postI < this.circLayoutTestTree.size; postI++) {
                var inputLength = this.circLayoutTestTree.lengths_[postI];
                var dx2 = Math.pow(obs.x0[postI] - obs.x1[postI], 2);
                var dy2 = Math.pow(obs.y0[postI] - obs.y1[postI], 2);
                var effectiveLength = Math.sqrt(dx2 + dy2);
                deepEqual(effectiveLength.toFixed(4), inputLength.toFixed(4));
            }
        });
        test("Test straightline tree circular layout (with and without root length)", function () {
            // These are the same tree, just with and without the root having a
            // length of 100. Since the circ. layout ignores the root's branch
            // length, the output data should be exactly the same.
            var trees = [this.straightLineTree, this.noRootLength];
            _.each(trees, function (tree) {
                var obs = LayoutsUtil.circularLayout(
                    tree,
                    1,
                    1,
                    false,
                    "none",
                    false
                );
                // The tree looks like:
                // root -- a ---- b
                deepEqual(obs.x0, [0, 1, 0, 0], "x0");
                deepEqual(obs.y0, [0, 0, 0, 0], "y0");
                deepEqual(obs.x1, [0, 3, 1, 0], "x1");
                deepEqual(obs.y1, [0, 0, 0, 0], "y1");
                deepEqual(obs.angle, [0, 0, 0, 0], "angle");
                // TODO: in the future, a's arc information should be negative
                // numbers or something to indicate that its arc shouldn't be
                // drawn. See https://github.com/biocore/empress/issues/327.
                deepEqual(obs.arcx0, [0, 0, 1, 0], "arcx0");
                deepEqual(obs.arcy0, [0, 0, 0, 0], "arcy0");
                deepEqual(obs.arcStartAngle, [0, 0, 0, 0], "arcStartAngle");
                deepEqual(obs.arcEndAngle, [0, 0, 0, 0], "arcEndAngle");
            });
        });
        test("Test straightline tree circular layout (all leaf sorting options)", function () {
            // Spoiler alert: should all look the same
            var scope = this;
            var opts = ["none", "ascending", "descending"];
            _.each(opts, function (opt) {
                var obs = LayoutsUtil.circularLayout(
                    scope.straightLineTree,
                    1,
                    1,
                    false,
                    opt,
                    false
                );
                // I just copied these assertions from the above test
                deepEqual(obs.x0, [0, 1, 0, 0], "x0");
                deepEqual(obs.y0, [0, 0, 0, 0], "y0");
                deepEqual(obs.x1, [0, 3, 1, 0], "x1");
                deepEqual(obs.y1, [0, 0, 0, 0], "y1");
                deepEqual(obs.angle, [0, 0, 0, 0], "angle");
                deepEqual(obs.arcx0, [0, 0, 1, 0], "arcx0");
                deepEqual(obs.arcy0, [0, 0, 0, 0], "arcy0");
                deepEqual(obs.arcStartAngle, [0, 0, 0, 0], "arcStartAngle");
                deepEqual(obs.arcEndAngle, [0, 0, 0, 0], "arcEndAngle");
            });
        });
        test("Test straightline tree circular layout: ignoreLengths", function () {
            var trees = [this.straightLineTree, this.noRootLength];
            _.each(trees, function (tree) {
                var obs = LayoutsUtil.circularLayout(
                    tree,
                    1,
                    1,
                    true,
                    "none",
                    false
                );
                // The tree looks like: (note the equal branch lengths)
                // root -- a -- b
                deepEqual(obs.x0, [0, 1, 0, 0], "x0");
                deepEqual(obs.y0, [0, 0, 0, 0], "y0");
                // Now, all lengths are set to 1. So b ends at x = 2 rather
                // than x = 3.
                deepEqual(obs.x1, [0, 2, 1, 0], "x1");
                deepEqual(obs.y1, [0, 0, 0, 0], "y1");
                deepEqual(obs.angle, [0, 0, 0, 0], "angle");
                deepEqual(obs.arcx0, [0, 0, 1, 0], "arcx0");
                deepEqual(obs.arcy0, [0, 0, 0, 0], "arcy0");
                deepEqual(obs.arcStartAngle, [0, 0, 0, 0], "arcStartAngle");
                deepEqual(obs.arcEndAngle, [0, 0, 0, 0], "arcEndAngle");
            });
        });
        test("Test straightline tree circular layout: normalize = true", function () {
            var scope = this;
            var trees = [this.straightLineTree, this.noRootLength];
            _.each(trees, function (tree) {
                var obs = LayoutsUtil.circularLayout(
                    tree,
                    100,
                    50000,
                    false,
                    "none",
                    true
                );
                // The tree looks like:
                // root -- a ---- b
                // We're normalizing the coordinates, so each coordinate will
                // be multiplied by width / (maxX - minX), aka 100 / (3 - 0) =
                // 100 / 3 = 33.3333...
                scope.eq(obs.x0, [0, 100 / 3, 0, 0], "x0");
                scope.eq(obs.y0, [0, 0, 0, 0], "y0");
                scope.eq(obs.x1, [0, 100, 100 / 3, 0], "x1");
                scope.eq(obs.y1, [0, 0, 0, 0], "y1");

                // Check that angle / arc data remains ok
                scope.eq(obs.angle, [0, 0, 0, 0], "angle");
                scope.eq(obs.arcx0, [0, 0, 100 / 3, 0], "arcx0");
                scope.eq(obs.arcy0, [0, 0, 0, 0], "arcy0");
                scope.eq(obs.arcStartAngle, [0, 0, 0, 0], "arcStartAngle");
                scope.eq(obs.arcEndAngle, [0, 0, 0, 0], "arcEndAngle");
            });
        });
        test("Test two-tip tree circular layout: normalize = true", function () {
            var obs = LayoutsUtil.circularLayout(
                this.twoTipTree,
                100,
                500,
                false,
                "none",
                true
            );
            // The tree looks like:
            // b ---- root -- a
            // We're normalizing the coordinates, so each coordinate will
            // be multiplied by width / (maxX - minX), aka 100 / (1 - (-2)) =
            // 100 / 3 = 33.3333...
            //
            // a and b both "start" at the root node, so their x0 and y0
            // positions are (0, 0)
            this.eq(obs.x0, [0, 0, 0, 0], "x0");
            this.eq(obs.y0, [0, 0, 0, 0], "y0");
            this.eq(obs.x1, [0, 100 / 3, -200 / 3, 0], "x1");
            this.eq(obs.y1, [0, 0, 0, 0], "y1");

            // Check that angles remain ok. a should have been assigned an
            // angle of 0, and b should have been assigned an angle of pi
            // (since it's exactly half of the (2pi - 0) angle range, since we
            // have just two tips)
            this.eq(obs.angle, [0, 0, Math.PI, 0], "angle");
            // And there aren't any non-root internal nodes, so arc data should
            // all be empty.
            deepEqual(obs.arcx0, [0, 0, 0, 0], "arcx0");
            deepEqual(obs.arcy0, [0, 0, 0, 0], "arcy0");
            deepEqual(obs.arcStartAngle, [0, 0, 0, 0], "arcStartAngle");
            deepEqual(obs.arcEndAngle, [0, 0, 0, 0], "arcEndAngle");
        });
        test("Test unrooted layout", function () {
            var obs = LayoutsUtil.unrootedLayout(this.tree, 1, 1, false);
            var exp = {
                xCoord: [
                    0,
                    -0.4650449880443435,
                    -0.7105255165406029,
                    -0.35526275827030146,
                    -0.1776313791351507,
                    -0.1776313791351507,
                    0.5328941374054522,
                    0.6846094475924276,
                    0.35526275827030146,
                    0,
                ],
                yCoord: [
                    0,
                    -0.1511022762500036,
                    0.1154318675000508,
                    0,
                    0.4312613037499384,
                    0.05771593375002539,
                    -0.05771593375002535,
                    -0.5687386962500616,
                    -0.11543186750005074,
                    0,
                ],
            };
            this.eq(obs.xCoord, exp.xCoord, "x-coordinates");
            this.eq(obs.yCoord, exp.yCoord, "y-coordinates");
        });
        test("Test straightline tree unrooted layout: normalize = true", function () {
            var scope = this;
            var trees = [this.straightLineTree, this.noRootLength];
            _.each(trees, function (tree) {
                var obs = LayoutsUtil.unrootedLayout(
                    tree,
                    100,
                    500,
                    false,
                    true
                );
                // The tree looks like a vertical line:
                //
                //  b
                //  |
                //  |
                //  a
                //  |
                // root
                //
                // We're normalizing the coordinates, so each coordinate will
                // be multiplied by height / (maxY - minY), aka 500 / (3 - 0) =
                // 500 / 3 = 166.6666...
                scope.eq(obs.xCoord, [0, 0, 0, 0], "x1");
                scope.eq(obs.yCoord, [0, 500, 500 / 3, 0], "y1");
            });
        });
        test("Test getPostOrderNodes (ascending)", function () {
            var po = LayoutsUtil.getPostOrderNodes(this.tree, "ascending");
            // Two explicit "choices" (all other choices, I think, are between
            // clades of equal numbers of tips) --
            // 1. Visit h (8)'s clade first, since it has 2 tips and
            //    g (5)'s clade has 3 tips.
            // 2. Visit b (4)'s clade first, since it has 1 tip (itself) and
            //    f (3)'s clade has 2 tips.
            deepEqual(po, [6, 7, 8, 4, 1, 2, 3, 5, 9]);
        });

        test("Test getPostOrderNodes (descending)", function () {
            var po = LayoutsUtil.getPostOrderNodes(this.tree, "descending");
            // Same logic as above, in reverse. Coincidentally, the tree was
            // already stored in a descending leaf-sorted way! That's why all
            // the numbers are monotonically increasing (since the numbers are
            // the normal postorder positions).
            deepEqual(po, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });

        test("Test getPostOrderNodes (no leaf sorting)", function () {
            var po = LayoutsUtil.getPostOrderNodes(this.tree, "descending");
            // Identical to descending leaf-sorting (not normally, just for
            // this particular tree...)
            deepEqual(po, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });

        test("Test getPostOrderNodes (error on bad leaf sorting method)", function () {
            var scope = this;
            throws(function () {
                LayoutsUtil.getPostOrderNodes(scope.tree, "bluhbluhbluh");
            }, /Unrecognized leaf sorting method bluhbluhbluh/);
        });
        test("Test computeScaleFactor (both axes >= epsilon)", function () {
            var sf = LayoutsUtil.computeScaleFactor(
                    100,
                    200,
                    1,
                    2,
                    3,
                    4
            );
            deepEqual(sf, 200);
        });
        test("Test computeScaleFactor (error on both epsilons)", function () {
            throws(function () {
                LayoutsUtil.computeScaleFactor(
                    100,
                    200,
                    1e-10,
                    2e-10,
                    3e-6,
                    4e-6
                );
            }, /dx and dy are < epsilon; can't scale this layout./);
        });
    });
});
