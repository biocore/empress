require(["jquery", "VectorOps"], function ($, VectorOps) {
    $(document).ready(function () {
        // Setup test variables
        module("VectorOps", {
            setup: function () {},

            teardown: function () {},
        });

        // tests the constructor of bp tree
        test("Test getAngle", function () {
            // point on the positive x-axis
            deepEqual(VectorOps.getAngle([1, 0]), { cos: 1, sin: 0 });
            deepEqual(VectorOps.getAngle([100, 0]), { cos: 1, sin: 0 });

            //point on the negative x-axis
            deepEqual(VectorOps.getAngle([-1, 0]), { cos: -1, sin: 0 });

            // point on the positive y-axis
            deepEqual(VectorOps.getAngle([0, 1]), { cos: 0, sin: 1 });

            // point on the negative y-axis
            deepEqual(VectorOps.getAngle([0, -1]), { cos: 0, sin: -1 });

            // arbitrary point
            var angle = VectorOps.getAngle([1, 1]);
            ok(Math.abs(angle.cos - Math.sqrt(2) / 2 < 1.0e-15));
            ok(Math.abs(angle.sin - Math.sqrt(2) / 2 < 1.0e-15));

            // arbitrary point
            angle = VectorOps.getAngle([(-5 * Math.sqrt(3)) / 2, -5 / 2]);
            ok(Math.abs(angle.cos - (-1 * Math.sqrt(3)) / 2) < 1.0e-15);
            // prettier-ignore
            ok(Math.abs(angle.sin - (-1 / 2)) < 1.0e-15);
        });

        test("Test magnitude", function () {
            equal(VectorOps.magnitude([0, 0]), 0);
            equal(VectorOps.magnitude([1, 1]), Math.sqrt(2));
            equal(VectorOps.magnitude([1, -1]), Math.sqrt(2));
            equal(VectorOps.magnitude([-5, -2]), Math.sqrt(29));
        });

        test("Test rotate", function () {
            // rotate [0,1] by 0 or 360 degrees
            deepEqual(VectorOps.rotate([0, 1], { cos: 1, sin: 0 }), [0, 1]);

            // rotate [-1, -1] by 90 degress
            deepEqual(VectorOps.rotate([-1, -1], { cos: 0, sin: 1 }), [1, -1]);

            // rotate [1,1] by 240 degrees
            var angle = {
                cos: -1 / 2,
                sin: (-1 * Math.sqrt(3)) / 2,
            };
            var rPoint = VectorOps.rotate([1, 1], angle);
            ok(Math.abs(rPoint[0] - 0.3660254037844386) < 1.0e-15);
            // prettier-ignore
            ok(Math.abs(rPoint[1] - (-1.3660254037844386)) < 1.0e-15);
        });

        test("Test translate", function () {
            deepEqual(VectorOps.translate([0, 0], 1, 2), [1, 2]);
            deepEqual(VectorOps.translate([1, 2], -1, -2), [0, 0]);
        });

        test("Test computeBoxCorners", function () {
            var box = VectorOps.computeBoxCorners(-2, 0, 3, 0, 2);
            deepEqual(box, {
                bL: [-2, 2],
                bR: [-2, -2],
                tL: [3, 2],
                tR: [3, -2],
            });

            box = VectorOps.computeBoxCorners(0, -2, 0, 3, 2);
            deepEqual(box, {
                bL: [-2, -2],
                bR: [2, -2],
                tL: [-2, 3],
                tR: [2, 3],
            });
        });

        test("Test triangleArea", function () {
            // these three tests use the same triangle but each test will
            // move/rotate the triangle.
            equal(VectorOps.triangleArea([0, 0], [20, 0], [0, 12]), 120);
            equal(VectorOps.triangleArea([0, 0], [-20, 0], [0, -12]), 120);
            equal(VectorOps.triangleArea([1, -1], [-19, -1], [1, -13]), 120);

            equal(
                VectorOps.triangleArea([0, 0], [0, 0], [0, 12]),
                0,
                "Area of a line should be zero"
            );

            equal(
                VectorOps.triangleArea([0, 12], [0, 12], [0, 12]),
                0,
                "Area of a point should be zero"
            );
        });
    });
});
