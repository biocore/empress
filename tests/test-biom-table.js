require(['jquery','BiomTable'], function($, BiomTable) {
    $(document).ready(function() {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray without
        // effecting other test
        module('Biom Table' , {
            setup: function() {
                this._obs = {
                    's1': ['o1', 'o2', 'o4', 'o5', 'o7', 'o10'],
                    's2': ['o1', 'o3', 'o5', 'o6', 'o7', 'o9'],
                    's3': ['o2', 'o3', 'o6'],
                    's4': ['o4', 'o8'],
                    's5': ['o5', 'o8']
                };

                this._samp = {
                    's1': {
                        'f1': 'a',
                        'f2': 'd',
                        'f3': 'i',
                        'f4': 4
                    },
                    's2': {
                        'f1': 'a',
                        'f2': 'd',
                        'f3': 'j',
                        'f4': 3
                    },
                    's3': {
                        'f1': 'c',
                        'f2': 'd',
                        'f3': 'j',
                        'f4': 1
                    },
                    's4': {
                        'f1': 'b',
                        'f2': 'e',
                        'f3': 'j',
                        'f4': 2
                    },
                    's5': {
                        'f1': 'b',
                        'f2': 'f',
                        'f3': 'h',
                        'f4': 5
                    }
                };
                this._types = {
                    'f1': 'o',
                    'f2': 'o',
                    'f3': 'o',
                    'f4': 'n'
                }
                this.biomTable = new BiomTable(
                    this._obs,
                    this._samp,
                    this._types
                );
            },

            teardown: function() {
                this._obs = null;
                this._samp = null;
                this._types = null;
                this.biomTable = null;
            }
        });

        test('Test getObservationUnionForSamples', function() {
            // converting result to Set makes validation eaiser since
            // getObjservationUnionForSamples uses a Set and then converts the
            // Set to an array. The convertion does not keep order so converting
            // the result back to a Set makes validation easier.
            deepEqual(
                new Set(this.biomTable.getObjservationUnionForSamples(['s1'])),
                new Set(['o1', 'o2', 'o4', 'o5', 'o7', 'o10']),
                'Test: observations in s1'
            );
            deepEqual(
                new Set(this.biomTable.getObjservationUnionForSamples(['s1', 's4'])),
                new Set(['o1', 'o2', 'o4', 'o5', 'o7', 'o8', 'o10']),
                'Test: observations in s1 and s4'
            );
        });

        test('Test getObsBy', function() {
            var obsReturned = this.biomTable.getObsBy('f1');
            var keys = Object.keys(obsReturned);

            // convert obsReturned elements (which are arrays) to Set since
            // getObsBy uses Sets and then converts the Sets to arrays.
            // The convertion does not keep order so converting the result back
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

        test('Test getObservations', function () {
            deepEqual(
                this.biomTable.getObservations(),
                new Set([['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9', 'o10']]),
                'Test: getObservations'
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
            // and then converts the Set to an array. The convertion does not
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
            // The convertion does not keep order so converting the result back
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
