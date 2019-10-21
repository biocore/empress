/** @module vector utility-functions */
define([], function() {
    /**
     * Finds the angle of vector w.r.t the x-axis
     *
     * @param {Array} point - the point to find the angle for
     *
     * @return {Object}
     */
    function getAngle(point) {
        var x = point[0],
            y = point[1];
        var cos = x / Math.sqrt(x * x + y * y);
        var sin = Math.sqrt(1 - cos * cos);

        return {
            cos: cos,
            sin: sin
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
     * @param {Number} angle The amount to rotate the vector
     * @param {Boolean} over if true rotate point in positve sine direction
     *                       if false rotate point in negative sine direction
     *
     * @return {Array}
     */
    function rotate(point, angle, over) {
        var cos = angle.cos;
        var sin = angle.sin;
        var x = point[0];
        var y = point[1];

        // rotate the point in the negative sine direction (i.e. beneath x axis)
        if (over) {
            sin = -1 * sin;
        }

        x = point[0];
        y = point[1];

        point[0] = cos * x + -1 * sin * y;
        point[1] = sin * x + cos * y;

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

    return {
        getAngle: getAngle,
        magnitude: magnitude,
        rotate: rotate,
        translate: translate
    };
});
