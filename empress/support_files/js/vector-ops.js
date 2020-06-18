/** @module vector utility-functions */
define([], function () {
    /**
     * Finds the cos and sin of the angle of vector w.r.t the x-axis
     *
     * @param {Array} point - the point to find the angle for
     *
     * @return {Object}
     */
    function getAngle(point) {
        var x = point[0],
            y = point[1];
        var cos = x / Math.sqrt(x * x + y * y);

        // Note: This will always result in the abs(sin). Thus, if the y
        //       component is negative then we have to multiple sin by -1
        var sin = Math.sqrt(1 - cos * cos);
        if (y < 0) sin = -1 * sin;

        return {
            cos: cos,
            sin: sin,
        };
    }

    /**
     * Finds the magnitude of the vector
     *
     * @param {Array} point - the vector to find the magnitude of
     *
     * @return {Number}
     */
    function magnitude(point) {
        var x = point[0],
            y = point[1];
        return Math.sqrt(x * x + y * y);
    }

    /**
     * Rotates the vector
     *
     * @param {Array} point (x, y) coordinates
     * @param {Object} angle The amount to rotate the vector
     *                       if theta is the rotating amount, then angle
     *                       is defined as {"cos": cos(theta),
                                            "sin": sin(theta)}
     * @param {Boolean} over if true rotate point in positve sine direction
     *                       if false rotate point in negative sine direction
     *
     * @return {Array}
     */
    function rotate(point, angle) {
        var cos = angle.cos;
        var sin = angle.sin;
        var x = point[0];
        var y = point[1];

        point[0] = x * cos + -1 * y * sin;
        point[1] = x * sin + y * cos;

        return point;
    }

    /**
     * Translates the vector
     *
     * @param {Number} x - the amount to move along x-axis
     * @param {Number} y - the amount to move along y-axis
     *
     * @return {Array}
     */
    function translate(point, x, y) {
        point[0] = point[0] + x;
        point[1] = point[1] + y;
        return point;
    }

    /**
     * Returns an Object describing the top-left, top-right, bottom-left, and
     * bottom-right coordinates of a "thick line" box connecting two points
     * specified by (x1, y1) and (x2, y2).
     *
     * The output object from this function is directly passable into
     * Empress._addTriangleCoords() as the corners parameter, for reference.
     *
     * @param {Number} x1
     * @param {Number} y1
     * @param {Number} x2
     * @param {Number} y2
     * @param {Number} amount - Thickness of the box to be drawn
     *
     * @return {Object} corners - Contains keys tL, tR, bL, bR
     */
    function computeBoxCorners(x1, y1, x2, y2, amount) {
        // // center line so that it starts at (0,0)
        // var mag1 = magnitude([x1, y1),
        //     mag2 = magnitude([x2,y2]),
        //     point;
        // if (mag1 > mag2) {
        //     point = translate([])
        // }
        var point = translate([x2, y2], -1 * x1, -1 * y1);

        // find angle/length of branch
        var angle = getAngle(point);
        var length = magnitude(point);

        // find top left of box
        bL = [0, amount];
        bL = rotate(bL, angle);
        bL = translate(bL, x1, y1);

        // find top right of box
        bR = [0, -1 * amount];
        bR = rotate(bR, angle);
        bR = translate(bR, x1, y1);

        // find bottom left of box
        tL = [length, amount];
        tL = rotate(tL, angle);
        tL = translate(tL, x1, y1);

        //f find bottom right of box
        tR = [length, -1 * amount];
        tR = rotate(tR, angle);
        tR = translate(tR, x1, y1);

        return { tL: tL, tR: tR, bL: bL, bR: bR };
    }

    return {
        getAngle: getAngle,
        magnitude: magnitude,
        rotate: rotate,
        translate: translate,
        computeBoxCorners,
    };
});
