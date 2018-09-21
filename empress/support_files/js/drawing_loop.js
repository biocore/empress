"use strict";

function loop() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // calculate where the virtual camera is
  let hCamPos = vec4.fromValues(camera.pos[0], camera.pos[1], camera.pos[2], 1);
  let hLookDir = vec4.fromValues(camera.lookDir[0], camera.lookDir[1], camera.lookDir[2], 1);
  vec4.transformMat4(hCamPos, hCamPos, shaderProgram.xyTransMat);
  vec4.transformMat4(hCamPos, hCamPos, shaderProgram.zTransMat);
  vec4.transformMat4(hLookDir, hLookDir, shaderProgram.xyTransMat);


  // create virtual camera
  let camPos = vec3.create();
  let lookDir = vec3.create();
  vec3.copy(camPos, hCamPos);
  vec3.copy(lookDir, hLookDir);
  shaderProgram.viewMat  = mat4.create();
  mat4.lookAt(shaderProgram.viewMat, camPos, lookDir, camera.upDir);

  // calculate the model view matrix
  shaderProgram.mvpMat = mat4.create();
  mat4.multiply(shaderProgram.mvpMat, shaderProgram.projMat, shaderProgram.viewMat);
  mat4.multiply(shaderProgram.mvpMat, shaderProgram.mvpMat, shaderProgram.worldMat);

  gl.clear(gl.COLOR_BUFFER_BIT);

  // pass the model view matrix to webgl
  gl.uniformMatrix4fv(shaderProgram.mvpUniform, false, shaderProgram.mvpMat);

  // draw any highlighted clades
  bindBuffer(shaderProgram.cladeVertBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, drawingData.coloredClades.length / 5);

  // draw the tree
  bindBuffer(shaderProgram.treeVertBuffer);
  gl.drawArrays(gl.LINES, 0, drawingData.edgeCoords.length / 5 );

  // draw any nodes
  bindBuffer(shaderProgram.nodeVertBuffer);
  gl.drawArrays(gl.POINTS, 0, drawingData.nodeCoords.length / 5 );

  bindBuffer(shaderProgram.selectBuffer);
  gl.drawArrays(gl.LINES, 0, drawingData.selectTree.length / 5);

  bindBuffer(shaderProgram.triangleBuffer);
  gl.drawArrays(gl.TRIANGLES, 0, drawingData.triangles.length / 5);

  drawLabels();
}

/*
 * sends a buffer to webgl to draw
 */
function bindBuffer(buffer) {
  // defines constants for a vertex. A vertex is the form [x, y, r, g, b]
  const VERTEX_SIZE = 5;
  const COORD_SIZE = 2;
  const COORD_OFFSET = 0;
  const COLOR_SIZE = 3;
  const COLOR_OFFEST = 2;

  // tell webgl which buffer to store the vertex data in
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  // tell webgl where the x,y coords are in the array
  gl.vertexAttribPointer(
    shaderProgram.positionAttribLocation,
    COORD_SIZE,
    gl.FLOAT,
    gl.FALSE,
    VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT,
    COORD_OFFSET
  );

  // tel webgl where the r,g,b values are in the array
  gl.vertexAttribPointer(
    shaderProgram.colorAttribLocation,
    COLOR_SIZE,
    gl.FLOAT,
    gl.FALSE,
    VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT,
    COLOR_OFFEST * Float32Array.BYTES_PER_ELEMENT
  );
}

function drawLabels() {
  const NEGATE = -1;
  // remove old labels
  let divContainerElement = document.getElementById("divcontainer");
  while(divContainerElement.firstChild) {
    divContainerElement.removeChild(divContainerElement.firstChild);
  }
  let canvas = $(".tree-surface")[0];

  const X = 0;
  const Y = 1;
  const VALUE = 2;

  // // find the top left corner of the viewing window in tree space
  let boundingBoxDim = camera.pos[2] + shaderProgram.zTransMat[14];
  let topLeft = vec4.fromValues(NEGATE * boundingBoxDim, boundingBoxDim, 0, 1);
  vec4.transformMat4(topLeft, topLeft, shaderProgram.xyTransMat);

  // find the bottom right corner of the voewing window in tree space
  let bottom = NEGATE * camera["bottomSlope"] * boundingBoxDim;
  let bottomRight = vec4.fromValues(boundingBoxDim, bottom, 0, 1);
  vec4.transformMat4(bottomRight, bottomRight, shaderProgram.xyTransMat);

  // find where the range of the viewing window along the the x/y axis
  let minX = topLeft[X], maxX = bottomRight[X];
  let minY = bottomRight[Y], maxY = topLeft[Y];

  // predefine variables need in for loop to speed up loop
  let i;
  let pixelX = 0, pixelY = 0;
  let div, textNode;
  let treeSpace = vec4.create();
  let screenSpace = vec4.create();
  let treeX, treeY, numLabels;
  let count = 0;

  // draw top 10 labels within the viewing window
  numLabels = labels.length;
  for(i = 0; i < numLabels; ++i) {
    // grad x,y coordinate of node in tree space and check to see if its in the viewing window
    treeX = labels[i][X];
    treeY = labels[i][Y];
    if(minX <= treeX && treeX <= maxX &&
        minY <= treeY && treeY <= maxY) {
      // calculate the screen coordinate of the label
      treeSpace = vec4.fromValues(labels[i][X], labels[i][Y], 0, 1);
      screenSpace = vec4.create();
      vec4.transformMat4(screenSpace, treeSpace, shaderProgram.mvpMat);
      screenSpace[0] /= screenSpace[3];
      screenSpace[1] /= screenSpace[3];
      pixelX = (screenSpace[0] * 0.5 + 0.5) * canvas.offsetWidth;
      pixelY = (screenSpace[1] * -0.5 + 0.5)* canvas.offsetHeight;

      // make the div
      div = document.createElement("div");

      // assign it a CSS class
      div.className = "floating-div";

      // make a text node for its content
      textNode = document.createTextNode(labels[i][VALUE]);
      div.appendChild(textNode);

      // add it to the divcontainer
      divContainerElement.appendChild(div);
      div.style.left = Math.floor(pixelX) + "px";
      div.style.top = Math.floor(pixelY) + "px";
      div.id = labels[i][VALUE];

      // stop once 10 labels have been drawn to screen
      count++;
      if(count === 10) {
        break;
      }
    }
  }
}

/*
 * Draws the tree
 */
function setPerspective() {
  // create a perspective projection
  let fov = {
    upDegrees: 45,
    downDegrees: 45,
    leftDegrees: 45,
    rightDegrees: 45
  }
  shaderProgram.projMat = mat4.create();
  mat4.perspectiveFromFieldOfView(shaderProgram.projMat, fov,
                   0.1, -10);
}
