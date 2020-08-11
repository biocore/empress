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
        var maxHeight = 0;
        var prevY = 0;
        var xCoord = new Array(tree.size + 1);
        var yCoord = new Array(tree.size +1);
        // postorder
        for (var i = 1; i <= tree.size; i++) {
            if (tree.isleaf(tree.postorderselect(i))) {
                yCoord[i] = prevY;
                prevY += 1;
                if (yCoord[i] > maxHeight) {
                    maxHeight = yCoord[i];
                }
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
            yScalingFactor = height / maxHeight;
        }

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

    function unrootedLayout(tree, width, height) {
        var angle = (2*Math.PI) / tree.numleaves();
        var updateArgs = {
            s: 1.0,
            x1: 0.0,
            y1: 0.0,
            a: 0.0,
            da: angle,
        };
        var bestArgs = {
            s : Number.NEGATIVE_INFINITY,
            da: angle,
        };
        var x1Arr = new Array(tree.size + 1);
        var x2Arr = new Array(tree.size +1);
        var y1Arr = new Array(tree.size +1);
        var y2Arr = new Array(tree.size +1);
        var aArr = new Array(tree.size +1);


        var updateCoords = function(args) {
            var maxX = Number.NEGATIVE_INFINITY;
            var minX = Number.POSITIVE_INFINITY;
            var maxY = Number.NEGATIVE_INFINITY;
            var minY = Number.POSITIVE_INFINITY;

            var getStep = function(node, a) {
                node = tree.preorder(tree.postorderselect(node));
                return tree.lengths_[node] * args.s * a;
            }
            var setArrs = function(node, _x1, _x2, _y1, _y2, _a) {
                x1Arr[node] = _x1;
                x2Arr[node] = _x2;
                y1Arr[node] = _y1;
                y2Arr[node] = _y2;
                aArr[node] = _a;
            }

            var x2 = args.x1 + getStep(tree.size, Math.sin(args.a));
            var y2 = args.y1 + getStep(tree.size, Math.cos(args.a));
            setArrs(tree.size, args.x1, x2, args.y1, y2, args.a)

            // reverse postorder
            for (var node = tree.size - 1; node > 0; node--) {
                var parent = tree.postorder(
                    tree.parent(tree.postorderselect(node))
                );
                var x1 = x2Arr[parent];
                var y1 = y2Arr[parent];
                var a = aArr[parent] - tree.findTips(parent).length * args.da / 2;
                var sib = tree.postorder(
                    tree.fchild(tree.postorderselect(parent))
                );
                while (sib !== 0) {
                    if (sib !== node) {
                        a += (tree.findTips(sib).length * args.da);
                    } else {
                        a += ((tree.findTips(node).length * args.da) / 2)
                        break;
                    }
                    sib = tree.postorder(
                        tree.nsibling(tree.postorderselect(sib))
                    );
                }

                x2 = x1 + getStep(node, Math.sin(a));
                y2 = y1 + getStep(node, Math.cos(a));
                setArrs(node, x1, x2, y1, y2, a);
                maxX = Math.max(maxX, x2);
                minX = Math.min(minX, x2);
                maxY = Math.max(maxY, y2);
                minY = Math.min(minY, y2);
            }

            return {
                maxX: maxX,
                minX: minX,
                maxY: maxY,
                minY: minY,
            }

        };


        for (var i = 0; i < 60; i++) {
            updateArgs.a = (i / 60.0) * Math.PI;
            var update = updateCoords(updateArgs);

            var xDiff = update.maxX - update.minX;
            var widthMin = 0;
            if (xDiff !== 0) {
                widthMin = width / xDiff;
            }

            var yDiff = update.maxY - update.minY;
            var heightMin = 0;
            if (yDiff !== 0) {
                heightMin = height / yDiff;
            }

            var scale = Math.min(widthMin, heightMin) * 0.95;
            if (scale >= bestArgs.s) {
                bestArgs.s = scale;
                bestArgs.x1 = (width / 2) - ((update.maxX + update.minX) / 2) * scale;
                bestArgs.y1 = height / 2 - ((update.maxY + update.minY) / 2) * scale;
                bestArgs.a = updateArgs.a;
            }
        }
        updateCoords(bestArgs);

        var rX = x2Arr[tree.size];
        var rY = y2Arr[tree.size];
        for (var i = 1; i <= tree.size; i++) {
            x2Arr[i] -= rX;
            y2Arr[i] -= rY;
        }

        return {xCoord: x2Arr, yCoord: y2Arr};
    };

    return {
        rectangularLayout: rectangularLayout,
        unrootedLayout: unrootedLayout,
    };
});