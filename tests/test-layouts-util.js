require([
    "jquery",
    "underscore",
    "ByteArray",
    "BPTree",
    "LayoutsUtil",
], function ($, _, ByteArray, BPTree, LayoutsUtil) {
    $(document).ready(function () {
        module("Layout Utilities", {
            setup: function () {
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

                this.straightLineTree = new BPTree(
                    new Uint8Array([1, 1, 1, 0, 0, 0]),
                    ["", "root", "a", "b"],
                    ["", 100.0, 1.0, 2.0],
                    null
                );

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
            var obs = LayoutsUtil.rectangularLayout(this.tree, 500, 500);

            var exp = {
                xCoord: [0, 300, 400, 200, 300, 100, 300, 500, 200, 0.0],
                yCoord: [
                    0,
                    -296.875,
                    -171.875,
                    -234.375,
                    -46.875,
                    -140.625,
                    78.125,
                    203.125,
                    140.625,
                    0.0,
                ],
            };
            deepEqual(obs, exp);
        });

        test("Test straightline tree rectangular layout", function () {
            var obs = LayoutsUtil.rectangularLayout(
                this.straightLineTree,
                100,
                100
            );

            var exp = {
                xCoord: [0, 100, 100 / 3, 0],
                yCoord: [0, 0, 0, 0],
            };
            deepEqual(obs, exp);
        });

        test("Test missing root length rectangular layout", function () {
            var obs = LayoutsUtil.rectangularLayout(
                this.noRootLength,
                100,
                100
            );

            var exp = {
                xCoord: [0, 100, 100 / 3, 0],
                yCoord: [0, 0, 0, 0],
            };
            deepEqual(obs, exp);
        });

        test("Test circular layout", function () {
            var testTree = new BPTree(
                new Uint8Array([1, 1, 1, 0, 1, 0, 0, 1, 0, 0]),
                ["", "root", "b", "d", "c", "a"],
                ["", 1, 2, 4, 3, 1],
                null
            );
            var obs = LayoutsUtil.circularLayout(testTree, 100, 100);
            // Check that there isn't extra junk included in obs' output
            // (so we'll know that the 9 keys within obs we check are the
            // *only* keys in obs)
            deepEqual(_.keys(obs).length, 9, "Amount of keys is correct");

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

            // Check starting positions. Recall that the first elements here
            // are meaningless (these arrays are 1-indexed), and that the
            // remaining (0, 0)s are from nodes a, b, and the root -- all of
            // which "originate" at (0, 0) because they're either immediate
            // descendants of the root node or the root node itself.
            approxDeepEqual(obs.x0, [0, 38.49, -19.245, 0, 0, 0], "x0");
            approxDeepEqual(obs.y0, [0, 0, 33.3333, 0, 0, 0], "y0");

            // Check ending positions.
            approxDeepEqual(
                obs.x1,
                [0, 115.4701, -48.1125, 19.245, -9.6225, 0],
                "x1"
            );
            approxDeepEqual(
                obs.y1,
                [0, 0, 83.3333, 33.3333, -16.6667, 0],
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
            approxDeepEqual(obs.arcx0, [0, 0, 0, -19.245, 0, 0], "arcx0");
            approxDeepEqual(obs.arcy0, [0, 0, 0, 33.3333, 0, 0], "arcy0");
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
            var obs = LayoutsUtil.circularLayout(
                this.straightLineTree,
                100,
                100
            );
            // The tree looks like:
            // root -- a ---- b
            // Since the width is 100, the tree should be scaled so that the
            // root is at x = 0 and b's endpoint is at x = 100.
            deepEqual(obs.x0, [0, 100 / 3, 0, 0], "x0");
            deepEqual(obs.y0, [0, 0, 0, 0], "y0");
            deepEqual(obs.x1, [0, 100, 100 / 3, 0], "x1");
            deepEqual(obs.y1, [0, 0, 0, 0], "y1");
            deepEqual(obs.angle, [0, 0, 0, 0], "angle");
            // TODO: in the future, a's arc information should be negative
            // numbers or something to indicate that its arc shouldn't be
            // drawn.
            deepEqual(obs.arcx0, [0, 0, 100 / 3, 0], "arcx0");
            deepEqual(obs.arcy0, [0, 0, 0, 0], "arcy0");
            deepEqual(obs.arcStartAngle, [0, 0, 0, 0], "arcStartAngle");
            deepEqual(obs.arcEndAngle, [0, 0, 0, 0], "arcEndAngle");
        });
    });
});
