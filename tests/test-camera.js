require(["jquery", "Camera", "glMatrix"], function ($, Camera, gl) {
    $(document).ready(function () {
        // variables shared across all tests
        var initPos;
        var lookDir;
        var upDir;
        var cam;

        // Setup test variables
        module("Camera", {
            setup: function () {
                initPos = gl.vec3.fromValues(0, 0, 10);
                lookDir = gl.vec3.fromValues(0, 0, 0);
                upDir = gl.vec3.fromValues(0, 0, 1);
                // cam = new Camera(initPos, lookDir, upDir);
                cam = new Camera();
            },

            teardown: function () {
                initPos = null;
                lookDir = null;
                upDir = null;
                cam = null;
            },
        });

        test("Test getViewMat()", function () {
            cam.placeCamera(initPos, lookDir, upDir);
            var viewMat = gl.mat4.create();
            gl.mat4.lookAt(viewMat, initPos, lookDir, upDir);
            deepEqual(cam.getViewMat(), viewMat, "Test: getViewMmat()");
        });

        test("Test moveCam()", function () {
            cam.placeCamera(initPos, lookDir, upDir);
            // translate initPos and lookDir
            var translation = gl.vec3.fromValues(1, 1, 0);
            var transMat = gl.mat4.create();
            gl.mat4.fromTranslation(transMat, translation);

            var p = gl.vec4.fromValues(initPos[0], initPos[1], initPos[2], 1);
            var l = gl.vec4.fromValues(lookDir[0], lookDir[1], lookDir[2], 1);
            gl.vec4.transformMat4(p, p, transMat);
            gl.vec4.transformMat4(l, l, transMat);

            // save expected pos and lookDir
            p = gl.vec3.fromValues(p[0], p[1], p[2]);
            l = gl.vec3.fromValues(l[0], l[1], l[2]);

            // move the camera
            cam.moveCam(translation);

            deepEqual(cam.pos_, p, "Test: cam pos translation");
            deepEqual(cam.lookDir_, l, "Test: cam lookDir translation");
        });

        test("Test zoom()", function () {
            cam.placeCamera(initPos, lookDir, upDir);
            // move camera 5 units forward
            var x = 5;
            initPos[2] = initPos[2] - x;
            cam.zoom(x);
            deepEqual(cam.pos_, initPos, "Test: move camera 5 units in");

            // try moving camera past (0,0)
            x = 100;
            cam.zoom(x);

            // camera should be at same locaiton
            deepEqual(cam.pos_, initPos, "Test: move past (0,0");
        });

        test("Test placeCamera()", function () {
            var newPos = gl.vec3.fromValues(10, 10, 10);
            var newLook = gl.vec3.fromValues(10, 10, 0);
            var newUp = gl.vec3.fromValues(0, 0, 2);
            cam.placeCamera(newPos, newLook, newUp);
            deepEqual(cam.pos_, newPos, "Test: set postion");
            deepEqual(cam.lookDir_, newLook, "Test: set look direction");
            deepEqual(cam.upDir_, newUp, "Test: set up direction");
        });
    });
});
