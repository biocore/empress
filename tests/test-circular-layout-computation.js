require(["jquery", "BPTree", "BiomTable", "Empress"], function (
    $,
    BPTree,
    BiomTable,
    Empress
) {
    $(document).ready(function () {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray without
        // effecting other test
        module("Circular Layout Computation", {
            setup: function () {
                var tree = new BPTree(
                    new Uint8Array([1, 1, 1, 0, 1, 0, 0, 1, 0, 0]),
                    null,
                    null,
                    null
                );
                var layoutToCoordSuffix = { Circular: "c1" };
                var tdToInd = {
                    // all nodes
                    color: 0,
                    isColored: 1,
                    visible: 2,
                    name: 3,
                    x2: 4,
                    y2: 5,
                    xr: 6,
                    yr: 7,
                    xc1: 8,
                    yc1: 9,
                    xc0: 10,
                    yc0: 11,
                    angle: 12,
                    // all internal nodes
                    highestchildyr: 13,
                    lowestchildyr: 14,
                    // non-root internal nodes
                    arcx0: 15,
                    arcy0: 16,
                    arcstartangle: 17,
                    arcendangle: 18,
                };

                var treeData = [
                    0,
                    [
                        [0.75, 0.75, 0.75],
                        false,
                        true,
                        "",
                        0,
                        0,
                        0,
                        0,
                        -2,
                        0,
                        -2,
                        2,
                    ],
                    [
                        [0.75, 0.75, 0.75],
                        false,
                        true,
                        "",
                        0,
                        0,
                        0,
                        0,
                        2,
                        0,
                        2,
                        2,
                    ],
                    [
                        [0.75, 0.75, 0.75],
                        false,
                        true,
                        "",
                        0,
                        0,
                        0,
                        0,
                        0,
                        -1,
                        0,
                        1,
                        0,
                        0,
                        0,
                        2,
                        0,
                        0,
                        Math.PI,
                    ],
                    [
                        [0.75, 0.75, 0.75],
                        false,
                        true,
                        "",
                        0,
                        0,
                        0,
                        0,
                        0,
                        -1,
                        0,
                        -3,
                    ],
                    [
                        [0.75, 0.75, 0.75],
                        false,
                        true,
                        "",
                        0,
                        0,
                        0,
                        0,
                        0,
                        -1,
                        0,
                        -1,
                    ],
                ];

                // data for the BiomTable object; copied from test-empress.js
                // We need to actually pass a BiomTable to Empress so that
                // the BarplotPanel can call Empress.getSampleCategories()
                // without crashing.
                var sIDs = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];
                var fIDs = [null, "1", "2", "3"];
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
                    null: 0,
                    1: 1,
                    2: 2,
                    3: 3,
                };
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
                var biom = new BiomTable(
                    sIDs,
                    fIDs,
                    sID2Idx,
                    fID2Idx,
                    tbl,
                    smCols,
                    sm
                );

                // README: If this test starts failing at some point in the
                // future, it will probably be due to the parameters of the
                // Empress object having been changed around without this
                // invocation of the object being updated.
                this.empress = new Empress(
                    tree,
                    biom,
                    [], // feature metadata columns
                    [], // split taxonomy columns
                    {}, // tip metadata
                    {}, // internal node metadata
                    null // canvas
                );
                this.empress._drawer = {};
                this.empress._drawer.VERTEX_SIZE = 5;

                // Since layouts are now computed on client-side which means
                // _treeData and _tdToInd are created on client-side. The test were
                // originally written when coordinates were calculated on python
                // side. Thus we need to set them back.
                this.empress._treeData = treeData;
                this.empress._tdToInd = tdToInd;
                this.empress._currentLayout = "Circular";
            },

            teardown: function () {
                this.empress = null;
            },
        });

        test("Test Circular Layout Arc Computation", function () {
            var coords = this.empress.getTreeCoords();

            // NOTE: all node numbers are in reference to the postorder position
            //      starting at 1.
            // check if line for node 1 is correct (tip)
            var node = 1;
            equal(coords[node - 1], -2); // start x position
            equal(coords[node - 1 + 1], 2); // start y position
            equal(coords[node - 1 + 2], -2); // end x position
            equal(coords[node - 1 + 3], 0); // end y position

            // check if line for node 3 is correct (internal)
            node = 3;
            equal(coords[(node - 1) * 4], 0); // start x position
            equal(coords[(node - 1) * 4 + 1], 1); // start y position
            equal(coords[(node - 1) * 4 + 2], 0); // end x position
            equal(coords[(node - 1) * 4 + 3], -1); // end y position

            // For the arc for node 3 start at (2,0) and ends at (-2, 0)
            // check if arc for node 3 is correct
            ok(Math.abs(coords[12] - 2) < 1.0e-15); // start x arc position
            ok(Math.abs(coords[13]) < 1.0e-15); //start y arc position
            // the arc for node 3 spans PI radians thus, the number of lines to
            // approximate arc are 60*((radians spanned by arc) / PI) = 60
            // the above calculation can be found at
            // Empress._numSampToApproximate()
            ok(Math.abs(coords[250] + 2) < 1.0e-15); // end arc x
            ok(Math.abs(coords[251]) < 1.0e-15); //end arc y
        });
    });
});
