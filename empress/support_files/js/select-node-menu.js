define(["underscore", "util"], function (_, util) {
    function SelectedNodeMenu(empress, drawer) {
        this.empress = empress;
        this.drawer = drawer;
        this.fields = [];
        this.smTable = document.getElementById("menu-sm-table");
        this.smSection = document.getElementById("menu-sm-section");
        this.box = document.getElementById("menu-box");
        this.sel = document.getElementById("menu-select");
        this.addBtn = document.getElementById("menu-add-btn");
        this.nodeNameLabel = document.getElementById("menu-box-node-id");
        this.notes = document.getElementById("menu-box-notes");
        this.warning = document.getElementById("menu-box-warning");
        this.fmTable = document.getElementById("menu-fm-table");
        this.fmHeader = document.getElementById("menu-fm-header");
        this.smHeader = document.getElementById("menu-sm-header");
        this.nodeKeys = null;

        this.hiddenCallback = null;
        this.visibleCallback = null;
        this._samplesInSelection = [];
    }

    /**
     * Initializes the state machine. Adds metadata field options to drop down
     * menu, and creates the add button click event.
     */
    SelectedNodeMenu.prototype.initialize = function () {
        var scope = this;

        // add items to select
        var selOpts = this.empress.getSampleCategories();
        for (var i = 0; i < selOpts.length; i++) {
            var opt = document.createElement("option");
            opt.value = selOpts[i];
            opt.innerHTML = selOpts[i];
            this.sel.appendChild(opt);
        }

        // add event to add button
        var click = function () {
            var val = scope.sel.value;
            scope.sel.options[scope.sel.selectedIndex].remove();
            scope.fields.push(val);
            scope.smHeader.classList.remove("hidden");
            scope.showNodeMenu();
        };
        this.addBtn.onclick = click;
    };

    /*
     * Creates a HTML table describing sample presence info for a feature.
     *
     * This is set up as a static method
     * (https://stackoverflow.com/a/1635143/10730311) to make testing easier
     * (and also because it really doesn't need to depend on the state of this
     * object).
     *
     * @param{Object} ctData Two-dimensional mapping: The keys are the
     *                       sample metadata fields to include in the table,
     *                       and the values are Objects mapping unique values
     *                       in these fields to numbers describing this
     *                       feature's presence for these values.
     *                       e.g. {"body-site": {"gut": 5, "tongue": 2}}
     * @param{HTMLElement} tableEle A reference to the <table> element to
     *                              which this method will insert HTML.
     *                              This can just be the return value of
     *                              document.getElementById(). This element's
     *                              innerHTML will be cleared at the start of
     *                              this method.
     */
    SelectedNodeMenu.makeSampleMetadataTable = function (ctData, tableEle) {
        tableEle.innerHTML = "";
        // loop over all metadata fields the user has decided to show
        var sortedFields = util.naturalSort(_.keys(ctData));
        for (var i = 0; i < sortedFields.length; i++) {
            var field = sortedFields[i];

            // Create new rows in menu-table: the first row is for this
            // metadata field's "headers" (the unique values in the field,
            // e.g. "gut", "tongue", etc. for a field like body site), and
            // the second row is for the sample presence data for
            // the selected tree node within these unique values.
            //
            // Each group of two rows additionally has a header cell
            // on its leftmost side which spans both the header and data
            // rows; this header cell contains the name of the selected
            // metadata field, and has some fancy CSS that keeps it frozen
            // in place as the user scrolls the table horizontally.
            var fieldHeaderRow = tableEle.insertRow(-1);
            var fieldHeaderCell = fieldHeaderRow.insertCell(-1);
            fieldHeaderCell.innerHTML = "<strong>" + field + "</strong>";
            fieldHeaderCell.rowSpan = 2;
            fieldHeaderCell.classList.add("menu-box-header-cell");

            var fieldDataRow = tableEle.insertRow(-1);

            // add row values for this metadata field, one column at a time
            var categories = util.naturalSort(_.keys(ctData[field]));
            for (var j = 0; j < categories.length; j++) {
                var categoryHeaderCell = fieldHeaderRow.insertCell(-1);
                categoryHeaderCell.innerHTML =
                    "<strong>" + categories[j] + "</strong>";
                var categoryDataCell = fieldDataRow.insertCell(-1);
                categoryDataCell.innerHTML = ctData[field][categories[j]];
            }
        }
    };

    /*
     * Creates a HTML table (and a header) describing feature metadata.
     *
     * This checks to make sure that there actually is feature metadata (and
     * that the requested node has feature metadata) before creating things --
     * unlike makeSampleMetadataTable(), it's expected that some nodes may not
     * have any feature metadata information, or that feature metadata may not
     * have even been provided in the first place. (If this is the case, this
     * function will hide the fmHeader and fmTable elements.)
     *
     * @param{String} nodeName Name of the node to create this table for.
     *                         Duplicate names (for internal nodes) are ok.
     * @param{Array} mdCols Array of metadata columns present in each entry in
     *                      mdObj. If this is an empty array, this function
     *                      won't create anything, and will hide the fmHeader
     *                      and fmTable elements -- see above for details.
     * @param{Object} mdObj Object describing feature metadata. The keys should
     *                      be node names, and the value for a node name N
     *                      should be another Object mapping the metadata
     *                      columns (in mdCols) to the metadata values for
     *                      the node name N.
     * @param{HTMLElement} fmHeader A reference to a header HTML element to
     *                              hide / unhide depending on whether or not
     *                              feature metadata will be shown for this
     *                              node name.
     * @param{HTMLElement} fmTable A reference to the <table> element to
     *                             which this method will insert HTML.
     *                             This element's innerHTML will be cleared at
     *                             the start of this method.
     */
    SelectedNodeMenu.makeFeatureMetadataTable = function (
        nodeName,
        mdCols,
        mdObj,
        fmHeader,
        fmTable
    ) {
        fmTable.innerHTML = "";
        // If there is feature metadata, and if this node name is present as a
        // key in the feature metadata, then show this information.
        // (This uses boolean short-circuiting, so the _.has() should only be
        // evaluated if mdCols has a length of > 0.)
        if (mdCols.length > 0 && _.has(mdObj, nodeName)) {
            var headerRow = fmTable.insertRow(-1);
            var featureRow = fmTable.insertRow(-1);
            for (var x = 0; x < mdCols.length; x++) {
                var colName = mdCols[x];
                var colCell = headerRow.insertCell(-1);
                colCell.innerHTML = "<strong>" + colName + "</strong>";
                var dataCell = featureRow.insertCell(-1);
                dataCell.innerHTML = mdObj[nodeName][x];
            }
            fmHeader.classList.remove("hidden");
            fmTable.classList.remove("hidden");
        } else {
            fmHeader.classList.add("hidden");
            fmTable.classList.add("hidden");
        }
    };

    /**
     * Displays the node selection menu. nodeKeys must be set in order to use
     * this method.
     */
    SelectedNodeMenu.prototype.showNodeMenu = function () {
        // make sure the state machine is set
        if (this.nodeKeys === null) {
            throw "showNodeMenu(): Nodes have not be set in the state machine!";
        }

        // grab the name of the node
        var emp = this.empress;
        var nodeKeys = this.nodeKeys;
        var node = emp._treeData[nodeKeys[0]];
        var name = emp.getNodeInfo(node, "name");

        this.nodeNameLabel.textContent = "Name: " + name;

        this.notes.textContent = "";
        this.warning.textContent = "";

        // show either leaf or internal node
        var t = emp._tree;
        if (t.isleaf(t.postorderselect(this.nodeKeys[0]))) {
            this.showLeafNode();
        } else {
            this.showInternalNode();
        }

        // place menu-node menu next to node
        // otherwise place the (aggregated) node-menu over the root of the tree
        this.updateMenuPosition();

        // show table
        this.box.classList.remove("hidden");

        if (this.visibleCallback !== null) {
            this.visibleCallback(this._samplesInSelection);
        }
    };

    /**
     * Creates the node menu-table for a tip node. nodeKeys must be set in
     * before this function is called.
     */
    SelectedNodeMenu.prototype.showLeafNode = function () {
        // test to make sure nodeKeys is set
        if (this.nodeKeys === null) {
            throw "showLeafNode(): nodeKeys is not set!";
        }

        // test to make sure the leaf node is unique
        // (This should already be enforced in the Python side of things, but
        // we may as well be extra cautious.)
        if (this.nodeKeys.length > 1) {
            throw "showLeafNode(): Leaf nodes must be unique!";
        }

        // get the name of the tip
        var name = this.empress.getNodeInfo(
            this.empress._treeData[this.nodeKeys[0]],
            "name"
        );

        // 1. Add feature metadata information (if present for this tip; if
        // there isn't feature metadata for this tip, the f.m. UI elements in
        // the selected node menu will be hidden)
        SelectedNodeMenu.makeFeatureMetadataTable(
            name,
            this.empress._featureMetadataColumns,
            this.empress._tipMetadata,
            this.fmHeader,
            this.fmTable
        );

        // 2. Add sample presence information for this tip
        var ctData = this.empress.computeTipSamplePresence(name, this.fields);

        // 2.1 The samples represented by this tip are sent to Emperor

        // check if this tip is present in the BIOM table. The array returned
        // by BIOMTable.getObsIDsDifference() contains the feature IDs present
        // in the input array but not in the BIOM table -- so if the length of
        // this array is zero, this feature is present in the table.
        var diff = this.empress._biom.getObsIDsDifference([name]);
        if (diff.length == 0) {
            this._samplesInSelection = this.empress._biom.getSamplesByObservations(
                [name]
            );
        } else {
            this._samplesInSelection = [];
        }
        this._checkTips(diff);

        SelectedNodeMenu.makeSampleMetadataTable(ctData, this.smTable);
        if (this.fields.length > 0) {
            this.notes.textContent =
                "This node is a tip in the tree. These values represent the " +
                "number of unique samples that contain this node.";
        }
        this.smSection.classList.remove("hidden");
        this.smTable.classList.remove("hidden");
    };

    /**
     * Creates the node menu-table for internal nodes. nodeKeys must be set in
     * before this function is called. Furthermore, if there are more than key
     * in nodeKeys, then the keys must represent internal nodes with the same
     * name in the newick tree.
     */
    SelectedNodeMenu.prototype.showInternalNode = function () {
        // test to make sure nodeKeys is set
        if (this.nodeKeys === null) {
            throw "showInternalNode(): nodeKeys is not set!";
        }

        var name = this.empress.getNodeInfo(
            this.empress._treeData[this.nodeKeys[0]],
            "name"
        );

        // Figure out whether or not we know the actual node in the tree (for
        // example, if the user searched for a node with a duplicate name, then
        // we don't know which node the user was referring to). This impacts
        // whether or not we show the sample presence info for this node.
        var isUnambiguous = this.nodeKeys.length === 1;

        // This is not necessarily equal to this.nodeKeys. If an internal node
        // with a duplicate name was clicked on then this.nodeKeys will only
        // have a single entry (the node that was clicked on): but
        // keysOfNodesWithThisName will accordingly have multiple entries.
        // The reason we try to figure this out here is so that we can
        // determine whether or not to show a warning about duplicate names
        // in the menu.
        var keysOfNodesWithThisName = this.empress._nameToKeys[name];
        if (keysOfNodesWithThisName.length > 1) {
            this.warning.textContent =
                "Warning: " +
                keysOfNodesWithThisName.length +
                " nodes exist with the " +
                "above name.";
        }

        // 1. Add feature metadata information (if present) for this node
        // (Note that we allow duplicate-name internal nodes to have
        // feature metadata; this isn't a problem)
        SelectedNodeMenu.makeFeatureMetadataTable(
            name,
            this.empress._featureMetadataColumns,
            this.empress._intMetadata,
            this.fmHeader,
            this.fmTable
        );

        // 2. Compute sample presence information for this node.
        // (NOTE: this does not prevent "double-counting" samples, so the
        // aggregation for duplicate names should be fixed.)

        // force-reset the selection buffer
        this._samplesInSelection = [];

        if (isUnambiguous) {
            // this.nodeKeys has a length of 1
            var nodeKey = this.nodeKeys[0];
            var tips = this.empress._tree.findTips(nodeKey);

            var emp = this.empress;
            var samplePresence = emp.computeIntSamplePresence(
                nodeKey,
                this.fields
            );

            // used for the emperor callback
            this._samplesInSelection = this._samplesInSelection.concat(
                samplePresence.samples
            );

            this._checkTips(samplePresence.diff);

            SelectedNodeMenu.makeSampleMetadataTable(
                samplePresence.fieldsMap,
                this.smTable
            );
            this.smSection.classList.remove("hidden");
            this.smTable.classList.remove("hidden");
        } else {
            this.smSection.classList.add("hidden");
            this.smTable.classList.add("hidden");
        }

        // If isUnambiguous is false, no notes will be shown and the sample
        // presence info (including the table and notes) will be hidden
        if (this.fields.length > 0 && isUnambiguous) {
            this.notes.textContent =
                "This node is an internal node in the tree. These " +
                "values represent the number of unique samples that " +
                "contain any of this node's descendant tips.";
        }
    };

    /**
     * Given an array of tip names that are not present in the BIOM table,
     * warns the user about them using a toast message.
     */
    SelectedNodeMenu.prototype._checkTips = function (diff) {
        if (
            diff.length &&
            (this.visibleCallback !== null || this.hiddenCallback !== null)
        ) {
            util.toastMsg(
                "The following tips are not represented by your " +
                    "feature table and ordination: " +
                    diff.join(", ")
            );
        }
    };

    /**
     * Resets the state machine.
     */
    SelectedNodeMenu.prototype.clearSelectedNode = function () {
        this.smTable.innerHTML = "";
        this.nodeKeys = null;
        this.box.classList.add("hidden");
        this.fmHeader.classList.add("hidden");
        this.fmTable.classList.add("hidden");
        this.fmTable.innerHTML = "";
        this.drawer.loadSelectedNodeBuff([]);
        this.empress.drawTree();

        if (this.hiddenCallback !== null) {
            this.hiddenCallback(this._samplesInSelection);
        }
        this._samplesInSelection = [];
    };

    /**
     * Sets the nodeKeys parameter of the state machine. This method will also
     * set the buffer to highlight the selected nodes.
     *
     * @param {Array} nodeKeys An array of node keys representing the
     *                         nodes to be selected. The keys should be the
     *                         post order position of the nodes. If this array
     *                         has multiple entries (i.e. multiple nodes are
     *                         selected), the node selection menu will be
     *                         positioned at the first node in this array.
     */
    SelectedNodeMenu.prototype.setSelectedNodes = function (nodeKeys) {
        // test to make sure nodeKeys represents nodes with the same name
        var emp = this.empress;
        var name = emp.getNodeInfo(emp._treeData[nodeKeys[0]], "name");
        for (var i = 1; i < nodeKeys.length; i++) {
            if (emp.getNodeInfo(emp._treeData[nodeKeys[i]], "name") !== name) {
                throw "setSelectedNodes(): keys do not represent the same node!";
            }
        }

        // test if nodeKeys represents tips then only one key should exist i.e.
        // tips must be unique
        var t = emp._tree;
        if (t.isleaf(t.postorderselect(nodeKeys[0])) && nodeKeys.length > 1) {
            throw (
                "setSelectedNodes(): " +
                emp.getNodeInfo(emp._treeData[nodeKeys[0]], "name") +
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
     * Set the coordinates of the node menu box at the first node in nodeKeys.
     * This means that, if only a single node is selected, the menu will be
     * placed at this node's position; if multiple nodes are selected, the menu
     * will be placed at the first node's position.
     */
    SelectedNodeMenu.prototype.updateMenuPosition = function () {
        if (this.nodeKeys === null) {
            return;
        }

        var nodeToPositionAt = this.empress._treeData[this.nodeKeys[0]];
        // get table coords
        var x = this.empress.getX(nodeToPositionAt);
        var y = this.empress.getY(nodeToPositionAt);
        var tableLoc = this.drawer.toScreenSpace(x, y);

        // set table location. add slight offset to location so menu appears
        // next to the node instead of on top of it.
        this.box.style.left = Math.floor(tableLoc.x + 23) + "px";
        this.box.style.top = Math.floor(tableLoc.y - 43) + "px";
    };

    return SelectedNodeMenu;
});
