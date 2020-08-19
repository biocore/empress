require(["jquery", "ByteArray", "BPTree"], function ($, ByteArray, BPTree) {
    $(document).ready(function () {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray without
        // effecting other test
        module("Succinct Tree", {
            setup: function () {
                this.bpArray = new Uint8Array([
                    1,
                    1,
                    1,
                    0,
                    1,
                    0,
                    1,
                    1,
                    0,
                    0,
                    0,
                    1,
                    0,
                    1,
                    1,
                    1,
                    0,
                    1,
                    0,
                    0,
                    0,
                    0,
                ]);
                this.bpObj = new BPTree(
                    this.bpArray,
                    null,
                    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                    null
                );

                // rank caches
                this.r0 = ByteArray.sumVal(this.bpArray, Uint32Array, 0);
                this.r1 = ByteArray.sumVal(this.bpArray, Uint32Array, 1);

                // select caches
                this.s0 = ByteArray.seqUniqueIndx(this.r0, Uint32Array);
                this.s1 = ByteArray.seqUniqueIndx(this.r1, Uint32Array);
            },

            teardown: function () {
                this.bpArray = null;
            },
        });

        // tests the constructor of bp tree
        test("Test BP Constructor", function () {
            // Test if rank 0 cache was initialized correctly
            deepEqual(this.bpObj.r0Cache_, this.r0, "Test: rank 0 cache");

            // Test if rank 1 cache was initialized correctly
            deepEqual(this.bpObj.r1Cache_, this.r1, "Test: rank 1 cache");

            // Test if select 0 cache was initialized correctly
            deepEqual(this.bpObj.s0Cache_, this.s0, "Test: select 0 cache");

            // Test if select 1 cached was initialized correctly
            deepEqual(this.bpObj.s1Cache_, this.s1, "Test: select 1 cache");
        });

        test("Test rank", function () {
            // rank 0
            for (var i = 0; i < this.r0.length; i++) {
                equal(
                    this.bpObj.rank(0, i),
                    this.r0[i],
                    `Rank 0: ${i}-th index`
                );
            }

            // rank 1
            for (var j = 0; j < this.r1.length; j++) {
                equal(
                    this.bpObj.rank(1, j),
                    this.r1[j],
                    `Rank 1: ${j}-th index`
                );
            }
        });

        test("Test select", function () {
            // select 0
            for (var k = 0; k < this.s0.length; k++) {
                equal(
                    this.bpObj.select(0, k + 1),
                    this.s0[k],
                    `Selec 0: ${k}-th node`
                );
            }

            // select 1
            for (var kk = 0; kk < this.s1.length; kk++) {
                equal(
                    this.bpObj.select(1, kk + 1),
                    this.s1[kk],
                    `Selec 0: ${kk}-th node`
                );
            }
        });

        test("Test number of leaves", function () {
            equal(this.bpObj.numleaves(), 6);
        });

        test("Test rank property", function () {
            var BIT_0 = 0,
                BIT_1 = 1;
            var l = this.bpArray.length;
            for (var i = 0; i < l; i++) {
                equal(
                    this.bpObj.rank(BIT_0, i) + this.bpObj.rank(BIT_1, i),
                    i + 1
                );
            }
        });

        test("Test rank-select property", function () {
            var s = { 0: this.s0, 1: this.s1 };
            for (var bit in s) {
                var ks = s[bit];
                var t = parseInt(bit);
                for (var k = 0; k < ks.length; k++) {
                    equal(
                        this.bpObj.rank(t, this.bpObj.select(t, k + 1)),
                        k + 1
                    );
                }
            }
        });

        test("Test excess", function () {
            var exp = [
                1,
                2,
                3,
                2,
                3,
                2,
                3,
                4,
                3,
                2,
                1,
                2,
                1,
                2,
                3,
                4,
                3,
                4,
                3,
                2,
                1,
                0,
            ];
            for (var i = 0; i < exp.length; i++) {
                equal(this.bpObj.excess_(i), exp[i]);
            }
        });

        // Note: depth should equal to excess
        test("Test depth", function () {
            var exp = [
                1,
                2,
                3,
                2,
                3,
                2,
                3,
                4,
                3,
                2,
                1,
                2,
                1,
                2,
                3,
                4,
                3,
                4,
                3,
                2,
                1,
                0,
            ];
            for (var i = 0; i < exp.length; i++) {
                equal(this.bpObj.depth(i), exp[i]);
            }
        });

        test("Test name unset", function () {
            equal(this.bpObj.names_, null, "Name");
        });

        test("Test name/length set", function () {
            // Note: 0 entry is blank because names uses 1-based index
            // see https://github.com/biocore/empress/issues/311
            var names = [0, ...Array(this.bpObj.size).keys()];
            var lengths = names.map((k) => parseInt(k));
            var resBP = new BPTree(this.bpArray, names, lengths, null);
            for (var i = 1; i <= this.bpObj.size; i++) {
                var index = resBP.postorderselect(i);
                equal(resBP.name(index), names[i], "Name");
                equal(resBP.length(index), lengths[i], "Length");
            }
        });

        test("Test fwdsearchNaive", function () {
            var exp = {
                10: [0, 0],
                21: [3, -2],
                15: [11, 2],
            };
            for (var e in exp) {
                var res = this.bpObj.fwdsearchNaive(exp[e][0], exp[e][1]);
                equal(res, parseInt(e));
            }
        });

        test("Test bwdsearchNaive", function () {
            var exp = {
                1: [3, 0],
                17: [21, 4],
                7: [9, 2],
            };
            for (var e in exp) {
                var res = this.bpObj.bwdsearchNaive(exp[e][0], exp[e][1]);
                equal(res, parseInt(e));
            }
        });

        test("Test close", function () {
            var exp = [21, 10, 3, 5, 9, 8, 12, 20, 19, 16, 18];
            var n = 0;
            for (var i = 0; i < this.bpArray.length; i++) {
                if (this.bpArray[i]) {
                    equal(this.bpObj.close(i), exp[n++], `${n}-th open paren`);
                }
            }
        });

        test("Test open", function () {
            var exp = [2, 4, 7, 6, 1, 11, 15, 17, 14, 13, 0];
            var n = 0;
            for (var i = 0; i < this.bpArray.length; i++) {
                if (!this.bpArray[i]) {
                    equal(this.bpObj.open(i), exp[n++], `${n}-th close paren`);
                }
            }
        });

        test("Test enclose", function () {
            var exp = [
                0,
                1,
                1,
                1,
                1,
                1,
                6,
                6,
                1,
                0,
                0,
                0,
                0,
                13,
                14,
                14,
                14,
                14,
                13,
                0,
            ];
            for (var i = 1; i < this.bpArray.length - 1; i++) {
                equal(
                    this.bpObj.enclose(i),
                    exp[i - 1],
                    `${i}-th enclose paren: which is a ${this.bpArray[i]}`
                );
            }
        });

        test("Test parent", function () {
            var exp = [
                -1,
                0,
                1,
                1,
                1,
                1,
                1,
                6,
                6,
                1,
                0,
                0,
                0,
                0,
                13,
                14,
                14,
                14,
                14,
                13,
                0,
                -1,
            ];
            for (var i = 0; i < this.bpArray.length; i++) {
                equal(this.bpObj.parent(i), exp[i], `Parent for ${i}-th index`);
            }
        });

        test("Test root", function () {
            equal(this.bpObj.root(), 0);
        });

        test("Test isleaf", function () {
            var exp = [
                0,
                0,
                1,
                0,
                1,
                0,
                0,
                1,
                0,
                0,
                0,
                1,
                0,
                0,
                0,
                1,
                0,
                1,
                0,
                0,
                0,
                0,
            ];
            for (var i = 0; i < this.bpArray.length; i++) {
                equal(this.bpObj.isleaf(i), exp[i], `${i}-th index`);
            }
        });

        test("Test fchild", function () {
            var exp = [
                1,
                2,
                0,
                0,
                0,
                0,
                7,
                0,
                0,
                7,
                2,
                0,
                0,
                14,
                15,
                0,
                0,
                0,
                0,
                15,
                14,
                1,
            ];
            for (var i = 0; i < this.bpArray.length; i++) {
                equal(this.bpObj.fchild(i), exp[i], `${i}-th index`);
            }
        });

        test("Test lchild", function () {
            var exp = [
                13,
                6,
                0,
                0,
                0,
                0,
                7,
                0,
                0,
                7,
                6,
                0,
                0,
                14,
                17,
                0,
                0,
                0,
                0,
                17,
                14,
                13,
            ];
            for (var i = 0; i < this.bpArray.length; i++) {
                equal(this.bpObj.lchild(i), exp[i], `${i}-th index`);
            }
        });

        test("Test nsibling", function () {
            var exp = [
                0,
                11,
                4,
                4,
                6,
                6,
                0,
                0,
                0,
                0,
                11,
                13,
                13,
                0,
                0,
                17,
                17,
                0,
                0,
                0,
                0,
                0,
            ];
            for (var i = 0; i < this.bpArray.length; i++) {
                equal(this.bpObj.nsibling(i), exp[i], `${i}-th index`);
            }
        });

        test("Test psibling", function () {
            var exp = [
                0,
                0,
                0,
                0,
                2,
                2,
                4,
                0,
                0,
                4,
                0,
                1,
                1,
                11,
                0,
                0,
                0,
                15,
                15,
                0,
                11,
                0,
            ];
            for (var i = 0; i < this.bpArray.length; i++) {
                equal(this.bpObj.psibling(i), exp[i], `${i}-th index`);
            }
        });

        test("Test postorder", function () {
            var exp = [
                11,
                5,
                1,
                1,
                2,
                2,
                4,
                3,
                3,
                4,
                5,
                6,
                6,
                10,
                9,
                7,
                7,
                8,
                8,
                9,
                10,
                11,
            ];
            for (var i = 0; i < exp.length; i++) {
                equal(this.bpObj.postorder(i), exp[i]);
            }
        });

        test("Test postorderselect", function () {
            var exp = [2, 4, 7, 6, 1, 11, 15, 17, 14, 13, 0];
            for (var k = 0; k < exp.length; k++) {
                equal(this.bpObj.postorderselect(k + 1), exp[k]);
            }
        });

        test("Test preorder", function () {
            exp = [
                1,
                2,
                3,
                3,
                4,
                4,
                5,
                6,
                6,
                5,
                2,
                7,
                7,
                8,
                9,
                10,
                10,
                11,
                11,
                9,
                8,
                1,
            ];
            for (var i = 0; i < exp.length; i++) {
                equal(this.bpObj.preorder(i), exp[i]);
            }
        });

        test("Test preorderselect", function () {
            exp = [0, 1, 2, 4, 6, 7, 11, 13, 14, 15, 17];
            for (var k = 0; k < exp.length; k++) {
                equal(this.bpObj.preorderselect(k + 1), exp[k]);
            }
        });

        test("Test coding", function () {
            // zeros and ones test
            var obj = new BPTree([3851728]);
            equal(obj.b, this.bpObj.b);

            // zeros test
            var exp = [0, 0, 0, 0, 0, 0];
            obj = new BPTree(exp);
            equal(obj.b_.length, exp.length);

            // odds test
            exp = [5, 0, 0, 0];
            obj = new BPTree(exp);
            equal(obj.b_.length, 50 + 4);

            exp = [
                5,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
            ];
            obj = new BPTree(exp);
            equal(obj.b_.length, 51 + 51 + 4);
        });

        test("Test inOrderNodes", function () {
            var expect = [11, 5, 6, 10, 1, 2, 4, 9, 3, 7, 8];
            deepEqual(this.bpObj.inOrderNodes(), expect);
        });

        test("Test getTotalLength", function () {
            equal(
                this.bpObj.getTotalLength(3, 11),
                12,
                "Total length from 3 to 11 should be 12."
            );

            throws(function () {
                this.bpObj.getTotalLength(5, 3);
            });
        });

        test("Test findTips", function () {
            // Note: 0 entry is blank because names uses 1-based index
            // see https://github.com/biocore/empress/issues/311
            var names = [
                "",
                "a",
                "b",
                "c",
                "d",
                "e",
                "f",
                "g",
                "h",
                "i",
                "j",
                "k",
            ];
            var resBP = new BPTree(this.bpArray, names, null, null);

            var intNodes = {
                5: [1, 2, 3],
                4: [3],
                9: [7, 8],
                10: [7, 8],
            };

            for (var node in intNodes) {
                deepEqual(resBP.findTips(node), intNodes[node], "node:" + node);
            }

            // ensure error is thrown if leaf node is passed to findTips
            var leafNode = 2;
            throws(function () {
                resBP.findTips(leafNode);
            });
        });

        test("Test getNumTips", function () {
            var expected = [undefined, 1, 1, 1, 1, 3, 1, 1, 1, 2, 2, 6];
            for (var i = 1; i <= this.bpObj.size; i++) {
                equal(this.bpObj.getNumTips(i), expected[i], "node " + i);
            }
        });

        test("Test containsNode", function (assert) {
            var names = [
                "a",
                "b",
                "c",
                "d",
                "e",
                "f",
                "g",
                "h",
                "i",
                "j",
                "k",
                "l",
                "m",
                "n",
                "o",
                "p",
                "q",
                "r",
                "s",
                "t",
                "u",
                "v",
            ];

            var tree = new BPTree(this.bpArray, names, null, null);

            assert.ok(tree.containsNode("a"));
            assert.ok(!tree.containsNode("x"));
            assert.ok(!tree.containsNode("hello"));
            assert.ok(!tree.containsNode(0xa));
        });
    });
});
