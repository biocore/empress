"use strict";

//webgl vertex shader program - calculates tree coordinates in screen space
window.vertexShaderText =
[
'precision mediump float;',
'',
'attribute vec2 vertPosition;',
'uniform mat4 mWorld;',
'uniform mat4 mView;',
'uniform mat4 mProj;',
'attribute vec3 color;',
'varying vec3 c;',
'',
'void main()',
'{',
'  c = color;',
'  gl_Position = mProj * mView * mWorld * vec4(vertPosition, 0.0, 1.0);',
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

//global variables -- window = global
window.program; //loads the vertex/fragment shader into webgl
window.gl; //webgl context - used to call webgl functions
window.largeDim; //used to normalize the tree to fit into a 1x1 square
window.result = []; //edgeMetadata extracted from dataframe
window.worldMat = mat4.create();
window.scaleFactor = 5.0 / 4.0; //how much the tree grows/shrinks during zoom

/*
 * compliles shader programs and initializes webgl
 */

function initWebGl() {
  console.log("init webgl");


  //sets the size of the webgl canvas to fill the screen
  var drawingSurface = $("#drawing-surface");
  window.canvas = $("#tree-surface");
  window.canvas[0].width = drawingSurface.width();
  window.canvas[0].height = drawingSurface.height();

  window.gl = window.canvas[0].getContext("webgl");

  if (!window.gl) {
    console.log("WebGL not supported, falling back on experimental-webgl");
    window.gl = window.canvas[0].getContext("experimental-webgl");
    return;
  }

  if (!window.gl) {
    alert("Your browser does not support WebGL");
    return;
  }

  window.gl.clearColor(0.75, 0.85, 0.8, 1.0);
  window.gl.clear(window.gl.COLOR_BUFFER_BIT | window.gl.DEPTH_BUFFER_BIT);

  //
  // Create shaders
  //
  var vertexShader = window.gl.createShader(window.gl.VERTEX_SHADER);
  var fragmentShader = window.gl.createShader(window.gl.FRAGMENT_SHADER);

  window.gl.shaderSource(vertexShader, window.vertexShaderText);
  window.gl.shaderSource(fragmentShader, window.fragmentShaderText);

  window.gl.compileShader(vertexShader);
  if (!window.gl.getShaderParameter(vertexShader, window.gl.COMPILE_STATUS)) {
    console.error("ERROR compiling vertex shader!", window.gl.getShaderInfoLog(vertexShader));
    return;
  }

  window.gl.compileShader(fragmentShader);
  if (!window.gl.getShaderParameter(fragmentShader, window.gl.COMPILE_STATUS)) {
    console.error("ERROR compiling fragment shader!", window.gl.getShaderInfoLog(fragmentShader));
    return;
  }

  window.program = window.gl.createProgram();
  window.gl.attachShader(window.program, vertexShader);
  window.gl.attachShader(window.program, fragmentShader);
  window.gl.linkProgram(window.program);
  if (!window.gl.getProgramParameter(window.program, window.gl.LINK_STATUS)) {
    console.error("ERROR linking program!", window.gl.getProgramInfoLog(window.program));
    return;
  }
  window.gl.validateProgram(window.program);
  if (!window.gl.getProgramParameter(window.program, window.gl.VALIDATE_STATUS)) {
    console.error("ERROR validating program!", window.gl.getProgramInfoLog(window.program));
    return;
  }

  window.gl.useProgram(window.program);
  var treeVertexBufferObject = window.gl.createBuffer();
  window.gl.bindBuffer(window.gl.ARRAY_BUFFER, treeVertexBufferObject);
  window.gl.bufferData(window.gl.ARRAY_BUFFER, new Float32Array(window.result), window.gl.DYNAMIC_DRAW);

  var positionAttribLocation = window.gl.getAttribLocation(window.program, "vertPosition");
  var colorAttribLocation = window.gl.getAttribLocation(window.program, "color");

    //send vertices to webgl
  window.gl.vertexAttribPointer(
    positionAttribLocation, // Attribute location
    2, // Number of elements per attribute
    window.gl.FLOAT, // Type of elements
    window.gl.FALSE,
    5 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
    0 // Offset from the beginning of a single vertex to this attribute
  );

    //send red color to webgl
  window.gl.vertexAttribPointer(
    colorAttribLocation, // Attribute location
    3, // Number of elements per attribute
    window.gl.FLOAT, // Type of elements
    window.gl.FALSE,
    5 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
    2 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
  );

  window.gl.enableVertexAttribArray(positionAttribLocation);
  window.gl.enableVertexAttribArray(colorAttribLocation);
  console.log("finish init webgl");
}
