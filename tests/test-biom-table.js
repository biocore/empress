require(['jquery','BiomTable'], function($, BiomTable) {
    $(document).ready(function() {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray without
        // effecting other test
        module('Biom Table' , {
            setup: function() {
                this._sIDs = ["s1", "s2", "s3", "s4", "s5"];
                this._fIDs = [
                    "o1", "o2", "o3", "o4", "o5", "o6", "o7", "o8", "o9", "o10"
                ];
                this._sID2Idx = {"s1": 0, "s2": 1, "s3": 2, "s4": 3, "s5": 4};
                this._fID2Idx = {
                    "o1": 0,
                    "o2": 1,
                    "o3": 2,
                    "o4": 3,
                    "o5": 4,
                    "o6": 5,
                    "o7": 6,
                    "o8": 7,
                    "o9": 8,
                    "o10": 9
                };
                // Each row is a sample; each array is the indices of the
                // features present in each sample
                this._tbl = [
                    [0, 1, 3, 4, 6, 9],
                    [0, 2, 4, 5, 6, 8],
                    [1, 2, 5],
                    [3, 7],
                    [4, 7]
                ];
                this._smCols = ["f1", "f2", "f3", "f4"];
                this._sm = [
                    ["a", "d", "i", "4"],
                    ["a", "d", "j", "3"],
                    ["c", "d", "j", "1"],
                    ["b", "e", "j", "2"],
                    ["b", "f", "h", "5"]
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
                // refactoring).
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

            teardown: function() {
                this._sIDs = null;
                this._fIDs = null;
                this._sID2Idx = null;
                this._fID2Idx = null;
                this._tbl = null;
                this._smCols = null;
                this._sm = null;
                this.biomTable = null;
            }
        });

        test('Test _featureIndexSetToIDArray', function() {
            var observedArray = this.biomTable._featureIndexSetToIDArray(
                new Set([0, 2, 4, 3])
            );
            ok(Array.isArray(observedArray), 'Test: returns an array');
            deepEqual(
                this.biomTable._featureIndexSetToIDArray(new Set()),
                [],
                'Test: empty set maps to empty array'
            );
            deepEqual(
                this.biomTable._featureIndexSetToIDArray(new Set([9])),
                ["o10"],
                'Test: one feature index correctly mapped'
            );
            // We don't know (or really care) about the order of the array
            // returned by this function, so we just convert it to a Set.
            // (We already know now that this function returns an Array, so
            // this is acceptable.)
            deepEqual(
                new Set(observedArray),
                new Set(["o1", "o3", "o4", "o5"]),
                'Test: multiple feature indices correctly mapped'
            );
            var scope = this;
            throws(
                function() {
                    scope.biomTable._featureIndexSetToIDArray(
                        new Set([100])
                    );
                },
                /Feature index "100" unrecognized./,
                'Test: error thrown if unrecognized feature index passed.'
            );
            throws(
                function() {
                    scope.biomTable._featureIndexSetToIDArray(
                        new Set(['asdf'])
                    );
                },
                /Feature index "asdf" unrecognized./,
                'Test: error thrown if unrecognized feature index passed.'
            );
        });

        test('Test getObservationUnionForSamples', function() {
            // converting result to Set makes validation easier since
            // getObservationUnionForSamples uses a Set and then converts the
            // Set to an array. The conversion does not keep order so converting
            // the result back to a Set makes validation easier.
            deepEqual(
                new Set(this.biomTable.getObservationUnionForSamples(['s1'])),
                new Set(['o1', 'o2', 'o4', 'o5', 'o7', 'o10']),
                'Test: observations in s1'
            );
            deepEqual(
                new Set(this.biomTable.getObservationUnionForSamples(['s1', 's4'])),
                new Set(['o1', 'o2', 'o4', 'o5', 'o7', 'o8', 'o10']),
                'Test: observations in s1 and s4'
            );
            deepEqual(
                this.biomTable.getObservationUnionForSamples([]),
                [],
                'Test: input list of samples is empty'
            );
            var scope = this;
            throws(
                function() {
                    scope.biomTable.getObservationUnionForSamples(['sBad']);
                },
                /Sample ID "sBad" not recognized in BIOM table./,
                'Test: error thrown if unrecognized sample ID passed.'
            );
        });

        test('Test getObsBy', function() {
            var obsReturned = this.biomTable.getObsBy('f1');
            var keys = Object.keys(obsReturned);

            // convert obsReturned elements (which are arrays) to Set since
            // getObsBy uses Sets and then converts the Sets to arrays.
            // The conversion does not keep order so converting the result back
            // to Sets makes validation easier.
            for (var i = 0; i < keys.length; i++) {
                obsReturned[keys[i]] = new Set(obsReturned[keys[i]]);
            }
            deepEqual(
                obsReturned,
                {'a': new Set(['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o10']),
                 'b': new Set(['o4', 'o5', 'o8']),
                 'c': new Set(['o2', 'o3', 'o6'])
                },
                'Test: find observations in f1 '
            );

            obsReturned = this.biomTable.getObsBy('f3');
            keys = Object.keys(obsReturned);
            for (i = 0; i < keys.length; i++) {
                obsReturned[keys[i]] = new Set(obsReturned[keys[i]]);
            }
            deepEqual(
                obsReturned,
                {
                    'h' : new Set([['o5', 'o8']]),
                    'i' : new Set(),
                    'j' : new Set()
                },
                'Test: find observations in f3'
            );
        });

        test('Test getObsCountsBy', function() {
            deepEqual(
                this.biomTable.getObsCountsBy('f1', 'o1'),
                {
                    'a' : 2,
                    'b' : 0,
                    'c' : 0
                },
                'Test: getObsCountsBy(f1, o1)'
            );

            deepEqual(
                this.biomTable.getObsCountsBy('f3', 'o5'),
                {
                    'h' : 1,
                    'i' : 1,
                    'j' : 1
                },
                'Test: getObsCountsBy(f1, o1)'
            );
        });

        test('Test getSampleCategories', function() {
            deepEqual(
                this.biomTable.getSampleCategories(),
                ['f1', 'f2', 'f3', 'f4'],
                'Test getSampleCategories'
            );
        });

        test('Test getUniqueSampleValues', function() {
            // convert result to a Set since getUniqueSampleValues uses a Set
            // and then converts the Set to an array. The conversion does not
            // keep order so converting the result back to a Set makes
            // validation easier.
            deepEqual(
                new Set(this.biomTable.getUniqueSampleValues('f1')),
                new Set(['a', 'b', 'c']),
                'Test non-numeric category f1'
            );

            // dont convert result for f4 because f4 is numberic and the order
            // of the result does matter for numberic fields
            deepEqual(
                this.biomTable.getUniqueSampleValues('f4'),
                [1,2,3,4,5],
                'Test numeric category f4'
            )
        });

        test('Test getGradientStep', function() {
            var obsReturned = this.biomTable.getGradientStep('f1', 'a', 'f4');
            var keys = Object.keys(obsReturned);

            // convert obsReturned elements (which are arrays) to Set since
            // getGradientStep uses Sets and then converts the Sets to arrays.
            // The conversion does not keep order so converting the result back
            // to Sets makes validation easier.
            for (var i = 0; i < keys.length; i++) {
                obsReturned[keys[i]] = new Set(obsReturned[keys[i]]);
            }
            deepEqual(
                obsReturned,
                {
                    3 : new Set([['o1', 'o3', 'o5', 'o6', 'o7', 'o9']]),
                    4 : new Set(['o1', 'o2', 'o4', 'o5', 'o7', 'o10'])
                },
                'Test gradient a trjectory f4'
            );

            obsReturned = this.biomTable.getGradientStep('f2', 'd', 'f3');
            keys = Object.keys(obsReturned);
            for (var i = 0; i < keys.length; i++) {
                obsReturned[keys[i]] = new Set(obsReturned[keys[i]]);
            }
            deepEqual(
                obsReturned,
                {
                    'i' : new Set(['o1', 'o2', 'o4', 'o5', 'o7', 'o10']),
                    'j' : new Set(['o1', 'o2',, 'o3', 'o5', 'o6', 'o7', 'o9'])
                },
                'Test gradient d trjectory f3'
            );
        });

        test('Test getSamplesByObservations', function() {
            var obsReturned = this.biomTable.getSamplesByObservations(
                ['o10']);
            obsReturned.sort();
            deepEqual(
                obsReturned,
                ['s1'],
                'Test find samples that contain o10'
            );

            obsReturned = this.biomTable.getSamplesByObservations(
                ['o1', 'o2']);
            obsReturned.sort();
            deepEqual(
                obsReturned,
                ['s1', 's2', 's3'],
                'Test find samples that contain o1 and o2'
            );
        });

        test('Test getSampleValuesCount', function() {
            deepEqual(
                this.biomTable.getSampleValuesCount(['s1','s2','s3','s4','s5'], 'f1'),
                {
                    'a' : 2,
                    'b' : 2,
                    'c' : 1
                },
                'Test getSampleValuesCount passing all samples for f1 category'
            );
        });

    });
});
