define([
    "underscore",
    "Camera",
    "Drawer",
    "Colorer",
    "VectorOps",
    "CanvasEvents",
    "util",
    "chroma",
], function (
    _,
    Camera,
    Drawer,
    Colorer,
    VectorOps,
    CanvasEvents,
    util,
    chroma
) {
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
     * @param {Array} featureMetadataColumns Columns of the feature metadata
     * @param {Object} tipMetadata Feature metadata for tips in the tree
     * @param {Object} intMetadata Feature metadata for internal nodes in tree
     * @param {Canvas} canvas The HTML canvas that the tree will be drawn on.
     */
    function Empress(
        tree,
        treeData,
        nameToKeys,
        layoutToCoordSuffix,
        defaultLayout,
        biom,
        featureMetadataColumns,
        tipMetadata,
        intMetadata,
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
        // allow canvas to be null to make testing empress easier
        if (canvas !== null) {
            this._drawer = new Drawer(canvas, this._cam);
            this._canvas = canvas;
        }

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
         * @type{Array}
         * Feature metadata column names.
         * @private
         */
        this._featureMetadataColumns = featureMetadataColumns;

        /**
         * @type{Object}
         * Feature metadata: keys are tree node IDs, and values are objects
         * mapping feature metadata column names to the metadata value for that
         * feature. We split this up into tip and internal node feature
         * metadata objects.
         * @private
         */
        this._tipMetadata = tipMetadata;
        this._intMetadata = intMetadata;

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
        // allow canvas to be null to make testing empress easier
        if (canvas !== null) {
            this._events = new CanvasEvents(this, this._drawer, canvas);
        }
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
        nodeNames = nodeNames.filter((n) => !n.startsWith("EmpressNode"));
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
            // Leaves have 1 line (horizontal), the root also has 1 line
            // (vertical), and internal nodes have 2 lines (both vertical and
            // horizontal). As an example, the below tiny tree shown in
            // rectangular layout contains 5 nodes total (including the root)
            // and 3 leaves. So numLines = 3 + 1 + 2*(5 - (3 + 1)) = 3+1+2 = 6.
            //
            //     +--
            // +---|
            // |   +-
            // |
            // +--------
            var leafAndRootCt = this._tree.numleafs() + 1;
            numLines = leafAndRootCt + 2 * (this._tree.size - leafAndRootCt);
        } else if (this._currentLayout === "Circular") {
            // All internal nodes (except root which is just a point) have an
            // arc that is made out of 15 small line segments. In addition, all
            // non-root nodes have an additional line that connects them to
            // their parent's arc. So the same example above would have
            // numLines = 3 + 16 * (5 - 3 - 1) = 19.
            // i.e. 3 lines for the leaves and 16 * (5 - 3 - 1) lines for the
            // internal nodes. The -1 is there because we do not draw a line
            // for the root.
            var leafCt = this._tree.numleafs();
            numLines = leafCt + 16 * (this._tree.size - leafCt - 1);
        } else {
            // the root is not drawn in the unrooted layout
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
            if (!node.name.startsWith("EmpressNode")) {
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

        /* Draw a vertical line, if we're in rectangular layout mode. Note that
         * we *don't* draw a horizontal line (with the branch length of the
         * root) for the root node, even if it has a nonzero branch length;
         * this could be modified in the future if desired. See #141 on GitHub.
         *
         * (The python code explicitly disallows trees with <= 1 nodes, so
         * we're never going to be in the unfortunate situation of having the
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
            } else if (this._currentLayout === "Circular") {
                /* Same deal as above, except instead of a "vertical line" this
                 * time we draw an "arc".
                 */
                // 1. Draw line protruding from parent (we're already skipping
                // the root so this is ok)
                //
                // Note that position info for this is stored as two sets of
                // coordinates: (xc0, yc0) for start point, (xc1, yc1) for end
                // point. The *c1 coordinates are explicitly associated with
                // the circular layout so we can just use this.getX() /
                // this.getY() for these coordinates.
                coords[coords_index++] = this._treeData[node].xc0;
                coords[coords_index++] = this._treeData[node].yc0;
                coords.set(color, coords_index);
                coords_index += 3;
                coords[coords_index++] = this.getX(this._treeData[node]);
                coords[coords_index++] = this.getY(this._treeData[node]);
                coords.set(color, coords_index);
                coords_index += 3;
                // 2. Draw arc, if this is an internal node (note again that
                // we're skipping the root)
                if (this._treeData[node].hasOwnProperty("arcx0")) {
                    // arcs are created by sampling 15 small lines along the
                    // arc spanned by rotating (arcx0, arcy0), the line whose
                    // origin is the root of the tree and endpoint is the start
                    // of the arc, by arcendangle - arcstartangle radians.
                    var numSamples = 15;
                    var arcDeltaAngle =
                        this._treeData[node].arcendangle -
                        this._treeData[node].arcstartangle;
                    var sampleAngle = arcDeltaAngle / numSamples;
                    var sX = this._treeData[node].arcx0;
                    var sY = this._treeData[node].arcy0;
                    for (var line = 0; line < numSamples; line++) {
                        var x =
                            sX * Math.cos(line * sampleAngle) -
                            sY * Math.sin(line * sampleAngle);
                        var y =
                            sX * Math.sin(line * sampleAngle) +
                            sY * Math.cos(line * sampleAngle);
                        coords[coords_index++] = x;
                        coords[coords_index++] = y;
                        coords.set(color, coords_index);
                        coords_index += 3;

                        x =
                            sX * Math.cos((line + 1) * sampleAngle) -
                            sY * Math.sin((line + 1) * sampleAngle);
                        y =
                            sX * Math.sin((line + 1) * sampleAngle) +
                            sY * Math.cos((line + 1) * sampleAngle);
                        coords[coords_index++] = x;
                        coords[coords_index++] = y;
                        coords.set(color, coords_index);
                        coords_index += 3;
                    }
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
     * the corners coordinates, so if those are messed up (e.g. you're trying
     * to draw the rectangle shown above but you accidentally swap bL and tL)
     * then this will just draw something weird.
     *
     * (Also note that we can modify coords because JS uses "Call by sharing"
     * for Arrays/Objects; see http://jasonjl.me/blog/2014/10/15/javascript.)
     *
     * @param {Array} coords Array containing coordinate + color data, to be
     *                       passed to Drawer.loadSampleThickBuf().
     * @param {Object} corners Object with tL, tR, bL, and bR entries (each
     *                         mapping to an array of the format [x, y]
     *                         indicating this position).
     * @param {Array} color  the color to draw / fill both triangles with
     */
    Empress.prototype._addTriangleCoords = function (coords, corners, color) {
        // Triangle 1
        coords.push(...corners.tL);
        coords.push(...color);
        coords.push(...corners.bL);
        coords.push(...color);
        coords.push(...corners.bR);
        coords.push(...color);
        // Triangle 2
        coords.push(...corners.tL);
        coords.push(...color);
        coords.push(...corners.tR);
        coords.push(...color);
        coords.push(...corners.bR);
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
     * @param {Number} level Desired line thickness (note that this will be
     *                       applied on both sides of the line -- so if
     *                       level = 1 here then the drawn thick line will
     *                       have a width of 1 + 1 = 2).
     */
    Empress.prototype._addThickVerticalLineCoords = function (
        coords,
        node,
        level
    ) {
        var corners = {
            tL: [
                this.getX(this._treeData[node]) - level,
                this._treeData[node].highestchildyr,
            ],
            tR: [
                this.getX(this._treeData[node]) + level,
                this._treeData[node].highestchildyr,
            ],
            bL: [
                this.getX(this._treeData[node]) - level,
                this._treeData[node].lowestchildyr,
            ],
            bR: [
                this.getX(this._treeData[node]) + level,
                this._treeData[node].lowestchildyr,
            ],
        };
        var color = this._treeData[node].color;
        this._addTriangleCoords(coords, corners, color);
    };

    /**
     * Thickens the branches that belong to unique sample categories
     * (i.e. features that are only in gut)
     *
     * @param {Number} level - Desired line thickness (note that this will be
     *                         applied on both sides of the line -- so if
     *                         level = 1 here then the drawn thick line will
     *                         have a width of 1 + 1 = 2).
     */
    Empress.prototype.thickenSameSampleLines = function (level) {
        // we do this because SidePanel._updateSample() calls this function
        // with lWidth - 1, so in order to make sure we're setting this
        // properly we add 1 to this value.
        this._currentLineWidth = level + 1;
        var tree = this._tree;

        // the coordinate of the tree.
        var coords = [];
        this._drawer.loadSampleThickBuf([]);

        // define these variables so jslint does not complain
        var x1, y1, x2, y2, corners;

        // In the corner case where the root node (located at index tree.size)
        // has an assigned color, thicken the root's drawn vertical line when
        // drawing the tree in Rectangular layout mode
        if (
            this._currentLayout === "Rectangular" &&
            this._treeData[tree.size].sampleColored
        ) {
            this._addThickVerticalLineCoords(coords, tree.size, level);
        }
        // iterate through the tree in postorder, skip root
        for (var i = 1; i < this._tree.size; i++) {
            // name of current node
            var node = i;
            var parent = tree.postorder(tree.parent(tree.postorderselect(i)));

            if (!this._treeData[node].sampleColored) {
                continue;
            }

            var color = this._treeData[node].color;
            if (this._currentLayout === "Rectangular") {
                // Draw a thick vertical line for this node, if it isn't a tip
                if (this._treeData[node].hasOwnProperty("lowestchildyr")) {
                    this._addThickVerticalLineCoords(coords, node, level);
                }
                /* Draw a horizontal thick line for this node -- we can safely
                 * do this for all nodes since this ignores the root, and all
                 * nodes except for the root (at least as of writing) have a
                 * horizontal line portion in the rectangular layout.
                 * tL   tR---
                 * -----|
                 * bL   bR---
                 */
                corners = {
                    tL: [
                        this.getX(this._treeData[parent]),
                        this.getY(this._treeData[node]) + level,
                    ],
                    tR: [
                        this.getX(this._treeData[node]),
                        this.getY(this._treeData[node]) + level,
                    ],
                    bL: [
                        this.getX(this._treeData[parent]),
                        this.getY(this._treeData[node]) - level,
                    ],
                    bR: [
                        this.getX(this._treeData[node]),
                        this.getY(this._treeData[node]) - level,
                    ],
                };
                this._addTriangleCoords(coords, corners, color);
            } else if (this._currentLayout === "Circular") {
                // Thicken the "arc" if this is non-root internal node
                // (TODO: this will need to be adapted when the arc is changed
                // to be a bezier curve)
                if (this._treeData[node].hasOwnProperty("arcx0")) {
                    // arcs are created by sampling 15 small lines along the
                    // arc spanned by rotating arcx0, the line whose origin
                    // is the root of the tree and endpoint is the start of the
                    // arc, by arcendangle - arcstartangle radians.
                    var numSamples = 15;
                    var arcDeltaAngle =
                        this._treeData[node].arcendangle -
                        this._treeData[node].arcstartangle;
                    var sampleAngle = arcDeltaAngle / numSamples;
                    var sX = this._treeData[node].arcx0;
                    var sY = this._treeData[node].arcy0;
                    for (var line = 0; line < numSamples; line++) {
                        x1 =
                            sX * Math.cos(line * sampleAngle) -
                            sY * Math.sin(line * sampleAngle);
                        y1 =
                            sX * Math.sin(line * sampleAngle) +
                            sY * Math.cos(line * sampleAngle);
                        x2 =
                            sX * Math.cos((line + 1) * sampleAngle) -
                            sY * Math.sin((line + 1) * sampleAngle);
                        y2 =
                            sX * Math.sin((line + 1) * sampleAngle) +
                            sY * Math.cos((line + 1) * sampleAngle);
                        var arc0corners = VectorOps.computeBoxCorners(
                            x1,
                            y1,
                            x2,
                            y2,
                            level
                        );
                        var arc1corners = VectorOps.computeBoxCorners(
                            x1,
                            y1,
                            x2,
                            y2,
                            level
                        );
                        this._addTriangleCoords(coords, arc0corners, color);
                        this._addTriangleCoords(coords, arc1corners, color);
                    }
                }
                // Thicken the actual "node" portion, extending from the center
                // of the layout
                x1 = this._treeData[node].xc0;
                y1 = this._treeData[node].yc0;
                x2 = this.getX(this._treeData[node]);
                y2 = this.getY(this._treeData[node]);
                corners = VectorOps.computeBoxCorners(x1, y1, x2, y2, level);
                this._addTriangleCoords(coords, corners, color);
            } else {
                x1 = this.getX(this._treeData[parent]);
                y1 = this.getY(this._treeData[parent]);
                x2 = this.getX(this._treeData[node]);
                y2 = this.getY(this._treeData[node]);
                corners = VectorOps.computeBoxCorners(x1, y1, x2, y2, level);
                this._addTriangleCoords(coords, corners, color);
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
    Empress.prototype.colorSampleIDs = function (sIds, rgb) {
        var tree = this._tree;
        var obs = this._biom.getObjservationUnionForSamples(sIds);
        obs = Array.from(this._namesToKeys(obs));
        obs = this._projectObservations({ samples: new Set(obs) });
        obs = Array.from(obs.samples);

        for (var i = 0; i < obs.length; i++) {
            this._treeData[obs[i]].color = rgb;
        }
        this.drawTree();
    };

    /**
     *
     * Color the tree by sample groups
     *
     * This method assumes we receive a list of samples and colors from
     * Emperor then it goes ahead and creates one group per color.
     *
     * @param {Array} sampleGroups - A list of sample identifiers
     */
    Empress.prototype.colorSampleGroups = function (sampleGroups) {
        var observationsPerGroup = {},
            obs;

        // get a group of observations per color
        for (var group in sampleGroups) {
            obs = this._biom.getObjservationUnionForSamples(
                sampleGroups[group]
            );
            obs = Array.from(this._namesToKeys(obs));
            observationsPerGroup[group] = new Set(obs);
        }

        // project to ancestors
        observationsPerGroup = this._projectObservations(observationsPerGroup);

        for (group in observationsPerGroup) {
            obs = Array.from(observationsPerGroup[group]);

            // convert hex string to rgb array
            var rgb = chroma(group).gl().slice(0, 3);

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

        // assign internal nodes to appropriate category based on its children
        obs = this._projectObservations(obs);

        // assign colors to categories
        var colorer = new Colorer(color, categories);
        // colors for drawing the tree
        var cm = colorer.getMapRGB();
        // colors for the legend
        var keyInfo = colorer.getMapHex();
        // color tree
        this._colorTree(obs, cm);

        return keyInfo;
    };

    /**
     * Color the tree based on a feature metadata column.
     *
     * @param {String} cat The feature metadata column to color nodes by.
     *                     It's assumed that this is present in
     *                     this._featureMetadataColumns.
     * @param {String} color The name of the color map to use.
     * @param {String} method Defines how coloring is done. If this is "tip",
     *                        then only tip-level feature metadata will be
     *                        used, and (similar to sample coloring) upwards
     *                        propagation of unique values will be done in
     *                        order to color internal nodes where applicable.
     *                        If this is "all", then this will use both tip and
     *                        internal node feature metadata without doing any
     *                        propagation. If this is anything else, this will
     *                        throw an error.
     *
     * @return {Object} Maps unique values in this f. metadata column to colors
     */
    Empress.prototype.colorByFeatureMetadata = function (cat, color, method) {
        // Produce a mapping of unique values in this feature metadata
        // column to an array of the feature(s) with each value.
        // The coloring method influences how much of the feature metadata
        // we'll look at. (While we're at it, validate the coloring method.)
        var fmObjs;
        if (method === "tip") {
            fmObjs = [this._tipMetadata];
        } else if (method === "all") {
            fmObjs = [this._tipMetadata, this._intMetadata];
        } else {
            throw 'F. metadata coloring method "' + method + '" unrecognized.';
        }

        var uniqueValueToFeatures = {};
        _.each(fmObjs, function (mObj) {
            _.mapObject(mObj, function (fmRow, tipID) {
                // This is loosely based on how BIOMTable.getObsBy() works.
                var fmVal = fmRow[cat];
                if (_.has(uniqueValueToFeatures, fmVal)) {
                    uniqueValueToFeatures[fmVal].push(tipID);
                } else {
                    uniqueValueToFeatures[fmVal] = [tipID];
                }
            });
        });

        var emp = this;
        var sortedUniqueValues = util.naturalSort(
            Object.keys(uniqueValueToFeatures)
        );
        // convert observation IDs to _treeData keys. Notably, this includes
        // converting the values of uniqueValueToFeatures from Arrays to Sets.
        var obs = {};
        _.each(sortedUniqueValues, function (uniqueVal, i) {
            uniqueVal = sortedUniqueValues[i];
            obs[uniqueVal] = emp._namesToKeys(uniqueValueToFeatures[uniqueVal]);
        });

        // assign colors to unique values
        var colorer = new Colorer(color, sortedUniqueValues);
        // colors for drawing the tree
        var cm = colorer.getMapRGB();
        // colors for the legend
        var keyInfo = colorer.getMapHex();

        // Do upwards propagation only if the coloring method is "tip"
        // TODO / NOTE: _projectObservations() sets the .inSample property of
        // features that are colored with metadata. This is "wrong," in the
        // sense that samples don't really have anything to do with feature
        // metadata coloring, but I don't *think* this will impact things
        // because I think resetTree() should be called before any other
        // coloring operations would be done. However, would be good to test
        // things -- or at least to rename a lot of these coloring utilities
        // to talk about "groups" rather than "samples", esp. since I think
        // animation has the same problem...
        if (method === "tip") {
            obs = this._projectObservations(obs);
        }

        // color tree
        this._colorTree(obs, cm);

        return keyInfo;
    };

    /*
     * Projects the groups in obs up the tree.
     *
     * This function performs two distinct operations:
     *      1) Removes the non-unique observations from each group in obs
     *         (i.e. performs an 'exclusive or' between each group).
     *
     *      2) Assigns each internal node to a group if all of its children belong
     *         to the same group.
     *
     * Note: All tips that are not passed into obs are considered to belong to
     *       a "not-represented" group, which will be omitted from the
     *       returned version of obs.
     *
     * @param {Object} obs Maps categories to a set of observations (i.e. tips)
     * @return {Object} returns A Map with the same group names that maps groups
                        to a set of keys (i.e. tree nodes) that are unique to
                        each group.
     */
    Empress.prototype._projectObservations = function (obs) {
        var tree = this._tree,
            categories = Object.keys(obs),
            notRepresented = new Set(),
            i,
            j;

        // find "non-represented" tips
        // Note: the following uses postorder traversal
        for (i = 1; i < tree.size; i++) {
            if (tree.isleaf(tree.postorderselect(i))) {
                var represented = false;
                for (j = 0; j < categories.length; j++) {
                    if (obs[categories[j]].has(i)) {
                        represented = true;
                        break;
                    }
                }
                if (!represented) notRepresented.add(i);
            }
        }

        // assign internal nodes to appropriate category based on children
        // iterate using postorder
        // Note that, although we don't explicitly iterate over the
        // root (at index tree.size) in this loop, we iterate over all its
        // descendants; so in the event that all leaves are unique,
        // the root can still get assigned to a group.
        for (i = 1; i < tree.size; i++) {
            var node = i;
            var parent = tree.postorder(tree.parent(tree.postorderselect(i)));

            for (j = 0; j < categories.length; j++) {
                category = categories[j];

                // add internal nodes to groups
                if (obs[category].has(node)) {
                    this._treeData[node].inSample = true;
                    obs[category].add(parent);
                }
                if (notRepresented.has(node)) {
                    notRepresented.add(parent);
                }
            }
        }
        var result = util.keepUniqueKeys(obs, notRepresented);

        return result;
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

    /**
     * Returns an array of feature metadata column names.
     *
     * @return {Array}
     */
    Empress.prototype.getFeatureMetadataCategories = function () {
        return this._featureMetadataColumns;
    };

    return Empress;
});
