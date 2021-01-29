define(["underscore", "VectorOps", "util"], function (_, VectorOps, util) {
    /**
     * Given a tree and leaf sorting method, returns an Array of the tree's
     * nodes in postorder (using the given leaf sorting method).
     *
     * @param {BPTree} tree The tree to be traversed
     * @param {String} leafSorting One of the following three options:
     *                             -"none": Lay out the tree's clades in the
     *                              same order as specified in the input tree.
     *                             -"ascending": Use leaf sorting with
     *                              "ascending" order. See
     *                              BPTree.postorderLeafSortedNodes() for
     *                              details.
     *                             -"descending": Use leaf sorting with
     *                              "descending" order. Again, see BPTree.
     *                             If any other value is passed in for this
     *                             parameter, this will throw an error.
     * @return {Array} postOrderNodes
     * @throws {Error} If the leafSorting parameter is invalid
     */
    function getPostOrderNodes(tree, leafSorting) {
        var postOrderNodes = [];
        if (leafSorting === "ascending" || leafSorting === "descending") {
            postOrderNodes = tree.postorderLeafSortedNodes(leafSorting);
        } else if (leafSorting === "none") {
            // Nodes are already stored as their postorder position, so we can
            // just return an array in the range [1, tree.size]
            postOrderNodes = _.range(1, tree.size + 1);
        } else {
            throw new Error("Unrecognized leaf sorting method " + leafSorting);
        }
        return postOrderNodes;
    }

    /**
     * Compute ultrametric lengths on a tree
     *
     * @param {BPTree} tree The tree to generate the lengths for.
     *
     * @returns {Object} Keys are the index position of the node in tree.
     *                   Values are the length of the node in an ultrametric tree.
     */
    function getUltrametricLengths(tree) {
        var lengths = {};
        var i;
        var j;
        var maxNodeToTipDistance = new Array(tree.size);
        var depths = new Array(tree.size);
        var nodeIndex;
        var children;
        var child;
        /*
        This loop is responsible for finding the maximum distance from
        each node to its deepest tip.
         */
        for (i = 1; i <= tree.size; i++) {
            nodeIndex = tree.postorderselect(i);
            if (tree.isleaf(nodeIndex)) {
                maxNodeToTipDistance[nodeIndex] = 0;
            } else {
                var maxDist = 0;
                children = tree.getChildren(nodeIndex);
                for (j = 0; j < children.length; j++) {
                    child = children[j];
                    var childMaxLen =
                        maxNodeToTipDistance[child] + tree.length(child);
                    if (childMaxLen > maxDist) {
                        maxDist = childMaxLen;
                    }
                }
                maxNodeToTipDistance[nodeIndex] = maxDist;
            }
        }
        /*
         This loop is responsible for determining new branch lengths.
         The lengths for intermediate nodes are effectively "stretched" until
         their deepest descendant hits the deepest level in the whole tree.

         E.g., if we are at the node represented by * in the tree below:

         |--------------------------maxDistance-------------------------|
         |--distanceAbove--|           |---distanceBelow---|
                            |-length--|                     |-remainder-|
                                                    ____
                                        ___________|
                            *__________|           |_______
          __________________|          |__
                            |
                            |___________________________________________

         then the branch will be extended so that its deepest tip has the
         same depth as the deepest tip in the whole tree,
         i.e., newLength = length + remainder
         however, below it is equivalently calculated with
         newLength = maxDistance - distanceAbove - distanceBelow

         E.g.,
         |--------------------------maxDistance-------------------------|
         |--distanceAbove--|                        |---distanceBelow---|
                            |-length--||-remainder-|
                                                                 ____
                                                     ___________|
                            *_______________________|           |_______
          __________________|                       |__
                            |
                            |___________________________________________

        Repeated in a pre-order traversal, this will result in an ultrametric tree

         */
        var maxDistance = maxNodeToTipDistance[tree.root()];
        depths[tree.root()] = 0;
        lengths[tree.root()] = tree.depth(tree.root());
        for (i = 1; i <= tree.size; i++) {
            nodeIndex = tree.preorderselect(i);
            children = tree.getChildren(nodeIndex);
            for (j = 0; j < children.length; j++) {
                child = children[j];
                var distanceAbove = depths[nodeIndex];
                var distanceBelow = maxNodeToTipDistance[child];
                lengths[child] = maxDistance - distanceAbove - distanceBelow;
                depths[child] = distanceAbove + lengths[child];
            }
        }
        return lengths;
    }

    /**
     * Gets a method for determining branch lengths by name, parameterized on a tree.
     *
     * @param {String} methodName Method for determing branch lengths.
     *                            One of ("ultrametric", "ignore", "normal").
     * @param {BPTree} tree Tree that needs branch lengths determined.
     * @returns {Function} A function that maps node indices to branch lengths.
     */
    function getLengthMethod(methodName, tree) {
        var lengthGetter;
        if (methodName === "ultrametric") {
            var ultraMetricLengths = getUltrametricLengths(tree);
            lengthGetter = function (i) {
                return ultraMetricLengths[i];
            };
        } else if (methodName === "ignore") {
            lengthGetter = function (i) {
                return 1;
            };
        } else if (methodName === "normal") {
            lengthGetter = function (i) {
                return tree.length(i);
            };
        } else {
            throw "Invalid method: '" + methodName + "'.";
        }
        return lengthGetter;
    }

    /**
     * Determines whether a given method should check if branch lengths were changed.
     *
     * @param {String} methodName Method for determing branch lengths.
     *                            One of ("ultrametric", "ignore", "normal").
     * @returns {Boolean} Indicates whether the check should be performed.
     * @throws {Error} If methodName is invalid.
     */
    function shouldCheckBranchLengthsChanged(methodName) {
        var methods = {
            ultrametric: true,
            ignore: true,
            normal: false,
        };
        if (methodName in methods) {
            return methods[methodName];
        } else {
            throw "Invalid method: '" + methodName + "'.";
        }
    }

    var NO_LENGTHS_CHANGED_MSG =
        "It doesn't look like any branch lengths were changed " +
        "by the current method of modifying branch lengths.";
    var NO_LENGTHS_CHANGED_DURATION = 3000;
    var TOL = 0.000001;

    /**
     * Raises a toast message telling the user that no branch lengths changed.
     */
    function noLengthsChangedMsg() {
        util.toastMsg(NO_LENGTHS_CHANGED_MSG, NO_LENGTHS_CHANGED_DURATION);
    }

    /**
     * Computes the "scale factor" for the circular / unrooted layouts.
     *
     * NOTE that we don't bother with this for the rectangular layout since --
     * 1. we scale the x- and y- axes separately in the rectangular layout
     * 2. the rectangular layout y-coordinates should increase in increments of
     *    one, so we shouldn't need to worry too much about detecting
     *    floating-point numbers (if the max y is > 0, it's at least 1, so
     *    we're fine)
     *
     * @param {Number} width Width to which the coordinates should be scaled
     * @param {Number} height Height to which the coordinates should be scaled
     * @param {Number} minX Minimum x-coordinate
     * @param {Number} maxX Maximum x-coordinate
     * @param {Number} minY Minimum y-coordinate
     * @param {Number} maxY Maximum y-coordinate
     * @param {Number} epsilon Threshold to use when considering the min and
     *                         max coordinates on a given axis "different".
     *                         If dx (a.k.a. maxX - minX) is < epsilon, then
     *                         this will only look at the y-axis for scaling,
     *                         and vice versa. If both dx and dy are < epsilon,
     *                         this will raise an error: this should never
     *                         happen in practice since the Python code
     *                         guarantees that input trees have at least one
     *                         non-root node and that the non-root node(s) have
     *                         a positive length, but we catch it here just in
     *                         case. (If this *does* start happening to people
     *                         with real trees, which it shouldn't, then we may
     *                         want to decrease this epsilon. But I highly
     *                         doubt that will ever happen.)
     *
     * @return {Number} scaleFactor Equal to max(width/dx, height/dy), assuming
     *                              that dx and dy are both >= epsilon. If
     *                              either dx or dy is < epsilon, this'll just
     *                              return the other term.
     *
     * @throws {Error} If (maxX - minX) < epsilon AND (maxY - minY) < epsilon.
     *                 (Only one of the epsilon
     *                 conditions being satisifed implies that the tree is a
     *                 straight line along either the y- or x-axis, which is
     *                 fine; if BOTH epsilon conditions are satisified, then
     *                 something is probably very wrong.)
     */
    function computeScaleFactor(
        width,
        height,
        minX,
        maxX,
        minY,
        maxY,
        epsilon = 1e-5
    ) {
        var dx = maxX - minX;
        var dy = maxY - minY;
        var widthScale = width / dx;
        var heightScale = height / dy;
        if (dy >= epsilon) {
            if (dx >= epsilon) {
                return Math.max(widthScale, heightScale);
            } else {
                return heightScale;
            }
        } else {
            if (dx >= epsilon) {
                return widthScale;
            } else {
                throw new Error(
                    "dx and dy are < epsilon; can't scale this layout."
                );
            }
        }
    }

    /**
     * Rectangular layout.
     *
     * In this sort of layout, each tip has a distinct y-position, and parent
     * y-positions are centered over their descendant tips' positions.
     * x-positions are computed based on nodes' branch lengths.
     *
     * For a simple tree, this layout should look something like:
     *          __
     *      ___|
     *  ___|   |__
     * |   |___
     * |    ___
     * |___|
     *     |___
     *
     * NOTE: This doesn't draw a horizontal line leading to the root "node"
     * of the graph (as with the other layout methods). See
     * https://github.com/biocore/empress/issues/141 for context.
     *
     * For other resources see:
     *
     *  https://rachel53461.wordpress.com/2014/04/20/algorithm-for-drawing-trees/
     *      Clear explanation of Reingold-Tilford that I used a lot
     *  https://github.com/qiime/Topiary-Explorer/blob/master/src/topiaryexplorer/TreeVis.java
     *      Derived from the "Rectangular" layout algorithm code.
     *
     * @param {BPTree} tree The tree to generate the coordinates for.
     * @param {Float} width Width of the canvas where the tree will be
     *                      displayed.
     * @param {Float} height Height of the canvas where the tree will be
     *                       displayed.
     * @param {String} leafSorting See the getPostOrderNodes() docs above.
     * @param {Boolean} normalize If true, then the tree will be scaled up to
     *                            fill the bounds of width and height.
     * @param {Function} lengthGetter Is a function that takes a single argument
     *                                that corresponds to the index of a node in
     *                                tree. Returns the length of the node at that
     *                                index. Defaults to 'normal' method.
     * @param {Boolean} checkLengthsChange If true, then a warning will be raised
     *                                     if no branch lengths in the tree differ
     *                                     from the value determined by lengthGetter.
     * @return {Object} Object with the following properties:
     *                   -xCoords
     *                   -yCoords
     *                   -highestChildYr
     *                   -lowestChildYr
     *                   -yScalingFactor
     *                  Each of these properties (except for yScalingFactor)
     *                  maps to an Array where data for each node is stored in
     *                  postorder. yScalingFactor maps to a Number.
     */
    function rectangularLayout(
        tree,
        width,
        height,
        leafSorting,
        normalize = true,
        lengthGetter = null,
        checkLengthsChange = false
    ) {
        var maxWidth = 0;
        var maxHeight = 0;
        var prevY = 0;
        var xCoord = new Array(tree.size + 1).fill(0);
        var yCoord = new Array(tree.size + 1).fill(0);
        var highestChildYr = new Array(tree.size + 1);
        var lowestChildYr = new Array(tree.size + 1);
        if (lengthGetter === null) {
            lengthGetter = getLengthMethod("normal", tree);
        }

        var postOrderNodes = getPostOrderNodes(tree, leafSorting);
        var i;
        for (var p = 0; p < postOrderNodes.length; p++) {
            i = postOrderNodes[p];
            if (tree.isleaf(tree.postorderselect(i))) {
                yCoord[i] = prevY;
                prevY += 1;
                if (yCoord[i] > maxHeight) {
                    maxHeight = yCoord[i];
                }
            } else {
                // Center internal nodes above their children
                // We could also center them above their tips, but (IMO) this
                // looks better ;)
                var sum = 0;
                var numChild = 0;
                var child = tree.fchild(tree.postorderselect(i));
                while (child !== 0) {
                    child = tree.postorder(child);
                    sum += yCoord[child];
                    child = tree.nsibling(tree.postorderselect(child));
                    numChild++;
                }
                yCoord[i] = sum / numChild;
            }
        }

        var anyDifferent = false;
        // iterates in preorder
        var parent;
        for (i = 2; i <= tree.size; i++) {
            var prepos = tree.preorderselect(i);
            var node = tree.postorder(prepos);
            parent = tree.postorder(tree.parent(prepos));

            var nodeLen = lengthGetter(prepos);
            xCoord[node] = xCoord[parent] + nodeLen;
            if (maxWidth < xCoord[node]) {
                maxWidth = xCoord[node];
            }
            if (checkLengthsChange && !anyDifferent) {
                anyDifferent = isTransformedLenDifferent(nodeLen, tree, prepos);
            }
        }
        if (checkLengthsChange && !anyDifferent) {
            noLengthsChangedMsg();
        }

        // We don't check if max_width == 0 here, because we check when
        // constructing an Empress tree that it has at least one positive
        // branch length and no negative branch lengths. (And if this is the
        // case, then max_width must be > 0.)
        var xScalingFactor = width / maxWidth;

        // If the tree is a straight line (i.e. all internal nodes have exactly
        // one child), every node in the tree will have a y-coordinate of 0. In
        // this case, this scaling factor won't matter, since it'll get
        // multiplied by 0 for every node.
        var yScalingFactor = 1;

        // Having a max_height of 0 could actually happen, in the funky case
        // where the entire tree is a straight line (e.g. A -> B -> C). In
        // this case our "rectangular layout" drawing places all nodes on
        // the same y-coordinate (0), resulting in max_height = 0.
        // ... So, that's why we only do y-scaling if this *isn't* the case.
        if (maxHeight > 0) {
            yScalingFactor = height / maxHeight;
        }
        if (normalize) {
            for (i = 1; i <= tree.size; i++) {
                xCoord[i] *= xScalingFactor;
                yCoord[i] *= yScalingFactor;
            }
        }

        var rX = xCoord[tree.size];
        var rY = yCoord[tree.size];

        // skip the first element since the tree is zero-indexed
        for (i = 1; i < tree.size; i++) {
            xCoord[i] -= rX;
            yCoord[i] -= rY;

            // Determine highest and lowest child y-position for internal nodes
            // in the rectangular layout; used to draw vertical lines for these
            // nodes.

            // NOTE: This will have the effect of drawing vertical lines
            // even for nodes with only 1 child -- in this case
            // lowest_child_yr == highest_child_yr for this node, so all of the
            // stuff drawn in WebGL for this vertical line shouldn't show up.
            // I don't think this should cause any problems, but it may be worth
            // detecting these cases and not drawing vertical lines for them in
            // the future.
            parent = tree.postorder(tree.parent(tree.postorderselect(i)));
            if (
                yCoord[i] > highestChildYr[parent] ||
                highestChildYr[parent] === undefined
            ) {
                highestChildYr[parent] = yCoord[i];
            }

            if (
                yCoord[i] < lowestChildYr[parent] ||
                lowestChildYr[parent] === undefined
            ) {
                lowestChildYr[parent] = yCoord[i];
            }
        }
        xCoord[tree.size] -= rX;
        yCoord[tree.size] -= rY;

        // We draw each internal node as a vertical line ranging from its
        // lowest child y-position to its highest child y-position, and then
        // draw horizontal lines from this line to all of its child nodes
        // (where the length of the horizontal line is proportional to the node
        // length in question).
        return {
            xCoord: xCoord,
            yCoord: yCoord,
            highestChildYr: highestChildYr,
            lowestChildYr: lowestChildYr,
            yScalingFactor: yScalingFactor,
        };
    }

    /**
     * "Circular" version of the rectangular layout.
     *
     * ANGLES
     * ------
     * Tips are arranged around the border of a circle (a.k.a. assigned an
     * angle in the range [0, 2pi] in radians), and (non-root) internal nodes
     * are assigned an angle equal to the average of their children's. This
     * process is analogous to the assignment of y coordinates in the
     * rectangular layout.
     *
     * RADII
     * -----
     * All nodes are then assigned a radius equal to the sum of their branch
     * lengths descending from the root (not including the root's branch
     * length, if provided: the root node is consistently represented as a
     * single point in the center of the layout). This mirrors the assignment
     * of x-coordinates in the rectangular layout.
     *
     * ARCS
     * ----
     * Finally, we create arcs for every non-root internal node connecting the
     * "start points" of the child nodes of that node with the minimum and
     * maximum angle. (These points should occur at the radius equal to the
     * "end point" of the given non-root internal node.) These arcs should
     * ideally be drawn as Bezier curves or something, but they can also be
     * approximated by making multiple line segments throughout the curve.
     * These arcs are analogous to the vertical lines drawn for the rectangular
     * layout: they visually connect all of the children of an internal node.
     *
     * ROOT NODE
     * ---------
     * The root node of the tree is not drawn like other nodes in the tree.
     * Like the other layouts, It will always be positioned at (0, 0) -- for
     * the circular layout, this point is the center of the "circle"
     * constructed during layout. Since the root's "end point" is the same as
     * its "start point," it's not possible to draw a visible arc.
     * (We could draw the root's branch length if desired, but for simplicity
     * and consistency's sake this is omitted. This mirrors how the root is
     * represented in the rectangular layout.)
     *
     * REFERENCES
     * ----------
     * https://github.com/qiime/Topiary-Explorer/blob/master/src/topiaryexplorer/TreeVis.java
     *     Description above + the implementation of this algorithm derived
     *     from the Polar layout algorithm code.
     *
     * @param {BPTree} tree The tree to generate the coordinates for.
     * @param {Float} width Width of the canvas where the tree will be
     *                      displayed.
     * @param {Float} height Height of the canvas where the tree will be
     *                       displayed.
     * @param {String} leafSorting See the getPostOrderNodes() docs above.
     * @param {Boolean} normalize If true, then the tree will be scaled up to
     *                            fill the bounds of width and height.
     * @param {Function} lengthGetter Is a function that takes a single argument
     *                                that corresponds to the index of a node in
     *                                tree. Returns the length of the node at that
     *                                index. Defaults to 'normal' method.
     * @param {Boolean} checkLengthsChange If true, then a warning will be raised
     *                                     if no branch lengths in the tree differ
     *                                     from the value determined by lengthGetter.
     * @return {Object} Object with the following properties:
     *                   -x0, y0 ("starting point" x and y)
     *                   -x1, y1 ("ending point" x and y)
     *                   -angle (angle on the circle this node was assigned)
     *                   -arcx0, arcy0 (arc start point for max-angle child x
     *                    and y)
     *                   -arcStartAngle
     *                   -arcEndAngle
     *                  Each of these properties maps to an Array where data
     *                  for each node is stored in postorder. The arc* values
     *                  will be 0 for all leaf nodes, and all values will be 0
     *                  for the root node.
     */
    function circularLayout(
        tree,
        width,
        height,
        leafSorting,
        normalize = true,
        lengthGetter = null,
        checkLengthsChange = false
    ) {
        // Set up arrays we're going to store the results in
        var x0 = new Array(tree.size + 1).fill(0);
        var y0 = new Array(tree.size + 1).fill(0);
        var x1 = new Array(tree.size + 1).fill(0);
        var y1 = new Array(tree.size + 1).fill(0);
        var angle = new Array(tree.size + 1).fill(0);
        // (We don't return the radius values, but we need to keep track of
        // them throughout this function anyway)
        var radius = new Array(tree.size + 1).fill(0);
        // Arc information (only relevant for non-root internal nodes)
        var arcx0 = new Array(tree.size + 1).fill(0);
        var arcy0 = new Array(tree.size + 1).fill(0);
        var arcStartAngle = new Array(tree.size + 1).fill(0);
        var arcEndAngle = new Array(tree.size + 1).fill(0);

        var anglePerTip = (2 * Math.PI) / tree.numleaves();

        // Note: this means that the first tip visited in the tree is
        // positioned on the rightmost point of the circle. This also means
        // that trees with a single tip should look basically identical in the
        // circular and rectangular layouts. This really should not be changed
        // -- when we add support for rotating the tree, that should be done
        // after computing layouts, as a WebGL matrix multiplication thing.
        // See https://github.com/biocore/empress/issues/359.
        var prevAngle = 0;

        var child, currRadius;
        var maxX = 0,
            minX = Number.POSITIVE_INFINITY;
        var maxY = 0,
            minY = Number.POSITIVE_INFINITY;

        if (lengthGetter === null) {
            lengthGetter = getLengthMethod("normal", tree);
        }

        // Iterate over the tree in postorder, assigning angles
        // Note that we skip the root (using "p < postOrderNodes.length - 1"),
        // since the root's angle is irrelevant.
        var postOrderNodes = getPostOrderNodes(tree, leafSorting);
        var i;
        for (var p = 0; p < postOrderNodes.length - 1; p++) {
            i = postOrderNodes[p];
            if (tree.isleaf(tree.postorderselect(i))) {
                angle[i] = prevAngle;
                prevAngle += anglePerTip;
            } else {
                // Assign internal nodes an angle of the average of their
                // children's angles
                var angleSum = 0;
                var numChildren = 0;
                child = tree.fchild(tree.postorderselect(i));
                while (child !== 0) {
                    child = tree.postorder(child);
                    angleSum += angle[child];
                    child = tree.nsibling(tree.postorderselect(child));
                    numChildren++;
                }
                angle[i] = angleSum / numChildren;
            }
        }

        var anyDifferent = false;
        // Iterate over the tree in preorder, assigning radii
        // (The "i = 2" skips the root of the tree; its radius is implicitly 0)
        for (i = 2; i <= tree.size; i++) {
            var prepos = tree.preorderselect(i);
            // Get the postorder position of this node, which we'll use when
            // writing to the radius array (which is stored in postorder, as
            // are the remainder of the "result" arrays defined above)
            var node = tree.postorder(prepos);
            var parent = tree.postorder(tree.parent(prepos));

            var nodeLen = lengthGetter(prepos);
            radius[node] = radius[parent] + nodeLen;
            if (checkLengthsChange && !anyDifferent) {
                anyDifferent = isTransformedLenDifferent(nodeLen, tree, prepos);
            }
        }
        if (checkLengthsChange && !anyDifferent) {
            noLengthsChangedMsg();
        }

        // Now that we have the polar coordinates of the nodes, convert them to
        // normal x/y coordinates (a.k.a. Cartesian coordinates).
        // We skip the root because we already know it's going to be at (0, 0).
        //
        // Unlike the rectangular / unrooted layout we need to keep track of
        // two sets of positions for each (non-root) node: a "starting" and
        // "end" point. In the other layouts we can just infer the starting
        // point during drawing, but here each node's line begins at its parent
        // node's radius but at its own angle in polar coordinates -- and to
        // avoid doing extra work on converting between polar and Cartesian
        // coords, we just compute both points here. (As a potential TODO, it's
        // probably possible to do this more efficiently.)
        for (i = 1; i < tree.size; i++) {
            // To avoid repeated lookups / computations, store a few things in
            // memory during this iteration of the loop
            var parentRadius =
                radius[tree.postorder(tree.parent(tree.postorderselect(i)))];
            var currAngle = angle[i];
            currRadius = radius[i];
            // NOTE: due to the inherent inaccuracies of floating-point math
            // (and due to pi being irrational), Math.cos(Math.PI / 2) is
            // __very__ slightly off from zero (so e.g.
            // 2(cos(pi/2)) != 1(cos(pi/2)), even though ideally both sides of
            // that equation would be 0). This shouldn't really impact
            // anything, but it was a problem in the past when we were
            // determining the "min and max" x/y coordinates for scaling
            // (which has since been removed). Just something to keep in mind.
            // (See https://stackoverflow.com/q/8050722/10730311 for details.)
            var angleCos = Math.cos(currAngle);
            var angleSin = Math.sin(currAngle);
            // Assign starting points
            x0[i] = parentRadius * angleCos;
            y0[i] = parentRadius * angleSin;
            // Assign ending points
            x1[i] = currRadius * angleCos;
            y1[i] = currRadius * angleSin;

            // _Usually_ we won't need to take the x0/y0 coordinates into
            // account when expanding the bounding box (since by nature nodes
            // should radiate "outward" from the root node, positioned at the
            // center the circle at (0, 0)), but this assumption can fail for
            // 1-tip trees or if in the future we modify the circular layout to
            // e.g. only go from 0 to 180 degrees or something. So for safety's
            // sake we consider the x0/y0 coordinates as well.
            maxX = Math.max(maxX, x1[i], x0[i]);
            minX = Math.min(minX, x1[i], x0[i]);
            maxY = Math.max(maxY, y1[i], y0[i]);
            minY = Math.min(minY, y1[i], y0[i]);
        }

        var scaleFactor = 1;
        if (normalize) {
            scaleFactor = computeScaleFactor(
                width,
                height,
                minX,
                maxX,
                minY,
                maxY
            );
        }

        // Go over the tree (in postorder, but order doesn't really matter
        // for this) to determine arc positions for non-root internal nodes.
        // Also scale nodes' coordinates, while we're at it.
        for (i = 1; i < tree.size; i++) {
            if (normalize) {
                x0[i] *= scaleFactor;
                x1[i] *= scaleFactor;
                y0[i] *= scaleFactor;
                y1[i] *= scaleFactor;
            }
            // Compute arcs for non-root internal nodes (we know that this node
            // isn't the root because we're skipping the root entirely in this
            // for loop)
            if (!tree.isleaf(tree.postorderselect(i))) {
                // Find the biggest and smallest angle of the node's children
                var biggestCAngle = Number.NEGATIVE_INFINITY;
                var smallestChildAngle = Number.POSITIVE_INFINITY;
                child = tree.fchild(tree.postorderselect(i));
                while (child !== 0) {
                    child = tree.postorder(child);
                    var childAngle = angle[child];
                    if (childAngle > biggestCAngle) {
                        biggestCAngle = childAngle;
                    }
                    if (childAngle < smallestChildAngle) {
                        smallestChildAngle = childAngle;
                    }
                    child = tree.nsibling(tree.postorderselect(child));
                }
                // Position the arc start point at the biggest child angle
                // position
                currRadius = radius[i];
                arcx0[i] = currRadius * Math.cos(biggestCAngle);
                arcy0[i] = currRadius * Math.sin(biggestCAngle);
                if (normalize) {
                    arcx0[i] *= scaleFactor;
                    arcy0[i] *= scaleFactor;
                }
                arcStartAngle[i] = biggestCAngle;
                arcEndAngle[i] = smallestChildAngle;
            }
        }

        // We don't need to reposition coordinates relative to the root because
        // the root is already at (0, 0) :)

        return {
            x0: x0,
            y0: y0,
            x1: x1,
            y1: y1,
            angle: angle,
            arcx0: arcx0,
            arcy0: arcy0,
            arcStartAngle: arcStartAngle,
            arcEndAngle: arcEndAngle,
        };
    }

    /**
     * Returns true if a given node (a.k.a. branch) in the tree has a
     * transformed length differing from its original length.
     *
     * @param {Float} branchLen Transformed length of the branch.
     * @param {BPTree} tree That has (potentially) been transformed.
     * @param {Number} n Node index in tree.
     * @returns {Boolean} Indicates if this branch's transformed length is
     *                    different from its original length.
     */
    function isTransformedLenDifferent(branchLen, tree, n) {
        return Math.abs(tree.length(n) / branchLen - 1) > TOL;
    }

    /**
     * Unrooted layout.
     *
     * REFERENCES
     * ----------
     * https://github.com/biocore/gneiss/blob/master/gneiss/plot/_dendrogram.py
     *
     * @param {BPTree} tree The tree to generate the coordinates for.
     * @param {Float} width Width of the canvas where the tree will be
     *                      displayed.
     * @param {Float} height Height of the canvas where the tree will be
     *                       displayed.
     * @param {Boolean} normalize If true, then the tree will be scaled up to
     *                            fill the bounds of width and height.
     * @param {Function} lengthGetter Is a function that takes a single argument
     *                                that corresponds to the index of a node in
     *                                tree. Returns the length of the node at that
     *                                index. Defaults to 'normal' method.
     * @param {Boolean} checkLengthsChange If true, then a warning will be raised
     *                                     if no branch lengths in the tree differ
     *                                     from the value determined by lengthGetter.
     * @return {Object} Object with the following properties:
     *                   -xCoords
     *                   -yCoords
     *                  Each of these properties maps to an Array where data for
     *                  each node is stored in postorder.
     */
    function unrootedLayout(
        tree,
        width,
        height,
        normalize = true,
        lengthGetter = null,
        checkLengthsChange = false
    ) {
        var da = (2 * Math.PI) / tree.numleaves();
        var x1Arr = new Array(tree.size + 1);
        var x2Arr = new Array(tree.size + 1).fill(0);
        var y1Arr = new Array(tree.size + 1);
        var y2Arr = new Array(tree.size + 1).fill(0);
        var aArr = new Array(tree.size + 1);
        if (lengthGetter === null) {
            lengthGetter = getLengthMethod("normal", tree);
        }

        var n = tree.postorderselect(tree.size);
        var x1, y1, a;
        // Position the root at (0, 0) and ignore any length it might
        // ostensibly have in the tree:
        // https://github.com/biocore/empress/issues/374
        x1Arr[tree.size] = 0;
        x2Arr[tree.size] = 0;
        y1Arr[tree.size] = 0;
        y2Arr[tree.size] = 0;
        aArr[tree.size] = 0;
        var maxX = x2Arr[tree.size],
            minX = x2Arr[tree.size];
        var maxY = y2Arr[tree.size],
            minY = y2Arr[tree.size];

        var anyDifferent = false;
        // reverse postorder
        for (var node = tree.size - 1; node > 0; node--) {
            var parent = tree.postorder(
                tree.parent(tree.postorderselect(node))
            );
            x1 = x2Arr[parent];
            y1 = y2Arr[parent];
            a = aArr[parent] - (tree.getNumTips(parent) * da) / 2;
            var sib = tree.postorder(tree.fchild(tree.postorderselect(parent)));
            while (sib !== node) {
                a += tree.getNumTips(sib) * da;
                sib = tree.postorder(tree.nsibling(tree.postorderselect(sib)));
            }
            a += (tree.getNumTips(node) * da) / 2;

            n = tree.postorderselect(node);
            var nodeLen = lengthGetter(n);
            x2 = x1 + nodeLen * Math.sin(a);
            y2 = y1 + nodeLen * Math.cos(a);
            x1Arr[node] = x1;
            x2Arr[node] = x2;
            y1Arr[node] = y1;
            y2Arr[node] = y2;
            aArr[node] = a;

            maxX = Math.max(maxX, x2Arr[node]);
            minX = Math.min(minX, x2Arr[node]);
            maxY = Math.max(maxY, y2Arr[node]);
            minY = Math.min(minY, y2Arr[node]);
            if (checkLengthsChange && !anyDifferent) {
                anyDifferent = isTransformedLenDifferent(nodeLen, tree, n);
            }
        }
        if (checkLengthsChange && !anyDifferent) {
            noLengthsChangedMsg();
        }
        if (normalize) {
            var scaleFactor = computeScaleFactor(
                width,
                height,
                minX,
                maxX,
                minY,
                maxY
            );
            // skip the first element since the tree is zero-indexed
            for (var i = 1; i <= tree.size - 1; i++) {
                x2Arr[i] *= scaleFactor;
                y2Arr[i] *= scaleFactor;
            }
        }
        // Don't need to reposition coordinates relative to the root because
        // the root is already at (0, 0)

        return { xCoord: x2Arr, yCoord: y2Arr };
    }

    return {
        getLengthMethod: getLengthMethod,
        getPostOrderNodes: getPostOrderNodes,
        getUltrametricLengths: getUltrametricLengths,
        shouldCheckBranchLengthsChanged: shouldCheckBranchLengthsChanged,
        computeScaleFactor: computeScaleFactor,
        rectangularLayout: rectangularLayout,
        circularLayout: circularLayout,
        unrootedLayout: unrootedLayout,
    };
});
