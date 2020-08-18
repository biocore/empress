define(["Empress", "BPTree", "BiomTable"], function (
    Empress,
    BPTree,
    BiomTable
) {
    /**
     * Returns an Object containing test data that can be used to construct an
     * instance of Empress.
     *
     * This function was cobbled together from the setup code in
     * test-empress.js. It will likely need to be extended or modified to
     * support further testing in the future.
     *
     * @param {Boolean} constructEmpress If truthy, this will actually create a
     *                                   new Empress instance and include this
     *                                   instance in the returned Object under
     *                                   the key "empress". If this is falsy,
     *                                   this will instead just set the value
     *                                   of the empress key to null.
     * @return {Object} testData
     */
    function getTestData(constructEmpress = false) {
        // tree comes from the following newick string
        // ((1,(2,3)4)5,6)7;
        var tree = new BPTree(
            new Uint8Array([1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0]),
            // see https://github.com/biocore/empress/issues/311
            ["", "root", "internal", "1", "internal", "2", "3", "EmpressNode6"],
            [0, 7, 5, 1, 4, 2, 3, 6],
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

        // see core.py for more details on  the format of treeData
        var treeData = [
            0, // this is blank since empress uses 1-based index. This
            // will be addressed with #223
            [[0.75, 0.75, 0.75], false, true, "1", 29, 30, 1, 2, 15, 16, 0, 0, 0],
            [[0.75, 0.75, 0.75], false, true, "2", 31, 32, 3, 4, 17, 18, 0, 0, 0.5],
            [[0.75, 0.75, 0.75], false, true, "3", 33, 34, 5, 6, 19, 20, 0, 0, 1],
            [[0.75, 0.75, 0.75], false, true, "internal", 35, 36, 7, 8, 21, 22, 0, 0, 0],
            [[0.75, 0.75, 0.75], false, true, "internal", 37, 38, 9, 10, 23, 24, 0, 0, 0],
            [[0.75, 0.75, 0.75], false, true, "EmpressNode6", 39, 40, 11, 12, 25, 26, 0, 0, 0],
            [[0.75, 0.75, 0.75], false, true, "root", 41, 42, 13, 14, 27, 28, 0, 0, 0],
        ];
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
        var biom = new BiomTable(sIDs, fIDs, sID2Idx, fID2Idx, tbl, smCols, sm);
        var canvas = document.createElement("canvas");

        // Rectangular layout y scaling factor
        // equal to 4020 / (# leaves - 1) = 4020 / 3 = 1,340.0
        var yrscf = 1340.0;
        var empress;
        if (constructEmpress) {
            empress = new Empress(
                tree,
                treeData,
                // tdToInd,
                nameToKeys,
                layoutToCoordSuffix,
                "Unrooted",
                yrscf,
                biom,
                featureColumns,
                tipMetadata,
                intMetadata,
                canvas
            );
        } else {
            empress = null;
        }

        return {
            empress: empress,
            tree: tree,
            treeData: treeData,
            tdToInd: tdToInd,
            nameToKeys: nameToKeys,
            layoutToCoordSuffix: layoutToCoordSuffix,
            yrscf: yrscf,
            biom: biom,
            fmCols: featureColumns,
            tm: tipMetadata,
            im: intMetadata,
            canvas: canvas,
        };
    }

    return { getTestData: getTestData };
});
