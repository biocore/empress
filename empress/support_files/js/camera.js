define(["glMatrix"], function (gl) {
    /**
     *
     * @class Camera
     *
     * Camera is used to control the zoom level of the canvas. It also provides
     * the perspective of the canvas as well.
     *
     * @param {vec3} initPos The initial position of the camera
     * @param {vec3} lookDir The direction the camera will face
     * @param {vec3} upDir The direction the camera will treat as the "y-axis"
     *
     * @return {Camera}
     * constructs Camera
     */
    function Camera() {
        // The inital setup of the camera
        this.pos_ = null;
        this.lookDir_ = null;
        this.upDir_ = null;

        // Set the initial perspective of camera
        var fov = {
            upDegrees: 45,
            downDegrees: 45,
            leftDegrees: 45,
            rightDegrees: 45,
        };

        // create perspective matrix
        // Note: this can be modified to create fish eye effect
        this.projMat = gl.mat4.create();
        gl.mat4.perspectiveFromFieldOfView(this.projMat, fov, 0.1, -10);
    }

    /**
     * Creates a view matrix based on camera pos, lookDir, and upDir
     *
     * @return {mat4}
     */
    Camera.prototype.getViewMat = function () {
        var viewMat = gl.mat4.create();
        gl.mat4.lookAt(viewMat, this.pos_, this.lookDir_, this.upDir_);
        return viewMat;
    };

    /**
     * Moves the camera in the x-y plane
     *
     * @param {vec3} translation - A vector that describes how much to move cam
     *    along the x and y axis. This will modify pos and lookDir.
     *    Note: translation[2] be set to zero.
     */
    Camera.prototype.moveCam = function (translation) {
        // set z-axis to 0
        translation[2] = 0;

        // create the transformation matrix
        var transMat = gl.mat4.create();
        gl.mat4.fromTranslation(transMat, translation);

        // perform the transformation
        // Note: Need to use homogenous coordinates to perform translation
        //       with a single matrix
        var pos = gl.vec4.fromValues(
            this.pos_[0],
            this.pos_[1],
            this.pos_[2],
            1
        );
        var look = gl.vec4.fromValues(
            this.lookDir_[0],
            this.lookDir_[1],
            this.lookDir_[2],
            1
        );
        gl.vec4.transformMat4(pos, pos, transMat);
        gl.vec4.transformMat4(look, look, transMat);

        // save the new pos and lookDir
        this.pos_ = gl.vec3.fromValues(pos[0], pos[1], pos[2]);
        this.lookDir_ = gl.vec3.fromValues(look[0], look[1], look[2]);
    };

    /**
     * Moves the camera forward or backwards along the z-axis.
     *
     * @param{Number} x How many units to move camera along the z-axis. Positive
     *                x will zoom in, negative x will zoom out. Any x that
     *                would cause the cameras z coordinate to be negative will
     *                be ignored.
     */
    Camera.prototype.zoom = function (x) {
        // multiply by -1 so that a positive x will zoom the camera in
        x = -1 * x;

        this.pos_[2] = this.pos_[2] + x > 0 ? this.pos_[2] + x : this.pos_[2];
        this.lookDir_[2] =
            this.pos_[2] + x > 0 ? this.lookDir_[2] + x : this.lookDir_[2];
    };

    /**
     * Moves the camera to an exact location
     *
     * @param {vec3} pos The new position of the camera
     * @param {vec3} lookDir Where the camera will be looking
     * @param {vec3} upDir What direction the camera considers up
     */
    Camera.prototype.placeCamera = function (
        pos,
        lookDir = null,
        upDir = null
    ) {
        this.pos_ = pos;
        if (lookDir !== null) this.lookDir_ = lookDir;
        if (upDir !== null) this.upDir_ = upDir;
    };

    return Camera;
});
