require(['jquery', 'ByteArray', 'BPTree'], function($, ByteArray, BPTree) {
    $(document).ready(function() {

        // test variables
        var bpArray;
        var bpObj;
        var r0, r1, s0, s1;

        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray without
        // effecting other test
        module('Succinct Tree' , {
            setup: function() {
                bpArray = new Uint8Array([1, 1, 1, 0, 1, 0, 1, 1 ,0, 0, 0, 1, 0,
                        1, 1, 1, 0, 1, 0, 0, 0, 0]);
                bpObj = new BPTree(bpArray);

                // rank caches
                r0 = ByteArray.sumVal(bpArray, Uint32Array, 0);
                r1 = ByteArray.sumVal(bpArray, Uint32Array, 1);

                // select caches
                s0 = ByteArray.seqUniqueIndx(r0, Uint32Array);
                s1 = ByteArray.seqUniqueIndx(r1, Uint32Array);
            },

            teardown: function() {
                bpArray = null;
            }
        });

        // tests the constructor of bp tree
        test('Test BP Constructor', function() {
            // Test if rank 0 cache was initialized correctly
            deepEqual(bpObj.r0Cache_, r0, 'Test: rank 0 cache');

            // Test if rank 1 cache was initialized correctly
            deepEqual(bpObj.r1Cache_, r1, 'Test: rank 1 cache');

            // Test if select 0 cache was initialized correctly
            deepEqual(bpObj.s0Cache_, s0, 'Test: select 0 cache');

            // Test if select 1 cached was initialized correctly
            deepEqual(bpObj.s1Cache_, s1, 'Test: select 1 cache');
        });

        test('Test rank', function() {
            // rank 0
            for (var i = 0; i < r0.length; i++) {
                equal(bpObj.rank(0, i), r0[i], `Rank 0: ${i}-th index`)
            }

            //rank 1
            for (var i = 0; i < r1.length; i++) {
                equal(bpObj.rank(1, i), r1[i], `Rank 1: ${i}-th index`)
            }
        });

        test('Test select', function() {
            // select 0
            for (var k = 0; k < s0.length; k++) {
                equal(bpObj.select(0, k + 1), s0[k], `Selec 0: ${k}-th node`);
            }

            // select 1
            for (var k = 0; k < s1.length; k++) {
                equal(bpObj.select(1, k + 1), s1[k], `Selec 0: ${k}-th node`);
            }
        });

        test('Test rank property', function() {
            var BIT_0 = 0, BIT_1 = 1;
            var l = bpArray.length;
            for (var i = 0; i < l; i++) {
                equal(bpObj.rank(BIT_0, i) + bpObj.rank(BIT_1, i), i + 1);
            }
        });

        test('Test rank-select property', function() {
            var s = {0 : s0, 1: s1};
            for (var bit in s) {
                var ks = s[bit];
                var t = parseInt(bit);
                for(var k = 0; k < ks.length; k++) {
                    equal(bpObj.rank(t, bpObj.select(t, k + 1)), k + 1);
                }
            }
        });

        test('Test excess', function() {
            var exp = [1, 2, 3, 2, 3, 2, 3, 4, 3, 2, 1, 2, 1, 2, 3, 4, 3, 4, 3,
                       2, 1, 0];
            for (var i = 0; i < exp.length; i++) {
                equal(bpObj.excess_(i), exp[i]);
            }
        });

        // Note: depth should equal to excess
        test('Test depth', function() {
            var exp = [1, 2, 3, 2, 3, 2, 3, 4, 3, 2, 1, 2, 1, 2, 3, 4, 3, 4, 3,
                       2, 1, 0];
            for (var i = 0; i < exp.length; i++) {
                equal(bpObj.depth(i), exp[i]);
            }
        });

        test('Test name/length unset', function() {
            equal(bpObj.names_, null ,'Name');
            equal(bpObj.lengths_, null, 'Length');
        });

        test('Test name/lenth set', function() {
            var names = [...Array(bpObj.size).keys()];
            var lengths =names.map(k => parseInt(k));
            var resBP = new BPTree(bpArray, names, lengths);
            for (var i = 0; i < bpObj.size; i++) {
                equal(resBP.name(i), names[i] ,'Name');
                equal(resBP.length(i), lengths[i], 'Length');
            }
        });

        test('Test fwdsearchNaive', function() {
            var exp = {
                10 : [0, 0],
                21 : [3, -2],
                15 : [11, 2]
            };
            for (var e in exp) {
                var res = bpObj.fwdsearchNaive(exp[e][0], exp[e][1]);
                equal(res, parseInt(e));
            }
        });

        test('Test bwdsearchNaive', function() {
            var exp = {
                1 : [3, 0],
                17 : [21, 4],
                7 : [9,2]
            };
            for (var e in exp) {
                var res = bpObj.bwdsearchNaive(exp[e][0], exp[e][1]);
                equal(res, parseInt(e));
            }
        });

        test('Test close', function() {
            var exp = [21, 10, 3, 5, 9, 8, 12, 20, 19, 16, 18];
            var n = 0;
            for (var i = 0; i < bpArray.length; i++) {
                if (bpArray[i]) {
                    equal(bpObj.close(i), exp[n++], `${n}-th open paren`);
                }
            }
        });

        test('Test open', function() {
            var exp = [2, 4, 7, 6, 1, 11, 15, 17, 14, 13, 0];
            var n = 0;
            for (var i = 0; i < bpArray.length; i++) {
                if (!bpArray[i]) {
                    equal(bpObj.open(i), exp[n++], `${n}-th close paren`)
                }
            }
        });

        test('Test enclose', function() {
            var exp = [0, 1, 1, 1, 1, 1, 6, 6, 1, 0, 0, 0, 0, 13, 14, 14, 14,
                       14, 13, 0];
            for (var i = 1; i < bpArray.length - 1; i++) {
                equal(bpObj.enclose(i), exp[i-1],
                    `${i}-th enclose paren: which is a ${bpArray[i]}`);
            }
        });

        test('Test parent', function() {
            var exp = [-1, 0, 1, 1, 1, 1, 1, 6, 6, 1, 0, 0, 0, 0, 13, 14,
                           14, 14, 14, 13, 0, -1];
            for (var i = 0; i < bpArray.length; i++) {
                equal(bpObj.parent(i), exp[i], `Parent for ${i}-th index`);
            }
        });

        test('Test root', function() {
            equal(bpObj.root(), 0);
        });

        test('Test isleaf', function() {
            var exp = [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0,
                       0, 0, 0];
            for (var i = 0; i < bpArray.length; i++) {
                equal(bpObj.isleaf(i), exp[i], `${i}-th index`);
            }
        });

        test('Test fchild', function() {
            var exp = [1, 2, 0, 0, 0, 0, 7, 0, 0, 7, 2, 0, 0, 14, 15, 0, 0, 0,
                       0, 15, 14, 1];
            for (var i = 0; i < bpArray.length; i++ ) {
                equal(bpObj.fchild(i), exp[i], `${i}-th index`);
            }
        });

        test('Test lchild', function() {
            var exp = [13, 6, 0, 0, 0, 0, 7, 0, 0, 7, 6, 0, 0, 14, 17, 0, 0, 0,
                       0, 17, 14, 13];
            for (var i = 0; i <bpArray.length; i++) {
                equal(bpObj.lchild(i), exp[i], `${i}-th index`);
            }
        });

        test('Test nsibling', function() {
            var exp = [0, 11, 4, 4, 6, 6, 0, 0, 0, 0, 11, 13, 13, 0, 0,
                             17, 17, 0, 0, 0, 0, 0];
            for (var i = 0; i < bpArray.length; i++) {
                equal(bpObj.nsibling(i), exp[i], `${i}-th index`);
            }
        });

        test('Test psibling', function() {
            var exp = [0, 0, 0, 0, 2, 2, 4, 0, 0, 4, 0, 1, 1, 11, 0, 0, 0, 15,
                       15, 0, 11, 0];
            for (var i = 0; i < bpArray.length; i++) {
                equal(bpObj.psibling(i), exp[i], `${i}-th index`);
            }
        });

        test('Test postorder', function() {
            var exp = [11, 5, 1, 1, 2, 2, 4, 3, 3, 4, 5, 6, 6, 10, 9, 7, 7, 8,
                        8, 9, 10, 11];
            for (var i = 0; i < exp.length; i++) {
                equal(bpObj.postorder(i), exp[i]);
            }
        });

        test('Test postorderselect', function() {
            var exp = [2, 4, 7, 6, 1, 11, 15, 17, 14, 13, 0];
            for (var k = 0; k < exp.length; k++) {
                equal(bpObj.postorderselect(k + 1), exp[k]);
            }
        });
    });
});