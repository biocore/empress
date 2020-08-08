require(["jquery", "underscore", "BiomTable"], function ($, _, BiomTable) {
    $(document).ready(function () {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray without
        // effecting other test
        module("Biom Table", {
            setup: function () {
                this._sIDs = ["s1", "s2", "s3", "s4", "s5"];
                this._fIDs = [
                    "o1",
                    "o2",
                    "o3",
                    "o4",
                    "o5",
                    "o6",
                    "o7",
                    "o8",
                    "o9",
                    "o10",
                ];
                this._sID2Idx = { s1: 0, s2: 1, s3: 2, s4: 3, s5: 4 };
                this._fID2Idx = {
                    o1: 0,
                    o2: 1,
                    o3: 2,
                    o4: 3,
                    o5: 4,
                    o6: 5,
                    o7: 6,
                    o8: 7,
                    o9: 8,
                    o10: 9,
                };
                // Each row is a sample; each array is the indices of the
                // features present in each sample. Notably, each array within
                // this table should be sorted in ascending order.
                this._tbl = [
                    [0, 1, 3, 4, 6, 9],
                    [0, 2, 4, 5, 6, 8],
                    [1, 2, 5],
                    [3, 7],
                    [4, 7],
                ];
                this._smCols = ["f1", "f2", "f3", "f4"];
                this._sm = [
                    ["a", "d", "i", "4"],
                    ["a", "d", "j", "3"],
                    ["c", "d", "j", "1"],
                    ["b", "e", "j", "2"],
                    ["b", "f", "h", "5"],
                ];
                this.biomTable = new BiomTable(
                    this._sIDs,
                    this._fIDs,
                    this._sID2Idx,
                    this._fID2Idx,
                    this._tbl,
                    this._smCols,
                    this._sm
                );
                // For comparison, here is the original _obs and _samp data
                // that were used as test data here (before the compression
                // refactoring). With the exception of placing the numeric
                // sample metadata in strings, this data is the same as what is
                // defined above.
                // this._obs = {
                //     's1': ['o1', 'o2', 'o4', 'o5', 'o7', 'o10'],
                //     's2': ['o1', 'o3', 'o5', 'o6', 'o7', 'o9'],
                //     's3': ['o2', 'o3', 'o6'],
                //     's4': ['o4', 'o8'],
                //     's5': ['o5', 'o8']
                // };
                // this._samp = {
                //     's1': {
                //         'f1': 'a',
                //         'f2': 'd',
                //         'f3': 'i',
                //         'f4': 4
                //     },
                //     's2': {
                //         'f1': 'a',
                //         'f2': 'd',
                //         'f3': 'j',
                //         'f4': 3
                //     },
                //     's3': {
                //         'f1': 'c',
                //         'f2': 'd',
                //         'f3': 'j',
                //         'f4': 1
                //     },
                //     's4': {
                //         'f1': 'b',
                //         'f2': 'e',
                //         'f3': 'j',
                //         'f4': 2
                //     },
                //     's5': {
                //         'f1': 'b',
                //         'f2': 'f',
                //         'f3': 'h',
                //         'f4': 5
                //     }
                // };
            },

            teardown: function () {
                this._sIDs = null;
                this._fIDs = null;
                this._sID2Idx = null;
                this._fID2Idx = null;
                this._tbl = null;
                this._smCols = null;
                this._sm = null;
                this.biomTable = null;
            },
        });

        test("Test constructor validation", function () {
            // First off, test basic "ok" data
            new BiomTable(
                ["s1"],
                ["o1"],
                { s1: 0 },
                { o1: 0 },
                [[0]],
                ["f1", "f2"],
                [["x", "y"]]
            );
            // See https://stackoverflow.com/a/9822522/10730311
            ok(true, "Normal table construction works without errors");

            // Now, test the weird stuff
            throws(
                function () {
                    new BiomTable(
                        ["s1"],
                        ["o1"],
                        { s1: 0 },
                        { o1: 0 },
                        [[0], [0]],
                        ["f1", "f2"],
                        [["x", "y"]]
                    );
                },
                /Sample IDs and table are uneven lengths./,
                "Number of samples in table differs from number of sample IDs"
            );
            throws(
                function () {
                    new BiomTable(
                        ["s1"],
                        ["o1"],
                        { s1: 0 },
                        { o1: 0 },
                        [[0]],
                        ["f1", "f2"],
                        [
                            ["x", "y"],
                            ["z", "a"],
                        ]
                    );
                },
                /Sample IDs and metadata are uneven lengths./,
                "Number of samples in metadata differs from number of " +
                    "sample IDs"
            );
            throws(
                function () {
                    new BiomTable(
                        ["s1"],
                        ["o1"],
                        { s1: 0, s2: 1 },
                        { o1: 0 },
                        [[0]],
                        ["f1", "f2"],
                        [["x", "y"]]
                    );
                },
                /Sample IDs and ID -> index are uneven lengths./,
                "Number of samples in ID -> index differs from number of " +
                    "sample IDs"
            );
            throws(
                function () {
                    new BiomTable(
                        ["s1"],
                        ["o1"],
                        { s1: 0 },
                        { o1: 0, o2: 1 },
                        [[0]],
                        ["f1", "f2"],
                        [["x", "y"]]
                    );
                },
                /Feature IDs and ID -> index are uneven lengths./,
                "Number of features in ID -> index differs from number of " +
                    "feature IDs"
            );
            throws(
                function () {
                    new BiomTable(
                        ["s1"],
                        ["o1"],
                        { s1: 0 },
                        { o1: 0 },
                        [[]],
                        ["f1", "f2"],
                        [["x", "y"]]
                    );
                },
                /Sample at index "0" has no features./,
                "Empty sample in table"
            );
            throws(
                function () {
                    new BiomTable(
                        ["s1"],
                        ["o1"],
                        { s1: 0 },
                        { o1: 0 },
                        [[0, 1]],
                        ["f1", "f2"],
                        [["x", "y"]]
                    );
                },
                /Sample at index "0" has more features than are possible./,
                "Sample with too many features in the table"
            );
            throws(
                function () {
                    new BiomTable(
                        ["s1"],
                        ["o1", "o2", "o3"],
                        { s1: 0 },
                        { o1: 0, o2: 1, o3: 2 },
                        [[1, 0, 2]],
                        ["f1", "f2"],
                        [["x", "y"]]
                    );
                },
                /Sample at index "0" has non-strictly-increasing feature indices in table./,
                "Sample with non-strictly-increasing feature indices in the table"
            );
        });

        test("Test _featureIndexSetToIDArray", function () {
            var observedArray = this.biomTable._featureIndexSetToIDArray(
                new Set([0, 2, 4, 3])
            );
            ok(Array.isArray(observedArray), "Test: returns an array");
            deepEqual(
                this.biomTable._featureIndexSetToIDArray(new Set()),
                [],
                "Test: empty set maps to empty array"
            );
            deepEqual(
                this.biomTable._featureIndexSetToIDArray(new Set([9])),
                ["o10"],
                "Test: one feature index correctly mapped"
            );
            // We don't know (or really care) about the order of the array
            // returned by this function, so we just convert it to a Set.
            // (We already know now that this function returns an Array, so
            // this is acceptable.)
            deepEqual(
                new Set(observedArray),
                new Set(["o1", "o3", "o4", "o5"]),
                "Test: multiple feature indices correctly mapped"
            );
            var scope = this;
            throws(
                function () {
                    scope.biomTable._featureIndexSetToIDArray(new Set([100]));
                },
                /Feature index "100" invalid./,
                "Test: error thrown if unrecognized feature index passed"
            );
            throws(
                function () {
                    scope.biomTable._featureIndexSetToIDArray(
                        new Set(["asdf"])
                    );
                },
                /Feature index "asdf" invalid./,
                "Test: error thrown if unrecognized feature index passed"
            );
        });

        test("Test getObsIDsIntersection", function (assert) {
            var obs;
            var oids = [
                "o1",
                "o2",
                "o3",
                "o4",
                "o5",
                "o6",
                "o7",
                "o8",
                "o9",
                "o10",
            ];
            obs = this.biomTable.getObsIDsIntersection(oids);
            assert.deepEqual(obs, oids);

            obs = this.biomTable.getObsIDsIntersection(["o1"]);
            assert.deepEqual(obs, ["o1"]);

            obs = this.biomTable.getObsIDsIntersection(["oh no"]);
            assert.deepEqual(obs, []);
        });

        test("Test getObsIDsDifference", function (assert) {
            var obs;
            var oids = [
                "o1",
                "o2",
                "o3",
                "o4",
                "o5",
                "o6",
                "o7",
                "o8",
                "o9",
                "o10",
            ];
            obs = this.biomTable.getObsIDsDifference(oids);
            assert.deepEqual(obs, []);

            obs = this.biomTable.getObsIDsDifference(["o1"]);
            assert.deepEqual(obs, []);

            obs = this.biomTable.getObsIDsDifference(["oh no"]);
            assert.deepEqual(obs, ["oh no"]);

            obs = this.biomTable.getObsIDsDifference([]);
            assert.deepEqual(obs, []);

            obs = this.biomTable.getObsIDsDifference([
                "O1",
                "o2",
                "oh no",
                ":D",
            ]);
            assert.deepEqual(obs, ["O1", "oh no", ":D"]);
        });

        test("Test getObservationUnionForSamples", function () {
            // converting result to Set makes validation easier since
            // getObservationUnionForSamples uses a Set and then converts the
            // Set to an array. The conversion does not keep order so converting
            // the result back to a Set makes validation easier.
            deepEqual(
                new Set(this.biomTable.getObservationUnionForSamples(["s1"])),
                new Set(["o1", "o2", "o4", "o5", "o7", "o10"]),
                "Test: observations in s1"
            );
            deepEqual(
                new Set(
                    this.biomTable.getObservationUnionForSamples(["s1", "s4"])
                ),
                new Set(["o1", "o2", "o4", "o5", "o7", "o8", "o10"]),
                "Test: observations in s1 and s4"
            );
            deepEqual(
                this.biomTable.getObservationUnionForSamples([]),
                [],
                "Test: input list of samples is empty"
            );
            var scope = this;
            throws(
                function () {
                    scope.biomTable.getObservationUnionForSamples(["sBad"]);
                },
                /Sample ID "sBad" not in BIOM table./,
                "Test: error thrown if unrecognized sample ID passed"
            );
        });

        test("Test getObsBy", function () {
            // Convert the array values of getObsBy()'s output to Sets, since
            // we don't care about order.
            var settifyObs = function (obs) {
                return _.mapObject(obs, function (arr) {
                    return new Set(arr);
                });
            };

            var obsReturned = this.biomTable.getObsBy("f1");
            deepEqual(
                settifyObs(obsReturned),
                {
                    a: new Set([
                        "o1",
                        "o10",
                        "o2",
                        "o3",
                        "o4",
                        "o5",
                        "o6",
                        "o7",
                        "o9",
                    ]),
                    b: new Set(["o4", "o5", "o8"]),
                    c: new Set(["o2", "o3", "o6"]),
                },
                "Test: find observations in f1"
            );

            obsReturned = this.biomTable.getObsBy("f3");
            deepEqual(
                settifyObs(obsReturned),
                {
                    h: new Set(["o5", "o8"]),
                    i: new Set(["o1", "o10", "o2", "o4", "o5", "o7"]),
                    j: new Set([
                        "o1",
                        "o2",
                        "o3",
                        "o4",
                        "o5",
                        "o6",
                        "o7",
                        "o8",
                        "o9",
                    ]),
                },
                "Test: find observations in f3"
            );

            var scope = this;
            throws(
                function () {
                    scope.biomTable.getObsBy("f100");
                },
                /Sample metadata column "f100" not in BIOM table./,
                "Test: error thrown if unrecognized metadata col passed"
            );
        });

        test("Test getObsCountsBy", function () {
            deepEqual(
                this.biomTable.getObsCountsBy("f1", "o1"),
                {
                    a: 2,
                    b: 0,
                    c: 0,
                },
                "Test: getObsCountsBy(f1, o1)"
            );

            deepEqual(
                this.biomTable.getObsCountsBy("f3", "o5"),
                {
                    h: 1,
                    i: 1,
                    j: 1,
                },
                "Test: getObsCountsBy(f3, o5)"
            );

            var scope = this;
            throws(
                function () {
                    scope.biomTable.getObsCountsBy("f100", "o1");
                },
                /Sample metadata column "f100" not in BIOM table./,
                "Test: error thrown if unrecognized metadata col passed"
            );

            throws(
                function () {
                    scope.biomTable.getObsCountsBy("f1", "o100");
                },
                /Feature ID "o100" not in BIOM table./,
                "Test: error thrown if unrecognized feature ID passed"
            );

            // The metadata error takes "precedence" over the feature ID
            // error so it's what we check for, but the order doesn't matter --
            // it's just what we're going with. (This test just verifies that
            // *both* inputs being invalid doesn't explode everything.)
            throws(
                function () {
                    scope.biomTable.getObsCountsBy("f100", "o100");
                },
                /Sample metadata column "f100" not in BIOM table./,
                "Test: error thrown if unrecognized metadata col and " +
                    "feature ID passed"
            );
        });

        test("Test getSampleCategories", function () {
            deepEqual(
                this.biomTable.getSampleCategories(),
                ["f1", "f2", "f3", "f4"],
                "Test getSampleCategories()"
            );
            var tblWithNonAlphabeticallySortedMDFields = new BiomTable(
                this._sIDs,
                this._fIDs,
                this._sID2Idx,
                this._fID2Idx,
                this._tbl,
                ["f4", "f1", "f3", "f2"],
                this._sm
            );
            deepEqual(
                tblWithNonAlphabeticallySortedMDFields.getSampleCategories(),
                ["f1", "f2", "f3", "f4"],
                "Test that getSampleCategories() actually sorts field names"
            );
        });

        test("Test getUniqueSampleValues", function () {
            deepEqual(
                this.biomTable.getUniqueSampleValues("f1"),
                ["a", "b", "c"],
                "Test non-numeric category f1"
            );
            deepEqual(
                this.biomTable.getUniqueSampleValues("f4"),
                ["1", "2", "3", "4", "5"],
                "Test numeric category f4"
            );
            var tblWithMixedf3 = new BiomTable(
                this._sIDs,
                this._fIDs,
                this._sID2Idx,
                this._fID2Idx,
                this._tbl,
                this._smCols,
                [
                    ["a", "d", "2", "4"],
                    ["a", "d", "j", "3"],
                    ["c", "d", "10", "1"],
                    ["b", "e", "1", "2"],
                    ["b", "f", "i", "5"],
                ]
            );
            deepEqual(
                tblWithMixedf3.getUniqueSampleValues("f3"),
                ["i", "j", "1", "2", "10"],
                "Test mixed numeric and non-numeric category"
            );
            var scope = this;
            throws(
                function () {
                    scope.biomTable.getUniqueSampleValues("asdfasdf");
                },
                /Sample metadata column "asdfasdf" not in BIOM table./,
                "Test: error thrown if unrecognized metadata col passed"
            );
        });

        test("Test getGradientStep", function () {
            var obsReturned = this.biomTable.getGradientStep("f1", "a", "f4");
            var keys = Object.keys(obsReturned);

            // convert obsReturned elements (which are arrays) to Set since
            // getGradientStep uses Sets and then converts the Sets to arrays.
            // The conversion does not keep order so converting the result back
            // to Sets makes validation easier.
            for (var ii = 0; ii < keys.length; ii++) {
                obsReturned[keys[ii]] = new Set(obsReturned[keys[ii]]);
            }
            deepEqual(
                obsReturned,
                {
                    3: new Set(["o1", "o3", "o5", "o6", "o7", "o9"]),
                    4: new Set(["o1", "o2", "o4", "o5", "o7", "o10"]),
                },
                "Test gradient a trajectory f4"
            );

            obsReturned = this.biomTable.getGradientStep("f2", "d", "f3");
            keys = Object.keys(obsReturned);
            for (var jj = 0; jj < keys.length; jj++) {
                obsReturned[keys[jj]] = new Set(obsReturned[keys[jj]]);
            }
            deepEqual(
                obsReturned,
                {
                    i: new Set(["o1", "o2", "o4", "o5", "o7", "o10"]),
                    j: new Set(["o1", "o2", "o3", "o5", "o6", "o7", "o9"]),
                },
                "Test gradient d trajectory f3"
            );
            var scope = this;
            throws(
                function () {
                    scope.biomTable.getGradientStep("fasdf", "d", "f3");
                },
                /Sample metadata column "fasdf" not in BIOM table./,
                "Test: error thrown if unrecognized gradient col passed"
            );
            throws(
                function () {
                    scope.biomTable.getGradientStep("f2", "d", "foiuoiu");
                },
                /Sample metadata column "foiuoiu" not in BIOM table./,
                "Test: error thrown if unrecognized trajectory col passed"
            );
            throws(
                function () {
                    scope.biomTable.getGradientStep("f2", "a", "f3");
                },
                /No samples have "a" as their value in the "f2" gradient sample metadata column./,
                "Test: error thrown if no samples have the input gradient val"
            );
        });

        test("Test getSamplesByObservations", function () {
            var obsReturned = this.biomTable.getSamplesByObservations(["o10"]);
            deepEqual(
                obsReturned,
                ["s1"],
                "Test find samples that contain o10"
            );

            obsReturned = this.biomTable.getSamplesByObservations(["o1", "o2"]);
            obsReturned.sort();
            deepEqual(
                obsReturned,
                ["s1", "s2", "s3"],
                "Test find samples that contain o1 and o2"
            );
            deepEqual(
                this.biomTable.getSamplesByObservations([]),
                [],
                "Test empty array of feature IDs -> empty array of sample IDs"
            );
            var scope = this;
            throws(
                function () {
                    scope.biomTable.getSamplesByObservations(["o1", "oasdf"]);
                },
                /Feature ID "oasdf" not in BIOM table./,
                "Test: error thrown if unrecognized feature ID passed"
            );
        });

        test("Test getSampleValuesCount", function () {
            deepEqual(
                this.biomTable.getSampleValuesCount(
                    ["s1", "s2", "s3", "s4", "s5"],
                    "f1"
                ),
                {
                    a: 2,
                    b: 2,
                    c: 1,
                },
                "Test getSampleValuesCount passing all samples for f1 category"
            );
            deepEqual(
                this.biomTable.getSampleValuesCount(["s1", "s3"], "f4"),
                {
                    "4": 1,
                    "1": 1,
                },
                "Test getSampleValuesCount passing s1 and s3 for f4"
            );
            deepEqual(
                this.biomTable.getSampleValuesCount(["s4"], "f2"),
                {
                    e: 1,
                },
                "Test getSampleValuesCount passing s4 for f2 (just one sample)"
            );
            deepEqual(
                this.biomTable.getSampleValuesCount([], "f3"),
                {},
                "Test getSampleValuesCount: empty sample list -> empty Object"
            );
            var scope = this;
            throws(
                function () {
                    scope.biomTable.getSampleValuesCount(["sBad"], "f1");
                },
                /Sample ID "sBad" not in BIOM table./,
                "Test: error thrown if unrecognized sample ID passed"
            );
            throws(
                function () {
                    scope.biomTable.getSampleValuesCount(["s1"], "fasdf");
                },
                /Sample metadata column "fasdf" not in BIOM table./,
                "Test: error thrown if unrecognized metadata col passed"
            );
        });
        test("Test getFrequencyMap", function () {
            deepEqual(
                this.biomTable.getFrequencyMap("f1"),
                {
                    o1: { a: 1 },
                    o2: { a: 0.5, c: 0.5 },
                    o3: { a: 0.5, c: 0.5 },
                    o4: { a: 0.5, b: 0.5 },
                    o5: { a: 2 / 3, b: 1 / 3 },
                    o6: { a: 0.5, c: 0.5 },
                    o7: { a: 1 },
                    o8: { b: 1 },
                    o9: { a: 1 },
                    o10: { a: 1 },
                },
                "Test frequency map for field f1"
            );
            deepEqual(
                this.biomTable.getFrequencyMap("f4"),
                {
                    o1: { 4: 0.5, 3: 0.5 },
                    o2: { 4: 0.5, 1: 0.5 },
                    o3: { 3: 0.5, 1: 0.5 },
                    o4: { 4: 0.5, 2: 0.5 },
                    o5: { 4: 1 / 3, 3: 1 / 3, 5: 1 / 3 },
                    o6: { 3: 0.5, 1: 0.5 },
                    o7: { 4: 0.5, 3: 0.5 },
                    o8: { 2: 0.5, 5: 0.5 },
                    o9: { 3: 1 },
                    o10: { 4: 1 },
                },
                "Test frequency map for field f4"
            );

            var smolTable = new BiomTable(
                ["s1", "s2", "s3"],
                ["o1", "o2", "o3", "o4"],
                { s1: 0, s2: 1, s3: 2 },
                { o1: 0, o2: 1, o3: 2, o4: 3 },
                [
                    [0, 1],
                    [2, 3],
                    [0, 3],
                ],
                ["f1"],
                [["m"], ["m"], ["m"]]
            );
            deepEqual(
                smolTable.getFrequencyMap("f1"),
                {
                    o1: { m: 1 },
                    o2: { m: 1 },
                    o3: { m: 1 },
                    o4: { m: 1 },
                },
                "Test frequency map when all features unique to same group"
            );

            var funkyTable = new BiomTable(
                ["s1", "s2", "s3"],
                ["o1", "o2", "o3"],
                { s1: 0, s2: 1, s3: 2 },
                { o1: 0, o2: 1, o3: 2 },
                [[0], [1], [2]],
                ["f1"],
                [["x"], ["y"], ["z"]]
            );
            deepEqual(
                funkyTable.getFrequencyMap("f1"),
                {
                    o1: { x: 1 },
                    o2: { y: 1 },
                    o3: { z: 1 },
                },
                "Test frequency map when all features unique to different group"
            );

            var scope = this;
            throws(
                function () {
                    scope.biomTable.getFrequencyMap("badfield");
                },
                /Sample metadata column "badfield" not in BIOM table./,
                "Test error thrown if unrecognized metadata col passed"
            );
        });
    });
});
