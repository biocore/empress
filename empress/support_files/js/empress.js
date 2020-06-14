define([
    "Camera",
    "Drawer",
    "Colorer",
    "VectorOps",
    "CanvasEvents",
    "util",
], function (Camera, Drawer, Colorer, VectorOps, CanvasEvents, util) {
    // The index position of the color array
    const RED = 0;
    const GREEN = 1;
    const BLUE = 2;

    /**
     * @class EmpressTree
     *
     * @param {BPTree} tree The phylogenetic tree
     * @param {Object} treeData The metadata associated with the tree
     *                 Note: currently treeData uses the preorder position of
     *                       each node as a key. Originally this was to save a
     *                       a bit of space but it be better if it used the
     *                       actual name of the name in tree.
     * @param {Object} nameToKeys Converts tree node names to an array of keys.
     * @param {Object} layoutToCoordSuffix Maps layout names to coord. suffix.
     *                 Note: An example is the "Unrooted" layout, which as of
     *                       writing should map to "2" since it's represented
     *                       by a node's x2 and y2 coordinates in the data.
     * @param {String} defaultLayout The default layout to draw the tree with
     * @param {BIOMTable} biom The BIOM table used to color the tree
     * @param {Canvas} canvas The HTML canvas that the tree will be drawn on.
     */
    function Empress(
        tree,
        treeData,
        nameToKeys,
        layoutToCoordSuffix,
        defaultLayout,
        biom,
        canvas
    ) {
        /**
         * @type {Camera}
         * The camera used to look at the tree
         * @private
         */
        this._cam = new Camera();

        /**
         * @type {Drawer}
         * used to draw the tree
         * @private
         */
        this._drawer = new Drawer(canvas, this._cam);
        this._canvas = canvas;

        /**
         * @type {Array}
         * The default color of the tree
         */
        this.DEFAULT_COLOR = [0.75, 0.75, 0.75];
        this.DEFAULT_COLOR_HEX = "#c0c0c0";

        this.DEFAULT_BRANCH_VAL = 1;

        /**
         * @type {BPTree}
         * The phylogenetic balance parenthesis tree
         * @private
         */
        this._tree = tree;
        this._numTips = 0;
        for (var i = 0; i < this._tree.size; i++) {
            if (this._tree.isleaf(this._tree.postorderselect(i))) {
                this._numTips++;
            }
        }

        /**
         * @type {Object}
         * The metadata associated with the tree branches
         * Note: postorder positions are used as keys because node names are not
         *       assumed to be unique. Use nameToKeys to convert a name to list
         *       of keys associated with it. Keys start at 1
         * @private
         */
        this._treeData = treeData;

        /**
         * @type{Object}
         * Converts tree node names to an array of _treeData keys.
         * @private
         */
        this._nameToKeys = nameToKeys;

        /**
         * @type {BiomTable}
         * Sample metadata
         * @private
         */
        this._biom = biom;

        /**
         * @type{Object}
         * As described above, maps layout names to node coordinate suffixes
         * in the tree data.
         * @private
         */
        this._layoutToCoordSuffix = layoutToCoordSuffix;

        /**
         * @type {String}
         * The default / current layouts used in the tree visualization.
         * @private
         */
        this._defaultLayout = defaultLayout;
        this._currentLayout = defaultLayout;

        /**
         * @type{Number}
         * The line width used for drawing "thick" lines.
         */
        this._currentLineWidth = 1;

        /**
         * @type{CanvasEvents}
         * Handles user events
         */
        this._events = new CanvasEvents(this, this._drawer, canvas);
    }

    /**
     * Initializes WebGL and then draws the tree
     */
    Empress.prototype.initialize = function () {
        this._drawer.initialize();
        this._drawer.loadNodeBuff(this.getNodeCoords());
        this.drawTree();
        this._events.setMouseEvents();
        var nodeNames = Object.keys(this._nameToKeys);
        nodeNames = nodeNames.filter((n) => !n.includes("EmpressNode"));
        nodeNames.sort();
        this._events.autocomplete(nodeNames);
    };

    /**
     * Draws the tree
     */
    Empress.prototype.drawTree = function () {
        this._drawer.loadTreeBuf(this.getCoords());
        this._drawer.loadNodeBuff(this.getNodeCoords());
        this._drawer.draw();
    };

    Empress.prototype.getX = function (nodeObj) {
        var xname = "x" + this._layoutToCoordSuffix[this._currentLayout];
        return nodeObj[xname];
    };

    Empress.prototype.getY = function (nodeObj) {
        var yname = "y" + this._layoutToCoordSuffix[this._currentLayout];
        return nodeObj[yname];
    };

    /**
     * Computes the number of entries in an array needed to store all of the
     * coordinate and color information for drawing the tree.
     *
     * Critically, this number is dependent on the current layout, since (for
     * example) the rectangular layout requires more drawing than the unrooted
     * layout (since we also have to draw vertical lines for internal nodes).
     *
     * @return {Number}
     */
    Empress.prototype.computeNecessaryCoordsSize = function () {
        var numLines;
        if (this._currentLayout === "Rectangular") {
            // Leaves have 1 line (vertical), the root also has 1 line
            // (horizontal), and internal nodes have 2 lines (both vertical and
            // horizontal).
            var leafAndRootCt = this._tree.numleafs() + 1;
            numLines = leafAndRootCt + 2 * (this._tree.size - leafAndRootCt);
        } else {
            numLines = this._tree.size - 1;
        }

        // Every line takes up two coordinates, and every coordinate takes up
        // VERTEX_SIZE (as of writing this is set to 5, for x, y, r, g, b)
        // spaces in coords.
        return 2 * numLines * this._drawer.VERTEX_SIZE;
    };

    /**
     * Retrives the node coordinate info
     * format of node coordinate info: [x, y, red, green, blue, ...]
     *
     * @return {Array}
     */
    Empress.prototype.getNodeCoords = function () {
        var tree = this._tree;
        var coords = new Float32Array(tree.size * 5);
        var coords_index = 0;

        for (var i = 1; i <= tree.size; i++) {
            var node = this._treeData[i];
            if (!node.name.includes("EmpressNode")) {
                coords[coords_index++] = this.getX(node);
                coords[coords_index++] = this.getY(node);
                coords.set(node.color, coords_index);
                coords_index += 3;
            }
        }

        return coords;
    };

    /**
     * Retrives the coordinate info of the tree.
     *  format of coordinate info: [x, y, red, green, blue, ...]
     *
     * @return {Array}
     */
    Empress.prototype.getCoords = function () {
        var tree = this._tree;

        // The coordinates (and colors) of the tree's nodes.
        var coords = new Float32Array(this.computeNecessaryCoordsSize());

        // branch color
        var color;

        var coords_index = 0;

        /* Draw a vertical line for the root node, if we're in rectangular
         * layout mode. Note that we *don't* draw a horizontal line for the
         * root node, even if it has a nonzero branch length; this could be
         * modified in the future if desired. See #141 on GitHub.
         *
         * (The python code explicitly disallows trees with <= 1 nodes, so
         * we're never going to be in the unforuntate situation of having the
         * root be the ONLY node in the tree. So this behavior is ok.)
         */
        if (this._currentLayout === "Rectangular") {
            color = this._treeData[tree.size].color;
            coords[coords_index++] = this.getX(this._treeData[tree.size]);
            coords[coords_index++] = this._treeData[tree.size].lowestchildyr;
            coords.set(color, coords_index);
            coords_index += 3;
            coords[coords_index++] = this.getX(this._treeData[tree.size]);
            coords[coords_index++] = this._treeData[tree.size].highestchildyr;
            coords.set(color, coords_index);
            coords_index += 3;
        }
        // iterate throught the tree in postorder, skip root
        for (var i = 1; i < tree.size; i++) {
            // name of current node
            var node = i;
            var parent = tree.postorder(tree.parent(tree.postorderselect(i)));

            if (!this._treeData[node].visible) {
                continue;
            }

            // branch color
            color = this._treeData[node].color;

            if (this._currentLayout === "Rectangular") {
                /* Nodes in the rectangular layout can have up to two "parts":
                 * a horizontal line, and a vertical line at the end of this
                 * line. These parts are indicated below as AAA... and BBB...,
                 * respectively. (Child nodes are indicated by CCC...)
                 *
                 *        BCCCCCCCCCCCC
                 *        B
                 * AAAAAAAB
                 *        B
                 *        BCCCCCCCCCCCC
                 *
                 * All nodes except for the root are drawn with a horizontal
                 * line, and all nodes except for tips are drawn with a
                 * vertical line.
                 */
                // 1. Draw horizontal line (we're already skipping the root)
                coords[coords_index++] = this.getX(this._treeData[parent]);
                coords[coords_index++] = this.getY(this._treeData[node]);
                coords.set(color, coords_index);
                coords_index += 3;
                coords[coords_index++] = this.getX(this._treeData[node]);
                coords[coords_index++] = this.getY(this._treeData[node]);
                coords.set(color, coords_index);
                coords_index += 3;
                // 2. Draw vertical line, if this is an internal node
                if (this._treeData[node].hasOwnProperty("lowestchildyr")) {
                    coords[coords_index++] = this.getX(this._treeData[node]);
                    coords[coords_index++] = this._treeData[
                        node
                    ].highestchildyr;
                    coords.set(color, coords_index);
                    coords_index += 3;
                    coords[coords_index++] = this.getX(this._treeData[node]);
                    coords[coords_index++] = this._treeData[node].lowestchildyr;
                    coords.set(color, coords_index);
                    coords_index += 3;
                }
            } else {
                // Draw nodes for the unrooted layout.
                // coordinate info for parent
                coords[coords_index++] = this.getX(this._treeData[parent]);
                coords[coords_index++] = this.getY(this._treeData[parent]);
                coords.set(color, coords_index);
                coords_index += 3;
                // coordinate info for current nodeN
                coords[coords_index++] = this.getX(this._treeData[node]);
                coords[coords_index++] = this.getY(this._treeData[node]);
                coords.set(color, coords_index);
                coords_index += 3;
            }
        }

        return coords;
    };

    /**
     * Sets flag to hide branches not in samples
     *
     * @param {Boolean} hide If true then hide uncolored tips
     *                       if false then show uncolored tips
     */
    Empress.prototype.setNonSampleBranchVisibility = function (hide) {
        var visible = !hide;

        // check sample Value for all branches
        for (var node in this._treeData) {
            if (!this._treeData[node].inSample) {
                this._treeData[node].visible = visible;
            }
        }
    };

    /**
     * Adds to an array of coordinates / colors the data needed to draw two
     * triangles.
     *
     * The two triangles drawn should look as follows:
     *
     * tL--tR
     * | \  |
     * |  \ |
     * bL--bR
     *
     * ...where all of the area is filled in, giving the impression of just
     * a rectangle (or generic quadrilateral, if e.g. tL isn't directly above
     * bL) being drawn.
     *
     * Note that this doesn't do any validation on the relative positions of
     * the tL / tR / bL / bR coordinates, so if those are messed up (e.g.
     * you're trying to draw the rectangle shown above but you accidentally
     * swap bL and tL) then this will just draw something weird.
     *
     * (Also note that we can modify coords because JS uses "Call by sharing"
     * for Arrays/Objects; see http://jasonjl.me/blog/2014/10/15/javascript.)
     *
     * @param {Array} coords Array containing coordinate + color data, to be
     *                       passed to Drawer.loadSampleThickBuf().
     * @param {Array} tL     top-left position, represented as [x, y]
     * @param {Array} tR     top-right position, represented as [x, y]
     * @param {Array} bL     bottom-left position, represented as [x, y]
     * @param {Array} bR     bottom-right position, represented as [x, y]
     * @param {Array} color  the color to draw / fill both triangles with
     */
    Empress.prototype._addTriangleCoords = function (
        coords,
        tL,
        tR,
        bL,
        bR,
        color
    ) {
        // Triangle 1
        coords.push(...tL);
        coords.push(...color);
        coords.push(...bL);
        coords.push(...color);
        coords.push(...bR);
        coords.push(...color);
        // Triangle 2
        coords.push(...tL);
        coords.push(...color);
        coords.push(...tR);
        coords.push(...color);
        coords.push(...bR);
        coords.push(...color);
    };

    /* Adds coordinate/color info for a vertical line for a given node in the
     * rectangular layout. The vertices of the rectangle to be drawn look like:
     *
     * tL |-tR---
     * ---|
     * bL |-bR---
     *
     * @param {Array} coords  Array containing coordinate + color data, to be
     *                        passed to Drawer.loadSampleThickBuf().
     * @param {Number} node   Node index in this._treeData, from which we'll
     *                        retrieve coordinate information.
     * @param {Number} amount Desired line thickness (note that this will be
     *                        applied on both sides of the line -- so if
     *                        amount = 1 here then the drawn thick line will
     *                        have a width of 1 + 1 = 2).
     */
    Empress.prototype._addThickVerticalLineCoords = function (
        coords,
        node,
        amount
    ) {
        var tL = [
            this.getX(this._treeData[node]) - amount,
            this._treeData[node].highestchildyr,
        ];
        var tR = [
            this.getX(this._treeData[node]) + amount,
            this._treeData[node].highestchildyr,
        ];
        var bL = [
            this.getX(this._treeData[node]) - amount,
            this._treeData[node].lowestchildyr,
        ];
        var bR = [
            this.getX(this._treeData[node]) + amount,
            this._treeData[node].lowestchildyr,
        ];
        var color = this._treeData[node].color;
        this._addTriangleCoords(coords, tL, tR, bL, bR, color);
    };

    /**
     * Thickens the branches that belong to unique sample categories
     * (i.e. features that are only in gut)
     *
     * @param {Number} amount - How thick to make branch
     */
    Empress.prototype.thickenSameSampleLines = function (amount) {
        // we do this because SidePanel._updateSample() calls this function
        // with lWidth - 1, so in order to make sure we're setting this
        // properly we add 1 to this value.
        this._currentLineWidth = amount + 1;
        var tree = this._tree;

        // the coordinate of the tree.
        var coords = [];
        this._drawer.loadSampleThickBuf([]);

        // In the corner case where the root node (located at index tree.size)
        // has an assigned color, thicken the root's drawn vertical line when
        // drawing the tree in Rectangular layout mode
        if (
            this._currentLayout === "Rectangular" &&
            this._treeData[tree.size].sampleColored
        ) {
            this._addThickVerticalLineCoords(coords, tree.size, amount);
        }
        // iterate throught the tree in postorder, skip root
        for (var i = 1; i < this._tree.size; i++) {
            // name of current node
            var node = i;
            var parent = tree.postorder(tree.parent(tree.postorderselect(i)));

            if (!this._treeData[node].sampleColored) {
                continue;
            }

            var color = this._treeData[node].color;
            var tL, tR, bL, bR;
            if (this._currentLayout === "Rectangular") {
                // Draw a thick vertical line for this node, if it isn't a tip
                if (this._treeData[node].hasOwnProperty("lowestchildyr")) {
                    this._addThickVerticalLineCoords(coords, node, amount);
                }
                /* Draw a horizontal thick line for this node -- we can safely
                 * do this for all nodes since this ignores the root, and all
                 * nodes except for the root (at least as of writing) have a
                 * horizontal line portion in the rectangular layout.
                 * tL   tR---
                 * -----|
                 * bL   bR---
                 */
                tL = [
                    this.getX(this._treeData[parent]),
                    this.getY(this._treeData[node]) + amount,
                ];
                tR = [
                    this.getX(this._treeData[node]),
                    this.getY(this._treeData[node]) + amount,
                ];
                bL = [
                    this.getX(this._treeData[parent]),
                    this.getY(this._treeData[node]) - amount,
                ];
                bR = [
                    this.getX(this._treeData[node]),
                    this.getY(this._treeData[node]) - amount,
                ];
                this._addTriangleCoords(coords, tL, tR, bL, bR, color);
            } else {
                // center branch such that parent node is at (0,0)
                var x1 = this.getX(this._treeData[parent]);
                var y1 = this.getY(this._treeData[parent]);
                var x2 = this.getX(this._treeData[node]);
                var y2 = this.getY(this._treeData[node]);
                var point = VectorOps.translate([x1, y1], -1 * x2, -1 * y2);

                // find angle/length of branch
                var angle = VectorOps.getAngle(point);
                var length = VectorOps.magnitude(point);
                var over = point[1] < 0;

                // find top left of box of thick line
                tL = [0, amount];
                tL = VectorOps.rotate(tL, angle, over);
                tL = VectorOps.translate(tL, x2, y2);

                tR = [length, amount];
                tR = VectorOps.rotate(tR, angle, over);
                tR = VectorOps.translate(tR, x2, y2);

                // find bottom point of thick line
                bL = [0, -1 * amount];
                bL = VectorOps.rotate(bL, angle, over);
                bL = VectorOps.translate(bL, x2, y2);

                bR = [length, -1 * amount];
                bR = VectorOps.rotate(bR, angle, over);
                bR = VectorOps.translate(bR, x2, y2);

                this._addTriangleCoords(coords, tL, tR, bL, bR, color);
            }
        }

        this._drawer.loadSampleThickBuf(coords);
    };

    /**
     * Color the tree by sample IDs
     *
     * @param {Array} sID - The sample IDs
     * @param {Array} rgb - The rgb array which defines the color
     */
    Empress.prototype.colorSampleIDs = function(sIds, rgb) {
      var tree = this._tree;
      var obs = this._biom.getObjservationUnionForSamples(sIds);
      obs = Array.from(this._namesToKeys(obs));
      obs = this._projectObservations({'samples': new Set(obs)});
      obs = Array.from(obs['samples']);

      for (var i = 0; i < obs.length; i++) {
          this._treeData[obs[i]].color = rgb;
      }
      this.drawTree();
    };


    /**
     * This method assumes we receive a list of samples and colors from
     * Emperor then it goes ahead and creates one group per color.
     */
    Empress.prototype.colorSampleGroups = function(sampleGroups) {
      var observationsPerGroup = {}, obs;

      // get a group of observations per color
      for (var group in sampleGroups) {
        obs = this._biom.getObjservationUnionForSamples(sampleGroups[group]);
        observationsPerGroup[group] = new Set(Array.from(this._namesToKeys(obs)));
      }

      // project to ancestors
      observationsPerGroup = this._projectObservations(observationsPerGroup);

      for (group in observationsPerGroup) {
        obs = Array.from(observationsPerGroup[group]);

        // convert hex string to rgb array
        var rgb = [
          parseInt(group.slice(0, 2), 16) / 255,
          parseInt(group.slice(2, 4), 16) / 255,
          parseInt(group.slice(4), 16) / 255,
        ];

        for (var i = 0; i < obs.length; i++) {
            this._treeData[obs[i]].color = rgb;
        }
      }

      this.drawTree();
    };


    /**
     * Converts a list of tree node names to their respectives keys in _treeData
     *
     * @param {Array} names Array of tree node names
     *
     * @return {Set} A set of keys cooresponding to entries in _treeData
     */
    Empress.prototype._namesToKeys = function (names) {
        var keys = new Set();

        // adds a key to the keys set.
        var addKey = function (key) {
            keys.add(key);
        };

        for (var i = 0; i < names.length; i++) {
            // most names have a one-to-one correspondence but during testing
            // a tree came up that had a one-to-many correspondance.
            // _nameToKeys map node names (the names that appear in the newick
            // string) to all nodes (in bp-tree) with that name.
            this._nameToKeys[names[i]].forEach(addKey);
        }
        return keys;
    };

    /**
     * Color the tree using sample data
     *
     * @param {String} cat The sample category to use
     * @param {String} color - the Color map to use
     *
     * @return {Object} Maps keys to colors
     */
    Empress.prototype.colorBySampleCat = function (cat, color) {
        var tree = this._tree;
        var obs = this._biom.getObsBy(cat);
        var categories = util.naturalSort(Object.keys(obs));

        // shared by the following for loops
        var i, j, category;

        // convert observation IDs to _treeData keys
        for (i = 0; i < categories.length; i++) {
            category = categories[i];
            obs[category] = this._namesToKeys(obs[category]);
        }

        // assign colors to categories
        var colorer = new Colorer(color, categories);
        // colors for drawing the tree
        var cm = colorer.getMapRGB();
        // colors for the legend
        var keyInfo = colorer.getMapHex();

        // assign internal nodes to approperiate category based on its children
        obs = this._projectObservations(obs);

        // color tree
        this._colorTree(obs, cm);

        // get percent of branches belonging to unique category (i.e. just gut)
        this.percentColoredBySample(obs, keyInfo);

        return keyInfo;
    };

    /**
     * Finds the branches that are unique to each category in obs
     *
     * @param {Object} observations grouped by categories
     *
     * @return {Object} the branches of the tree that are uniqe to category in
                        obs
    */
    Empress.prototype._projectObservations = function (obs) {
        var tree = this._tree;
        var categories = Object.keys(obs);

        // assign internal nodes to approperiate category based on its children
        // iterate using postorder
        for (var i = 1; i < tree.size; i++) {
            var node = i;
            var parent = tree.postorder(tree.parent(tree.postorderselect(i)));

            for (j = 0; j < categories.length; j++) {
                category = categories[j];
                if (obs[category].has(node)) {
                    this._treeData[node].inSample = true;
                    obs[category].add(parent);
                }
            }
        }
        obs = util.keepUniqueKeys(obs);
        return obs;
    };

    /**
     * Updates the tree based on obs and cm but does not draw a new tree.
     *
     * @param{Object} obs The mapping from sample category to unique features.
     * @param{Object} cm The mapping from sample category to color.
     */
    Empress.prototype._colorTree = function (obs, cm) {
        var categories = util.naturalSort(Object.keys(obs));
        // color tree
        for (var i = 0; i < categories.length; i++) {
            category = categories[i];
            var keys = [...obs[category]];

            for (var j = 0; j < keys.length; j++) {
                var key = keys[j];
                this._treeData[key].color = cm[category];
                this._treeData[key].sampleColored = true;
            }
        }
    };

    /**
     * Cacluates the total and relative pertange of the tree that was colored by
     * each category in sampleObs
     *
     * @param {Object} sampleObs The object containing which tree branches are
     *                 colored by which sample category
     * @param {Object} keyInfo The object containing the information to be
     *                 displayed in the sample legend
     */
    Empress.prototype.percentColoredBySample = function (sampleObs, keyInfo) {
        // calculate relative tree size i.e. the subtree spanned by the samples
        // iterate over tree using postorder

        var i,
            relativeTreeSize = 0;
        for (i = 1; i <= this._tree.size; i++) {
            if (this._treeData[i].inSample) {
                relativeTreeSize++;
            }
        }

        // calculate total and relative percentages in each group
        var sampleCategies = Object.keys(sampleObs);
        for (i = 0; i < sampleCategies.length; i++) {
            var category = sampleCategies[i];
            var branchesInCategory = sampleObs[category].length;
            keyInfo[category].tPercent = branchesInCategory / this._tree.size;
            keyInfo[category].rPercent = branchesInCategory / relativeTreeSize;
        }
    };

    /**
     * Sets the color of the tree back to default
     */
    Empress.prototype.resetTree = function () {
        var keys = Object.keys(this._treeData);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            this._treeData[key].color = this.DEFAULT_COLOR;
            this._treeData[key].inSample = false;
            this._treeData[key].sampleColored = false;
            this._treeData[key].visible = true;
        }
        this._drawer.loadSampleThickBuf([]);
    };

    /**
     * Returns a list of sample categories
     *
     * @return {Array}
     */
    Empress.prototype.getSampleCategories = function () {
        return this._biom.getSampleCategories();
    };

    /**
     * Returns a list of all available layouts.
     *
     * @return {Array}
     */
    Empress.prototype.getAvailableLayouts = function () {
        return Object.keys(this._layoutToCoordSuffix);
    };

    /**
     * Redraws the tree with a new layout (if different from current layout).
     */
    Empress.prototype.updateLayout = function (newLayout) {
        if (this._currentLayout !== newLayout) {
            if (this._layoutToCoordSuffix.hasOwnProperty(newLayout)) {
                this._currentLayout = newLayout;
                // Adjust the thick-line stuff before calling drawTree() --
                // this will get the buffer set up before it's actually drawn
                // in drawTree(). Doing these calls out of order (draw tree,
                // then call thickenSameSampleLines()) causes the thick-line
                // stuff to only change whenever the tree is redrawn.
                if (this._currentLineWidth !== 1) {
                    // The - 1 mimics the behavior of SidePanel._updateSample()
                    this.thickenSameSampleLines(this._currentLineWidth - 1);
                }
                this._drawer.loadNodeBuff(this.getNodeCoords());
                this.drawTree();
            } else {
                // This should never happen under normal circumstances (the
                // input to this function should always be an existing layout
                // name), but we might as well account for it anyway.
                throw "Layout " + newLayout + " doesn't have coordinate data.";
            }
        }
    };

    /**
     * Returns the default layout name.
     *
     * @return {String}
     */
    Empress.prototype.getDefaultLayout = function () {
        return this._defaultLayout;
    };

    /**
     * Returns an array of unique values in a metadata column. If column is
     * numberic then the array is sorted in ascending order.
     *
     * @param{Object} category The column of data
     *
     * @return{Object}
     */
    Empress.prototype.getUniqueSampleValues = function (category) {
        return this._biom.getUniqueSampleValues(category);
    };

    /**
     * Returns a mapping of trajectory values to observations given a gradient
     * and trajectory. Ignores trajectories which represent missing data. (i.e.
     * 'unknown' for non-numberic and NaN for numeric)
     *
     * @param{Object} col The column in metadata the gradient belongs to.
     * @param{Object} grad The value for the gradient. observations that have
     *                this value will only be returned.
     * @param{Object} traj The column for the trajectory. All observations with
     *                missing data in this column will be ignored.
     *
     * @return{Object} return a mapping of trajectory values to observations.
     */
    Empress.prototype.getGradientStep = function (cat, grad, traj) {
        return this._biom.getGradientStep(cat, grad, traj);
    };

    return Empress;
});
