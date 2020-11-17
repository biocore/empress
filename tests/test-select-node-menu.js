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

                this.selectedNodeMenu = this.testData.empress._events.selectedNodeMenu;

                var _isHidden = function (attrEle) {
                    return scope.selectedNodeMenu[attrEle].classList.contains(
                        "hidden"
                    );
                };

                this.isShown = function (attrEle) {
                    notOk(_isHidden(attrEle), attrEle + " is shown");
                };
                this.isHidden = function (attrEle) {
                    ok(_isHidden(attrEle), attrEle + " is hidden");
                };

                this.textEquals = function (attrEle, expText) {
                    var obsText = scope.selectedNodeMenu[attrEle].textContent;
                    deepEqual(obsText, expText, attrEle + " has expected text");
                };
                this.fmTableOk = function (expf1val, expf2val) {
                    var fmt = $(scope.selectedNodeMenu.fmTable);

                    deepEqual(fmt.children().length, 1);
                    var tbody = fmt.children()[0];
                    deepEqual(tbody.tagName, "TBODY");
                    deepEqual($(tbody).children().length, 2);

                    var rows = $(tbody).children();
                    deepEqual(rows.length, 2);
                    var tr1 = rows[0];
                    var tr2 = rows[1];
                    deepEqual(tr1.tagName, "TR");
                    deepEqual(tr2.tagName, "TR");

                    var headerCells = $(tr1).children();
                    deepEqual(headerCells.length, 2);
                    deepEqual(headerCells[0].textContent, "f1");
                    deepEqual(headerCells[1].textContent, "f2");

                    var dataCells = $(tr2).children();
                    deepEqual(dataCells.length, 2);
                    deepEqual(dataCells[0].textContent, expf1val);
                    deepEqual(dataCells[1].textContent, expf2val);
                };

                this.expNoSMColsSelectedNotesText =
                    "No sample metadata columns selected yet.";
            },
            teardown: function () {
                $(this.selectedNodeMenu.sel).empty();
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
        test("showNodeMenu: throws error if no nodes selected", function () {
            throws(function () {
                this.selectedNodeMenu.showNodeMenu();
            }, /showNodeMenu\(\): Nodes have not been selected./);
        });
        test("showNodeMenu: tip node (in table, sm table unpopulated)", function () {
            this.selectedNodeMenu.setSelectedNodes([2]);
            this.selectedNodeMenu.showNodeMenu();
            // Test that a few things are set up in the menu as expected.
            // Node name
            this.textEquals("nodeNameLabel", "Name: 2");
            // Node length
            this.isShown("nodeLengthContainer");
            this.textEquals("nodeLengthLabel", "2");
            // Duplicate node name warning isn't shown
            this.isHidden("nodeNameWarning");

            // Check that the feature metadata table was constructed properly
            this.fmTableOk("1", "2");

            // Check that the feature metadata header and table are visible,
            // but that the "no feature metadata" text isn't visible
            this.isShown("fmSection");
            this.isShown("fmHeader");
            this.isHidden("fmNoDataNote");
            this.isShown("fmTable");

            // Check that the sample metadata section is visible. Just the
            // header and add section stuff should be visible right now, as
            // well as a cursory note saying that no sample metadata columns
            // are selected.
            this.isShown("smSection");
            this.isShown("smHeader");
            this.isHidden("smTable");
            this.isShown("smNotes");
            this.textEquals("smNotes", this.expNoSMColsSelectedNotesText);
            this.isShown("smAddSection");
            this.isHidden("smNotInTableWarning");

            // Menu is visible
            this.isShown("box");
        });
        test("showNodeMenu: internal node (unambiguous, tips in table, sm table unpopulated, duplicate node name warning)", function () {
            this.selectedNodeMenu.setSelectedNodes([4]);
            this.selectedNodeMenu.showNodeMenu();
            // Node name
            this.textEquals("nodeNameLabel", "Name: internal");
            // Node length
            this.isShown("nodeLengthContainer");
            this.textEquals("nodeLengthLabel", "4");
            // Duplicate node name warning is shown, since multiple nodes in
            // the test dataset have the name "internal"
            this.isShown("nodeNameWarning");

            // Check that the feature metadata table was constructed properly
            this.fmTableOk("1", "1");

            // Check that the feature metadata header and table are visible,
            // but that the "no feature metadata" text isn't visible
            this.isShown("fmSection");
            this.isShown("fmHeader");
            this.isHidden("fmNoDataNote");
            this.isShown("fmTable");

            // Check that the sample metadata section is visible. Just the
            // header, add section stuff, and notes should be visible now.
            this.isShown("smSection");
            this.isShown("smHeader");
            this.isHidden("smTable");
            this.isShown("smNotes");
            this.textEquals("smNotes", this.expNoSMColsSelectedNotesText);
            this.isShown("smAddSection");
            this.isHidden("smNotInTableWarning");

            // Menu is visible
            this.isShown("box");
        });
        test("showNodeMenu: internal node (ambiguous, sm table unpopulated)", function () {
            this.selectedNodeMenu.setSelectedNodes([4, 5]);
            this.selectedNodeMenu.showNodeMenu();
            // Node name
            this.textEquals("nodeNameLabel", "Name: internal");
            // Node length should be hidden, since multiple nodes are selected
            // (so the length is ambiguous)
            this.isHidden("nodeLengthContainer");
            // Duplicate node name warning is shown, since multiple nodes in
            // the test dataset have the name "internal"
            this.isShown("nodeNameWarning");

            // Check that the feature metadata table was constructed properly
            // (even though multiple nodes are selected, internal nodes with
            // the same name share feature metadata)
            this.fmTableOk("1", "1");

            // Check that the feature metadata header and table are visible,
            // but that the "no feature metadata" text isn't visible
            this.isShown("fmSection");
            this.isShown("fmHeader");
            this.isHidden("fmNoDataNote");
            this.isShown("fmTable");

            // Check that the sample metadata stuff is mostly hidden, with some
            // text explaining that there's ambiguity.
            this.isShown("smSection");
            this.isShown("smHeader");
            this.isHidden("smTable");
            this.isShown("smNotes");
            this.isHidden("smAddSection");
            this.isHidden("smNotInTableWarning");
            this.textEquals(
                "smNotes",
                "Multiple internal nodes are selected. We can't " +
                    "identify the samples containing these nodes' " +
                    "descendant tips, if present, due to the ambiguity."
            );

            // Menu is visible
            this.isShown("box");
        });
        test("showNodeMenu: tip node (populated sm table with one row)", function () {
            this.selectedNodeMenu.setSelectedNodes([2]);
            this.selectedNodeMenu.showNodeMenu();
            this.textEquals("nodeNameLabel", "Name: 2");
            this.isShown("nodeLengthContainer");
            this.textEquals("nodeLengthLabel", "2");
            this.isHidden("nodeNameWarning");

            this.fmTableOk("1", "2");
            this.isShown("fmSection");
            this.isShown("fmHeader");
            this.isHidden("fmNoDataNote");
            this.isShown("fmTable");

            this.isShown("smSection");
            this.isShown("smHeader");
            this.isHidden("smTable");
            this.isShown("smNotes");
            this.textEquals("smNotes", this.expNoSMColsSelectedNotesText);
            this.isShown("smAddSection");
            this.isHidden("smNotInTableWarning");
            this.isShown("box");

            // Add a row for "f1" (the default s.m. field) to the s.m. table
            this.selectedNodeMenu.addBtn.click();

            // First off, check that stuff is still shown
            this.isShown("smNotes");
            this.isShown("smTable");
            this.isHidden("smNotInTableWarning");
            this.isShown("smAddSection");

            // Check that the notes were updated accordingly
            this.textEquals(
                "smNotes",
                "This is a tip in the tree. These values represent the " +
                    "number of unique samples that contain this node."
            );

            var smt = $(this.selectedNodeMenu.smTable);

            deepEqual(smt.children().length, 1);
            var tbody = smt.children()[0];
            deepEqual(tbody.tagName, "TBODY");
            deepEqual($(tbody).children().length, 2);
            // Table should have two rows: one for values and one for sample
            // counts for each value
            var rows = $(tbody).children();
            deepEqual(rows.length, 2);
            var tr1 = rows[0];
            var tr2 = rows[1];
            deepEqual(tr1.tagName, "TR");
            deepEqual(tr2.tagName, "TR");

            // First row should have one "extra" cell, which'll be the
            // rowspan="2" frozen cell containing the field name (in this case,
            // f1). The remaining cells contain the unique values within this
            // field.
            var headerCells = $(tr1).children();
            deepEqual(headerCells.length, 3);
            deepEqual(headerCells[0].textContent, "f1");
            deepEqual(headerCells[1].textContent, "a");
            deepEqual(headerCells[2].textContent, "b");

            // Second row should just have two cells, one per unique value in
            // f1 (a and b). Tip 2 is present in four samples where "f1" is
            // "a", and one sample where "f1" is "b" (this is observable by
            // comparing the tbl and sm variables created in getTestData()).
            var dataCells = $(tr2).children();
            deepEqual(dataCells.length, 2);
            deepEqual(dataCells[0].textContent, "4");
            deepEqual(dataCells[1].textContent, "1");
        });
        test("showNodeMenu: Adding all sm fields to the table causes the 'Add' controls to be hidden", function () {
            this.selectedNodeMenu.setSelectedNodes([2]);
            this.selectedNodeMenu.showNodeMenu();
            // There are three sample metadata fields in the test dataset, so
            // let's try "clicking" on the add button three times.
            this.isShown("smAddSection");
            this.selectedNodeMenu.addBtn.click();
            this.isShown("smAddSection");
            this.selectedNodeMenu.addBtn.click();
            this.isShown("smAddSection");
            this.selectedNodeMenu.addBtn.click();
            this.isHidden("smAddSection");
        });
    });
});
