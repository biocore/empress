require(['jquery', 'camera', 'glMatrix'], function($, Camera, gl) {
    $(document).ready(function() {

        // variables shared across all tests
        var initPos;
        var lookDir;
        var upDir;
        var cam;

        // Setup test variables
        module('Camera', {
            setup : function() {
                initPos = gl.vec3.fromValues(0, 0, 10);
                lookDir = gl.vec3.fromValues(0, 0, 0);
                upDir = gl.vec3.fromValues(0, 0, 1);
                cam = new Camera(initPos, lookDir, upDir);
            },

            teardown : function() {
                initPos = null;
                lookDir = null;
                upDir = null;
                cam = null;
            }
        });

        test('Test constructor', function() {
            deepEqual(cam.pos_, initPos, 'Test: cam init pos');
            deepEqual(cam.lookDir_, lookDir, 'Test: cam init lookDir');
            deepEqual(cam.upDir_, upDir, 'Test: Cam init upDir');
        });

        test('Test getViewMat()', function() {
            var viewMat = gl.mat4.create();
            gl.mat4.lookAt(viewMat, initPos, lookDir, upDir);
            deepEqual(cam.getViewMat(), viewMat, 'Test: getViewMmat()');
        });

        test('Test moveCam()', function() {
            // translate initPos and lookDir
            var translation = gl.vec3.fromValues(1,1, 0);
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
    });
});