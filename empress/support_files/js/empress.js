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
         * The (not-yet-scaled) line width used for drawing "thick" lines.
         * Can be passed as input to this.thickenColoredNodes().
         */
        this._currentLineWidth = 0;

        /**
         * @type{Bool}
         * Whether the camera is focused on a selected node.
         */
        this.focusOnSelectedNode = true;

        /**
         * @type{Bool}
         * Whether unrepresented tips are ignored when propagating colors.
         */
        this.ignoreAbsentTips = true;

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
         * @private
         * Stores the information about the collapsed clades. This object is
         * used to determine if a user clicked on a collapsed clade.
         *
         * Note: <node_key> refers to the key in _treeData
         * Format:
         * {
         *      <node_key>: {
         *          left: <node_key>,
         *          right: <node_key>,
         *          deepest: <node_key>,
         *          length: <Number>,
         *          color: <[r,g,b]>
         *      }
         *  }
         */
        this._collapsedClades = {};

        /**
         * @type{Array}
         * @private
         *
         * Stores the vertex information that is passed to WebGl
         *
         * Format: [x, y, r, g, b, ...]
         */
        this._collapsedCladeBuffer = [];

        /**
         * @type{String}
         * @private
         *
         * The method used to collapsed the tree
         */
        this._collapseMethod = "normal";

        /**
         * @type{Array}
         * @private
         *
         * This stores the group membership of a node. -1 means the node doesn't
         * belong to a group. This array is used to collapse clades by search
         * for clades in this array that share the same group membershi[.
         */
        this._group = new Array(this._tree.size + 1).fill(-1);
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
    };

    /**
     * Draws the tree
     */
    Empress.prototype.drawTree = function () {
        this._drawer.loadTreeBuff(this.getCoords());
        this._drawer.loadNodeBuff(this.getNodeCoords());
        this._drawer.loadCladeBuff(this._collapsedCladeBuffer);
        this._drawer.draw();
    };

    /**
     * Creates an SVG string to export the current drawing
     */
    Empress.prototype.exportSvg = function () {
        // TODO: use the same value as the actual WebGL drawing engine, but
        // right now this value is hard coded on line 327 of drawer.js
        NODE_RADIUS = 4;

        minX = 0;
        maxX = 0;
        minY = 0;
        maxY = 0;
        svg = "";

        // create a line from x1,y1 to x2,y2 for every two consecutive coordinates
        // 5 array elements encode one coordinate:
        // i=x, i+1=y, i+2=red, i+3=green, i+4=blue
        svg += "<!-- tree branches -->\n";
        coords = this.getCoords();
        for (
            i = 0;
            i + 2 * this._drawer.VERTEX_SIZE <= coords.length;
            i += 2 * this._drawer.VERTEX_SIZE
        ) {
            // "normal" lines have a default color,
            // all other lines have a user defined thickness
            // All lines are defined using the information from the child node.
            // So, if coords[i+2] == DEFAULT_COLOR then coords[i+2+5] will
            // also be equal to DEFAULT_COLOR. Thus, we can save checking three
            // array elements here.
            linewidth = 1 + this._currentLineWidth;
            if (
                coords[i + 2] == this.DEFAULT_COLOR[0] &&
                coords[i + 3] == this.DEFAULT_COLOR[1] &&
                coords[i + 4] == this.DEFAULT_COLOR[2]
            ) {
                linewidth = 1;
            }
            svg +=
                '<line x1="' +
                coords[i] +
                '" y1="' +
                coords[i + 1] +
                '" x2="' +
                coords[i + this._drawer.VERTEX_SIZE] +
                '" y2="' +
                coords[i + 1 + this._drawer.VERTEX_SIZE] +
                '" stroke="' +
                chroma.gl(coords[i + 2], coords[i + 3], coords[i + 4]).css() +
                '" style="stroke-width:' +
                linewidth +
                '" />\n';

            // obtain viewport from tree coordinates
            minX = Math.min(
                minX,
                coords[i],
                coords[i + this._drawer.VERTEX_SIZE]
            );
            maxX = Math.max(
                maxX,
                coords[i],
                coords[i + this._drawer.VERTEX_SIZE]
            );

            minY = Math.min(
                minY,
                coords[i + 1],
                coords[i + 1 + this._drawer.VERTEX_SIZE]
            );
            maxY = Math.max(
                maxY,
                coords[i + 1],
                coords[i + 1 + this._drawer.VERTEX_SIZE]
            );
        }

        // create a circle for each node
        if (this._drawer.showTreeNodes) {
            svg += "<!-- tree nodes -->\n";
            coords = this.getNodeCoords();
            for (
                i = 0;
                i + this._drawer.VERTEX_SIZE <= coords.length;
                i += this._drawer.VERTEX_SIZE
            ) {
                // getNodeCoords array seem to be larger than necessary and
                // elements are initialized with 0.  Thus, nodes at (0, 0) will
                // be skipped (root will always be positioned at 0,0 and drawn
                // below) This is a known issue and will be resolved with #142
                if (coords[i] == 0 && coords[i + 1] == 0) {
                    continue;
                }
                svg +=
                    '<circle cx="' +
                    coords[i] +
                    '" cy="' +
                    coords[i + 1] +
                    '" r="' +
                    NODE_RADIUS +
                    '" style="fill:' +
                    chroma
                        .gl(coords[i + 2], coords[i + 3], coords[i + 4])
                        .css() +
                    '"/>\n';
            }
        }

        // add one black circle to indicate the root
        // Not sure if this speacial treatment for root is necessary once #142
        // is merged.
        svg += "<!-- root node -->\n";
        svg +=
            '<circle cx="0" cy="0" r="' +
            NODE_RADIUS +
            '" fill="rgb(0,0,0)"/>\n';

        return [
            svg,
            'viewBox="' +
                (minX - NODE_RADIUS) +
                " " +
                (minY - NODE_RADIUS) +
                " " +
                (maxX - minX + 2 * NODE_RADIUS) +
                " " +
                (maxY - minY + 2 * NODE_RADIUS) +
                '"',
        ];
    };

    /**
     * Creates an SVG string to export legends
     */
    Empress.prototype.exportSVG_legend = function (dom) {
        // top left position of legends, multiple legends are placed below
        // each other.
        top_left_x = 0;
        top_left_y = 0;
        unit = 30; // all distances are based on this variable, thus "zooming"
        // can be realised by just increasing this single value
        factor_lineheight = 1.8; // distance between two text lines as a
        // multiplication factor of unit
        svg = ""; // the svg string to be generated

        // used as a rough estimate about the consumed width by text strings
        var myCanvas = document.createElement("canvas");
        var context = myCanvas.getContext("2d");
        context.font = "bold " + unit + "pt verdana";

        // the document can have up to three legends, of which at most one shall
        // be visible at any given timepoint. This might change and thus this
        // method can draw multiple legends
        row = 1; // count the number of used rows
        for (let legend of dom.getElementsByClassName("legend")) {
            max_line_width = 0;
            title = legend.getElementsByClassName("legend-title");
            svg_legend = "";
            if (title.length > 0) {
                titlelabel = title.item(0).innerHTML;
                max_line_width = Math.max(
                    max_line_width,
                    context.measureText(titlelabel).width
                );
                svg_legend +=
                    '<text x="' +
                    (top_left_x + unit) +
                    '" y="' +
                    (top_left_y + row * (unit * factor_lineheight)) +
                    '" style="font-weight:bold;font-size:' +
                    unit +
                    'pt;">' +
                    titlelabel +
                    "</text>\n";
                row++;
                for (let item of legend.getElementsByClassName(
                    "gradient-bar"
                )) {
                    color = item
                        .getElementsByClassName("category-color")
                        .item(0)
                        .getAttribute("style")
                        .split(":")[1]
                        .split(";")[0];
                    itemlabel = item
                        .getElementsByClassName("gradient-label")
                        .item(0)
                        .getAttribute("title");
                    max_line_width = Math.max(
                        max_line_width,
                        context.measureText(itemlabel).width
                    );

                    // a rect left of the label to indicate the used color
                    svg_legend +=
                        '<rect x="' +
                        (top_left_x + unit) +
                        '" y="' +
                        (top_left_y + row * (unit * factor_lineheight) - unit) +
                        '" width="' +
                        unit +
                        '" height="' +
                        unit +
                        '" style="fill:' +
                        color +
                        '"/>\n';
                    // the key label
                    svg_legend +=
                        '<text x="' +
                        (top_left_x + 2.5 * unit) +
                        '" y="' +
                        (top_left_y + row * (unit * factor_lineheight)) +
                        '" style="font-size:' +
                        unit +
                        'pt;">' +
                        itemlabel +
                        "</text>\n";
                    row++;
                }
                // draw a rect behind, i.e. lower z-order, the legend title and
                // colored keys to visually group the legend. Also acutally put
                // these elements into a group for easier manual editing
                // rect shall have a certain padding, its height must exceed
                //number of used text rows and width must be larger than longest
                // key text and/or legend title
                svg +=
                    '<g>\n<rect x="' +
                    top_left_x +
                    '" y="' +
                    (top_left_y +
                        (row -
                            legend.getElementsByClassName("gradient-bar")
                                .length -
                            2) *
                            (unit * factor_lineheight)) +
                    '" width="' +
                    (max_line_width + 2 * unit) +
                    '" height="' +
                    ((legend.getElementsByClassName("gradient-bar").length +
                        1) *
                        unit *
                        factor_lineheight +
                        unit) +
                    '" style="fill:#eeeeee;stroke:#000000;stroke-width:1" ry="30" />\n' +
                    svg_legend +
                    "</g>\n";
                row += 2; // one blank row between two legends
            }
        }

        return svg;
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
            var leafAndRootCt = this._tree.numleaves() + 1;
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
            var leafCt = this._tree.numleaves();
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
     *                       passed to Drawer.loadThickNodeBuff().
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
     *                        passed to Drawer.loadThickNodeBuff().
     * @param {Number} node   Node index in this._treeData, from which we'll
     *                        retrieve coordinate information.
     * @param {Number} lwScaled Desired line thickness (note that this will be
     *                          applied on both sides of the line -- so if
     *                          lwScaled = 1 here then the drawn thick line
     *                          will have a width of 1 + 1 = 2).
     */
    Empress.prototype._addThickVerticalLineCoords = function (
        coords,
        node,
        lwScaled
    ) {
        var corners = {
            tL: [
                this.getX(this._treeData[node]) - lwScaled,
                this._treeData[node].highestchildyr,
            ],
            tR: [
                this.getX(this._treeData[node]) + lwScaled,
                this._treeData[node].highestchildyr,
            ],
            bL: [
                this.getX(this._treeData[node]) - lwScaled,
                this._treeData[node].lowestchildyr,
            ],
            bR: [
                this.getX(this._treeData[node]) + lwScaled,
                this._treeData[node].lowestchildyr,
            ],
        };
        var color = this._treeData[node].color;
        this._addTriangleCoords(coords, corners, color);
    };

    /**
     * Thickens the colored branches of the tree.
     *
     * @param {Number} lw Amount of thickness to use, in the same "units"
     *                    that the user can enter in one of the line width
     *                    <input>s. If this is 0, this function won't do
     *                    anything. (If this is < 0, this will throw an error.
     *                    But this really shouldn't happen, since this
     *                    parameter should be the output from
     *                    util.parseAndValidateLineWidth().)
     */
    Empress.prototype.thickenColoredNodes = function (lw) {
        // If lw isn't > 0, then we don't thicken colored lines at all --
        // we just leave them at their default width.
        if (lw < 0) {
            // should never happen because util.parseAndValidateLineWidth()
            // should've been called in order to obtain lw, but in case
            // this gets messed up in the future we'll catch it
            throw "Line width passed to thickenColoredNodes() is < 0.";
        } else {
            // Make sure that, even if lw is 0 (i.e. we don't need to
            // thicken the lines), we still set the current line width
            // accordingly. This way, when doing things like updating the
            // layout that'll require re-drawing the tree based on the most
            // recent settings, we'll have access to the correct line width.
            this._currentLineWidth = lw;
            if (lw === 0) {
                // But, yeah, if lw is 0 we can just return early.
                return;
            }
        }
        // Scale the line width in such a way that trees with more leaves have
        // "smaller" line width values than trees with less leaves. This is a
        // pretty arbitrary equation based on messing around and seeing what
        // looked nice on mid- and small-sized trees; as a TODO for the future,
        // there is almost certainly a better way to do this.
        var lwScaled =
            (2 * lw) / Math.pow(Math.log10(this._tree.numleaves()), 2);
        var tree = this._tree;

        // the coordinates of the tree
        var coords = [];
        this._drawer.loadThickNodeBuff([]);

        // define these variables so jslint does not complain
        var x1, y1, x2, y2, corners;

        // In the corner case where the root node (located at index tree.size)
        // has an assigned color, thicken the root's drawn vertical line when
        // drawing the tree in Rectangular layout mode
        if (
            this._currentLayout === "Rectangular" &&
            this._treeData[tree.size].isColored
        ) {
            this._addThickVerticalLineCoords(coords, tree.size, lwScaled);
        }
        // iterate through the tree in postorder, skip root
        for (var i = 1; i < this._tree.size; i++) {
            // name of current node
            var node = i;
            var parent = tree.postorder(tree.parent(tree.postorderselect(i)));

            if (
                this._collapsedClades.hasOwnProperty(i) ||
                !this._treeData[node].visible ||
                !this._treeData[node].isColored
            ) {
                continue;
            }

            var color = this._treeData[node].color;
            if (this._currentLayout === "Rectangular") {
                // Draw a thick vertical line for this node, if it isn't a tip
                if (this._treeData[node].hasOwnProperty("lowestchildyr")) {
                    this._addThickVerticalLineCoords(coords, node, lwScaled);
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
                        this.getY(this._treeData[node]) + lwScaled,
                    ],
                    tR: [
                        this.getX(this._treeData[node]),
                        this.getY(this._treeData[node]) + lwScaled,
                    ],
                    bL: [
                        this.getX(this._treeData[parent]),
                        this.getY(this._treeData[node]) - lwScaled,
                    ],
                    bR: [
                        this.getX(this._treeData[node]),
                        this.getY(this._treeData[node]) - lwScaled,
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
                            lwScaled
                        );
                        var arc1corners = VectorOps.computeBoxCorners(
                            x1,
                            y1,
                            x2,
                            y2,
                            lwScaled
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
                corners = VectorOps.computeBoxCorners(x1, y1, x2, y2, lwScaled);
                this._addTriangleCoords(coords, corners, color);
            } else {
                x1 = this.getX(this._treeData[parent]);
                y1 = this.getY(this._treeData[parent]);
                x2 = this.getX(this._treeData[node]);
                y2 = this.getY(this._treeData[node]);
                corners = VectorOps.computeBoxCorners(x1, y1, x2, y2, lwScaled);
                this._addTriangleCoords(coords, corners, color);
            }
        }

        this._drawer.loadThickNodeBuff(coords);
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
        observationsPerGroup = this._projectObservations(
            observationsPerGroup,
            this.ignoreAbsentTips
        );

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
     * Color the tree using sample metadata
     *
     * @param {String} cat Sample metadata category to use
     * @param {String} color Color map to use
     *
     * @return {Object} If there exists at least one group with unique features
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
        obs = this._projectObservations(obs, this.ignoreAbsentTips);

        if (Object.keys(obs).length === 0) {
            return null;
        }

        // assigns node in obs to groups in this._groups
        this.assignGroups(obs);

        // assign colors to categories
        categories = util.naturalSort(Object.keys(obs));
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
        if (method === "tip") {
            obs = this._projectObservations(obs, false);
        }

        // assigns nodes in to a group in this._group array
        this.assignGroups(obs);

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
     *      3) Remove empty groups from return object.
     *
     * Note: All tips that are not passed into obs are considered to belong to
     *       a "not-represented" group, which will be omitted from the
     *       returned version of obs.
     *
     * @param {Object} obs Maps categories to a set of observations (i.e. tips)
     * @param {Bool} ignoreAbsentTips Whether absent tips should be ignored
     * during color propagation.
     * @return {Object} returns A Map with the same group names that maps groups
                        to a set of keys (i.e. tree nodes) that are unique to
                        each group.
     */
    Empress.prototype._projectObservations = function (obs, ignoreAbsentTips) {
        var tree = this._tree,
            categories = Object.keys(obs),
            notRepresented = new Set(),
            i,
            j;

        if (!ignoreAbsentTips) {
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
     * NOTE: The nodes in each category should be unique. The behavior of
     *       this function is undefined if nodes in each category are not
     *       unique.
     *
     * @param{Object} obs Maps categories to the unique nodes to be colored for
     *                    each category.
     * @param{Object} cm Maps categories to the colors to color their nodes
     *                   with. Colors should be represented as RGB arrays, for
     *                   example as is done in the color values of the output
     *                   of Colorer.getMapRGB().
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
                this._treeData[key].isColored = true;
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
            this._treeData[key].isColored = false;
            this._treeData[key].visible = true;
        }
        this._collapsedClades = {};
        this._collapsedCladeBuffer = [];
        this._drawer.loadThickNodeBuff([]);
        this._drawer.loadCladeBuff([]);
        this._group = new Array(this._tree.size + 1).fill(-1);
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

                // recollapse clades
                if (Object.keys(this._collapsedClades).length != 0) {
                    this._collapsedCladeBuffer = [];
                    this.collapseClades();
                }

                // Adjust the thick-line stuff before calling drawTree() --
                // this will get the buffer set up before it's actually drawn
                // in drawTree(). Doing these calls out of order (draw tree,
                // then call thickenColoredNodes()) causes the thick-line
                // stuff to only change whenever the tree is redrawn.
                this.thickenColoredNodes(this._currentLineWidth);

                // recenter viewing window
                // Note: this function calls drawTree()
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
     * Sets the group state value for all tree nodes. Assigns all nodes in obs
     * to their repsect group. All other nodes will be set to the null group.
     *
     * Note: this will effect this._groups
     *
     * @param {Object} obs An object whose keys are group values and elements
     *                     are the nodes that belong to that group.
     */
    Empress.prototype.assignGroups = function (obs) {
        var groupNum = 0;
        for (var cat in obs) {
            var nodes = [...obs[cat]];
            for (var i in nodes) {
                this._group[nodes[i]] = groupNum;
            }
            groupNum++;
        }
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
        // first check if any collapsed clades have been cached
        if (Object.keys(this._collapsedClades).length != 0) {
            for (var cladeRoot in this._collapsedClades) {
                this.createCollapsedCladeShape(cladeRoot);
            }
            return;
        }
        // The following algorithm consists of two parts: 1) find all clades
        // whose member nodes have the same color, 2) collapse the clades

        // 1) Find all clades
        // this._group array will be used to determine what color group a node
        // belongs to. At this point, this._group has been initialized by either
        // colorBySampleCat, colorByFeatureMetadata, or the animator. Each index
        // of this._group refers to a node's postorder position and the value at
        // that index refers to the group a node belongs to. The values of group
        // are in the range [-1, inf). -1 means the node either is
        // "non-represented" or "non-unique".

        // project groups up tree
        // Note: if _projectObservations was called, then if an internal node
        // belongs to a group, all of its descendants will belong to the
        // same group. However, this is not guaranteed if _projectOBservations
        // was not called. Thus, this loop is used to guarantee that if an
        // internal node belongs to a group then all of its descendants belong
        // to the same group.
        for (var i = 1; i <= this._tree.size; i++) {
            var parent = this._tree.postorder(
                this._tree.parent(this._tree.postorderselect(i))
            );
            if (this._group[i] !== this._group[parent]) {
                this._group[parent] = -1;
            }
        }

        // 2) Collapse the clades
        // To accomplish this, we will iterate the tree in a inorder fashion.
        // Once a internal node is reached that belongs to a group (i.e. not -1)
        // than that node will be marked as the root of the clade and then
        // collaped.
        // Collapsing a clade will set the .visible property of members to
        // false and will then be skipped in the for loop.
        // Note: if the root of a clade has DEFUALT_COLOR then it will not be
        // collapsed (since all of its children will also have DEFAULT_COLOR)
        var inorder = this._tree.inOrderNodes();
        for (var node in inorder) {
            node = inorder[node];
            var visible = this._treeData[node].visible;
            var isTip = this._tree.isleaf(this._tree.postorderselect(node));

            if (visible && !isTip && this._group[node] !== -1) {
                this._collapseClade(node);
            }
        }
    };

    /**
     * Creates a special shape for WebGl to draw in place of a clade. Each
     * layout has its own unique shape. Furthermore, Rectangular and Circular
     * layuots will get two versions of their shape. The shape that will be
     * drawn will be determined by this._currentLayout and this._collapseMethod.
     * Before calling this method, the .visible property of all nodes in the
     * clade (besides the root) should be set to false.
     *
     * Note: This method will modify this._collapsedCladeBuffer and also add
     *       sX, sY, and totalAngle to each clade in this_collapsedClades if
     *       this._currentLayou === "Circular"
     *
     * @param {Number} rootNode The root of the clade
     */
    Empress.prototype.createCollapsedCladeShape = function (rootNode) {
        // add collapsed clade to drawing buffer
        var cladeBuffer = [];
        var color = this._collapsedClades[rootNode].color;
        var cladeInfo = this._collapsedClades[rootNode];
        var scope = this;
        var curNode, x, y;

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
        var addPoint = function (point) {
            cladeBuffer.push(...point, ...color);
        };
        var getCoords = function (node) {
            node = scope._treeData[node];
            return [scope.getX(node), scope.getY(node)];
        };
        if (this._currentLayout === "Unrooted") {
            // Unrooted collapsed clade is a quadrilateral whose vertices are
            // 1) root of clade, 2) "left" most node, 3) "right" most node, and
            // 4) deepest node. However, WebGl requires that we approximate the
            // quadrilateral with triangles. Thus, the quad is made out of two
            // triangles. One triangle is formed from 1, 4, 2 and the other
            // triangle from 1, 4, 3

            // input is either "left" most or "right" most child
            var addTriangle = function (child) {
                addPoint(getCoords(rootNode));
                addPoint(getCoords(cladeInfo.deepest));
                addPoint(getCoords(child));
            };

            // triangle from 1, 4, 2
            addTriangle(cladeInfo.left);

            // triangle from 1, 4, 3
            addTriangle(cladeInfo.right);
        } else if (this._currentLayout === "Rectangular") {
            // Rectangular layout is a triangle. Symmetric version is used if
            // this._collapseMethod === "symmetric"
            //
            // Unsymmetric version
            // The vertices of the triangle are 1) the root of the clade,
            // 2) "left" most child, 3) "right" most child
            //
            // Symmetric version
            // The vertices of the triangle are 1) the root of the clade,
            // 2) The "left" or "right" most child whose y-coordinate is closest
            // in value to the root, 3) The ray from the 1) to 2) will refected
            // across the horizontal axis that touches the root of the clade.

            // root of the clade
            addPoint(getCoords(rootNode));
            y = this.getY(this._treeData[rootNode]);

            // The x coordinate of 2) and 3) will be set to the x-coordinate of
            // the "deepest" node.
            var dx = this.getX(this._treeData[cladeInfo.deepest]);

            // y-coordinate of 2) and 3)
            var ly = this.getY(this._treeData[cladeInfo.left]);
            var ry = this.getY(this._treeData[cladeInfo.right]);
            if (this._collapseMethod === "symmetric") {
                if (Math.abs(y - ly) < Math.abs(y - ry)) {
                    ry = y + Math.abs(y - ly);
                } else {
                    ly = y - Math.abs(y - ry);
                }
            }
            addPoint([dx, ly]);
            addPoint([dx, ry]);
        } else {
            // Circular layout is a wedge. The wedge can be thought of a sector
            // of a circle whose center is at the root of the tree (note clade)
            // and whose radius is equal to the distance from the root of the
            // tree to the "deepest" node in the clade. The sector starts at the
            // root of the clade. Symmetric version is used if
            // this._collapseMethod === "symmetric"
            //
            // Note: The wedge is approximated by 15 triangles.
            //
            // Unsymmetric version
            // The angle of the sector is the angle between the "left" most and
            // "right" most children.
            //
            // Symmetric version
            // The angle of the sector is determined by taking the angle of the
            // "left" or "right" most child that is closest to the root of the
            // clade and doubling it.
            var dangle = this._treeData[cladeInfo.deepest].angle;
            var langle = this._treeData[cladeInfo.left].angle;
            var rangle = this._treeData[cladeInfo.right].angle;
            var totalAngle, cos, sin, sX, sY;

            // This block finds (sX, sY) start point and total angle of the
            // sector
            x = this.getX(this._treeData[cladeInfo.deepest]);
            y = this.getY(this._treeData[cladeInfo.deepest]);
            if (this._collapseMethod === "symmetric") {
                var nangle = this._treeData[rootNode].angle;
                var minAngle = Math.min(nangle - langle, rangle - nangle);
                totalAngle = 2 * minAngle;
                cos = Math.cos(nangle - minAngle - dangle);
                sin = Math.sin(nangle - minAngle - dangle);
                sX = x * cos - y * sin;
                sY = x * sin + y * cos;
            } else {
                totalAngle = rangle - langle;
                cos = Math.cos(langle - dangle);
                sin = Math.sin(langle - dangle);
                sX = x * cos - y * sin;
                sY =
                    x * Math.sin(langle - dangle) +
                    y * Math.cos(langle - dangle);
            }
            cladeInfo.sX = sX;
            cladeInfo.sY = sY;
            cladeInfo.totalAngle = totalAngle;

            // create 15 triangles to approximate sector
            var deltaAngle = totalAngle / 15;
            cos = Math.cos(deltaAngle);
            sin = Math.sin(deltaAngle);
            for (var line = 0; line < 15; line++) {
                addPoint(getCoords(rootNode));

                x = sX * cos - sY * sin;
                y = sX * sin + sY * cos;
                addPoint([x, y]);

                cos = Math.cos((line + 1) * deltaAngle);
                sin = Math.sin((line + 1) * deltaAngle);
                x = sX * cos - sY * sin;
                y = sX * sin + sY * cos;
                addPoint([x, y]);
            }
        }

        this._collapsedCladeBuffer.push(...cladeBuffer);
    };

    /**
     * Collapse the clade at rootNode
     *
     * This method will set the .visible property for all nodes in the clade
     * (execpt the root) to false. Also, the color of rootNode will be set to
     * DEFAULT_COLOR and this._collapsedCladeBuffer will be modified.
     *
     * Note: This method will cache the clade information. So, as long as
     *       the collapsed clades aren't changed, you do not need to call this
     *       method again. Instead, just use createCollapsedCladeShape(). For
     *       example if the layout is switch, simply iterate through
     *       this._collapsedClades and call createCollapsedCladeShape() on each
     *       element.
     *
     * @param {Number} rootNode The root of the clade. Note: This is the key
     *                          in _treeData.
     */
    Empress.prototype._collapseClade = function (rootNode) {
        // There are four steps to collapse the clade. 1) find all nodes in the
        // clade, 2) find the "left", "right" and deepest node in the clade,
        // 3) set the .visible property of all nodes in the clade (except
        // rootNode) to false, 4) create the collapsed clade shape.
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

        // step 1: find all nodes in the clade.
        // Note: cladeNodes is an array of nodes arranged in postorder fashion
        var cladeNodes = this.getCladeNodes(rootNode);

        // use the left most child in the clade to initialize currentCladeInfo
        var currentCladeInfo = {
            left: cladeNodes[0],
            right: cladeNodes[0],
            deepest: cladeNodes[0],
            length: this._tree.getTotalLength(cladeNodes[0], rootNode),
            color: this._treeData[rootNode].color,
        };

        // step 2: find the following clade information and
        // step 3: make all descendants of rootNode invisible
        for (var i in cladeNodes) {
            var cladeNode = cladeNodes[i];
            this._treeData[cladeNode].visible = false;

            // internal nodes do not effect clade information
            if (!this._tree.isleaf(this._tree.postorderselect(cladeNode))) {
                continue;
            }

            var curLeft = currentCladeInfo.left;
            var curRight = currentCladeInfo.right;
            var curDeep = currentCladeInfo.deepest;
            var length = this._tree.getTotalLength(cladeNode, rootNode);

            // update deepest node
            if (length > currentCladeInfo.length) {
                currentCladeInfo.length = length;
                currentCladeInfo.deepest = cladeNode;
            }

            // update "left" and "right" most nodes
            if (this._currentLayout === "Unrooted") {
                // currentCladeInfo.left is initially set to be the "left" most
                // node in Unrooted layout so we only need to update "right".
                // Since cladeNodes arranges nodes in postorder, "right" is the
                // last tip in cladeNodes
                currentCladeInfo.right = cladeNode;
            } else if (this._currentLayout === "Rectangular") {
                curLeftY = this.getY(this._treeData[curLeft]);
                curRightY = this.getY(this._treeData[curRight]);
                y = this.getY(this._treeData[cladeNode]);
                currentCladeInfo.left = y < curLeftY ? cladeNode : curLeft;
                currentCladeInfo.right = y > curRightY ? cladeNode : curRight;
            } else {
                curLAng = this._treeData[curLeft].angle;
                curRAng = this._treeData[curRight].angle;
                angle = this._treeData[cladeNode].angle;
                currentCladeInfo.left = angle < curLAng ? cladeNode : curLeft;
                currentCladeInfo.right = angle > curRAng ? cladeNode : curRight;
            }
        }
        this._collapsedClades[rootNode] = currentCladeInfo;

        // the root of the clade should be visible
        this._treeData[rootNode].visible = true;

        // step 4)
        this.createCollapsedCladeShape(rootNode);

        // We set the root of the clade to default otherwise, the branch that
        // connects the root clade to its parent will still be colored
        this._treeData[rootNode].color = this.DEFAULT_COLOR;
    };

    /**
     * Update the collapse method. The collapse method can be changed to either
     * 'symmetric' or 'normal'.
     *
     * Note: this method will recreate the collapsed clades and call drawTree()
     *
     * @param{String} method The collapse method. An error will be thrown if
     *                       this is not either 'symmetric' or 'normal'
     */
    Empress.prototype.updateCollapseMethod = function (method) {
        // do nothing
        if (method === this._collapseMethod) {
            return;
        }

        if (method !== "normal" && method !== "symmetric") {
            throw method + " is not a clade collapse method.";
        }

        this._collapseMethod = method;
        this._collapsedCladeBuffer = [];
        for (var cladeRoot in this._collapsedClades) {
            this.createCollapsedCladeShape(cladeRoot);
        }
        this.drawTree();
    };

    /**
     * Returns all nodes in the clade whose root is node.
     *
     * Note: elements in the returned array are keys in this._treeData
     *       also, the returned array is sorted in a postorder fashion
     *
     * @param {Number} cladeRoot The root of the clade. An error is thrown if
     *                           cladeRoot is not a valid node.
     *
     * @return {Array} The nodes in the clade
     */
    Empress.prototype.getCladeNodes = function (cladeRoot) {
        if (!this._treeData.hasOwnProperty(cladeRoot)) {
            throw cladeRoot + " is not a valid node.";
        }
        // stores the clade nodes
        var cladeNodes = [];

        // Nodes in the clade are found by performing a postorder traversal
        // starting at the left most child of the clade and ending on cladeRoot

        // find left most child
        // Note: initializing lchild as cladeRoot incase cladeRoot is a tip
        var lchild = cladeRoot;
        var fchild = this._tree.fchild(this._tree.postorderselect(cladeRoot));
        while (fchild !== 0) {
            lchild = this._tree.postorder(fchild);
            fchild = this._tree.fchild(this._tree.postorderselect(lchild));
        }

        // perform post order traversal until cladeRoot is reached.
        for (var i = lchild; i <= cladeRoot; i++) {
            cladeNodes.push(i);
        }

        return cladeNodes;
    };

    /**
     * Checks if the point (x, y) is within the bounds of the collapsed clade.
     *
     * Note: if cladeRoot is not the root of a collapsed clade then this method
     *       will return false.
     *
     * @param {Number} cladeRoot The root of the clade. Note: cladeRoot should
     *                           be a key in this._treeData
     * @param {Array} point The x, y coordinate of the point
     *
     * @return {Boolean} true if point is within the bounds of the collapsed
     *                   clade, false otherwise
     */
    Empress.prototype._isPointInClade = function (cladeRoot, point) {
        // check if cladeRoot is the root of a collapsed clade
        if (!this._collapsedClades.hasOwnProperty(cladeRoot)) {
            return false;
        }

        var scope = this;
        var getCoords = function (node) {
            node = scope._treeData[node];
            return [scope.getX(node), scope.getY(node)];
        };
        var clade = this._collapsedClades[cladeRoot];
        var cRoot = getCoords(cladeRoot);
        var left = getCoords(clade.left);
        var right = getCoords(clade.right);
        var deep = getCoords(clade.deepest);
        var cladeArea, netArea;
        if (this._currentLayout === "Unrooted") {
            // In Unrooted layout, to check if point is within in the collapsed
            // clade, we first calculate the area of the collapsed clade.
            // (The shape of the collapsed clade is a quad whose vertices are
            // (1) root, (2) "left" most child, (3) "right" most child, and
            // (4) "deepest" child). Next, we form four triangles whose vertices
            // are:
            // 1) point, (3), (4)
            // 2) point, (4), (2)
            // 3) point, (2), (1)
            // 4) point, (1), (3)
            // and sum there areas. Next, we take the difference of quad area
            // and triangle areas. If the difference is ~0, then point is in the
            // collapsed clade.
            // Note: this works because the only way for the difference in areas
            //       to be zero is if the triangles exactly overlap the
            //       collapsed clade.
            cladeArea =
                VectorOps.triangleArea(cRoot, left, right) +
                VectorOps.triangleArea(deep, left, right);

            // can happen if clade has children with 0-length or clade
            // only has a single child. If cladeArea is 0, then the area of the
            // four trianges will also be 0 regardless of the location of point
            // (this is because the quad is either a point or a line). So, with
            // out this check, if cladeArea is 0 then this funtion will always
            // return 0
            if (cladeArea == 0) {
                return false;
            }
            netArea =
                cladeArea -
                VectorOps.triangleArea(point, right, deep) -
                VectorOps.triangleArea(point, deep, left) -
                VectorOps.triangleArea(point, left, cRoot) -
                VectorOps.triangleArea(point, cRoot, right);
            return Math.abs(netArea) < 1.0e-5;
        } else if (this._currentLayout == "Rectangular") {
            // The procedure is pretty much the same as Unrooted layout.
            // However, since, the Rectangular layout has two different version,
            // we need to first calculate the three vertices of the collapsed
            // clade (denoted (1), (2), (3)). Then, similar to the Unrooted
            // layout, we calculate the area of the collapsed clade. Next,
            // we form three triangle whose vertices are:
            // 1) point, (2), (3)
            // 2) point, (3), (1)
            // 3) point, (1), (2)
            // and take the difference of the areas. If the difference is 0,
            // then the point is within the collapsed clade.

            // find vertices of clade
            if (this._collapseMethod === "symmetric") {
                if (
                    Math.abs(cRoot[1] - left[1]) < Math.abs(cRoot[1] - right[1])
                ) {
                    right[1] = cRoot[1] + Math.abs(cRoot[1] - left[1]);
                } else {
                    left[1] = cRoot[1] - Math.abs(cRoot[1] - right[1]);
                }
            }
            cladeArea = VectorOps.triangleArea(
                cRoot,
                [deep[0], left[1]],
                [deep[0], right[1]]
            );

            // can happen if clade has children with 0-length or clade
            // only has a single child
            if (cladeArea == 0) {
                return false;
            }
            netArea =
                cladeArea -
                VectorOps.triangleArea(
                    point,
                    [deep[0], right[1]],
                    [deep[0], left[1]]
                ) -
                VectorOps.triangleArea(point, [deep[0], left[1]], cRoot) -
                VectorOps.triangleArea(point, cRoot, [deep[0], right[1]]);
            return Math.abs(netArea) < 1.0e-5;
        } else {
            // For Circular layou, we "use" Polar coordinates to determine if
            // point is in the clade. The idea behind this method is to
            // calculate the angle of the "left" and "right" most children in
            // the clade (we consider the root of the clade to be thec origin)
            // and also calculate the distance from the root of the tree
            // to the "deepest" node in the clade. Then we calculate the angle
            // of point and its distance to the root of the tree. if the angle
            // of point is within the range of the "left" and "right" and its
            // distance is less than the distance to the "deepest" node then,
            // point is within the bounds of the collapsed clade.
            var totalAngle = clade.totalAngle;
            var cos = Math.cos(totalAngle);
            var sin = Math.sin(totalAngle);

            left = [clade.sX, clade.sY];
            right[0] = left[0] * cos - left[1] * sin;
            right[1] = left[0] * sin + left[1] * cos;
            var getAngleAndMagnitude = function (p) {
                var angle = VectorOps.getAngle([
                    p[0] - cRoot[0],
                    p[1] - cRoot[1],
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
            };

            var leftPoint = getAngleAndMagnitude(left);
            var rightPoint = getAngleAndMagnitude(right);
            var p = getAngleAndMagnitude(point);
            if (leftPoint.radian > rightPoint.radian) {
                rightPoint.radian += 2 * Math.PI;
                if (leftPoint.radian > p.radian) {
                    p.radian += 2 * Math.PI;
                }
            }
            return (
                p.radian >= leftPoint.radian &&
                p.radian <= rightPoint.radian &&
                p.mag <= leftPoint.mag
            );
        }
    };

    /**
     * Checks if (x, y) is within the bounds of a collapsed clade
     *
     * @param {Array} point (x, y) coordinates of a point
     *
     * @return {Number} if point is in a collapsed clade then root of the
     *                  the collapse clade will be returned otherwise -1 is
     *                  returned.
     */
    Empress.prototype.getRootNodeForPointInClade = function (point) {
        for (var clade in this._collapsedClades) {
            if (this._isPointInClade(clade, point)) {
                var cladeNode = this._treeData[clade];
                return clade;
            }
        }
        return -1;
    };

    /**
     * Returns the name of node
     *
     * @param {Number} node The node key in this._treeData. An error will be
     *                      thrown if it is not a key in this._treeData
     *
     * @return {String} The name of the node
     */
    Empress.prototype.getName = function (node) {
        if (!this._treeData.hasOwnProperty(node)) {
            throw node + " is not a key in _treeData";
        }
        return this._treeData[node].name;
    };
    /*
     * Show the node menu for a node name
     *
     * Calculate the number of samples in which a tip appears for the
     * unique values of a metadata field across a list of metadata fields.
     *
     * @param {String} nodeName Name of the (tip) node for which to calculate
     *                          sample presence.
     * @param {Array} fields Metadata fields for which to calculate tip
     *                       sample presence.
     * @return {Object} ctData Maps metadata field names to another Object,
     *                         which in turn maps unique metadata values to
     *                         the number of samples with this metadata value
     *                         in this field that contain the given tip.
     */
    Empress.prototype.computeTipSamplePresence = function (nodeName, fields) {
        var ctData = {};

        for (var f = 0; f < fields.length; f++) {
            var field = fields[f];
            ctData[field] = this._biom.getObsCountsBy(field, nodeName);
        }

        return ctData;
    };

    /**
     * Calculate the number of samples in which at least one tip of an internal
     * node appears for the unique values of a metadata field across a list of
     * metadata fields.
     *
     * @param {String} nodeKey Key of the (internal) node to calculate
     *                         sample presence for.
     * @param {Array} fields Metadata fields for which to calculate internal
     *                       node sample presence.
     * @return {Object} samplePresence A mapping with three entries:
     *                                 (1) fieldsMap Maps metadata field names
     *                                 to Object mapping unique metadata values
     *                                 to the number of samples with this metadata
     *                                 value in this field containing at least one
     *                                 tip in the subtree of the given nodeKey.
     *                                 (2) diff Array of tip names not present
     *                                 as features in the table.
     *                                 (3) samples Array of samples represented by
     *                                 tips present in the table.
     */
    Empress.prototype.computeIntSamplePresence = function (nodeKey, fields) {
        // retrieve the sample data for the tips in the table
        var tips = this._tree.findTips(nodeKey);
        var diff = this._biom.getObsIDsDifference(tips);
        var intersection = this._biom.getObsIDsIntersection(tips);
        var samples = this._biom.getSamplesByObservations(intersection);

        var fieldsMap = {};
        for (var i = 0; i < fields.length; i++) {
            field = fields[i];
            var possibleValues = this._biom.getUniqueSampleValues(field);
            for (var j = 0; j < possibleValues.length; j++) {
                var possibleValue = possibleValues[j];
                if (!(field in fieldsMap)) fieldsMap[field] = {};
                fieldsMap[field][possibleValue] = 0;
            }
        }

        // iterate over the samples and extract the field values
        for (var k = 0; k < fields.length; k++) {
            field = fields[k];

            // update fields mapping object
            var result = this._biom.getSampleValuesCount(samples, field);
            fieldValues = Object.keys(result);
            for (var m = 0; m < fieldValues.length; m++) {
                fieldValue = fieldValues[m];
                fieldsMap[field][fieldValue] += result[fieldValue];
            }
        }

        var samplePresence = {
            fieldsMap: fieldsMap,
            diff: diff,
            samples: samples,
        };
        return samplePresence;
    };

    /** Show the node menu for a node name
     *
     * @param {String} nodeName The name of the node to show.
     */
    Empress.prototype.showNodeMenuForName = function (nodeName) {
        if (!this._tree.containsNode(nodeName)) {
            util.toastMsg(
                "The node '" + nodeName + "' is not present in the phylogeny"
            );
            return;
        }

        this._events.selectedNodeMenu.clearSelectedNode();
        this._events.placeNodeSelectionMenu(nodeName, this.focusOnSelectedNode);
    };

    return Empress;
});
