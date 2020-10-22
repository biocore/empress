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
        test("Initialization", function () {
            deepEqual(this.selectedNodeMenu.hiddenCallback, null);
        });
    });
});
