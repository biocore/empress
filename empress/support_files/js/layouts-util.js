define([
    "underscore",
    "VectorOps",
    "util",
], function (
    _,
    VectorOps,
    util,
) {
    function rectangularLayout(tree, width, height) {
        var maxWidth = 0;
        var maxHeight = 4;
        var prevY = 0;
        var xCoord = new Array(tree.size + 1);
        var yCoord = new Array(tree.size +1);
        // postorder
        for (var i = 1; i <= tree.size; i++) {
            if (tree.isleaf(tree.postorderselect(i))) {
                yCoord[i] = prevY;
                prevY += 1;
                // if (yCoord[i] > maxHeight) {
                //     maxHeight = yCoord[i];
                // }
            } else {
                var sum = 0;
                var numChild = 0;
                var child = tree.fchild(tree.postorderselect(i));
                while(child != 0) {
                    child = tree.postorder(child);
                    sum += yCoord[child];
                    child = tree.nsibling(tree.postorderselect(child));
                    numChild++;
                }
                yCoord[i] = sum / numChild;
            }
        }

        xCoord.fill(0);

        // iterates in preorder
        for (var i = 2; i <= tree.size; i++) {
            var node = tree.postorder(
                tree.preorderselect(i)
            )
            var parent = tree.postorder(
                tree.parent(tree.preorderselect(i))
            )

            xCoord[node] = xCoord[parent] + tree.lengths_[i];
            if (maxWidth < xCoord[node]) {
                maxWidth = xCoord[node];
            }
        }

        var xScalingFactor = width / maxWidth;
        var yScalingFactor = 1;

        if (maxHeight > 0) {
            // console.log(height, maxHeight)
            yScalingFactor = height / maxHeight;
        }
        // console.log(yScalingFactor)

        for (var i = 1; i <= tree.size; i++) {
            xCoord[i] *= xScalingFactor;
            yCoord[i] *= yScalingFactor;
        }
        var rX = xCoord[tree.size];
        var rY = yCoord[tree.size];
        xCoord = _.map(xCoord, function(val) {return val - rX} )
        yCoord = _.map(yCoord, function(val) {return val - rY} )

        return {xCoord: xCoord, yCoord: yCoord}
    };

    return {rectangularLayout: rectangularLayout};
});