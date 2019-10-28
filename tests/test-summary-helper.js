require(['jquery', 'ByteArray', 'BPTree', 'BiomTable', 'SummaryHelper'], function($, ByteArray, BPTree, BiomTable, SummaryHelper) {
    $(document).ready(function() {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray without
        // effecting other test
        module('SummaryHelper' , {
            setup: function() {
                this.bpArray = new Uint8Array([1, 1, 1, 0, 1, 0, 1, 1 ,0, 0, 0,
                        1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]);

                //this.names = ["0","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21"];

                this.names = [...Array(10).keys()];
                this.lengths = this.names.map(k => parseInt(k));
                this.bpObj = new BPTree(this.bpArray, this.names, this.lengths);

                this.obs = {"1": [2, 3],"2":[3,4,5],"3":[8,4,6]};
                this.samp = {
                  "1": {"cat1": 0},
                  "2": {"cat2": 0},
                  "3": {"cat3": 0}
                };
                this.biomTable = new BiomTable(this.obs, this.samp);

                // rank caches
                this.r0 = ByteArray.sumVal(this.bpArray, Uint32Array, 0);
                this.r1 = ByteArray.sumVal(this.bpArray, Uint32Array, 1);

                // select caches
                this.s0 = ByteArray.seqUniqueIndx(this.r0, Uint32Array);
                this.s1 = ByteArray.seqUniqueIndx(this.r1, Uint32Array);
            },

            teardown: function() {
                this.bpArray = null;
            }
        });

        // tests unifrac
        test('Test unifrac', function() {
            var sIds1 = ["1", "3"]
            var sIds2 = ["1", "2"]
            equal(SummaryHelper.unifrac(this.biomTable, this.bpObj, sIds1, sIds2), 19/28);
        });

    });
});
