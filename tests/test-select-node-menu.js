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
            throws(function () {
                this.selectedNodeMenu.showNodeMenu();
            }, /showNodeMenu\(\): Nodes have not been selected./);
        });
        test("showNodeMenu: tip node (in table, no sample metadata)", function () {
            this.selectedNodeMenu.setSelectedNodes([2]);
            this.selectedNodeMenu.showNodeMenu();
            // Test that a few things are set up in the menu as expected.
            // Node name
            deepEqual(
                this.selectedNodeMenu.nodeNameLabel.textContent,
                "Name: 2"
            );
            // Node length
            deepEqual(this.selectedNodeMenu.nodeLengthLabel.textContent, "2");
            // Duplicate node name warning, and node-not-in-table warning, are
            // not shown
            ok(
                this.selectedNodeMenu.nodeNameWarning.classList.contains(
                    "hidden"
                )
            );
            ok(
                this.selectedNodeMenu.nodeNotInTableWarning.classList.contains(
                    "hidden"
                )
            );
            equal(this.selectedNodeMenu.smTable.innerHTML, "");

            // Check that the feature metadata table was constructed properly
            var fmt = $(this.selectedNodeMenu.fmTable);

            equal(fmt.children().length, 1);
            var tbody = fmt.children()[0];
            equal(tbody.tagName, "TBODY");
            equal($(tbody).children().length, 2);

            var rows = $(tbody).children();
            equal(rows.length, 2);
            var tr1 = rows[0];
            var tr2 = rows[1];
            equal(tr1.tagName, "TR");
            equal(tr2.tagName, "TR");

            var headerCells = $(tr1).children();
            equal(headerCells.length, 2);
            equal(headerCells[0].textContent, "f1");
            equal(headerCells[1].textContent, "f2");

            var dataCells = $(tr2).children();
            equal(dataCells.length, 2);
            equal(dataCells[0].textContent, "1");
            equal(dataCells[1].textContent, "2");

            // Check that the feature metadata header and table are visible
            notOk(this.selectedNodeMenu.fmTable.classList.contains("hidden"));
            notOk(this.selectedNodeMenu.fmHeader.classList.contains("hidden"));

            // Check that the sample metadata section is visible
            // TODO, just the add button should be until it's clicked

            // Menu is visible
            notOk(this.selectedNodeMenu.box.classList.contains("hidden"));
        });
    });
});
