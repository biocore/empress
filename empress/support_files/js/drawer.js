define(["glMatrix", "Camera"], function (gl, Camera) {
    //  Shaders used in Drawer
    var vertShaderTxt = [
        "precision mediump float;",
        "",
        "attribute vec2 vertPosition;",
        "uniform mat4 mvpMat;",
        "attribute vec3 color;",
        "varying vec3 c;",
        "uniform float pointSize;",
        "",
        "void main()",
        "{",
        "  c = color;",
        "  gl_Position = mvpMat * vec4(vertPosition, 0.0, 1.0);",
        "  gl_PointSize = pointSize;",
        "}",
    ].join("\n");
    var fragShaderTxt = [
        "precision mediump float;",
        "varying vec3 c;",
        "uniform int isSingle;",
        "",
        "void main()",
        "{",
        "float r = 0.0;",
        "vec2 cxy = 2.0 * gl_PointCoord - 1.0;",
        "r = dot(cxy, cxy);",
        "if (r > 1.0 && isSingle == 1) {",
        "   discard;",
        "}",
        "  gl_FragColor = vec4(c,1);",
        "}",
    ].join("\n");

    /**
     * @class Drawer
     *
     * Creates a drawer that is capable of drawing all necessary components in
     * an empress tree.
     *
     * @param {canvas} The canvas that Drawer will draw on
     * @param {Camera} The camera used in Drawer
     *
     * @return {Drawer}
     * constructs Drawer
     */
    function Drawer(canvas, cam) {
        this.canvas = canvas;
        this.treeContainer = document.getElementById("tree-container");
        this.contex_ = canvas.getContext("webgl");
        this.cam = cam;
        this.VERTEX_SIZE = 5;

        // sets empress to light mode
        this.CLR_COL = 1;

        // the center of the viewing window in tree coordinates
        this.treeSpaceCenterX = null;
        this.treeSpaceCenterY = null;

        // the dimension of the canvas
        this.dim = null;

        this.showTreeNodes = true;
    }

    /**
     * Compliles the shaders and sets up the necessary array buffers.
     */
    Drawer.prototype.initialize = function () {
        // shorten name, will be using this frequently
        var c = this.contex_;

        //Sets the size of canvas to be equal to the width of the window.
        this.setCanvasSize();

        // Check if browser supports webGL
        if (!c) {
            alert("Your browser does not support WebGL");
            return;
        }

        // initialze canvas to have fully white background
        c.clearColor(this.CLR_COL, this.CLR_COL, this.CLR_COL, 1);
        c.clear(c.COLOR_BUFFER_BIT | c.DEPTH_BUFFER_BIT);

        // create webGL program
        this.sProg_ = this.createShaderProgram(vertShaderTxt, fragShaderTxt);

        // again shorten var name
        var s = this.sProg_;
        c.useProgram(s);

        // store references to the vertex and color attributes in the shaders
        s.vertPosition = c.getAttribLocation(s, "vertPosition");
        c.enableVertexAttribArray(s.vertPosition);
        s.color = c.getAttribLocation(s, "color");
        c.enableVertexAttribArray(s.color);

        // store references to the matrix uniforms
        s.mvpMat = c.getUniformLocation(s, "mvpMat");
        s.isSingle = c.getUniformLocation(s, "isSingle");
        s.pointSize = c.getUniformLocation(s, "pointSize");

        // buffer object for tree
        s.treeVertBuff = c.createBuffer();
        this.treeVertSize = 0;

        // buffer object used to thicken sampleLines
        s.sampleThickBuff = c.createBuffer();
        this.sampleThickSize = 0;

        // buffer object for tree nodes
        s.nodeVertBuff = c.createBuffer();

        // buffer object for active 'selected' node
        s.selectedNodeBuff = c.createBuffer();

        // buffer object for colored clades
        s.cladeBuff = c.createBuffer();

        // buffer object for triangles (collapse clades)
        s.triBuff = c.createBuffer();

        // world matrix
        this.worldMat = gl.mat4.create();

        // Constant scale factor used to zoom in/out the tree
        this.scaleBy = 1.2;

        // place camera
        this.cam.placeCamera([0, 0, this.dim / 2], [0, 0, 0], [0, 1, 0]);

        this._findViewingCenter();
    };

    /**
     * Sets the canvas size to be a square whose side length is equal to browser
     * window width.
     */
    Drawer.prototype.setCanvasSize = function () {
        var width = this.treeContainer.offsetWidth;
        var height = this.treeContainer.offsetHeight;

        // canvas needs to be a square in order simplify various calculations
        // such as zoom/moving tree
        // set size of canvas to be the larger of the two inorder to fill the
        // available space
        this.dim = width > height ? width : height;
        var can = this.contex_.canvas;
        can.width = this.dim;
        can.height = this.dim;
    };

    /**
     * Compiles the vertex/fragment shaders for webGL to use
     *
     * @param {String Array} vShadTxt text used to create the vertex shader
     * @param {String Array} fShadTxt text used to create the fragment shader
     *
     * @return {WebGLProgram}
     */
    Drawer.prototype.createShaderProgram = function (vShadTxt, fShadTxt) {
        // create shaders
        var c = this.contex_;
        var vertShader = c.createShader(c.VERTEX_SHADER);
        var fragShader = c.createShader(c.FRAGMENT_SHADER);
        c.shaderSource(vertShader, vShadTxt);
        c.shaderSource(fragShader, fShadTxt);

        // complile shaders
        c.compileShader(vertShader);
        if (!c.getShaderParameter(vertShader, c.COMPILE_STATUS)) {
            console.error(
                "ERROR compiling vertex shader!",
                c.getShaderInfoLog(vertShader)
            );
        }
        c.compileShader(fragShader);
        if (!c.getShaderParameter(fragShader, c.COMPILE_STATUS)) {
            console.error(
                "error compiling fragment shader!",
                c.getShaderInfoLog(fragShader)
            );
        }

        // create program
        var prog = c.createProgram();
        c.attachShader(prog, vertShader);
        c.attachShader(prog, fragShader);
        c.linkProgram(prog);
        c.validateProgram(prog);

        return prog;
    };

    /**
     * Fills the WebGLBuffer with vertex data (coordinate and color data)
     *
     * @param {WebGLBuffer} buff The WebGLBuffer
     * @param {Array} data The coordinate and color data to fill the buffer
     */
    Drawer.prototype.fillBufferData_ = function (buff, data) {
        var c = this.contex_;
        c.bindBuffer(c.ARRAY_BUFFER, buff);
        c.bufferData(c.ARRAY_BUFFER, data, c.DYNAMIC_DRAW);
    };

    /**
     * Binds the buffer so WebGL can use it.
     *
     * @param {WebGLBuffer} buffer The Buffer to bind
     */
    Drawer.prototype.bindBuffer = function (buffer) {
        // defines constants for a vertex. A vertex is the form [x, y, r, g, b]
        const COORD_SIZE = 2;
        const COORD_OFFSET = 0;
        const COLOR_SIZE = 3;
        const COLOR_OFFEST = 2;

        var c = this.contex_;
        var s = this.sProg_;

        // tell webGL which buffer to use
        c.bindBuffer(c.ARRAY_BUFFER, buffer);

        c.vertexAttribPointer(
            s.vertPosition,
            COORD_SIZE,
            c.FLOAT,
            c.FALSE,
            this.VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT,
            COORD_OFFSET
        );

        c.vertexAttribPointer(
            s.color,
            COLOR_SIZE,
            c.FLOAT,
            c.FALSE,
            this.VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT,
            COLOR_OFFEST * Float32Array.BYTES_PER_ELEMENT
        );
    };

    /**
     * Fills the buffer used to draw the tree
     *
     * @param {Array} data The coordinate and color data to fill tree buffer
     */
    Drawer.prototype.loadTreeBuf = function (data) {
        data = new Float32Array(data);
        this.treeVertSize = data.length / 5;
        this.fillBufferData_(this.sProg_.treeVertBuff, data);
    };

    /**
     * Fills the buffer used to thicken sample lines
     *
     * @param {Array} data The coordinate and color data to fill sampleThink
     */
    Drawer.prototype.loadSampleThickBuf = function (data) {
        data = new Float32Array(data);
        this.sampleThickSize = data.length / 5;
        this.fillBufferData_(this.sProg_.sampleThickBuff, data);
    };

    /**
     * Fills the selected node buffer
     *
     * @param {Array} data The coordinate and color of selected node
     */
    Drawer.prototype.loadSelectedNodeBuff = function (data) {
        data = new Float32Array(data);
        this.selectedNodeSize = data.length / 5;
        this.fillBufferData_(this.sProg_.selectedNodeBuff, data);
    };

    /**
     * Fills the buffer used to draw nodes
     *
     * @param{Array} data The coordinate and color to fill node buffer
     */
    Drawer.prototype.loadNodeBuff = function (data) {
        data = new Float32Array(data);
        this.nodeSize = data.length / 5;
        this.fillBufferData_(this.sProg_.nodeVertBuff, data);
    };

    /**
     * Display the tree nodes.
     * Note: Currently Empress will only display the nodes that had an assigned
     * name in the newick string. (I.E. Empress will not show any node that
     * starts with EmpressNode)
     *
     * Note: this will only take effect after draw() is called.
     *
     * @param{Boolean} showTreeNodes If true the empress with display the tree
     *                               nodes.
     */
    Drawer.prototype.setTreeNodeVisibility = function (showTreeNodes) {
        this.showTreeNodes = showTreeNodes;
    };
    /**
     * Draws tree and other metadata
     */
    Drawer.prototype.draw = function () {
        var c = this.contex_;
        var s = this.sProg_;
        c.viewport(0, 0, c.canvas.width, c.canvas.height);

        // create MVP matrix
        var mvp = gl.mat4.create();
        gl.mat4.multiply(mvp, this.cam.projMat, this.cam.getViewMat());
        gl.mat4.multiply(mvp, mvp, this.worldMat);

        // clear canvas
        c.clear(c.COLOR_BUFFER_BIT);

        // set the mvp attribute
        c.uniformMatrix4fv(s.mvpMat, false, mvp);

        // draw tree node circles, if requested
        if (this.showTreeNodes) {
            c.uniform1i(s.isSingle, 1);
            c.uniform1f(s.pointSize, 4.0);
            this.bindBuffer(s.nodeVertBuff);
            c.drawArrays(c.POINTS, 0, this.nodeSize);
        }

        // draw selected node
        c.uniform1f(s.pointSize, 9.0);
        this.bindBuffer(s.selectedNodeBuff);
        c.drawArrays(gl.POINTS, 0, this.selectedNodeSize);

        c.uniform1i(s.isSingle, 0);
        this.bindBuffer(s.treeVertBuff);
        c.drawArrays(c.LINES, 0, this.treeVertSize);

        this.bindBuffer(s.sampleThickBuff);
        c.drawArrays(c.TRIANGLES, 0, this.sampleThickSize);
    };

    /**
     * Converts (x,y) from screen space to tree space
     * @param {Number} x The x coordinate in screen space
     * param {Number} y The y coordinate in screen space
     *
     * @return {gl.vec4} The tree coordinates
     */
    Drawer.prototype.toTreeCoords = function (x, y) {
        // get value of center of canvas in screen coorindates
        var center = this.dim / 2;

        // center (x,y) in screen space
        x = x - center;
        y = center - y;

        // calculate (x,y) in tree space
        var treeSpace = gl.vec4.fromValues(x, y, 0, 1);
        var invWorld = gl.mat4.create();
        gl.mat4.invert(invWorld, this.worldMat);
        gl.vec4.transformMat4(treeSpace, treeSpace, invWorld);

        return { x: treeSpace[0], y: treeSpace[1] };
    };

    /**
     *
     * Convert world coordinates to screen coordinates.
     *
     * @param {Float} x The x coordinate.
     * @param {Float} y The y coordinate.
     * @returns {Object} Object with an x and y attribute corresponding to the
     * screen coordinates.
     */
    Drawer.prototype.toScreenSpace = function (x, y) {
        // create MVP matrix
        var mvp = gl.mat4.create();
        gl.mat4.multiply(mvp, this.cam.projMat, this.cam.getViewMat());
        gl.mat4.multiply(mvp, mvp, this.worldMat);

        var screenSpace = gl.vec4.fromValues(x, y, 0, 1);
        gl.vec4.transformMat4(screenSpace, screenSpace, mvp);
        screenSpace[0] /= screenSpace[3];
        screenSpace[1] /= screenSpace[3];
        x = (screenSpace[0] * 0.5 + 0.5) * this.canvas.offsetWidth;
        y = (screenSpace[1] * -0.5 + 0.5) * this.canvas.offsetHeight;

        return { x: x, y: y };
    };

    /**
     * Find the coordinate of the center of the viewing window in tree
     * coordinates
     *
     * @private
     */
    Drawer.prototype._findViewingCenter = function () {
        var width = this.treeContainer.offsetWidth,
            height = this.treeContainer.offsetHeight,
            center = this.toTreeCoords(width / 2, height / 2);
        this.treeSpaceCenterX = center.x;
        this.treeSpaceCenterY = center.y;
    };

    /**
     * Centers the viewing window on the point (x, y).
     *
     * Note: This function will reset all other camera options (such as zoom).
     *
     *
     * @param{Number} x The x position
     * @param{Number} y The y position
     */
    Drawer.prototype.centerCameraOn = function (x, y) {
        // create matrix to translate node to center of screen
        var center = gl.vec3.fromValues(
            this.treeSpaceCenterX,
            this.treeSpaceCenterY,
            0
        );

        var centerMat = gl.mat4.create();
        gl.mat4.fromTranslation(centerMat, center);

        var nodePos = gl.vec3.fromValues(-x, -y, 0);

        var worldMat = gl.mat4.create();
        gl.mat4.fromTranslation(worldMat, nodePos);
        gl.mat4.multiply(this.worldMat, centerMat, worldMat);
    };

    /**
     * Zooms the viewing window in or out.
     *
     * @param{Number} x The x position to center the zoom operation on.
     * @param{Number} y The y position to center the zoom operation on.
     * @param{Boolean} zoomIn If true, the camera will zoom in. If false, the
     *                        camera will zoom out.
     *                        Note: if zoomIn=false then the camera will zoom
     *                              out by 1 / zoomAmount.
     * @param{Number} zoomAmount The amout to zoom in or out.
     */
    Drawer.prototype.zoom = function (x, y, zoomIn, zoomAmount = this.scaleBy) {
        var zoomAt = gl.vec4.fromValues(x, y, 0, 1);
        // move tree
        var transVec = gl.vec3.create();
        gl.vec3.sub(transVec, transVec, zoomAt);
        var transMat = gl.mat4.create();
        gl.mat4.fromTranslation(transMat, transVec);
        gl.mat4.multiply(this.worldMat, transMat, this.worldMat);

        // zoom tree
        if (!zoomIn) zoomAmount = 1 / zoomAmount;

        var zoomVec = gl.vec3.fromValues(zoomAmount, zoomAmount, zoomAmount),
            zoomMat = gl.mat4.create();
        gl.mat4.fromScaling(zoomMat, zoomVec);
        gl.mat4.multiply(this.worldMat, zoomMat, this.worldMat);

        // move tree back to original place
        transVec = gl.vec3.fromValues(zoomAt[0], zoomAt[1], zoomAt[2]);
        transMat = gl.mat4.create();
        gl.mat4.fromTranslation(transMat, transVec);
        gl.mat4.multiply(this.worldMat, transMat, this.worldMat);
    };

    return Drawer;
});
