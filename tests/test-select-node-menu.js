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
                // Create and destroy the menu HTML elements within the test,
                // to avoid having to mess around with the test HTML file.
                var elesToCreate = [
                    "menu-sm-table",
                    "menu-sm-section",
                    "menu-box-node-not-in-table-warning",
                    "menu-box",
                    "menu-select",
                    "menu-add-btn",
                    "menu-box-node-id",
                    "menu-box-notes",
                    "menu-box-node-name-warning",
                    "menu-box-node-length-container",
                    "menu-box-node-length",
                    "menu-fm-table",
                    "menu-fm-header",
                    "menu-sm-header",
                ];
                // For simplicity's sake, we just create most elements as
                // <div>s. This works well enough for testing purposes.
                // For certain elements which are not just simple text holders,
                // though, we actually create them as special element tags.
                this.createdEles = [];
                _.each(elesToCreate, function (eleID) {
                    var newEle;
                    if (eleID.endsWith("-select")) {
                        newEle = document.createElement("select");
                    } else if (eleID.endsWith("-btn")) {
                        newEle = document.createElement("button");
                    } else if (eleID.endsWith("-table")) {
                        newEle = document.createElement("table");
                    } else {
                        newEle = document.createElement("div");
                    }
                    scope.createdEles.push(newEle);
                });

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
            tearDown: function () {
                _.each(this.createdEles, function (ele) {
                    ele.remove();
                });
            },
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
    });
});
