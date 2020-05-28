define(["underscore", "util"], function (_, util) {
    function SelectedNodeMenu(empress, drawer) {
        this.empress = empress;
        this.drawer = drawer;
        this.fields = [];
        this.TYPES = {
            TREE_DATA: "t",
            SAMPLE_DATA: "s",
            FEATRUE_DATA: "f",
        };
        this.table = document.getElementById("hover-table");
        this.box = document.getElementById("hover-box");
        this.sel = document.getElementById("hover-select");
        this.addBtn = document.getElementById("hover-add-btn");
        this.nodeIdLabel = document.getElementById("hover-table-node-id");
        this.notes = document.getElementById("hover-table-notes");
        this.fmTable = document.getElementById("hover-fm-table");
        this.fmHeader = document.getElementById("hover-fm-header");
        this.smHeader = document.getElementById("hover-sm-header");
        this.nodeKeys = null;
    }

    /**
     * Initializes the state machine. Adds metadata field options to drop down
     * menu, and creates the add button click event.
     */
    SelectedNodeMenu.prototype.initialize = function () {
        // add items to select
        var selOpts = this.empress.getSampleCategories();
        for (var i = 0; i < selOpts.length; i++) {
            var opt = document.createElement("option");
            opt.value = selOpts[i];
            opt.innerHTML = selOpts[i];
            this.sel.appendChild(opt);
        }

        // add event to add button
        var selectMenu = this;
        var click = function () {
            var val = selectMenu.sel.value;
            selectMenu.sel.options[selectMenu.sel.selectedIndex].remove();
            selectMenu.fields.push(val);
            selectMenu.smHeader.classList.remove("hidden");
            selectMenu.showNodeMenu(true);
        };
        this.addBtn.onclick = click;
    };

    /**
     * Displays the hover node menu. nodeKeys must be set in order to use this
     * method.
     */
    SelectedNodeMenu.prototype.showNodeMenu = function (addingMoreSampleCats) {
        // make sure the state machine is set
        if (this.nodeKeys === null) {
            throw "showNodeMenu(): Nodes have not be set in the state machine!";
        }

        // grab the name of the node
        var emp = this.empress;
        var nodeKeys = this.nodeKeys;
        var node = emp._treeData[nodeKeys[0]];
        var name = node.name;

        // reset node-hover menu
        this.table.innerHTML = "";

        this.nodeIdLabel.innerHTML = "ID: " + node.name;

        // add id row
        this.notes.innerHTML =
            "For tip nodes: values represent number of unique samples that " +
            "contain the tip node." +
            "<br>" +
            "For internal nodes: values represent the number of unique " +
            "samples that contain any of its descendants." +
            "<br>";

        // show either leaf or internal node
        var t = emp._tree;
        if (t.isleaf(t.postorderselect(this.nodeKeys[0]))) {
            this.showLeafNode(addingMoreSampleCats);
        } else {
            this.showInternalNode();
        }

        // place hover-node menu next to node
        // otherwise place the (aggregated) node-menu over the root of the tree
        this.updateMenuPosition();

        // show table
        this.box.classList.remove("hidden");
    };

    /**
     * Creates the node hover-table for a tip node. nodeKeys must be set in
     * before this function is called.
     */
    SelectedNodeMenu.prototype.showLeafNode = function (addingMoreSampleCats) {
        // test to make sure nodeKeys is set
        if (this.nodeKeys === null) {
            throw "showLeafNode(): nodeKeys is not set!";
        }

        // test to make sure the leaf node is uniqe
        if (this.nodeKeys.length > 1) {
            throw "showLeafNode(): Leaf nodes must be unique!";
        }

        // get the name of the tip
        var name = this.empress._treeData[this.nodeKeys[0]].name;

        // Only add feature metadata if we're showing the hover box for a node
        // the first time
        if (!addingMoreSampleCats) {
            if (this.empress._featureMetadataColumns.length > 0) {
                if (_.has(this.empress._featureMetadata, name)) {
                    this.fmHeader.classList.remove("hidden");
                    this.fmTable.classList.remove("hidden");
                    var headerRow = this.fmTable.insertRow(-1);
                    var featureRow = this.fmTable.insertRow(-1);
                    for (
                        var x = 0;
                        x < this.empress._featureMetadataColumns.length;
                        x++
                    ) {
                        var colName = this.empress._featureMetadataColumns[x];
                        var colCell = headerRow.insertCell(-1);
                        colCell.innerHTML = "<strong>" + colName + "</strong>";
                        var dataCell = featureRow.insertCell(-1);
                        dataCell.innerHTML = this.empress._featureMetadata[
                            name
                        ][colName];
                    }
                }
            }
        }

        // loop over all metadata fields the user has added to the hover-table.
        this.fields = util.naturalSort(this.fields);
        for (var i = 0; i < this.fields.length; i++) {
            var field = this.fields[i];

            /*
             * TODO: Once feature metadata is available, this will be used to
             * flag if field is from the sample or feature metadata
             *
             *  var type = this.fields[i].type; // tree, sample, or feature
             */

            // create new rows in hover-table: 1 for header, 1 for data
            var fieldHeaderRow = this.table.insertRow(-1);
            var fieldHeaderCell = fieldHeaderRow.insertCell(-1);
            fieldHeaderCell.innerHTML = "<strong>" + field + "</strong>";
            fieldHeaderCell.rowSpan = 2;
            fieldHeaderCell.classList.add("hover-table-header-cell");

            var fieldDataRow = this.table.insertRow(-1);

            // add row values
            var obs = this.empress._biom.getObsCountsBy(field, name);
            var categories = util.naturalSort(Object.keys(obs));
            for (var j = 0; j < categories.length; j++) {
                var categoryHeaderCell = fieldHeaderRow.insertCell(-1);
                categoryHeaderCell.innerHTML =
                    "<strong>" + categories[j] + "</strong>";
                var categoryDataCell = fieldDataRow.insertCell(-1);
                categoryDataCell.innerHTML = obs[categories[j]];
            }
        }
    };

    /**
     * Creates the node hover-table for internal nodes. nodeKeys must be set in
     * before this function is called. Furthermore, if there are more than key
     * in nodeKeys, then the keys must represent internal nodes with the same
     * name in the newick tree.
     */
    SelectedNodeMenu.prototype.showInternalNode = function () {
        // test to make sure nodeKeys is set
        if (this.nodeKeys === null) {
            throw "showInternalNode(): nodeKeys is not set!";
        }

        if (this.nodeKeys.length > 1) {
            this.notes.innerHTML +=
                "<br>" +
                "Warning: " +
                this.nodeKeys.length +
                " nodes exists with the above id." +
                "<br>" +
                "The following table shows the aggregated values from all " +
                " nodes with the above id.";
        }
        // create object that will map fields to all of their possible values
        var field,
            fieldValues,
            fieldValue,
            fieldsMap = {},
            i,
            j,
            k;
        for (i = 0; i < this.fields.length; i++) {
            field = this.fields[i];
            var possibleValues = this.empress._biom.getUniqueSampleValues(
                field
            );
            for (j = 0; j < possibleValues.length; j++) {
                var possibleValue = possibleValues[j];
                if (!(field in fieldsMap)) fieldsMap[field] = {};
                fieldsMap[field][possibleValue] = 0;
            }
        }

        // iterate over all keys
        for (i = 0; i < this.nodeKeys.length; i++) {
            var nodeKey = this.nodeKeys[i];

            // find first and last preorder positions of the subtree spanned
            // by the current interal node
            var emp = this.empress;
            var t = emp._tree;
            var n = t.postorderselect(nodeKey);
            var start = t.preorder(t.fchild(n));
            var end = t.preorder(t.lchild(n));
            while (!t.isleaf(t.preorderselect(end))) {
                end = t.preorder(t.lchild(t.preorderselect(end)));
            }

            // find all tips within the subtree
            var tips = [];
            for (j = start; j <= end; j++) {
                var node = t.preorderselect(j);
                if (t.isleaf(node)) {
                    tips.push(t.name(node));
                }
            }

            // retrive the sample data for the tips
            var samples = emp._biom.getSamplesByObservations(tips);

            // iterate over the samples and extract the field values
            for (j = 0; j < this.fields.length; j++) {
                field = this.fields[j];

                // update fields mapping object
                var result = emp._biom.getSampleValuesCount(samples, field);
                fieldValues = Object.keys(result);
                for (k = 0; k < fieldValues.length; k++) {
                    fieldValue = fieldValues[k];
                    fieldsMap[field][fieldValue] += result[fieldValue];
                }
            }
        }

        // create hover-table
        this.fields = util.naturalSort(this.fields);
        for (i = 0; i < this.fields.length; i++) {
            // add row
            field = this.fields[i];
            row = this.table.insertRow(-1);
            cell = row.insertCell(-1);
            cell.innerHTML = "<strong>" + field + "</strong>";

            fieldValues = util.naturalSort(Object.keys(fieldsMap[field]));
            for (j = 0; j < fieldValues.length; j++) {
                fieldValue = fieldValues[j];
                cell = row.insertCell(-1);
                cell.innerHTML =
                    "<p>" +
                    fieldValue +
                    "<br>" +
                    fieldsMap[field][fieldValue] +
                    "</p>";
            }
        }
    };

    /**
     * Resets the state machine.
     */
    SelectedNodeMenu.prototype.clearSelectedNode = function () {
        this.table.innerHTML = "";
        this.nodeKeys = null;
        this.box.classList.add("hidden");
        this.fmHeader.classList.add("hidden");
        this.fmTable.classList.add("hidden");
        this.fmTable.innerHTML = "";
        this.drawer.loadSelectedNodeBuff([]);
    };

    /**
     * Sets the nodeKeys parameter of the state machine. This method will also
     * set the buffer to highlight the selected nodes.
     *
     * @param{Array} nodeKeys An array of node keys. The keys should be the
     *                        post order position of the nodes.
     */
    SelectedNodeMenu.prototype.setSelectedNodes = function (nodeKeys) {
        // test to make sure nodeKeys represents nodes with the same name
        var emp = this.empress;
        var name = emp._treeData[nodeKeys[0]].name;
        for (var i = 1; i < nodeKeys.length; i++) {
            if (emp._treeData[nodeKeys[i]].name !== name) {
                throw "setSelectedNodes(): keys do not represent the same node!";
            }
        }

        // test if nodeKeys represents tips then only one key should exist i.e.
        // tips must be uniqe
        var t = emp._tree;
        if (t.isleaf(t.postorderselect(nodeKeys[0])) && nodeKeys.length > 1) {
            throw (
                "setSelectedNodes(): " +
                this.empress._treeData[nodeKeys[0]].name +
                " matches multiple tips!"
            );
        }

        /* the buffer that holds the information to highlight the tree nodes
         * on the canvas.
         * format [x,y,r,g,b,...] where x,y is the coorindates of the
         * highlighted nodes
         */
        var highlightedNodes = [];
        for (i = 0; i < nodeKeys.length; i++) {
            var node = this.empress._treeData[nodeKeys[i]];
            var x = this.empress.getX(node);
            var y = this.empress.getY(node);
            highlightedNodes.push(...[x, y, 0, 1, 0]);
        }

        // send the buffer array to the drawer
        this.drawer.loadSelectedNodeBuff(highlightedNodes);

        // save the node keys to the selected node menu state machine
        this.nodeKeys = nodeKeys;
    };

    /**
     * Set the coordinates of the node hover-table. If nodeKeys was set to a
     * single node, then the hover-table will be placed next to that node.
     * Otherwise, the hover-table will be placed next to the root of the tree.
     */
    SelectedNodeMenu.prototype.updateMenuPosition = function () {
        if (this.nodeKeys === null) {
            return;
        }

        var node = this.empress._treeData[this.nodeKeys[0]];
        if (this.nodeKeys.length > 1) {
            node = this.empress._treeData[this.empress._tree.size - 1];
        }
        // get table coords
        var x = this.empress.getX(node);
        var y = this.empress.getY(node);
        var tableLoc = this.drawer.toScreenSpace(x, y);

        // set table location. add slight offset to location so menu appears
        // next to node instead of on top of it.
        this.box.style.left = Math.floor(tableLoc.x + 23) + "px";
        this.box.style.top = Math.floor(tableLoc.y - 43) + "px";
    };

    return SelectedNodeMenu;
});
