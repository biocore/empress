"use strict";

//webgl vertex shader program - calculates tree coordinates in screen space
window.vertexShaderText =
[
'precision mediump float;',
'',
'attribute vec2 vertPosition;',
'uniform mat4 mvpMat;',
// 'uniform int singleNode;',
'attribute vec3 color;',
'varying vec3 c;',
// 'varying int isSingle;',
'',
'void main()',
'{',
'  c = color;',
'  gl_Position = mvpMat * vec4(vertPosition, 0.0, 1.0);',
'  gl_PointSize = 4.0;',
// '  isSingle = singleNode;',
'}'
].join('\n');

//webgl fragment shader program - colors the tree
window.fragmentShaderText =
[
'precision mediump float;',
'varying vec3 c;',
'uniform int isSingle;',
'',
'void main()',
'{',
'float r = 0.0;',
'vec2 cxy = 2.0 * gl_PointCoord - 1.0;',
'r = dot(cxy, cxy);',
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

  shaderProgram = createShaderProgram(window.vertexShaderText, window.fragmentShaderText);
  // c_shaderProgram = createShaderProgram(window.c_vertexShaderText, window.c_fragmentShaderText);

  gl.useProgram(shaderProgram);

  shaderProgram.positionAttribLocation = gl.getAttribLocation(shaderProgram, "vertPosition");
  gl.enableVertexAttribArray(shaderProgram.positionAttribLocation);
  shaderProgram.colorAttribLocation = gl.getAttribLocation(shaderProgram, "color");
  gl.enableVertexAttribArray(shaderProgram.colorAttribLocation);

  // shader matrix uniform
  shaderProgram.mvpUniform = gl.getUniformLocation(shaderProgram,"mvpMat");
  shaderProgram.isSingle = gl.getUniformLocation(shaderProgram, "isSingle");

  // buffer object for tree
  shaderProgram.treeVertBuffer = gl.createBuffer();
  fillBufferData(shaderProgram.treeVertBuffer, edgeData);

  // buffer object for nodes
  shaderProgram.nodeVertBuffer = gl.createBuffer();
  fillBufferData(shaderProgram.nodeVertBuffer, drawingData.nodeCoords);

  // buufer object for hovered node
  shaderProgram.hoverNodeBuffer = gl.createBuffer();

  // buffer object for colored clades
  shaderProgram.cladeVertBuffer = gl.createBuffer();

  // buffer object for selected sub tree
  shaderProgram.selectBuffer = gl.createBuffer();

  shaderProgram.triangleBuffer = gl.createBuffer();
  shaderProgram.highTriBuffer = gl.createBuffer();

  shaderProgram.worldMat = mat4.create();
  shaderProgram.xyTransMat = mat4.create();
  shaderProgram.zTransMat = mat4.create();

  shaderProgram.boundingMat = mat4.create();
  shaderProgram.boundingTrans = mat4.create();
  shaderProgram.boundingScale = mat4.create();

  placeCamera(drawingData.initZoom);
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

function createShaderProgram(vShader, fShader) {
  // create shaders
  let vertexShader = gl.createShader(gl.VERTEX_SHADER);
  let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(vertexShader, vShader);
  gl.shaderSource(fragmentShader, fShader);

  // compile shaders
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

  // create program
  let sProgram = gl.createProgram();
  gl.attachShader(sProgram, vertexShader);
  gl.attachShader(sProgram, fragmentShader);
  gl.linkProgram(sProgram);
  if (!gl.getProgramParameter(sProgram, gl.LINK_STATUS)) {
    console.error("ERROR linking program!", gl.getProgramInfoLog(srogram));
    return;
  }
  gl.validateProgram(sProgram);
  if (!gl.getProgramParameter(sProgram, gl.VALIDATE_STATUS)) {
    console.error("ERROR validating program!", gl.getProgramInfoLog(sProgram));
    return;
  }

  return sProgram
}

/**
 * Places the camera at (0, 0, z) where z represents the zoom level
 * @param {number} z - the zoom level
*/
function placeCamera(z) {
  // calculate where the virtual camera is
  camera.pos = [0, 0, z];
  camera.lookDir = [0, 0, 0];
  camera.upDir = [0, 1, 0];
  shaderProgram.viewMat  = mat4.create();
  mat4.lookAt(shaderProgram.viewMat, camera.pos, camera.lookDir, camera.upDir);
}