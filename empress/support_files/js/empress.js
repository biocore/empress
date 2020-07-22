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
     * @param {Array} featureMetadataColumns Columns of the feature metadata.
     *                Note: The order of this array should match the order of
     *                      the arrays which are the values of tipMetadata and
     *                      intMetadata. If no feature metadata was provided
     *                      when generating an Empress visualization, this
     *                      parameter should be [] (and tipMetadata and
     *                      intMetadata should be {}s).
     * @param {Object} tipMetadata Feature metadata for tips in the tree
     *                 Note: This should map tip names to an array of feature
     *                       metadata values. Each array should have the same
     *                       length as featureMetadataColumns.
     * @param {Object} intMetadata Feature metadata for internal nodes in tree
     *                 Note: Should be formatted analogously to tipMetadata.
     *                       Note that internal node names can be non-unique.
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

        /**
         * @type {Object}
         * The metadata associated with the tree branches
         * Note: postorder positions are used as keys because node names are not
         *       assumed to be unique. Use nameToKeys to convert a name to list
         *       of keys associated with it. Keys start at 1
         * @private
         */
        this._treeData = treeData;

        // count number of tips and set default color/visible
        // Note: currently empress tree uses 1-based index since the bp-tree
        //       bp-tree.js is based off of used 1-based index.
        for (var i = 1; i <= this._tree.size; i++) {
            this._treeData[i].color = this.DEFAULT_COLOR;
            this._treeData[i].visible = true;
            if (this._tree.isleaf(this._tree.postorderselect(i))) {
                this._numTips++;
            }
        }

        /**
         * @type{Object}
         * Converts tree node names to an array of _treeData keys.
         * @private
         */
        this._nameToKeys = nameToKeys;

        /**
         * @type {BiomTable}
         * BIOM table: includes feature presence information and sample-level
         * metadata.
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
         * Feature metadata: keys are tree node names, and values are arrays
         * of length equal to this._featureMetadataColumns.length.
         * For the sake of simplicity, we split this up into tip and internal
         * node feature metadata objects.
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
         * type {Object}
         * Maps tree layouts to the average point of each layout
         */
        this.layoutAvgPoint = {};
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
        if (
            canvas !== null &&
            document.getElementById("quick-search") !== null
        ) {
            this._events = new CanvasEvents(this, this._drawer, canvas);
        }

        /**
         * @type{Object}
         * Stores the information that describes how the tree is currently being
         * colored.
         *
         * Format {metadata: <sample or feautre>, metadataColumn: <field>}
         */
        this._currentColorInfo = null;

        /**
         * @type{Object}
         * Stores the information about the collapsed clased. This object is
         * used to determine if a user clicked on a collapsed clade.
         *
         * Format:
         * {
         *      node: {
         *          left: <node_id>,
         *          right: <node_id>,
         *          deepest: <node_id>,
         *          length: <Number>
         *      }
         *  }
         */
        this._collapsedClades = {};
        this._collapsedCladeBuffer = [];
        this._collapseMethod = "normal";
        this._inorder = null;
    }

    /**
     * Initializes WebGL and then draws the tree
     */
    Empress.prototype.initialize = function () {
        this._drawer.initialize();
        this._events.setMouseEvents();
        var nodeNames = Object.keys(this._nameToKeys);
        nodeNames = nodeNames.filter((n) => !n.startsWith("EmpressNode"));
        nodeNames.sort();
        this._events.autocomplete(nodeNames);
        this.centerLayoutAvgPoint();
        this._inorder = this.inorderNodes();
    };

    /**
     * Draws the tree
     */
    Empress.prototype.drawTree = function () {
        this._drawer.loadTreeBuf(this.getCoords());
        this._drawer.loadNodeBuff(this.getNodeCoords());
        this._drawer.loadCladeBuff(this._collapsedCladeBuffer);
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
        var coords = [];
        var coords_index = 0;

        for (var i = 1; i <= tree.size; i++) {
            var node = this._treeData[i];
            if (!node.visible) {
                continue;
            }
            if (!node.name.startsWith("EmpressNode")) {
                coords[coords_index++] = this.getX(node);
                coords[coords_index++] = this.getY(node);
                coords.push(...node.color);
                coords_index += 3;
            }
        }

        return new Float32Array(coords);
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
                    // skip if node is root of collapsed clade
                    if (this._collapsedClades.hasOwnProperty(node)) continue;
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
                if (
                    this._treeData[node].hasOwnProperty("arcx0") &&
                    !this._collapsedClades.hasOwnProperty(node)
                ) {
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

            if (
                this._collapsedClades.hasOwnProperty(i) ||
                !this._treeData[node].visible ||
                !this._treeData[node].sampleColored
            ) {
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
            obs = this._biom.getObservationUnionForSamples(sampleGroups[group]);
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
     * Note: this will also set _currentColorInfo
     *
     * @param {String} cat The sample category to use
     * @param {String} color - the Color map to use
     *
     * @return {Object} If there exists at least on group with unique features
     *                  then an object will be returned that maps groups with
     *                  unique features to a color. If there doesn't exist a
     *                  group with unique features then null will be returned.
     */
    Empress.prototype.colorBySampleCat = function (cat, color) {
        var tree = this._tree;
        var obs = this._biom.getObsBy(cat);
        var categories = Object.keys(obs);

        // shared by the following for loops
        var i, j, category;

        // convert observation IDs to _treeData keys
        for (i = 0; i < categories.length; i++) {
            category = categories[i];
            obs[category] = this._namesToKeys(obs[category]);
        }

        // assign internal nodes to appropriate category based on its children
        obs = this._projectObservations(obs);
        if (Object.keys(obs).length === 0) {
            return null;
        }

        // assign colors to categories
        categories = util.naturalSort(Object.keys(obs));
        var colorer = new Colorer(color, categories);
        // colors for drawing the tree
        var cm = colorer.getMapRGB();
        // colors for the legend
        var keyInfo = colorer.getMapHex();
        // color tree
        this._colorTree(obs, cm);
        // set currentColorInfo
        this.setCurrentColorInfo("sample", cat);

        return keyInfo;
    };

    /**
     * Color the tree based on a feature metadata column.
     *
     * Note: this will also set _currentColorInfo
     *
     * @param {String} cat The feature metadata column to color nodes by.
     *                     This must be present in this._featureMetadataColumns
     *                     or an error will be thrown.
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
        // In order to access feature metadata for a given node, we need to
        // find the 0-based index in this._featureMetadataColumns that the
        // specified f.m. column corresponds to. (We *could* get around this by
        // generating a mapping of f.m. column name -> index in Python, but I
        // don't expect that f.m. columns will be very large and this is only
        // done once per coloring operation so this shouldn't be a bottleneck.)
        var fmIdx = _.indexOf(this._featureMetadataColumns, cat);
        if (fmIdx < 0) {
            throw "Feature metadata column " + cat + " not present in data.";
        }

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

        // Produce a mapping of unique values in this feature metadata
        // column to an array of the node name(s) with each value.
        var uniqueValueToFeatures = {};
        _.each(fmObjs, function (mObj) {
            _.mapObject(mObj, function (fmRow, nodeName) {
                // This is loosely based on how BIOMTable.getObsBy() works.
                var fmVal = fmRow[fmIdx];
                if (_.has(uniqueValueToFeatures, fmVal)) {
                    uniqueValueToFeatures[fmVal].push(nodeName);
                } else {
                    uniqueValueToFeatures[fmVal] = [nodeName];
                }
            });
        });

        var sortedUniqueValues = util.naturalSort(
            Object.keys(uniqueValueToFeatures)
        );
        // convert observation IDs to _treeData keys. Notably, this includes
        // converting the values of uniqueValueToFeatures from Arrays to Sets.
        var obs = {};
        var scope = this;
        _.each(sortedUniqueValues, function (uniqueVal, i) {
            uniqueVal = sortedUniqueValues[i];
            obs[uniqueVal] = scope._namesToKeys(
                uniqueValueToFeatures[uniqueVal]
            );
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

        // set currentColorInfo
        this.setCurrentColorInfo("feature", cat);

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
     *      3) Remove empty groups from return object.
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

        // remove all groups that do not contain unique features
        result = _.pick(result, function (value, key) {
            return value.size > 0;
        });

        return result;
    };

    /**
     * Updates the tree based on obs and cm but does not draw a new tree.
     *
     * Note: The nodes in each sample category should be unique. The behavior of
     *       this function is undefined if nodes in each category are not
     *       unique.
     *
     * @param{Object} obs The mapping from sample category to unique nodes.
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
        this._currentColorInfo = null;
        this._collapsedClades = {};
        this._collapsedCladeBuffer = [];
        this._drawer.loadSampleThickBuf([]);
        this._drawer.loadCladeBuff([]);
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

                // recollapse clades
                if (Object.keys(this._collapsedClades).length != 0) {
                    this._collapsedCladeBuffer = [];
                    this.collapseClades();
                }

                // recenter viewing window
                this.centerLayoutAvgPoint();
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
     * and trajectory. See BIOMTable.getGradientStep()'s docs for details.
     *
     * @param {String} gradCol Sample metadata column for the gradient
     * @param {String} gradVal Value within the gradient column to get
     *                         information for
     * @param {String} trajCol Sample metadata column for the trajectory
     *
     * @return {Object} Maps trajectory values to an array of feature IDs
     *
     * @throws {Error} If the gradient or trajectory columns are unrecognized.
     *                 If no samples' gradient column value is gradVal.
     */
    Empress.prototype.getGradientStep = function (gradCol, gradVal, trajCol) {
        return this._biom.getGradientStep(gradCol, gradVal, trajCol);
    };

    /**
     * Returns an array of feature metadata column names.
     *
     * @return {Array}
     */
    Empress.prototype.getFeatureMetadataCategories = function () {
        return this._featureMetadataColumns;
    };

    /**
     * Display the tree nodes.
     * Note: Currently Empress will only display the nodes that had an assigned
     * name in the newick string. (I.E. Empress will not show any node that
     * starts with EmpressNode)
     *
     * @param{Boolean} showTreeNodes If true then empress will display the tree
     *                               nodes.
     */
    Empress.prototype.setTreeNodeVisibility = function (showTreeNodes) {
        this._drawer.setTreeNodeVisibility(showTreeNodes);
        this.drawTree();
    };

    /**
     * Centers the viewing window at the average of the current layout.
     */
    Empress.prototype.centerLayoutAvgPoint = function () {
        if (!(this._currentLayout in this.layoutAvgPoint)) {
            // Add up x and y coordinates of all nodes in the tree (using
            // current layout).
            var x = 0,
                y = 0,
                zoomAmount = 0,
                node;
            for (var i = 1; i <= this._tree.size; i++) {
                node = this._treeData[i];
                x += this.getX(node);
                y += this.getY(node);
                zoomAmount = Math.max(
                    zoomAmount,
                    Math.abs(this.getX(node)),
                    Math.abs(this.getY(node))
                );
            }

            // each layout's avegerage point is define as followed:
            // [x, y, zoomAmount] where x is the average of all x coordinates,
            // y is the average of all y coordinates, and zoomAmount takes the
            // largest x or y coordinate and normaizes it by dim / 2 (where
            // dim is the dimension of the canvas).
            // Note: zoomAmount is defined be a simple heuristic that should
            // allow the majority of the tree to be visible in the viewing
            // window.
            this.layoutAvgPoint[this._currentLayout] = [
                x / this._tree.size,
                y / this._tree.size,
                (2 * zoomAmount) / this._drawer.dim,
            ];
        }

        // center the viewing window on the average point of the current layout
        // and zoom out so the majority of the tree is visible.
        var cX = this.layoutAvgPoint[this._currentLayout][0],
            cY = this.layoutAvgPoint[this._currentLayout][1];
        this._drawer.centerCameraOn(cX, cY);
        this._drawer.zoom(
            this._drawer.treeSpaceCenterX,
            this._drawer.treeSpaceCenterY,
            false,
            this.layoutAvgPoint[this._currentLayout][2]
        );
        this.drawTree();
    };

    /**
     * Set a callback when a the node menu is shown on screen
     *
     * The callback will receive an array of samples as the only argument. This
     * is intended to be used with Emperor.
     *
     * @param {Function} callback Callback to execute.
     */
    Empress.prototype.setOnNodeMenuVisibleCallback = function (callback) {
        this._events.selectedNodeMenu.visibleCallback = callback;
    };

    /**
     * Set a callback when the node menu is removed from the screen
     *
     * The callback will receive an array of samples as the only argument. This
     * is intended to be used with Emperor.
     *
     * @param {Function} callback Callback to execute.
     */
    Empress.prototype.setOnNodeMenuHiddenCallback = function (callback) {
        this._events.selectedNodeMenu.hiddenCallback = callback;
    };

    /**
     * Determines if column is a valid feature metadata column.
     *
     * @param{String} column A potential column name
     *
     * @return{Boolean} true if column is a valid feature metadata column.
     *                  false otherwise.
     */
    Empress.prototype.isMetadaColumn = function (column) {
        return this._featureMetadataColumns.includes(column);
    };

    /**
     * Sets the current color info object.
     *
     * @param{String} type The type of metadata used. Should be either sample
     *                     or feature. Anything else will throw an error.
     * @param{String} column The column in the metadata used. If the column
     *                       doesn't exist for the type of metadata then an
     *                       error will be thrown.
     */
    Empress.prototype.setCurrentColorInfo = function (type, column) {
        if (type !== "sample" && type !== "feature") {
            throw new Error("Metadata must be of type 'sample' or 'feature'");
        }

        if (type === "sample" && !this._biom.isMetadataColumn(column)) {
            throw new Error(column + " is not a valid sample metadata column");
        }

        if (type === "feature" && !this.isMetadaColumn(column)) {
            throw new Error(column + " is not a valid feature metadata column");
        }
        this._currentColorInfo = { metadata: type, metadataColumn: column };
    };

    /**
     * Collapses all clades that share the same color into a quadrilateral.
     *
     * Note: if a clade contains a node with DEFAULT_COLOR it will not be
     *       collapsed
     *
     * @return{Boolean} true if at least one clade was collapse. false otherwise
     */
    Empress.prototype.collapseClades = function () {
        // assume no clades were collapse
        var collapsed = false;

        if (Object.keys(this._collapsedClades).length != 0) {
            for (var cladeRoot in this._collapsedClades) {
                this.createCollapsedCladeShape(cladeRoot);
            }
        }

        // Alogorithm: once a tip is encounter with a none DEFAULT_COLOR, then
        // nodes are added to this set until a node is encountered with either
        // a different color or DEFAULT_COLOR at which point, if a non-tip node
        // was added to this set then it is considered a collapsed clade and a
        // quad will be created. This set will be then be reset.
        // This works because _projectObservations guarentees that internal
        // nodes are only colored if all descendant share the same color.
        // Note: _projectObservations is not called when the user colors the
        // tree using internal feature metadata so it is possible that this
        // algorithm will fail if the left most tips do not share the same
        // color as the rest of the clade. As such, we have to make sure all
        // tips in the clade belong to this set to consider in order to consider
        // it a collapsed clade.
        var currentCollapsedClade = new Set();

        // iterate through the tree using inorder
        for (var i in this._inorder) {
            var node = this._inorder[i],
                color = this._treeData[node].color,
                visible = this._treeData[node].visible,
                isTip = this._tree.isleaf(this._tree.postorderselect(node));

            if (visible && !isTip && color !== this.DEFAULT_COLOR) {
                this.createCollapsedClade(node);
            }
        }
    };
    Empress.prototype.createCollapsedCladeShape = function(rootNode) {
        // add collapsed clade to drawing buffer
        // this._addClade(currentCladeInfo);
        var cladeBuffer = [],
            curNode,
            color = this._collapsedClades[rootNode].color,
            currentCladeInfo = this._collapsedClades[rootNode],
            x,
            y;

        if (this._currentLayout === "Unrooted") {
            // Unrooted collasped clade is a quadrilateral whose vertices are
            // 1) root of clade, 2) "left" most node, 3) "right" most node, and
            // 4) deepest node. However, WebGl requires that we approximate the
            // quadrilateral with triangles. Thus, the quad is made out of two
            // triangles. One triangle is formed from 1, 4, 2 and the other
            // triangle from 1, 4, 3

            // triangle from 1, 4, 2
            curNode = this._treeData[rootNode],
            x = this.getX(curNode),
            y = this.getY(curNode);
            cladeBuffer.push(...[x, y, ...color]);
            curNode = this._treeData[currentCladeInfo["deepest"]],
            x = this.getX(curNode),
            y = this.getY(curNode);
            cladeBuffer.push(...[x, y, ...color]);
            curNode = this._treeData[currentCladeInfo["left"]],
            x = this.getX(curNode),
            y = this.getY(curNode);
            cladeBuffer.push(...[x, y, ...color]);

            // triangle from 1, 4, 3
            curNode = this._treeData[rootNode],
            x = this.getX(curNode),
            y = this.getY(curNode);
            cladeBuffer.push(...[x, y, ...color]);
            curNode = this._treeData[currentCladeInfo["deepest"]],
            x = this.getX(curNode),
            y = this.getY(curNode);
            cladeBuffer.push(...[x, y, ...color]);
            curNode = this._treeData[currentCladeInfo["right"]],
            x = this.getX(curNode),
            y = this.getY(curNode);
            cladeBuffer.push(...[x, y, ...color]);
        } else if (this._currentLayout === "Rectangular") {
            // Rectangular (Symmetric version)
            // A collapse clade is represented by a triangle. First, the
            // y-values of the "left" and "right" most branches are compared
            // to the y-value of the root of the clade. Next the branch whose
            // y-value is closest to the branch is selected. Then a triangle
            // is created by projecting a ray from the root of the clade in the
            // direction of the select branch until the ray reaches the x-value
            // of the deepest branch. Finally, ray created in the last step is
            // reflected about the x-axis that passes throught the root of the
            // clade

            // root of the clade
            curNode = this._treeData[rootNode],
            x = this.getX(curNode),
            y = this.getY(curNode);
            cladeBuffer.push(...[x, y, ...color]);

            var dx = this.getX(this._treeData[currentCladeInfo["deepest"]]),
                ly = this.getY(this._treeData[currentCladeInfo["left"]]),
                ry = this.getY(this._treeData[currentCladeInfo["right"]]);

            if (this._collapseMethod === "symmetric") {
                if (Math.abs(y - ly) < Math.abs(y - ry)) {
                    ry = y + Math.abs(y - ly);
                } else {
                    ly = y - Math.abs(y - ry);
                }
            }

            cladeBuffer.push(...[dx, ly, ...color]);
            cladeBuffer.push(...[dx, ry, ...color]);
        } else {
            var dangle = this._treeData[currentCladeInfo["deepest"]].angle;
            var langle = this._treeData[currentCladeInfo["left"]].angle;
            var rangle = this._treeData[currentCladeInfo["right"]].angle;
            var totalAngle;
            if (this._collapseMethod === "symmetric") {
                var nangle = this._treeData[rootNode].angle;
                var minAngle = Math.min((nangle - langle), (rangle - nangle));
                totalAngle = 2 * minAngle;
                x = this.getX(this._treeData[currentCladeInfo["deepest"]]);
                y = this.getY(this._treeData[currentCladeInfo["deepest"]]);
                sX =
                    x * Math.cos(nangle - minAngle - dangle) -
                    y * Math.sin(nangle - minAngle - dangle);
                sY =
                    x * Math.sin(nangle - minAngle - dangle) +
                    y * Math.cos(nangle - minAngle - dangle);
            } else {
                totalAngle = rangle - langle;
                x = this.getX(this._treeData[currentCladeInfo["deepest"]]);
                y = this.getY(this._treeData[currentCladeInfo["deepest"]]);
                sX =
                    x * Math.cos(langle - dangle) - y * Math.sin(langle - dangle);
                sY =
                    x * Math.sin(langle - dangle) + y * Math.cos(langle - dangle);
            }
            var deltaAngle = totalAngle / 15;
            for (var line = 0; line < 15; line++) {
                cladeBuffer.push(
                    ...[
                        this.getX(this._treeData[rootNode]),
                        this.getY(this._treeData[rootNode]),
                        ...color,
                    ]
                );
                x =
                    sX * Math.cos(line * deltaAngle) -
                    sY * Math.sin(line * deltaAngle);
                y =
                    sX * Math.sin(line * deltaAngle) +
                    sY * Math.cos(line * deltaAngle);
                cladeBuffer.push(...[x, y, ...color]);

                x =
                    sX * Math.cos((line + 1) * deltaAngle) -
                    sY * Math.sin((line + 1) * deltaAngle);
                y =
                    sX * Math.sin((line + 1) * deltaAngle) +
                    sY * Math.cos((line + 1) * deltaAngle);
                cladeBuffer.push(...[x, y, ...color]);
            }
        }

        this._collapsedCladeBuffer.push(...cladeBuffer);
    }
    Empress.prototype.createCollapsedClade = function (rootNode) {
        // step 1: find all nodes in the clade.
        var scope = this;
        var cladeNodes = this.getCladeNodes(rootNode);

        var currentCladeInfo = {
            left: cladeNodes[0],
            right: cladeNodes[0],
            deepest: cladeNodes[0],
            length: this.getTotalLength(cladeNodes[0], rootNode),
            color: this._treeData[rootNode].color,
        };
        // step 2: find the following clade information:
        //      1) "left" most child.
        //      2) "right" most child.
        //      3) "deepest" child
        // Note: "left" and "right" most children are different for each layout.
        //       Unrooted:
        //          left  - the left most child
        //          right - the right most child
        //      Rectangular:
        //          left  - the tip with smallest y-coord
        //          right - the tip with the largest y-coord
        //      Circular:
        //          left  - the tip with the smallest angle
        //          right - the tip with the largest angle
        // step 3: make all descendants of rootNode invisible
        var updateCladeInfo = function(node) {
            var curLeft = currentCladeInfo.left,
                curRight = currentCladeInfo.right,
                curDeep = currentCladeInfo.deepest,
                length = scope.getTotalLength(node, rootNode);

            // update deepest node
            if (length > currentCladeInfo.length) {
                currentCladeInfo.length = length;
                currentCladeInfo.deepest = node;
            }

            // update "left" and "right" most nodes
            if (scope._currentLayout === "Unrooted") {
                // Note: leaf sorting is not applied to unrooted layout. Thus
                // the left most node is the left most child of the clade and
                // the right most node is the right most child of the clade.
                currentCladeInfo.right = node;
            } else if (scope._currentLayout === "Rectangular") {
                curLeftY = scope.getY(scope._treeData[curLeft]);
                curRightY = scope.getY(scope._treeData[curRight]);
                y = scope.getY(scope._treeData[node]);
                currentCladeInfo.left = y < curLeftY ? node : curLeft;
                currentCladeInfo.right = y > curRightY ? node : curRight;
            } else {
                curLAngle = scope._treeData[curLeft].angle;
                curRAngle = scope._treeData[curRight].angle;
                angle = scope._treeData[node].angle;
                currentCladeInfo.left = angle < curLAngle ? node : curLeft;
                currentCladeInfo.right = angle > curRAngle ? node : curRight;
            }
        }
        this._collapsedClades[rootNode] = currentCladeInfo;

        for (var i in cladeNodes) {
            var cladeNode = cladeNodes[i];
            if (this._tree.isleaf(this._tree.postorderselect(cladeNode))) {
                updateCladeInfo(cladeNode);
            }
            this._treeData[cladeNode].visible = false;
        }
        this._treeData[rootNode].visible = true;
        this.createCollapsedCladeShape(rootNode);

        // currentCollapsedClade.delete(r);
        // var scope = this;
        // var invisible = function (rootNode) {
        //     scope._treeData[rootNode].visible = false;
        // };
        // _.each([...currentCollapsedClade], invisible);

        this._treeData[rootNode].color = this.DEFAULT_COLOR;
    };

    Empress.prototype.updateCollapseMethod = function(method) {
        // do nothing
        if (method === this._collapseMethod) {
            return;
        }

        if (method !== "normal" && method !== "symmetric") {
            throw method + " is not a clade collapse method."
        }

        this._collapseMethod = method;
        this._collapsedCladeBuffer = [];
        for (var cladeRoot in this._collapsedClades) {
            this.createCollapsedCladeShape(cladeRoot);
        }
        this.drawTree();
    }


    // TODO: move to bp-tree
    Empress.prototype.getTotalLength = function (start, end) {
        var curNode = start,
            totalLength = 0;
        while (curNode !== end) {
            totalLength += this._tree.length(
                this._tree.postorderselect(curNode)
            );
            curNode = this._tree.postorder(
                this._tree.parent(this._tree.postorderselect(curNode))
            );
        }
        return totalLength;
    };

    // TODO: move to bp-tree
    Empress.prototype.inorderNodes = function () {
        // the root node of the tree
        var curNode = this._tree.preorderselect(1),
            inorder = [],
            nodeStack = [curNode];
        while (nodeStack.length > 0) {
            // "visit" node
            curNode = nodeStack.shift();
            inorder.push(this._tree.postorder(curNode));

            // append children to stack
            var child = this._tree.fchild(curNode);
            while (child !== 0) {
                nodeStack.push(child);
                child = this._tree.nsibling(child);
            }
        }
        return inorder;
    };

    Empress.prototype.getCladeNodes = function(node) {
        // This is done by finding the left most child of the clade and then
        // performing a post-order traversal until node is reached

        // stores the clade nodes
        var cladeNodes = [];

        // find left most child
        // Note: initializing lchild as node incase node is a tip
        lchild = node;
        var fchild = this._tree.fchild(this._tree.postorderselect(node));
        while (fchild !== 0) {
            lchild = this._tree.postorder(fchild);
            fchild = this._tree.fchild(this._tree.postorderselect(lchild));
        }

        // perform post order traversal until node is reached.
        for (var i = lchild; i <= node; i++) {
            cladeNodes.push(i);
        }

        return cladeNodes;
    };

    Empress.prototype.isPointInClade = function(cladeRoot, x, y) {
        if (!this._collapsedClades.hasOwnProperty(cladeRoot)) {
            return false;
        }
        var scope = this;
        var getCoords = function(node) {
            node = scope._treeData[node];
            return [scope.getX(node), scope.getY(node)];
        }
        var clade = this._collapsedClades[cladeRoot];
        var cRoot = getCoords(cladeRoot),
            left = getCoords(clade.left),
            right = getCoords(clade.right),
            deep = getCoords(clade.deepest);
        if (this._currentLayout === "Unrooted") {
            var cladeArea = VectorOps.triangleArea(cRoot, left, right) +
                            VectorOps.triangleArea(deep, left, right);

            // can happen if clade has children with 0-length or clade
            // only has a single child
            if (cladeArea == 0) {
                return false;
            }
            var netArea = cladeArea -
                          VectorOps.triangleArea([x, y], right, deep) -
                          VectorOps.triangleArea([x, y], deep, left) -
                          VectorOps.triangleArea([x, y], left, cRoot) -
                          VectorOps.triangleArea([x, y], cRoot, right);
            return Math.abs(netArea) < 1.0e-5;
        } else if (this._currentLayout == "Rectangular") {
            if (this._collapseMethod === "symmetric") {
                if (Math.abs(cRoot[1] - left[1]) <
                    Math.abs(cRoot[1] - right[1])
                ) {
                    right[1] = cRoot[1] + Math.abs(cRoot[1] - left[1]);
                } else {
                    left[1] = cRoot[1] - Math.abs(cRoot[1] - right[1]);
                }
            }
            var cladeArea = VectorOps.triangleArea(cRoot,
                                                   [deep[0], left[1]],
                                                   [deep[0], right[1]]);

            // can happen if clade has children with 0-length or clade
            // only has a single child
            if (cladeArea == 0) {
                return false;
            }
            var netArea = cladeArea -
                          VectorOps.triangleArea([x, y],
                                                 [deep[0], right[1]],
                                                 [deep[0], left[1]]) -
                          VectorOps.triangleArea([x, y],
                                                 [deep[0], left[1]],
                                                 cRoot) -
                          VectorOps.triangleArea([x, y],
                                                 cRoot,
                                                 [deep[0], right[1]]);
            return Math.abs(netArea) < 1.0e-5;
        } else {
            var dangle = this._treeData[clade.deepest].angle;
            var langle = this._treeData[clade.left].angle;
            var rangle = this._treeData[clade.right].angle;
            var totalAngle;
            var dx, dy;
            if (this._collapseMethod === "symmetric") {
                var nangle = this._treeData[cladeRoot].angle;
                var minAngle = Math.min((nangle - langle), (rangle - nangle));
                totalAngle = 2 * minAngle;
                dx = this.getX(this._treeData[clade.deepest]);
                dy = this.getY(this._treeData[clade.deepest]);
                left[0] =
                    dx * Math.cos(nangle - minAngle - dangle) -
                    dy * Math.sin(nangle - minAngle - dangle);
                left[1] =
                    dx * Math.sin(nangle - minAngle - dangle) +
                    dy * Math.cos(nangle - minAngle - dangle);
            } else {
                totalAngle = rangle - langle;
                dx = this.getX(this._treeData[clade.deepest]);
                dy = this.getY(this._treeData[clade.deepest]);
                left[0] =
                    dx * Math.cos(langle - dangle) -
                    dy * Math.sin(langle - dangle);
                left[1] =
                    dx * Math.sin(langle - dangle) +
                    dy * Math.cos(langle - dangle);
            }
            right[0] =
                    left[0] * Math.cos(totalAngle) - left[1] * Math.sin(totalAngle);
            right[1] =
                    left[0] * Math.sin(totalAngle) + left[1] * Math.cos(totalAngle);
            var getAngleAndMagnitude = function(p) {
                var angle = VectorOps.getAngle([
                    p[0] - cRoot[0],
                    p[1] - cRoot[1]
                ]);
                var radian = Math.asin(angle.sin);
                if (angle.cos < 0) {
                    radian = Math.PI - radian;
                } else if (angle.sin < 0) {
                    radian = 2 * Math.PI + radian;
                }
                return {
                    radian: radian,
                    mag: VectorOps.magnitude(p),
                };
            }

            var leftPoint = getAngleAndMagnitude(left);
            var rightPoint = getAngleAndMagnitude(right);
            var point = getAngleAndMagnitude([x, y]);
            if (leftPoint.radian > rightPoint.radian) {
                rightPoint.radian += 2 * Math.PI;
                if (leftPoint.radian > point.radian) {
                    point.radian += 2 * Math.PI;
                }
            }
            return point.radian >= leftPoint.radian &&
                   point.radian <= rightPoint.radian &&
                   point.mag <= leftPoint.mag;
        }

    }

    return Empress;
});
