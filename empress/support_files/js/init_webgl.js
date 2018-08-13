"use strict";

//webgl vertex shader program - calculates tree coordinates in screen space
window.vertexShaderText =
[
'precision mediump float;',
'',
'attribute vec2 vertPosition;',
'uniform mat4 mvpMat;',
'attribute vec3 color;',
'varying vec3 c;',
'',
'void main()',
'{',
'  c = color;',
'  gl_Position = mvpMat * vec4(vertPosition, 0.0, 1.0);',
'  gl_PointSize = 1.0;',
'}'
].join('\n');

//webgl fragment shader program - colors the tree
window.fragmentShaderText =
[
'precision mediump float;',
'varying vec3 c;',
'',
'void main()',
'{',
'  gl_FragColor = vec4(c,1);',
'}'
].join('\n');


/*
 * compliles shader programs and initializes webgl
 */
function initWebGl() {
  gl = $(".tree-surface")[0].getContext("webgl");
  setCanvasSize(gl.canvas);

  if (!gl) {
    gl = $("#tree-surface")[0].getContext("experimental-webgl");
    return;
  }

  if (!gl) {
    alert("Your browser does not support WebGL");
    return;
  }

  gl.clearColor(0.75, 0.85, 0.8, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //
  // Create shaders
  //
  let vertexShader = gl.createShader(gl.VERTEX_SHADER);
  let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(vertexShader, window.vertexShaderText);
  gl.shaderSource(fragmentShader, window.fragmentShaderText);

  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error("ERROR compiling vertex shader!", gl.getShaderInfoLog(vertexShader));
    return;
  }

  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error("ERROR compiling fragment shader!", gl.getShaderInfoLog(fragmentShader));
    return;
  }

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error("ERROR linking program!", gl.getProgramInfoLog(shaderProgram));
    return;
  }
  gl.validateProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.VALIDATE_STATUS)) {
    console.error("ERROR validating program!", gl.getProgramInfoLog(shaderProgram));
    return;
  }

  gl.useProgram(shaderProgram);

  shaderProgram.positionAttribLocation = gl.getAttribLocation(shaderProgram, "vertPosition");
  gl.enableVertexAttribArray(shaderProgram.positionAttribLocation);
  shaderProgram.colorAttribLocation = gl.getAttribLocation(shaderProgram, "color");
  gl.enableVertexAttribArray(shaderProgram.colorAttribLocation);

  // shader matrix uniform
  shaderProgram.mvpUniform = gl.getUniformLocation(shaderProgram,"mvpMat");

  // buffer object for tree
  shaderProgram.treeVertBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, shaderProgram.treeVertBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawingData.edgeCoords), gl.DYNAMIC_DRAW);

  // buffer object for nodes
  shaderProgram.nodeVertBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, shaderProgram.nodeVertBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawingData.nodeCoords), gl.DYNAMIC_DRAW)

  // buffer object for colored clades
  shaderProgram.cladeVertBuffer = gl.createBuffer();

  shaderProgram.worldMat = mat4.create();
}

function setCanvasSize(canvas) {
    let realToCSSPixels = window.devicePixelRatio;

    // Lookup the size the browser is displaying the canvas in CSS pixels
    // and compute a size needed to make our drawingbuffer match it in
    // device pixels.
    let displayWidth  = Math.floor(gl.canvas.clientWidth * 0.75  * realToCSSPixels);
    let displayHeight = Math.floor(gl.canvas.clientHeight * 0.75 * realToCSSPixels);

    // Check if the canvas is not the same size.
    if (canvas.width  !== displayWidth ||
        canvas.height !== displayHeight) {

      // Make the canvas the same size
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
    }
}