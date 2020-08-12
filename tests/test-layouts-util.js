require(["jquery", "ByteArray", "BPTree", "LayoutsUtil"], function (
    $,
    ByteArray,
    BPTree,
    LayoutsUtil
) {
    $(document).ready(function () {
        module("Test layout utils", {
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
    });
});
