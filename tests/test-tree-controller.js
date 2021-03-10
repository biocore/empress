require([
    "jquery",
    "UtilitiesForTesting",
    "util",
    "TreeController"
], function ($, UtilitiesForTesting, util, TreeController) {
    $(document).ready(function () {
        // Setup test variables
        // Note: This is ran for each test() so tests can modify bpArray
        // without affecting other tests.
        module("TreeController", {
            setup: function () {
                this.tree = UtilitiesForTesting.getTestData(false).tree;
                this.tree.names_ = ["", "1", "2", "3", "4", "5", "6", "7"];
                this.treeController = new TreeController(this.tree);
            },

            teardown: function () {
                this.tree = null;
                this.treeController = null;
            },
        });

        test("Test shear", function () {
            this.treeController.shear(new Set(["2", "3"]));
            // console.log(this.treeController.getAllNames());
            var node = this.treeController.fchild(0);
            while (node !== 0) {
                console.log(this.treeController.name(node), this.treeController.isleaf(node) ,node);
                node = this.treeController.fchild(node)
            }

            node = 7;
            while (node !== 0) {
                console.log(this.treeController.name(node), this.treeController.isleaf(node) ,node);
                node = this.treeController.parent(node)
            }
            console.log(this.treeController.model.currentTree.name(this.treeController.model.currentTree.postorderselect(this.treeController.model.currentTree.size)))
        });
    });
});