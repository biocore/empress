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
function initWebGl(edgeData) {
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

  gl.clearColor(CLEAR_COLOR, CLEAR_COLOR, CLEAR_COLOR, 1);
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
  fillBufferData(shaderProgram.treeVertBuffer, edgeData);

  // buffer object for nodes
  shaderProgram.nodeVertBuffer = gl.createBuffer();
  fillBufferData(shaderProgram.nodeVertBuffer, drawingData.nodeCoords);

  // buffer object for colored clades
  shaderProgram.cladeVertBuffer = gl.createBuffer();

  // buffer object for selected sub tree
  shaderProgram.selectBuffer = gl.createBuffer();

  shaderProgram.triangleBuffer = gl.createBuffer();

  shaderProgram.worldMat = mat4.create();
  shaderProgram.xyTransMat = mat4.create();
  shaderProgram.zTransMat = mat4.create();

  shaderProgram.boundingMat = mat4.create();
  shaderProgram.boundingTrans = mat4.create();
  shaderProgram.boundingScale = mat4.create();

  // calculate where the virtual camera is
  camera.pos = [0, 0, drawingData.initZoom];
  camera.lookDir = [0, 0, 0];
  camera.upDir = [0, 1, 0];
  shaderProgram.viewMat  = mat4.create();
  mat4.lookAt(shaderProgram.viewMat, camera.pos, camera.lookDir, camera.upDir);
}

function setCanvasSize(canvas) {
  const HALF = 1 / 2;

  // Make the canvas a square, width is choosen because it will be larger
  canvas.width = $(window).width();
  canvas.height = $(window).width();
  const HALF_WIDTH = HALF * $(window).width();
  camera["yInt"] = $(window).height() - HALF_WIDTH;
  camera["bottomSlope"] = camera["yInt"] / HALF_WIDTH;
}
