require(['jquery', 'ByteArray', 'BPTree', 'BiomTable', 'SummaryHelper'], function($, ByteArray, BPTree, BiomTable, SummaryHelper) {
    $(document).ready(function() {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray without
        // effecting other test
        module('SummaryHelper' , {
            setup: function() {
                this.t1 = new Uint8Array([1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0]);
                this.t1_w_extra_tips = new Uint8Array([1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0]);
                this.t2 = new Uint8Array([1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0]);


                this.t1_names = ['root', 'EmpressNode4', 'EmpressNode2', 'EmpressNode1', 'EmpressNode0', 'OTU1', 'OTU2', 'OTU3', 'EmpressNode3', 'OTU4', 'OTU5'];
                this.t1_lengths = [0, 0.0, 0.0, 1.0, 0.5, 0.5, 0.5, 1.0, 1.25, 0.75, 0.75];

                this.t1_w_extra_tips_names = ['root', 'EmpressNode6', 'EmpressNode2', 'EmpressNode1', 'EmpressNode0', 'OTU1', 'OTU2', 'OTU3', 'EmpressNode5', 'OTU4', 'EmpressNode4', 'OTU5', 'EmpressNode3', 'OTU6', 'OTU7'];
                this.t1_w_extra_tips_lengths = [0, 0.0, 0.0, 1.0, 0.5, 0.5, 0.5, 1.0, 1.25, 0.75, 0.5, 0.25, 0.5, 0.5, 0.5];


                this.t2_names = ['root', 'EmpressNode0', 'OTU1', 'OTU2', 'EmpressNode1', 'OTU3', 'OTU4'];
                this.t2_lengths = [0, 0.3, 0.1, 0.2, 1.1, 0.5, 0.7];

                this.t1Obj = new BPTree(this.t1, this.t1_names, this.t1_lengths);
                this.t1WExtraTipsObj = new BPTree(this.t1_w_extra_tips, this.t1_w_extra_tips_names, this.t1_w_extra_tips_lengths);
                this.t2Obj = new BPTree(this.t2, this.t2_names, this.t2_lengths);

                this.b1 = [[1, 3, 0, 1, 0],
                   [0, 2, 0, 4, 4],
                   [0, 0, 6, 2, 1],
                   [0, 0, 1, 1, 1],
                   [5, 3, 5, 0, 0],
                   [0, 0, 0, 3, 5]];
                this.sids1 = ["A", "B", "C", "D", "E", "F"];
                this.oids1 = Array.from(Array(6), (x, index) => "OTU"+ (index+1));
                this.oids2 = Array.from(Array(5), (x, index) => "OTU"+ (index+1));
                this.samp = {
                  "1": {"cat1": 0},
                  "2": {"cat2": 0},
                  "3": {"cat3": 0}
                };
            },

            teardown: function() {
                this.bpArray = null;
            }
        });

        /**
         * Helper function for setting up biom table from counts arrays
         *
         * @params counts1 - Array of counts for first sample
         * @params counts2 - Array of counts for second sample
         * @params sids - Array of available sample Ids
         * @params oids - Array of observation ids, index matches counts
         * @params sid1 - Sample1 ID
         * @params sid2 - Sample2 ID
         *
         * @return {BiomTable}
         */
        function setupBiomTable(counts1, counts2, sids, oids, sid1=0, sid2=1){
          var obs = {};
          obs[sids[sid1]] = BiomTable.convertToObs(counts1, oids);
          obs[sids[sid2]] = BiomTable.convertToObs(counts2, oids);
          return new BiomTable(obs, this.samp);
        }

        /**
         * Checks if difference between values is within threshold
         *
         * @params actual - the actual value to compare
         * @params expected - the expected value
         * @params maxDiff - the threshold
         *
         * @return {undefined}
         */
        function almostEqual(actual, expected, maxDiff=0.0000001){
          // Compare actual with expected and allow difference of maxDiff
          var message = "actual: " + actual + " expected: "+ expected + " maxDifference allowed is: " + maxDiff;
          var result = Math.abs(actual - expected) <= maxDiff;
          ok(result, message);
        }

        // tests unifrac small
        test('Test unifrac small, multiple samples', function() {
            var bpArray = new Uint8Array([1, 1, 1, 0, 1, 0, 1, 1 ,0, 0, 0,
                  1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]);

            var names = [...Array(11).keys()];
            var lengths = names.map(k => parseInt(k));

            var bpObj = new BPTree(bpArray, names, lengths);

            var obs = {"1": [2, 3],"2":[3,5],"3":[2,9,10]};
            var biomTable = new BiomTable(obs, this.samp);
            var sIds1 = ["1", "3"];
            var sIds2 = ["1", "2"];
            equal(SummaryHelper.unifrac(biomTable, bpObj, sIds1, sIds2), 43/49);
        });

        // UniFrac API does not assert the observations are in tip order of the
        // input tree
        test('Test unifrac otus_out_of_order', function() {
          shuffled_ids = this.oids1;
          shuffled_b1 = [...this.b1];

          // swap ids
          var tmp = shuffled_ids[0];
          shuffled_ids[0] = shuffled_ids[shuffled_ids.length-1];
          shuffled_ids[shuffled_ids.length-1] = tmp;

          // swap data in counts
          for (var i = 0; i < shuffled_b1.length; ++i){
            var tmp = shuffled_b1[i][0];
            shuffled_b1[i][0] = shuffled_b1[i][-1];
            shuffled_b1[i][-1] = tmp;
          }

          for (var i = 0; i < this.b1.length; ++i){
              for (var j = 0; j < this.b1.length; ++j){
                var biomTable = setupBiomTable(this.b1[i], this.b1[j], this.sids1, this.oids1, i, j);
                var shuffled_biomTable =  setupBiomTable(shuffled_b1[i], shuffled_b1[j], this.sids1, shuffled_ids, i, j);
                var actual = SummaryHelper.unifrac(biomTable, this.t1Obj, Array(this.sids1[i]),Array(this.sids1[j]));
                var expected = SummaryHelper.unifrac(shuffled_biomTable, this.t1Obj, Array(this.sids1[i]),Array(this.sids1[j]));
                equal(actual, expected);
              }
          }
        });

        // UniFrac values are the same despite unobserved tips in the tree
        test('Test unifrac unweighted extra tips', function() {
          for (var i = 0; i < this.b1.length; ++i){
              for (var j = 0; j < this.b1.length; ++j){
                var biomTable =  setupBiomTable(this.b1[i], this.b1[j], this.sids1, this.oids1, i, j);
                var actual = SummaryHelper.unifrac(biomTable, this.t1WExtraTipsObj, Array(this.sids1[i]),Array(this.sids1[j]));
                var expected = SummaryHelper.unifrac(biomTable, this.t1Obj, Array(this.sids1[i]),Array(this.sids1[j]));
                equal(actual, expected);
              }
          }
        });


        // Two tips
        test('Test unifrac unweighted minimal trees', function() {
          var minTree = new Uint8Array([1, 1, 0, 1, 0, 0]);
          var minTree_names = ['root', 'OTU1', 'OTU2'];
          var minTree_lengths = [0, 0.25, 0.25];
          var minTreeObj = new BPTree(minTree, minTree_names, minTree_lengths);

          var biomTable =  setupBiomTable([1,0], [0,0], this.sids1, ['OTU1', 'OTU2']);
          var actual = SummaryHelper.unifrac(biomTable, minTreeObj, Array(this.sids1[0]),Array(this.sids1[1]));
          var expected = 1.0;
          equal(actual, expected);
        });

        // Expected values computed with QIIME 1.9.1 and by hand
        // root node not observed, but branch between (OTU1, OTU2) and root
        // is considered shared
        test('Test unifrac unweighted root not observed', function() {
          var maxDiff = 0.0000001;
          var biomTable = setupBiomTable([1,1,0,0],[1,0,0,0], this.sids1, this.oids2);
          var actual = SummaryHelper.unifrac(biomTable, this.t2Obj, Array(this.sids1[0]),Array(this.sids1[1]));
          /*
          for clarity of what I'm testing, compute expected as it would
          based on the branch lengths. the values that compose shared was
          a point of confusion for me here, so leaving these in for
          future reference
          */
          var expected = 0.2 / (0.1 + 0.2 + 0.3);  // 0.3333333333;
          almostEqual(actual, expected, maxDiff);

          /*
          root node not observed, but branch between (OTU3, OTU4) and root
          is considered shared
          */
          biomTable = setupBiomTable([0,0,1,1],[0,0,1,0], this.sids1, this.oids2);
          actual = SummaryHelper.unifrac(biomTable, this.t2Obj, Array(this.sids1[0]),Array(this.sids1[1]));

          /*
          for clarity of what I'm testing, compute expected as it would
          based on the branch lengths. the values that compose shared was
          a point of confusion for me here, so leaving these in for
          future reference
          */
          expected = 0.7 / (1.1 + 0.5 + 0.7);  // 0.3043478261
          almostEqual(actual, expected, maxDiff);
        });


        test('Test unifrac identity', function() {
            for(var i = 0; i < this.b1.length; i++){
              var obs = {};
              obs[this.sids1[i]] = BiomTable.convertToObs(this.b1[i], this.oids1);
              var biomTable = new BiomTable(obs, this.samp);
              var actual = SummaryHelper.unifrac(biomTable, this.t1Obj, Array(this.sids1[i]),Array(this.sids1[i]));
              var expected = 0.0;
              equal(actual, expected);
            }
        });

        test('Test unifrac symmetry', function() {
            for (var i = 0; i < this.b1.length; ++i){
                for (var j = 0; j < this.b1.length; ++j){
                    var biomTable =  setupBiomTable(this.b1[i], this.b1[j], this.sids1, this.oids1, i, j);
                    var actual = SummaryHelper.unifrac(biomTable, this.t1Obj, Array(this.sids1[i]),Array(this.sids1[j]));
                    var biomTableSym =  setupBiomTable(this.b1[i], this.b1[j], this.sids1, this.oids1, j, i);
                    var expected = SummaryHelper.unifrac(biomTable, this.t1Obj, Array(this.sids1[i]),Array(this.sids1[j]));
                    equal(actual, expected);
                }
            }
        });

        // these communities only share the root node
        test('Test unifrac non overlapping', function() {
          var biomTable = setupBiomTable(this.b1[4], this.b1[5], this.sids1, this.oids1, 4, 5);
          var actual = SummaryHelper.unifrac(biomTable, this.t1Obj, Array(this.sids1[4]),Array(this.sids1[5]));
          var expected = 1.0;
          equal(actual, expected);

          biomTable = setupBiomTable([1, 1, 1, 0, 0], [0, 0, 0, 1, 1], this.sids1, this.oids1);
          actual = SummaryHelper.unifrac(biomTable, this.t1Obj, Array(this.sids1[0]),Array(this.sids1[1]));
          equal(actual, expected);
        });

        test('Test unifrac zero counts', function() {
          var biomTable = setupBiomTable([1, 1, 1, 0, 0], [0, 0, 0, 0, 0], this.sids1, this.oids1);
          var actual = SummaryHelper.unifrac(biomTable, this.t1Obj, Array(this.sids1[0]),Array(this.sids1[1]));
          var expected = 1.0;
          equal(actual, expected);

          biomTable = setupBiomTable([0, 0, 0, 0, 0], [0, 0, 0, 0, 0], this.sids1, this.oids1);
          actual = SummaryHelper.unifrac(biomTable, this.t1Obj, Array(this.sids1[0]),Array(this.sids1[1]));
          expected = 0.0;
          equal(actual, expected);

          biomTable = setupBiomTable([], [], this.sids1, this.oids1)
          actual = SummaryHelper.unifrac(biomTable, this.t1Obj, Array(this.sids1[0]),Array(this.sids1[1]));
          expected = 0.0;
          equal(actual, expected);
        });

        test('Test unifrac', function() {
          /*
          expected results derived from QIIME 1.9.1, which
          is a completely different implementation skbio's initial
          unweighted unifrac implementation
          sample A versus all
          */
          // maxDiff we allow when comparing floats
          var maxDiff = 0.0000001;
          var expected  = [
            [0,0.238095238095,0.52,0.52, 0.545454545455, 0.619047619048],
            [0,0,0.347826086957, 0.347826086957, 0.68, 0.421052631579],
            [0,0,0, 0, 0.68, 0.421052631579],
            [0,0,0,0, 0.68, 0.421052631579 ],
            [0,0,0,0,0,1],
          ]
          for (var i = 0; i < this.b1.length-1; i++){
            for(var j = i+1; j < this.b1.length; j++){
              var biomTable = setupBiomTable(this.b1[i], this.b1[j], this.sids1, this.oids1);
              var actual = SummaryHelper.unifrac(biomTable, this.t1Obj, Array(this.sids1[0]), Array(this.sids1[1]));
              almostEqual(actual, expected[i][j], maxDiff);
            }
          }
        });

        test('Test unifrac pycogent', function() {

          // adapted from PyCogent unit tests
          var m = [
            [1,1,0,0,0,0,1,0,1],
            [0,1,1,0,1,1,1,1,1],
            [1,0,0,1,0,1,1,1,1]
          ];

          // lengths from ((a:1,b:2):4,(c:3,(d:1,e:1):2):3)
          var bl = [1, 2, 1, 1, 3, 2, 4, 3, 0];
          var lengths = [0, 4.0, 1.0, 2.0, 3.0, 3.0, 2.0, 1.0, 1.0];
          var names = ['EmpressNode3', 'EmpressNode0', 'a', 'b', 'EmpressNode2', 'c', 'EmpressNode1', 'd', 'e'];
          var t = new Uint8Array([1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0]);
          var tObj = new BPTree(t, names, lengths);
          var oids = ['a', 'b', 'd', 'e', 'c', 'EmpressNode1', 'EmpressNode0', 'EmpressNode2', 'EmpressNode3'];

          var biomTable = setupBiomTable(m[0], m[1], this.sids1, oids);
          var actual = SummaryHelper.unifrac(biomTable, tObj, Array(this.sids1[0]), Array(this.sids1[1]));
          var expected = 10/16.0;
          equal(actual, expected);

          biomTable = setupBiomTable(m[0], m[2], this.sids1, oids);
          actual = SummaryHelper.unifrac(biomTable, tObj, Array(this.sids1[0]), Array(this.sids1[1]));
          var expected = 8/13.0;
          equal(actual, expected);

          biomTable = setupBiomTable(m[1], m[2], this.sids1, oids);
          actual = SummaryHelper.unifrac(biomTable, tObj, Array(this.sids1[0]), Array(this.sids1[1]));
          var expected = 8/17.0;
          equal(actual, expected);
        });
        
        // test unifrac large, from file crawford.tre and crawford.biom
        test('Test unifrac pairwise', function() {

            var bpArray =  new Uint8Array([1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

            var names = ['EmpressNode353', 'EmpressNode352', '169901', 'EmpressNode351', '100344', 'EmpressNode350', 'EmpressNode289', '1684221', 'EmpressNode288', 'EmpressNode0', '1136443', '4374042', 'EmpressNode287', 'p__Firmicutes', 'EmpressNode2', 'EmpressNode1', '263705', '376397', '263452', 'EmpressNode275', 'c__Clostridia; o__Clostridiales', 'EmpressNode4', 'EmpressNode3', '229459', '1571092', '827195', 'EmpressNode8', 'EmpressNode7', 'EmpressNode5', '162991', '318370', 'EmpressNode6', '267689', '335952', '276044', 'EmpressNode274', 'EmpressNode269', 'EmpressNode17', '186521', 'EmpressNode16', 'EmpressNode14', 'EmpressNode9', '195840', '181603', 'EmpressNode13', '269378', 'EmpressNode12', 'EmpressNode11', 'EmpressNode10', '215193', '199307', '344527', '187790', 'EmpressNode15', '267041', '441494', 'EmpressNode268', 'EmpressNode22', '274438', 'EmpressNode21', 'EmpressNode20', '268121', 'EmpressNode19', '194787', 'EmpressNode18', '337331', '267411', '181205', 'EmpressNode267', '4418586', 'EmpressNode266', 'EmpressNode263', 'EmpressNode142', 'c__Clostridia; o__Clostridiales', 'EmpressNode31', 'EmpressNode25', 'EmpressNode23', '4471135', '195445', 'EmpressNode24', '172705', '2575787', 'EmpressNode30', '269576', 'EmpressNode29', 'EmpressNode27', 'EmpressNode26', '259593', '1105328', '208571', 'EmpressNode28', '182621', '271449', '181419', 'EmpressNode141', 'c__Clostridia; o__Clostridiales; f__Lachnospiraceae', 'EmpressNode51', 'EmpressNode38', 'EmpressNode36', 'EmpressNode35', 'EmpressNode34', '191958', 'EmpressNode33', 'EmpressNode32', '316842', '194822', '175432', '343906', '3392842', 'EmpressNode37', '351881', '346098', 'EmpressNode50', 'EmpressNode48', 'EmpressNode47', 'EmpressNode45', 'EmpressNode39', '191077', '351794', 'EmpressNode44', 'EmpressNode41', 'EmpressNode40', '4364243', '261419', '231169', 'EmpressNode43', '403497', 'EmpressNode42', '261334', '340189', 'EmpressNode46', '293580', '3265889', '292745', 'EmpressNode49', '322062', '190273', 'EmpressNode56', '288931', 'EmpressNode55', 'EmpressNode52', '553395', '302407', 'EmpressNode54', '833390', 'EmpressNode53', '275707', '450047', 'EmpressNode140', 'EmpressNode103', '132114', 'EmpressNode102', 'c__Clostridia; o__Clostridiales', '274422', 'EmpressNode57', '314810', '422727', 'EmpressNode101', 'EmpressNode100', 'c__Clostridia; o__Clostridiales', 'EmpressNode89', 'EmpressNode86', 'f__Ruminococcaceae; g__Ruminococcus', 'EmpressNode61', 'EmpressNode60', 'EmpressNode59', '190242', 'EmpressNode58', '265940', '170950', '187133', '4417539', 'EmpressNode62', '267452', '231021', 'EmpressNode85', 'EmpressNode83', '550807', 'EmpressNode82', 'g__Oscillospira', 'EmpressNode75', 'EmpressNode74', 'EmpressNode70', 'EmpressNode69', 'EmpressNode68', 'EmpressNode67', '4484382', 'EmpressNode66', 'EmpressNode65', 'EmpressNode64', '276404', 'EmpressNode63', '258725', '4403349', '321484', '263546', '196194', '269019', '270385', 'EmpressNode73', 'EmpressNode71', '182033', '263165', 'EmpressNode72', '260753', '191816', '270519', 'EmpressNode80', 'EmpressNode79', 'EmpressNode78', 'EmpressNode76', '262677', '272953', 'EmpressNode77', '187807', '276985', '263106', '176118', 'EmpressNode81', '170555', '263044', 'f__Clostridiaceae', '301870', 'EmpressNode84', '259212', '185222', 'EmpressNode88', 'EmpressNode87', '732128', '166099', '4480176', 'EmpressNode91', 'EmpressNode90', '179188', '194662', '261511', 'EmpressNode99', '273084', 'c__Erysipelotrichi', 'EmpressNode96', 'EmpressNode95', 'EmpressNode94', 'EmpressNode93', '260663', 'EmpressNode92', '265786', '260397', '275627', '4396877', '828435', 'EmpressNode98', 'EmpressNode97', '45363', '259266', '4407703', '262409', 'EmpressNode139', 'EmpressNode121', '262766', 'EmpressNode120', '180206', 'EmpressNode119', 'EmpressNode115', 'EmpressNode104', '262869', '260655', 'EmpressNode114', 'EmpressNode108', 'EmpressNode105', '349142', '195385', 'EmpressNode107', 'EmpressNode106', '176858', '263362', '233313', 'EmpressNode113', 'EmpressNode111', 'EmpressNode110', '178031', 'EmpressNode109', '259263', '263946', '268416', 'EmpressNode112', '97294', '258969', 'EmpressNode118', 'EmpressNode117', 'EmpressNode116', '187703', '259056', '191772', '276260', 'EmpressNode138', 'EmpressNode123', 'EmpressNode122', '184151', '176039', '310490', 'EmpressNode137', 'EmpressNode136', '333053', 'EmpressNode135', 'EmpressNode134', 'EmpressNode132', 'EmpressNode129', 'EmpressNode128', 'EmpressNode127', 'EmpressNode125', 'EmpressNode124', '331965', '261409', '185777', 'EmpressNode126', '259434', '276531', '303479', '263908', 'EmpressNode131', 'EmpressNode130', '258522', '274021', '181344', 'EmpressNode133', '272454', '176850', '275563', '318563', 'EmpressNode262', 'EmpressNode258', 'EmpressNode232', 'EmpressNode180', 'EmpressNode150', 'EmpressNode143', '312476', '174272', 'EmpressNode149', 'EmpressNode146', 'EmpressNode144', '268755', '268581', 'EmpressNode145', '179719', '264021', 'EmpressNode148', '260058', 'EmpressNode147', '167204', '829401', 'EmpressNode179', 'EmpressNode176', 'EmpressNode174', 'EmpressNode163', 'EmpressNode159', 'EmpressNode154', 'EmpressNode153', 'EmpressNode151', '178926', '196825', 'EmpressNode152', '443945', '310748', '260756', 'EmpressNode158', 'EmpressNode157', 'EmpressNode156', 'EmpressNode155', '233817', '259910', '197775', '130335', '4365109', 'EmpressNode162', 'EmpressNode160', '334365', '271766', 'EmpressNode161', '206494', '181249', 'EmpressNode173', 'EmpressNode172', 'EmpressNode169', 'EmpressNode165', 'EmpressNode164', '265828', '216403', '180919', 'EmpressNode168', 'EmpressNode166', '270662', '229386', 'EmpressNode167', '187989', '164308', 'EmpressNode171', 'EmpressNode170', '307595', '178779', '259888', '173417', 'EmpressNode175', '186526', '233411', 'EmpressNode178', '301012', 'EmpressNode177', '266483', '839215', 'EmpressNode231', 'EmpressNode228', 'EmpressNode223', 'EmpressNode221', 'EmpressNode194', 'EmpressNode188', 'EmpressNode185', '175416', 'EmpressNode184', 'EmpressNode183', 'EmpressNode181', '181141', '197216', 'EmpressNode182', '273515', '188536', '697874', 'EmpressNode187', '179181', 'EmpressNode186', '268923', '351859', 'EmpressNode193', 'EmpressNode192', 'EmpressNode191', 'EmpressNode189', '185743', '274844', 'EmpressNode190', '190460', '192971', '270396', '336145', 'EmpressNode220', 'EmpressNode207', 'EmpressNode200', '274597', 'EmpressNode199', 'EmpressNode195', '259228', '264373', 'EmpressNode198', 'EmpressNode197', 'EmpressNode196', '343581', '266595', '269359', '275150', 'EmpressNode206', '197790', 'EmpressNode205', 'EmpressNode201', '274106', '260828', 'EmpressNode204', 'EmpressNode203', '180105', 'EmpressNode202', '196777', '179063', '177802', 'EmpressNode219', 'EmpressNode216', 'EmpressNode212', 'EmpressNode210', 'EmpressNode209', 'EmpressNode208', '275078', '271378', '276580', '260653', 'EmpressNode211', '259335', '269992', 'EmpressNode215', '261606', 'EmpressNode214', 'EmpressNode213', '260205', '837473', '259175', 'EmpressNode218', '272812', 'EmpressNode217', '275136', '265641', 'EmpressNode222', '180362', '214471', 'EmpressNode227', 'EmpressNode225', '276663', 'EmpressNode224', '1108453', '267457', 'EmpressNode226', '174959', '185754', 'EmpressNode230', '181091', 'EmpressNode229', '319909', '4462541', 'EmpressNode257', 'EmpressNode254', 'EmpressNode252', 'EmpressNode234', 'EmpressNode233', '291750', '178659', '350381', 'EmpressNode251', 'EmpressNode249', 'EmpressNode246', 'EmpressNode239', 'EmpressNode236', '314963', 'EmpressNode235', '234121', '274018', 'EmpressNode238', 'EmpressNode237', '330296', '343420', '267388', 'EmpressNode245', 'EmpressNode243', '175573', 'EmpressNode242', 'EmpressNode241', 'EmpressNode240', '274521', '191887', '2120775', '436341', 'EmpressNode244', '199181', '266816', 'EmpressNode248', 'EmpressNode247', '180972', '183211', '227886', 'EmpressNode250', '348398', '270491', 'EmpressNode253', '327236', '182016', 'EmpressNode256', '258250', 'EmpressNode255', '275819', '275470', 'EmpressNode261', 'EmpressNode259', '320490', '311174', 'EmpressNode260', '193463', '191398', 'EmpressNode265', 'EmpressNode264', '354957', '183390', '275869', 'EmpressNode273', '461524', 'EmpressNode272', 'EmpressNode271', '265106', 'EmpressNode270', '178735', '267123', '199403', 'EmpressNode286', 'EmpressNode276', '115186', '687185', 'EmpressNode285', '214919', 'EmpressNode284', 'EmpressNode283', 'EmpressNode279', 'EmpressNode278', 'EmpressNode277', '4397402', '187233', '166911', '4338733', 'EmpressNode282', 'EmpressNode281', 'EmpressNode280', '452823', '259372', '239571', '135956', '303652', 'EmpressNode349', 'EmpressNode344', 'EmpressNode337', 'EmpressNode300', 'EmpressNode298', 'EmpressNode293', 'EmpressNode292', '1107945', 'EmpressNode291', 'EmpressNode290', '2137001', '4468234', '191483', '353782', 'EmpressNode297', 'EmpressNode295', 'EmpressNode294', '4346374', '184567', '4414420', 'EmpressNode296', '4372578', '3621189', 'EmpressNode299', '4449524', '173807', 'EmpressNode336', 'EmpressNode308', 'EmpressNode306', 'EmpressNode305', 'EmpressNode304', 'EmpressNode303', 'EmpressNode302', '3206355', 'EmpressNode301', '260387', '269902', '179069', '182995', '174663', '196138', 'EmpressNode307', '262399', '262166', 'EmpressNode335', 'EmpressNode313', 'EmpressNode311', 'EmpressNode310', 'EmpressNode309', '194978', '187078', '177205', '259249', 'EmpressNode312', '187644', '163862', 'EmpressNode334', 'EmpressNode330', 'EmpressNode321', 'EmpressNode319', 'EmpressNode318', 'EmpressNode315', 'EmpressNode314', '197318', '186497', '167078', 'EmpressNode317', '176886', 'EmpressNode316', '174754', '174791', '264496', 'EmpressNode320', '259609', '380534', 'EmpressNode329', 'EmpressNode325', 'EmpressNode322', '275339', '264787', 'EmpressNode324', '210950', 'EmpressNode323', '204144', '195005', 'EmpressNode328', 'EmpressNode327', '261177', 'EmpressNode326', '174056', '199698', '259012', 'EmpressNode333', 'EmpressNode331', '183106', '177427', 'EmpressNode332', '270984', '259859', 'EmpressNode343', 'EmpressNode342', 'EmpressNode341', 'EmpressNode340', 'EmpressNode338', '199534', '4127460', 'EmpressNode339', '169398', '336214', '276172', '270391', '4331760', 'EmpressNode348', 'f__[Odoribacteraceae]', 'EmpressNode345', '2112006', '170335', '3117556', 'EmpressNode347', '847228', 'EmpressNode346', '4329571', '4442459'];

            var lengths = [0, 0.19527, 0.39755, 0.08322, 0.37296, 0.02085, 0.01143, 0.33084, 0.02284, 0.2205, 0.00014, 0.00204, 0.04842, 0.00964, 0.09446, 0.02493, 0.02657, 0.05743, 0.09328, 0.06256, 0.01046, 0.16617, 0.03291, 0.04726, 0.0371, 0.03981, 0.02402, 0.08285, 0.00873, 0.01263, 0.02928, 0.00962, 0.0087, 0.01692, 0.25511, 0.03382, 0.01217, 0.01105, 0.09255, 0.00686, 0.01861, 0.0487, 0.05097, 0.04737, 0.06458, 0.05555, 0.05223, 0.01912, 0.03584, 0.01971, 0.02787, 0.06642, 0.06549, 0.00852, 0.06668, 0.29606, 0.01695, 0.00953, 0.08266, 0.00228, 0.00293, 0.04956, 0.01187, 0.05527, 0.00656, 0.0305, 0.12086, 0.07086, 0.00127, 0.09245, 0.03292, 0.00744, 0.00336, 0.00169, 0.00147, 0.00173, 0.00973, 0.04783, 0.06353, 0.01157, 0.09236, 0.21784, 0.01507, 0.04917, 0.01471, 0.0008, 0.00102, 0.02332, 0.012, 0.01117, 0.00713, 0.08672, 0.02772, 0.03032, 0.0016, 0.00448, 0.00451, 0.048, 0.00315, 0.00921, 0.00247, 0.01976, 0.01834, 0.00721, 0.02735, 0.01128, 0.01301, 0.02151, 0.00869, 0.00695, 0.04144, 0.02522, 0.00564, 0.00014, 0.00543, 0.00429, 0.00467, 0.05103, 0.07438, 0.00753, 0.0132, 0.01097, 0.04249, 0.04021, 0.01264, 0.00256, 0.04479, 0.01024, 0.01174, 0.05963, 0.00656, 0.02795, 0.05414, 0.04202, 0.04098, 0.01797, 0.01058, 0.01294, 0.03379, 0.0115, 0.01312, 0.05483, 0.0199, 0.0492, 0.00627, 0.01342, 0.02319, 0.00348, 0.0007, 0.00805, 0.18434, 0.01056, 0.00016, 0.21213, 0.08472, 0.04013, 0.06862, 0.00839, 0.01284, 0.00284, 0.0112, 0.00843, 0.01162, 0.01312, 0.03409, 0.05634, 0.01884, 0.03275, 0.00636, 0.02803, 0.06732, 0.16601, 0.22655, 0.01884, 0.02579, 0.01303, 0.02515, 0.14219, 0.02295, 0.02244, 0.022, 0.00674, 0.02724, 0.00207, 0.01292, 0.00344, 0.03105, 0.04859, 0.00374, 0.02161, 0.01013, 0.01233, 0.01776, 0.01479, 0.05463, 0.05758, 0.03084, 0.02212, 0.07485, 0.05687, 0.0503, 0.00895, 0.00701, 0.0122, 0.01819, 0.05696, 0.05105, 0.04356, 0.06462, 0.0029, 0.01976, 0.00993, 0.00844, 0.00809, 0.0179, 0.03212, 0.01522, 0.04609, 0.19443, 0.01542, 0.02129, 0.02365, 0.15284, 0.03418, 0.12329, 0.23345, 0.21389, 0.00226, 0.0582, 0.08664, 0.02225, 0.01032, 0.00318, 0.04915, 0.09909, 0.06272, 0.00127, 0.05892, 0.11955, 0.08237, 0.01023, 0.14991, 0.00014, 0.02738, 0.00102, 0.02702, 0.00524, 0.06381, 0.05675, 0.05156, 0.13663, 0.01623, 0.01629, 0.05658, 0.06932, 0.18866, 0.0081, 0.00603, 0.04848, 0.00758, 0.05998, 0.02587, 0.01331, 0.00395, 0.07152, 0.03801, 0.00851, 0.00147, 0.00159, 0.02154, 0.00634, 0.00408, 0.0004, 0.01629, 0.01476, 0.00963, 0.0039, 0.00532, 0.00147, 0.01612, 0.07026, 0.0181, 0.02447, 0.00842, 0.00502, 0.02181, 0.03813, 0.0168, 0.01041, 0.01444, 0.03164, 0.01433, 0.02529, 0.03673, 0.00257, 0.00551, 0.05897, 0.03171, 0.02716, 0.04338, 0.01131, 0.00923, 0.04164, 0.00741, 0.01607, 0.00176, 0.01457, 0.00508, 0.00853, 0.04786, 0.01822, 0.08704, 0.01737, 0.01487, 0.01824, 0.02291, 0.02123, 0.02542, 0.04835, 0.00566, 0.00554, 0.02949, 0.05646, 0.04727, 0.01689, 0.03068, 0.06171, 0.01872, 0.06893, 0.00971, 0.00187, 0.00421, 0.00433, 0.01245, 0.00785, 0.02917, 0.04651, 0.00992, 0.00394, 0.00878, 0.01177, 0.02385, 0.00417, 0.04377, 0.05912, 0.00244, 0.03496, 0.03983, 0.01011, 0.01565, 0.01471, 0.00533, 0.00441, 0.00474, 0.00157, 0.00669, 0.01777, 0.00883, 0.02199, 0.01879, 0.03013, 0.02387, 0.00905, 0.01673, 0.00354, 0.00866, 0.00786, 0.0001, 0.00475, 0.01695, 0.02372, 0.03254, 0.0344, 0.00257, 0.00976, 0.03359, 0.03304, 0.01657, 0.02039, 0.04899, 0.0056, 0.01198, 0.00272, 0.00659, 0.00681, 0.01611, 0.03131, 0.07082, 0.01998, 0.04132, 0.04106, 0.01722, 0.01745, 0.01675, 0.02502, 0.0098, 0.01155, 0.04286, 0.01324, 0.06879, 0.03133, 0.06098, 0.01221, 0.0164, 0.00659, 0.03892, 0.02063, 0.02079, 0.0076, 0.0035, 0.00361, 0.00489, 0.01462, 0.00759, 0.00429, 0.00368, 0.06589, 0.0203, 0.009, 0.00062, 0.02134, 0.04356, 0.0068, 0.06915, 0.03918, 0.0303, 0.00565, 0.08572, 0.03893, 0.11712, 0.05093, 0.00809, 0.00157, 0.00889, 0.02997, 0.07302, 0.06304, 0.0557, 0.01175, 0.02492, 0.13586, 0.06697, 0.01207, 0.01445, 0.00596, 0.05276, 0.01243, 0.00411, 0.09494, 0.04067, 0.01442, 0.00928, 0.00128, 0.00883, 0.03526, 0.02279, 0.04595, 0.0135, 0.07695, 0.00679, 0.00728, 0.03127, 0.02915, 0.01597, 0.00667, 0.00572, 0.02629, 0.02608, 0.02119, 0.01713, 0.01447, 0.01365, 0.00607, 0.00577, 0.00745, 0.00987, 0.05198, 0.04527, 0.06941, 0.01951, 0.02089, 0.00857, 0.01649, 0.03771, 0.01776, 0.01057, 0.01931, 0.01675, 0.0327, 0.0661, 0.05327, 0.01332, 0.01641, 0.0504, 0.04142, 0.02282, 0.0488, 0.03306, 0.00679, 0.00558, 0.07249, 0.01011, 0.12347, 0.04345, 0.08833, 0.05484, 0.01372, 0.0137, 0.05605, 0.05346, 0.01099, 0.01663, 0.00479, 0.00015, 0.00697, 0.01138, 0.00913, 0.01414, 0.02705, 0.03212, 0.016, 0.04236, 0.00294, 0.00348, 0.00336, 0.02373, 0.01383, 0.00158, 0.01522, 0.00813, 0.00199, 0.00877, 0.00828, 0.05277, 0.0044, 0.04471, 0.00729, 0.02026, 0.0148, 0.00412, 0.02619, 0.02143, 0.03204, 0.01208, 0.01288, 0.05741, 0.03119, 0.00806, 0.01057, 0.00911, 0.01607, 0.01216, 0.02149, 0.00318, 0.02772, 0.02379, 0.072, 0.06278, 0.01639, 0.03667, 0.0143, 0.02306, 0.00947, 0.05332, 0.00144, 0.04718, 0.01972, 0.03482, 0.0092, 0.04605, 0.0236, 0.00734, 0.05068, 0.04344, 0.07717, 0.23533, 0.11627, 0.05723, 0.01912, 0.03592, 0.02808, 0.03407, 0.02167, 0.02374, 0.05025, 0.18622, 0.01033, 0.04697, 0.0439, 0.07235, 0.07926, 0.05536, 0.05395, 0.01203, 0.00016, 0.02449, 0.04148, 0.01405, 0.18171, 0.04831, 0.00333, 0.00255, 0.00238, 0.01508, 0.02438, 0.03044, 0.15985, 0.39352, 0.02804, 0.05356, 0.08539, 0.11232, 0.08438, 0.08626, 0.00015, 0.03914, 0.00026, 0.03611, 0.02727, 0.02217, 0.02512, 0.0072, 0.01346, 0.01612, 0.02476, 0.04246, 0.02265, 0.04814, 0.00847, 0.03839, 0.01949, 0.14634, 0.22514, 0.0886, 0.0058, 0.02537, 0.00966, 0.00805, 0.01129, 0.01394, 0.05575, 0.02831, 0.01306, 0.00981, 0.04071, 0.11183, 0.06637, 0.06604, 0.09631, 0.01744, 0.00828, 0.00502, 0.01184, 0.01125, 0.01066, 0.00763, 0.0156, 0.01205, 0.03615, 0.01811, 0.02417, 0.03502, 0.01646, 0.00583, 0.00568, 0.0004, 0.00496, 0.00569, 0.00273, 0.03022, 0.0139, 0.02106, 0.05416, 0.01009, 0.02207, 0.0392, 0.014, 0.0416, 0.0376, 0.01009, 0.02492, 0.02199, 0.00235, 0.02039, 0.01257, 0.01699, 0.00088, 0.01172, 0.01363, 0.02314, 0.006, 0.0172, 0.02085, 0.00627, 0.03474, 0.01406, 0.03568, 0.08361, 0.05891, 0.00961, 0.01459, 0.04258, 0.02913, 0.02522, 0.02958, 0.03521, 0.11283, 0.02348, 0.00497, 0.00367, 0.0077, 0.02102, 0.03563, 0.02565, 0.01634, 0.01107, 0.01705, 0.0711, 0.04459, 0.02217, 0.0905, 0.03176, 0.09488, 0.05985, 0.13918, 0.14176, 0.03654, 0.03366, 0.02548, 0.01181];

            var bpObj = new BPTree(bpArray, names, lengths);

            var sIds = ['10084.PC.481', '10084.PC.593', '10084.PC.356', '10084.PC.355',
            '10084.PC.354', '10084.PC.636', '10084.PC.635', '10084.PC.607',
            '10084.PC.634'];

            var obs = {'10084.PC.481': ['197790', '206494', '181344', '214919', '265786', '172705', '169398', '273084', '3265889', '4365109', '233411', '452823', '177802', '176039', '177427', '178779', '1107945', '163862', '307595', '275150', '346098', '333053', '259056', '233313', '178031', '173417', '182621', '259372', '175416', '350381', '318370', '214471', '4417539', '170555', '180919', '176850', '4364243', '233817', '259434', '260205', '336145', '179063', '179719', '185743', '215193', '4468234', '97294', '259263', '227886', '272454', '195385', '267041', '267123', '349142', '260397', '274106', '275136', '4338733', '314810', '195005', '269902', '259228', '4397402', '264496', '194662', '261419', '269576', '199534', '276172', '263946', '293580', '270385', '173807', '175432'], '10084.PC.593': ['197790', '180206', '265786', '274422', '270662', '186497', '264787', '343420', '266483', '348398', '270396', '191077', '271378', '182016', '269992', '176886', '316842', '259372', '4372578', '314963', '100344', '177205', '839215', '191958', '179069', '194978', '259212', '259266', '192971', '239571', '260397', '274844', '3621189', '195005', '276985', '380534', '320490', '174056', '180972', '259910', '135956', '234121', '267457', '267452', '259593', '181419', '187078', '183211', '173807', '260387'], '10084.PC.356': ['276580', '206494', '195840', '181249', '185777', '331965', '169398', '4365109', '186497', '337331', '354957', '274018', '183106', '178926', '351859', '130335', '259888', '266483', '231021', '181205', '196194', '4480176', '436341', '231169', '259335', '187703', '191816', '275078', '233313', '336214', '262869', '262166', '177205', '839215', '216403', '199181', '260756', '194787', '3392842', '4484382', '184151', '227886', '260653', '229386', '204144', '334365', '314810', '187233', '343581', '291750', '301012', '174754', '4397402', '351881', '174056', '180972', '263546', '322062', '162991', '274021', '175573', '259859', '187807', '263362', '259175', '188536', '176118', '833390', '173807', '266816', '182995'], '10084.PC.355': ['206494', '4329571', '169398', '274018', '183106', '351859', '2575787', '266483', '260828', '4480176', '268416', '176039', '351794', '553395', '259335', '176886', '191887', '259056', '178659', '174272', '310748', '336214', '550807', '177205', '839215', '274521', '262766', '176858', '268121', '233817', '199698', '260756', '260753', '336145', '196138', '275869', '276260', '270984', '302407', '258969', '4468234', '227886', '174791', '732128', '192971', '180105', '195005', '269902', '174754', '4397402', '351881', '264496', '180972', '340189', '135956', '175573', '4471135', '181603', '833390', '182995', '310490', '2120775', '260387', '190460', '186526'], '10084.PC.354': ['206494', '268581', '330296', '195840', '4365109', '263044', '196825', '183106', '265828', '292745', '269378', '343420', '194822', '348398', '262677', '263452', '4480176', '187133', '270491', '190273', '436341', '268755', '450047', '195445', '178659', '550807', '376397', '177205', '839215', '4462541', '261409', '216403', '199181', '336145', '260058', '276260', '259212', '4468234', '181141', '227886', '166911', '443945', '318563', '334365', '403497', '267388', '274844', '4338733', '314810', '1105328', '275627', '269902', '303479', '4397402', '351881', '264496', '180972', '183390', '187989', '135956', '162991', '175573', '259859', '275707', '4407703', '173807', '186521'], '10084.PC.636': ['180206', '258250', '1136443', '4329571', '174663', '259609', '180362', '276663', '186497', '183106', '262399', '178926', '45363', '179181', '837473', '259249', '275339', '687185', '4374042', '1107945', '4331760', '275470', '270391', '269992', '164308', '327236', '177205', '264373', '187644', '276044', '4484382', '4468234', '204144', '199403', '182033', '195005', '276985', '174056', '115186', '267689', '276172', '197318', '167078', '182995', '263165', '260387'], '10084.PC.635': ['258250', '174663', '259609', '311174', '258522', '169398', '3265889', '271449', '264787', '3117556', '337331', '274018', '261606', '262399', '199307', '265641', '269378', '3206355', '263452', '344527', '275339', '4374042', '259335', '1107945', '269359', '270391', '176886', '828435', '259056', '178659', '336214', '550807', '190242', '174959', '214471', '274597', '177205', '272812', '166099', '233817', '229459', '199698', '260205', '275819', '266595', '4468234', '4403349', '182033', '269902', '1108453', '187790', '422727', '4449524', '267689', '162991', '4414420', '193463', '276172', '197318', '270519', '276404', '191398', '176118', '167078', '266816', '182995', '697874', '321484', '170335', '260387', '4418586'], '10084.PC.607': ['827195', '1136443', '276531', '265940', '265786', '259609', '258522', '169398', '264787', '185222', '179188', '196777', '210950', '197775', '263106', '181091', '4374042', '270391', '319909', '272953', '269992', '167204', '263705', '190242', '461524', '259012', '318370', '100344', '273515', '4462541', '271766', '336145', '261334', '170950', '260058', '266595', '312476', '275563', '270984', '262409', '261177', '260397', '288931', '267411', '269902', '274438', '263908', '380534', '335952', '258725', '194662', '191772', '174056', '303652', '260663', '267689', '1571092', '266816', '182995', '1684221', '260387', '197216'], '10084.PC.634': ['214919', '174663', '169398', '276663', '186497', '264021', '2112006', '3117556', '185222', '266483', '275339', '2137001', '191077', '4374042', '191483', '343906', '1107945', '270391', '353782', '176886', '132114', '178031', '847228', '265106', '4127460', '261511', '185754', '268121', '178735', '276044', '4396877', '829401', '4468234', '184567', '269019', '260655', '261177', '301870', '208571', '195005', '269902', '276985', '4414420', '276172', '441494', '4346374', '169901', '182995', '4442459', '268923', '170335']};

            var biomTable = new BiomTable(obs, this.samp);

            // Distance matrix of pairwise unifrac
            var exp = [
              [0., 0.71836067, 0.71317361, 0.69746044, 0.62587207, 0.72826674,
                0.72065895, 0.72640581, 0.73606053],
              [0.71836067, 0.        , 0.70302967, 0.73407301, 0.6548042,  0.71547381,
                0.78397813, 0.72318399, 0.76138933],
              [0.71317361, 0.70302967, 0.        , 0.61041275, 0.62331299, 0.71848305,
                0.70416337, 0.75258475, 0.79249029],
              [0.69746044, 0.73407301, 0.61041275, 0.        , 0.64392779, 0.70052733,
                0.69832716, 0.77818938, 0.72959894],
              [0.62587207, 0.6548042 , 0.62331299, 0.64392779, 0.       ,  0.75782689,
                0.71005144, 0.75065046, 0.78944369],
              [0.72826674, 0.71547381, 0.71848305, 0.70052733, 0.75782689, 0.,
                0.63593642, 0.71283615, 0.58314638],
              [0.72065895, 0.78397813, 0.70416337, 0.69832716, 0.71005144, 0.63593642,
                0.        , 0.69200762, 0.68972056],
              [0.72640581, 0.72318399, 0.75258475, 0.77818938, 0.75065046, 0.71283615,
                0.69200762, 0.        , 0.71514083],
              [0.73606053, 0.76138933, 0.79249029, 0.72959894, 0.78944369, 0.58314638,
                0.68972056, 0.71514083, 0.        ]
            ];

            // maxDiff we allow when comparing floats
            var maxDiff = 0.0000001;
                for (var i = 0; i < sIds.length; ++i){
                    for (var j = 0; j < sIds.length; ++j){
                        var actual = SummaryHelper.unifrac(biomTable, bpObj, Array(sIds[i]), Array(sIds[j]));
                        almostEqual(actual, exp[i][j], maxDiff);
                    }
                }

        });
    });
});
