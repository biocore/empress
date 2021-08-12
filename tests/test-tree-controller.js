require([
    "jquery",
    "UtilitiesForTesting",
    "util",
    "TreeController",
    "BPTree",
], function ($, UtilitiesForTesting, util, TreeController, BPTree) {
    $(document).ready(function () {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray
        // without affecting other tests.
        module("TreeController", {
            setup: function () {
                var testData = UtilitiesForTesting.getTestData(false);
                this.tree = testData.tree;
                this.largerTree = testData.largerTree;
                this.names = ["", "t1", "t2", "t3", "i4", "i5", "t6", "r"];
                this.tree.names_ = this.names;
                this.lengths = [null, 1, 2, 3, 4, 5, 6, null];
                this.tree.lengths_ = this.lengths;
                this.treeController = new TreeController(this.tree);
                this.largerTreeController = new TreeController(this.largerTree);
            },

            teardown: function () {
                this.tree = null;
                this.treeController = null;
            },
        });

        test("Test shear", function () {
            this.treeController.shear(new Set([2, 3]));

            // checks to make sure correct names are kept
            var shearNames = [null, "t1", "i5", "t6", "r"];
            var resutlNames = this.treeController.model.shearedTree.names_;
            deepEqual(resutlNames, shearNames);

            var shearLengths = [null, 1, 5, 6, null];
            var resultLengts = this.treeController.model.shearedTree.lengths_;
            deepEqual(resultLengts, shearLengths);

            // checks to make sure structre of tree is correct
            var shearTree = [1, 1, 1, 0, 0, 1, 0, 0];
            var resultTree = this.treeController.model.shearedTree.b_;
            deepEqual(resultTree, shearTree);

            // checks to make sure the mappings from orignal tree to shear tree
            // is correct and vice-versa
            var fullToSheared = new Map([
                [1, 1],
                [5, 2],
                [6, 3],
                [7, 4],
            ]);
            var shearedToFull = new Map([
                [1, 1],
                [2, 5],
                [3, 6],
                [4, 7],
            ]);
            var resultOrigToCur = this.treeController.model.fullToSheared;
            var resultCurToOrig = this.treeController.model.shearedToFull;
            deepEqual(resultOrigToCur, fullToSheared);
            deepEqual(resultCurToOrig, shearedToFull);
        });

        test("Test unshear", function () {
            this.treeController.shear(new Set([1, 6]));
            this.treeController.unshear();

            deepEqual(this.treeController.model.shearedTree.names_, this.names);
            deepEqual(
                this.treeController.model.shearedTree.lengths_,
                this.lengths
            );

            var map = new Map([
                [1, 1],
                [2, 2],
                [3, 3],
                [4, 4],
                [5, 5],
                [6, 6],
                [7, 7],
            ]);
            deepEqual(this.treeController.model.shearedToFull, map);
            deepEqual(this.treeController.model.fullToSheared, map);
        });

        test("Test postorderTraversal", function () {
            this.treeController.shear(new Set([1, 6]));
            var nodes = [2, 3, 4, 5, 7];
            var result = [
                ...this.treeController.postorderTraversal((includeRoot = true)),
            ];
            deepEqual(result, nodes);

            nodes.pop();
            result = [
                ...this.treeController.postorderTraversal(
                    (includeRoot = false)
                ),
            ];
            deepEqual(result, nodes);

            this.treeController.unshear();
            nodes = [1, 2, 3, 4, 5, 6, 7];
            result = [
                ...this.treeController.postorderTraversal((includeRoot = true)),
            ];
            deepEqual(result, nodes);
        });

        test("Test getLengthStats", function () {
            this.treeController.shear(new Set([1, 6]));
            var stats = {
                avg: 3.5,
                min: 2,
                max: 5,
            };
            var result = this.treeController.getLengthStats();
            deepEqual(result, stats);

            this.treeController.unshear();
            stats = {
                avg: 3.5,
                min: 1,
                max: 6,
            };
            result = this.treeController.getLengthStats();
            deepEqual(result, stats);
        });

        test("Test name", function () {
            // name() only uses the original tree and thus is not effected
            // by the shear operation
            var index = this.treeController.postorderselect(1);
            var name = this.treeController.name(index);
            deepEqual(name, "t1");
        });

        test("Test getAllNames", function () {
            this.treeController.shear(new Set([1, 6]));
            var shearNames = ["t2", "t3", "i4", "i5", "r"];
            var resutlNames = this.treeController.getAllNames();
            deepEqual(resutlNames, shearNames);

            this.treeController.unshear();
            shearNames = ["t1", "t2", "t3", "i4", "i5", "t6", "r"];
            deepEqual(this.treeController.getAllNames(), shearNames);
        });

        test("Test numleaves", function () {
            this.treeController.shear(new Set([1, 6]));
            equal(this.treeController.numleaves(), 2);

            this.treeController.unshear();
            equal(this.treeController.numleaves(), 4);
        });

        test("Test length", function () {
            // length() only uses the original tree and thus is not effected
            // by the shear operation
            var index = this.treeController.postorderselect(1);
            var length = this.treeController.length(index);
            equal(length, 1);
        });

        test("Test parent", function () {
            // parent() only uses the original tree and thus is not effected
            // by the shear operation
            var index = this.treeController.postorderselect(1);
            var parent = this.treeController.parent(index);
            parent = this.treeController.postorder(parent);
            equal(parent, 5);
        });

        test("Test root", function () {
            // root() only uses the original tree and thus is not effected
            // by the shear operation
            equal(this.treeController.root(), 0);
        });

        test("Test isleaf", function () {
            // isleaf() only uses the original tree and thus is not effected
            // by the shear operation
            var index = this.treeController.postorderselect(1);
            var isleaf = this.treeController.isleaf(index);
            equal(isleaf, true);

            index = this.treeController.postorderselect(7);
            isleaf = this.treeController.isleaf(index);
            equal(isleaf, false);
        });

        test("Test fchild", function () {
            // fchild's input/output is in respect to the original tree.
            // However, fchild will use the topology of the sheared tree.
            this.treeController.shear(new Set([1, 6]));
            var index = this.treeController.postorderselect(5);
            var fchild = this.treeController.fchild(index);
            var expected = this.treeController.postorderselect(4);
            equal(fchild, expected);

            this.treeController.unshear();
            index = this.treeController.postorderselect(5);
            fchild = this.treeController.fchild(index);
            expected = this.treeController.postorderselect(1);
            equal(fchild, expected);
        });

        test("Test lchild", function () {
            // lchild's input/output is in respect to the original tree.
            // However, lchild will use the topology of the sheared tree.
            this.treeController.shear(new Set([1, 6]));
            var index = this.treeController.postorderselect(7);
            var lchild = this.treeController.lchild(index);
            var expected = this.treeController.postorderselect(5);
            equal(lchild, expected);

            this.treeController.unshear();
            index = this.treeController.postorderselect(7);
            lchild = this.treeController.lchild(index);
            expected = this.treeController.postorderselect(6);
            equal(lchild, expected);
        });

        test("Test nsibling", function () {
            // nsibling's input/output is in respect to the original tree.
            // However, nsibling will use the topology of the sheared tree.
            this.treeController.shear(new Set([1, 6]));
            var index = this.treeController.postorderselect(5);
            var nsibling = this.treeController.nsibling(index);
            var expected = 0; // doesn't have a next sibling
            equal(nsibling, expected);

            this.treeController.unshear();
            index = this.treeController.postorderselect(5);
            nsibling = this.treeController.nsibling(index);
            expected = this.treeController.postorderselect(6);
            equal(nsibling, expected);
        });

        test("Test psibling", function () {
            // psibling's input/output is in respect to the original tree.
            // However, psibling will use the topology of the sheared tree.
            this.treeController.shear(new Set([1, 6]));
            var index = this.treeController.postorderselect(4);
            var psibling = this.treeController.psibling(index);
            var expected = 0; // doesn't have a next sibling
            equal(psibling, expected);

            this.treeController.unshear();
            index = this.treeController.postorderselect(4);
            psibling = this.treeController.psibling(index);
            expected = this.treeController.postorderselect(1);
            equal(psibling, expected);
        });

        test("Test postorder", function () {
            // postorder only uses the original tree and thus is not effected
            // by the shear operation
            var index = this.treeController.postorderselect(1);
            var postorder = this.treeController.postorder(index);
            equal(postorder, 1);
        });

        test("Test postorderselect", function () {
            // postorderselect only uses the original tree and thus is not effected
            // by the shear operation
            var index = this.treeController.postorderselect(1);
            equal(index, 2);
        });

        test("Test preorder", function () {
            // preorder only uses the original tree and thus is not effected
            // by the shear operation
            var index = this.treeController.preorderselect(1);
            var preorder = this.treeController.preorder(index);
            equal(preorder, 1);
        });

        test("Test preorderselect", function () {
            // preorderselect only uses the original tree and thus is not effected
            // by the shear operation
            var index = this.treeController.preorderselect(1);
            equal(index, 0);
        });

        test("Test inOrderTraversal", function () {
            // inOrderTraversal's input/output is in respect to the original tree.
            // However, inOrderTraversal will use the topology of the sheared tree.
            this.treeController.shear(new Set([1, 6]));
            var expected = [7, 5, 4, 2, 3];
            var result = [
                ...this.treeController.inOrderTraversal((includeRoot = true)),
            ];
            deepEqual(result, expected);
            expected.shift();
            result = [
                ...this.treeController.inOrderTraversal((includeRoot = false)),
            ];
            deepEqual(result, expected);

            this.treeController.unshear();
            expected = [7, 5, 6, 1, 4, 2, 3];
            result = [
                ...this.treeController.inOrderTraversal((includeRoot = true)),
            ];
            deepEqual(result, expected);
            expected.shift();
            result = [
                ...this.treeController.inOrderTraversal((includeRoot = false)),
            ];
            deepEqual(result, expected);
        });

        test("Test getTotalLength", function () {
            // getTotalLength's input/output is in respect to the original tree.
            // However, getTotalLength will use the topology of the sheared tree.
            this.treeController.shear(new Set([1, 6]));
            var result = this.treeController.getTotalLength(2, 7);
            equal(result, 11);

            this.treeController.unshear();
            result = this.treeController.getTotalLength(2, 7);
            equal(result, 11);
        });

        test("Test findTips", function () {
            // findTips's input/output is in respect to the original tree.
            // However, findTips will use the topology of the sheared tree.
            this.treeController.shear(new Set([1, 6]));
            var result = this.treeController.findTips(5);
            deepEqual(result, [2, 3]);

            this.treeController.unshear();
            result = this.treeController.findTips(5);
            deepEqual(result, [1, 2, 3]);
        });

        test("Test getNumTips", function () {
            // getNumTips's input/output is in respect to the original tree.
            // However, getNumTips will use the topology of the sheared tree.
            this.treeController.shear(new Set([1, 6]));
            var result = this.treeController.getNumTips(5);
            deepEqual(result, 2);

            this.treeController.unshear();
            result = this.treeController.getNumTips(5);
            deepEqual(result, 3);
        });

        test("Test containsNode", function () {
            this.treeController.shear(new Set([1, 6]));
            var result = this.treeController.containsNode("t1");
            equal(result, false);

            this.treeController.unshear();
            result = this.treeController.containsNode("t1");
            equal(result, true);
        });

        test("Test getNodesWithName", function () {
            // getNodesWithName's input/output is in respect to the original tree.
            // However, getNodesWithName will use the topology of the sheared tree.
            this.treeController.shear(new Set([1, 6]));
            var result = this.treeController.getNodesWithName("t2");
            deepEqual(result, [2]);
            result = this.treeController.getNodesWithName("t1");
            deepEqual(result, []);

            this.treeController.unshear();
            result = this.treeController.getNodesWithName("t2");
            deepEqual(result, [2]);
            result = this.treeController.getNodesWithName("t1");
            deepEqual(result, [1]);
        });

        test("isAncestor", function () {
            // original bp tree test
            exp = new Map();
            exp.set([0, 0], false); // identity test
            exp.set([2, 1], false); // tip test
            exp.set([1, 2], true); // open test
            exp.set([1, 3], true); // close test
            exp.set([0, 7], true); // nested test
            exp.set([1, 7], true); // nested test

            for (var [k, e] of exp) {
                var [i, j] = k;
                equal(this.treeController.isAncestor(i, j), e);
            }
        });

        test("lca", function () {
            // original bp tree test
            // modified from https://github.com/wasade/improved-octo-waddle/blob/master/bp/tests/test_bp.py
            // lca(i, j) = parent(rmq(i, j) + 1)
            // unless isancestor(i, j)
            // (so lca(i, j) = i) or isancestor(j, i) (so lca(i, j) = j),
            var bpArray = this.largerTree.b_;
            var bpSum = 0;
            for (var bpV of bpArray) {
                bpSum += bpV;
            }

            nodes = [];
            for (var n = 1; n <= bpSum; n++) {
                nodes.push(this.largerTreeController.preorderselect(n));
            }
            exp = new Map();
            exp.set([nodes[3], nodes[2]], nodes[1]);
            exp.set([nodes[5], nodes[2]], nodes[1]);
            exp.set([nodes[9], nodes[2]], nodes[0]);
            exp.set([nodes[10], nodes[9]], nodes[8]);
            exp.set([nodes[8], nodes[1]], nodes[0]);
            for (var [k, e] of exp) {
                var [i, j] = k;
                equal(this.largerTreeController.lca(i, j), e);
            }
        });
    });
});
