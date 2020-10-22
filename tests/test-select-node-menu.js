require([
    "jquery",
    "underscore",
    "UtilitiesForTesting",
    "SelectedNodeMenu",
], function ($, _, UtilitiesForTesting, SelectedNodeMenu) {
    $(document).ready(function () {
        module("Selected Node Menu", {
            setup: function () {
                var scope = this;
                this.testData = UtilitiesForTesting.getTestData(true);

                // Needed in order for setSelectedNodes() to work successfully
                // (since it calls
                // this.testData.empress._drawer.loadSelectedNodeBuff(), which
                // needs the Drawer to have been initialized first).
                this.testData.empress.initialize();

                this.selectedNodeMenu = new SelectedNodeMenu(
                    this.testData.empress,
                    this.testData.empress._drawer
                );
            },
            tearDown: function () {},
        });
        test("setSelectedNodes: throws error if multiple nodes that don't share the same name selected", function () {
            var scope = this;
            var errRegex = /setSelectedNodes\(\): keys do not represent the same node name./;
            // Two internal nodes
            throws(function () {
                scope.selectedNodeMenu.setSelectedNodes([7, 4]);
            }, errRegex);
            // Test cases where some or all of the selected nodes are tips.
            // Since tip names must be unique, this should trigger the same
            // error.
            //
            // One tip (2) and one internal node (4)
            throws(function () {
                scope.selectedNodeMenu.setSelectedNodes([2, 4]);
            }, errRegex);
            // Two tips
            throws(function () {
                scope.selectedNodeMenu.setSelectedNodes([2, 3]);
            }, errRegex);
        });
        test("setSelectedNodes: succeeds with sane inputs", function () {
            // Tips
            this.selectedNodeMenu.setSelectedNodes([2]);
            deepEqual(this.selectedNodeMenu.nodeKeys, [2]);
            this.selectedNodeMenu.setSelectedNodes([3]);
            deepEqual(this.selectedNodeMenu.nodeKeys, [3]);

            // Internal nodes
            this.selectedNodeMenu.setSelectedNodes([4]);
            deepEqual(this.selectedNodeMenu.nodeKeys, [4]);
            this.selectedNodeMenu.setSelectedNodes([7]);
            deepEqual(this.selectedNodeMenu.nodeKeys, [7]);

            // Multiple internal nodes with the same name ("internal")
            this.selectedNodeMenu.setSelectedNodes([4, 5]);
            deepEqual(this.selectedNodeMenu.nodeKeys, [4, 5]);
        });
        test("showNodeMenu: throws error if no nodes selected", function () {
            throws(function() {
                this.selectedNodeMenu.showNodeMenu();
            }, /showNodeMenu\(\): Nodes have not been selected./);
        });
        test("showNodeMenu: tip node", function () {
            this.selectedNodeMenu.setSelectedNodes([2]);
            this.selectedNodeMenu.showNodeMenu();
            deepEqual(
                this.selectedNodeMenu.nodeNameLabel.textContent,
                "Name: 2"
            );
        });
    });
});
