require([
    "jquery",
    "underscore",
    "ByteArray",
    "BPTree",
    "LayoutsUtil",
], function ($, _, ByteArray, BPTree, LayoutsUtil) {
    $(document).ready(function () {
        // Convert an array of numbers to an array of strings all formatted
        // using .toFixed(4).
        var toFixedIfy = function (arr) {
            return _.map(arr, function (ele) {
                return ele.toFixed(4);
            });
        };
        // Given two arrays of numbers, calls toFixedIfy() on each and
        // asserts deep equality on the results.
        var approxDeepEqual = function (arr1, arr2, message) {
            deepEqual(toFixedIfy(arr1), toFixedIfy(arr2), message);
        };

        module("Layout Utilities", {
            setup: function () {
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
                    ["", "i", "g", "f", "a", "e", "b", "h", "c", "d"],
                    [null, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 1.0, 3.0],
                    null
                );

                // In Newick format: "((b:2)a:1)root:100;"
                this.straightLineTree = new BPTree(
                    new Uint8Array([1, 1, 1, 0, 0, 0]),
                    ["", "root", "a", "b"],
                    ["", 100.0, 1.0, 2.0],
                    null
                );

                // In Newick format: "((b:2)a:1)root;"
                this.noRootLength = new BPTree(
                    new Uint8Array([1, 1, 1, 0, 0, 0]),
                    ["", "root", "a", "b"],
                    ["", null, 1.0, 2.0],
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

        test("Test rectangular layout", function () {
            var obs = LayoutsUtil.rectangularLayout(this.tree);
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
                    0
                ],
            };
            deepEqual(obs, exp);
        });

        test("Test straightline tree rectangular layout", function () {
            var obs = LayoutsUtil.rectangularLayout(this.straightLineTree);

            var exp = {
                xCoord: [0, 3, 1, 0],
                yCoord: [0, 0, 0, 0],
            };
            deepEqual(obs, exp);
        });

        test("Test missing root length rectangular layout", function () {
            var obs = LayoutsUtil.rectangularLayout(this.noRootLength);

            var exp = {
                xCoord: [0, 3, 1, 0],
                yCoord: [0, 0, 0, 0],
            };
            deepEqual(obs, exp);
        });

        test("Test circular layout", function () {
            // In Newick format: "((d:4,c:3)b:2,a:1)root:1;"
            var testTree = new BPTree(
                new Uint8Array([1, 1, 1, 0, 1, 0, 0, 1, 0, 0]),
                ["", "root", "b", "d", "c", "a"],
                ["", 1, 2, 4, 3, 1],
                null
            );
            var obs = LayoutsUtil.circularLayout(testTree);
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
            approxDeepEqual(obs.x0, [0, 2, -1, 0, 0, 0], "x0");
            // Should be equal to (total radius to parent node)*sin(node angle)
            approxDeepEqual(obs.y0, [0, 0, 1.7321, 0, 0, 0], "y0");

            // Check ending positions.
            // Should be equal to (total radius to node)*cos(node angle).
            approxDeepEqual(obs.x1, [0, 6, -2.5, 1, -0.5, 0], "x1");
            // Should be equal to (total radius to node)*sin(node angle).
            approxDeepEqual(
                obs.y1,
                [0, 0, 4.3301, 1.7321, -0.8660, 0],
                "y1"
            );

            // Check angles. There are just 3 tips so they get assigned
            // multiples of (2pi / 3) (that is: 0, 2pi/3, and 4pi/3). The lone
            // non-root internal node is given an angle of the average of its
            // child angles (i.e. 0 and 2pi/3, so just pi/3). And finally, the
            // root gets an angle of 0 (but the root's angle isn't used for
            // anything anyway).
            approxDeepEqual(
                obs.angle,
                [0, 0, (2 * Math.PI) / 3, Math.PI / 3, (4 * Math.PI) / 3, 0],
                "angle"
            );

            // Check arc start points. Only b should have any arc information;
            // the remaining nodes are either tips or the root.
            // Should be equal to
            // (total radius to b = 2) * op(largest child angle of b = 2pi/3),
            // where "op" is cos() for x and sin() for y.
            approxDeepEqual(obs.arcx0, [0, 0, 0, -1, 0, 0], "arcx0");
            approxDeepEqual(obs.arcy0, [0, 0, 0, 1.7321, 0, 0], "arcy0");
            // Check arc start and end angles. We've defined the "start" angle
            // to be the largest angle of an internal node's children, and the
            // "end" angle to be the smallest angle of these children.
            // In the case of b, it just has two children (with angles 2pi/3
            // and 0), so determining this is pretty straightforward...
            approxDeepEqual(
                obs.arcStartAngle,
                [0, 0, 0, (2 * Math.PI) / 3, 0, 0],
                "arc start angle"
            );
            approxDeepEqual(
                obs.arcEndAngle,
                [0, 0, 0, 0, 0, 0],
                "arc start angle"
            );
        });
        test("Test straightline tree circular layout", function () {
            var obs = LayoutsUtil.circularLayout(this.straightLineTree);
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
        test("Test straightline tree circular layout, rotated CCW by 90 degrees", function () {
            var piover2 = Math.PI / 2;
            var obs = LayoutsUtil.circularLayout(this.straightLineTree, piover2);
            // The tree looks like:
            //  b
            //  |
            //  |
            //  a
            //  |
            // root
            approxDeepEqual(obs.x0, [0, 0, 0, 0], "x0");
            deepEqual(obs.y0, [0, 1, 0, 0], "y0");
            approxDeepEqual(obs.x1, [0, 0, 0, 0], "x1");
            deepEqual(obs.y1, [0, 3, 1, 0], "y1");
            approxDeepEqual(obs.angle, [0, piover2, piover2, 0], "angle");
            // As with the above test, this arc will be invisible when drawn
            // since a only has 1 child (b). This is clear from how a's
            // arcStartAngle is equal to its arcEndAngle...
            approxDeepEqual(obs.arcx0, [0, 0, 0, 0], "arcx0");
            approxDeepEqual(obs.arcy0, [0, 0, 1, 0], "arcy0");
            approxDeepEqual(obs.arcStartAngle, [0, 0, piover2, 0], "arcStartAngle");
            approxDeepEqual(obs.arcEndAngle, [0, 0, piover2, 0], "arcEndAngle");
        });
    });
});
