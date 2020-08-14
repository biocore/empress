define(["underscore", "VectorOps", "util"], function (_, VectorOps, util) {
    /**
     *
     */
    function centerAtRoot(xCoords, yCoords) {
        var size = xCoords.length;
        var rX = xCoords[size - 1];
        var rY = yCoords[size - 1];

        // skip the first element since the tree is zero-indexed
        for (i = 1; i <= size - 1; i++) {
            xCoords[i] -= rX;
            yCoords[i] -= rY;
        }
    };

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
     * @return {Object} Object with xCoords and yCoords properties where the
     *                  node coordinates are stored in postorder.
     */
    function rectangularLayout(tree, width, height) {
        // NOTE: This doesn't draw a horizontal line leading to the root "node"
        // of the graph. See https://github.com/biocore/empress/issues/141 for
        // context.

        var maxWidth = 0;
        var maxHeight = 0;
        var prevY = 0;
        var xCoord = new Array(tree.size + 1).fill(0);
        var yCoord = new Array(tree.size + 1).fill(0);

        // postorder
        for (var i = 1; i <= tree.size; i++) {
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

        // iterates in preorder
        for (i = 2; i <= tree.size; i++) {
            var node = tree.postorder(tree.preorderselect(i));
            var parent = tree.postorder(tree.parent(tree.preorderselect(i)));

            xCoord[node] = xCoord[parent] + tree.lengths_[i];
            if (maxWidth < xCoord[node]) {
                maxWidth = xCoord[node];
            }
        }

        // We don't check if max_width == 0 here, because we check when
        // constructing an Empress tree that it has at least one positive
        // branch length and no negative branch lengths. (And if this is the
        // case, then max_width must be > 0.)
        var xScalingFactor = width / maxWidth;

        // Since this will be multiplied by 0 for every node, we can set
        // this to any real number and get the intended "effect" of keeping
        // every node's y-coordinate at 0.
        var yScalingFactor = 1;

        // Having a max_height of 0 could actually happen, in the funky case
        // where the entire tree is a straight line (e.g. A -> B -> C). In
        // this case our "rectangular layout" drawing places all nodes on
        // the same y-coordinate (0), resulting in max_height = 0.
        // ... So, that's why we only do y-scaling if this *isn't* the case.
        if (maxHeight > 0) {
            yScalingFactor = height / maxHeight;
        }

        for (i = 1; i <= tree.size; i++) {
            xCoord[i] *= xScalingFactor;
            yCoord[i] *= yScalingFactor;
        }

        centerAtRoot(xCoord, yCoord);

        // We draw each internal node as a vertical line ranging from its
        // lowest child y-position to its highest child y-position, and then
        // draw horizontal lines from this line to all of its child nodes
        // (where the length of the horizontal line is proportional to the node
        // length in question).
        return { xCoord: xCoord, yCoord: yCoord };
    }

    function unrootedLayout(tree, width, height) {
        var angle = (2*Math.PI) / tree.numleaves();
        var x1Arr = new Array(tree.size + 1);
        var x2Arr = new Array(tree.size +1);
        var y1Arr = new Array(tree.size +1);
        var y2Arr = new Array(tree.size +1);
        var aArr = new Array(tree.size +1);

        var n = tree.preorder(tree.postorderselect(tree.size));
        var x1 = 0, y1 = 0, a = 0, da = angle;
        var x2 = x1 + tree.lengths_[n] * Math.sin(a);
        var y2 = y1 + tree.lengths_[n] * Math.cos(a);
        x1Arr[tree.size] = x1;
        x2Arr[tree.size] = x2;
        y1Arr[tree.size] = y1;
        y2Arr[tree.size] = y2;
        aArr[tree.size] = a;

        // reverse postorder
        for (var node = tree.size - 1; node > 0; node--) {
            var parent = tree.postorder(
                tree.parent(tree.postorderselect(node))
            );
            x1 = x2Arr[parent];
            y1 = y2Arr[parent];
            a = aArr[parent] - tree.getNumTips(parent) * da / 2;
            var sib = tree.postorder(
                tree.fchild(tree.postorderselect(parent))
            );
            while (sib !== node) {
                a += (tree.getNumTips(sib) * da);
                sib = tree.postorder(
                    tree.nsibling(tree.postorderselect(sib))
                );
            }
            a += ((tree.getNumTips(node) * da) / 2)

            n = tree.preorder(tree.postorderselect(node));
            x2 = x1 + tree.lengths_[n] * Math.sin(a);
            y2 = y1 + tree.lengths_[n] * Math.cos(a);
            x1Arr[node] = x1;
            x2Arr[node] = x2;
            y1Arr[node] = y1;
            y2Arr[node] = y2;
            aArr[node] = a;
        }

        centerAtRoot(x2Arr, y2Arr);

        return {xCoord: x2Arr, yCoord: y2Arr};
    };

    return {
        rectangularLayout: rectangularLayout,
        unrootedLayout: unrootedLayout,
    };
});
