define([], function() {

    /**
     * @class VectorOps
     * Class functions for vector operations used in empress
     */
    function VectorOps() { };

    /**
     * Finds the angle of vector w.r.t the x-axis
     *
     * @param {Array} point - the point to find the angle for
     *
     * @return {Dictionary}
     */
    VectorOps.getAngle = function(point) {
        var x = point[0], y = point[1];
        var cos = (x) / Math.sqrt(x*x + y*y);
        var sin = Math.sqrt(1 - cos*cos);

        return {
            'cos' : cos,
            'sin' : sin
        };
    };

    /**
     * Finds the magnitude of the vector
     *
     * @param {Array} point - the vector to find the magnitude of
     *
     * @return {Number}
     */
    VectorOps.getLength = function(point) {
        var x = point[0], y = point[1];
        return Math.sqrt(x*x + y*y);
    };

    /**
     * Rotates the vector
     *
     * @param {Number} angle - the amount to rotate the vector
     *
     * @return {Array}
     */
    VectorOps.rotate = function(angle, point, over) {
        var cos = angle['cos'];
        var sin = angle['sin'];
        var x = point[0];
        var y = point[1];

        // rotate an additional pi radians or 3/2 pi radians
        if (over) {
            sin = -1*sin;
        }

        x = point[0];
        y = point[1];

        point[0] = cos*x + -1*sin*y;
        point[1] = sin*x + cos*y;

        return point;
    };

    /**
     * Translates the vector
     *
     * @param {Number} x - the amount to move along x-axis
     * @param {Number} y - the amount to move along y-axis
     *
     * @return {Array}
     */
    VectorOps.translate = function(point, x, y) {
        point[0] = point[0] + x;
        point[1] = point[1] + y;
        return point;
    }


    return VectorOps;
});