define(["jquery", "glMatrix", "Camera"], function($, gl, Camera) {
    //  Shaders used in Drawer
    var vertShaderTxt = [
        "precision mediump float;",
        "",
        "attribute vec2 vertPosition;",
        "uniform mat4 mvpMat;",
        "attribute vec3 color;",
        "varying vec3 c;",
        "",
        "void main()",
        "{",
        "  c = color;",
        "  gl_Position = mvpMat * vec4(vertPosition, 0.0, 1.0);",
        "  gl_PointSize = 4.0;",
        "}"
    ].join("\n");
    var fragShaderTxt = [
        "precision mediump float;",
        "varying vec3 c;",
        "",
        "void main()",
        "{",
        "  float r = 0.0;",
        "  vec2 cxy = 2.0 * gl_PointCoord - 1.0;",
        "  r = dot(cxy, cxy);",
        "  gl_FragColor = vec4(c,1);",
        "}"
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
        this.contex_ = canvas.getContext("webgl");
        this.CLR_COL = 1;
        this.cam = cam;
        this.VERTEX_SIZE = 5;
    }

    /**
     * Compliles the shaders and sets up the necessary array buffers.
     */
    Drawer.prototype.initialize = function() {
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

        // buffer object for tree
        s.treeVertBuff = c.createBuffer();
        this.treeVertSize = 0;

        // buffer object used to thicken sampleLines
        s.sampleThickBuff = c.createBuffer();
        this.sampleThickSize = 0;

        // buffer object for tree nodes
        s.nodeVertBuff = c.createBuffer();

        // buffer object for active 'hovered' node
        s.hoverNodeBuff = c.createBuffer();

        // buffer object for colored clades
        s.cladeBuff = c.createBuffer();

        // buffer object for triangles (collapse clades)
        s.triBuff = c.createBuffer();

        // world matrix
        this.worldMat = gl.mat4.create();

        // Constant scale factor used to zoom in/out the tree
        this.scaleBy = 1.2;

        // place camera
        this.cam.placeCamera(
            [0, 0, $(window).width() / 2],
            [0, 0, 0],
            [0, 1, 0]
        );

        // create mouse events to handle moving/zooming the tree
        this.setMouseEvents();
    };

    /**
     * Sets the canvas size to be a square whose side length is equal to browser
     * window width.
     */
    Drawer.prototype.setCanvasSize = function() {
        const WIDTH = $(window).width();

        // make canvas a square whose side is equal to window width
        var can = this.contex_.canvas;
        can.width = WIDTH;
        can.height = WIDTH;
    };

    /**
     * Compiles the vertex/fragment shaders for webGL to use
     *
     * @param {String Array} vShadTxt text used to create the vertex shader
     * @param {String Array} fShadTxt text used to create the fragment shader
     *
     * @return {WebGLProgram}
     */
    Drawer.prototype.createShaderProgram = function(vShadTxt, fShadTxt) {
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
    Drawer.prototype.fillBufferData_ = function(buff, data) {
        var c = this.contex_;
        c.bindBuffer(c.ARRAY_BUFFER, buff);
        c.bufferData(c.ARRAY_BUFFER, data, c.DYNAMIC_DRAW);
    };

    /**
     * Binds the buffer so WebGL can use it.
     *
     * @param {WebGLBuffer} buffer The Buffer to bind
     */
    Drawer.prototype.bindBuffer = function(buffer) {
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
    Drawer.prototype.loadTreeBuf = function(data) {
        data = new Float32Array(data);
        this.treeVertSize = data.length / 5;
        this.fillBufferData_(this.sProg_.treeVertBuff, data);
    };

    /**
     * Fills the buffer used to thicken sample lines
     *
     * @param {Array} data The coordinate and color data to fill sampleThink
     */
    Drawer.prototype.loadSampleThickBuf = function(data) {
        data = new Float32Array(data);
        this.sampleThickSize = data.length / 5;
        this.fillBufferData_(this.sProg_.sampleThickBuff, data);
    };

    /**
     * Draws tree and other metadata
     */
    Drawer.prototype.draw = function() {
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

        // draw tree
        this.bindBuffer(s.treeVertBuff);
        c.drawArrays(c.LINES, 0, this.treeVertSize);

        this.bindBuffer(s.sampleThickBuff);
        c.drawArrays(c.TRIANGLES, 0, this.sampleThickSize);
    };

    /**
     * Creates the mouse events to handle moving/zooming the tree
     *
     * modified from
     * https://www.w3schools.com/howto/howto_js_draggable.asp
     */
    Drawer.prototype.setMouseEvents = function() {
        // need for use in closures
        var canvas = this.contex_.canvas;
        var drawer = this;
        var curX = 0,
            curY = 0,
            newX = 0,
            newY = 0;

        // moves tree as long as mouse is pressed down
        var moveTree = function(e) {
            // grab mouse location
            var center = $(window).width() / 2;
            newX = e.clientX - center;
            newY = center - e.clientY;

            // find how far mouse move in tree space
            var curTreeCoords = gl.vec4.fromValues(curX, curY, 0, 1);
            var newTreeCoords = gl.vec4.fromValues(newX, newY, 0, 1);
            var transVec = gl.vec4.create();
            gl.vec4.sub(transVec, newTreeCoords, curTreeCoords);

            // create translation matrix
            var transMat = gl.mat4.create();
            gl.mat4.fromTranslation(transMat, transVec);
            gl.mat4.multiply(drawer.worldMat, transMat, drawer.worldMat);

            // update current mouse position
            curX = newX;
            curY = newY;

            // draw tree
            drawer.draw();
        };

        // stops moving tree when mouse is released
        var stopMove = function(e) {
            document.onmouseup = null;
            document.onmousemove = null;
            canvas.style.cursor = "default";
        };

        // adds the listenrs to the document to move tree
        var mouseDown = function(e) {
            var center = $(window).width() / 2;
            curX = e.clientX - center;
            curY = center - e.clientY;
            document.onmouseup = stopMove;
            document.onmousemove = moveTree;
            canvas.style.cursor = "none";
        };

        // zooms the tree in/out
        var zoomTree = function(e) {
            // find position of cursor before zoom. This allows the zoom to
            // occur at cursor rather than at origin
            var center = $(window).width() / 2;
            var mX = e.clientX - center;
            var mY = center - e.clientY;
            var curPos = gl.vec4.fromValues(mX, mY, 0, 1);

            // move tree
            var transVec = gl.vec3.create();
            gl.vec3.sub(transVec, transVec, curPos);
            var transMat = gl.mat4.create();
            gl.mat4.fromTranslation(transMat, transVec);
            gl.mat4.multiply(drawer.worldMat, transMat, drawer.worldMat);

            // zoom tree
            var zoomBy = e.deltaY < 0 ? drawer.scaleBy : 1 / drawer.scaleBy;
            var zoomVec = gl.vec3.fromValues(zoomBy, zoomBy, zoomBy);
            var zoomMat = gl.mat4.create();
            gl.mat4.fromScaling(zoomMat, zoomVec);
            gl.mat4.multiply(drawer.worldMat, zoomMat, drawer.worldMat);

            // move tree back to original place
            transVec = gl.vec3.fromValues(curPos[0], curPos[1], curPos[2]);
            transMat = gl.mat4.create();
            gl.mat4.fromTranslation(transMat, transVec);
            gl.mat4.multiply(drawer.worldMat, transMat, drawer.worldMat);

            // draw tree
            drawer.draw();
        };

        canvas.onmousedown = mouseDown;
        canvas.onwheel = zoomTree;
    };

    /**
     * Converts (x,y) from screen space to tree space
     * @param {Number} x The x coordinate in screen space
     * param {Number} y The y coordinate in screen space
     *
     * @return {gl.vec4} The tree coordinates
     */
    Drawer.prototype.toTreeCoords = function(x, y) {
        // get value of center of canvas in screen coorindates
        var center = $(window).width() / 2;

        // center (x,y) in screen space
        x = x - center;
        y = center - y;

        // calculate (x,y) in tree space
        var treeSpace = gl.vec4.fromValues(x, y, 0, 1);
        var invWorld = gl.mat4.create();
        gl.mat4.invert(invWorld, this.worldMat);
        gl.vec4.transformMat4(treeSpace, treeSpace, invWorld);

        return treeSpace;
    };

    return Drawer;
});
