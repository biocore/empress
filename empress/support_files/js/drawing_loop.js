"use strict";

function loop() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  shaderProgram.mvpMat = mat4.create();
  mat4.multiply(shaderProgram.mvpMat, shaderProgram.projMat, shaderProgram.viewMat);
  mat4.multiply(shaderProgram.mvpMat, shaderProgram.mvpMat, shaderProgram.worldMat);

  // gl.clearColor(0.75, 0.85, 0.8, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

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

  drawLabels();
}

/*
 * sends a buffer to webgl to draw
 */
function bindBuffer(buffer) {
  // defines constants for a vertex. Vertex are in the for [x, y, r, g, b]
  const VERTEX_SIZE = 5;
  const COORD_SIZE = 2;
  const COORD_OFFSET = 0;
  const COLOR_SIZE = 3;
  const COLOR_OFFEST = 2;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(
    shaderProgram.positionAttribLocation,
    COORD_SIZE,
    gl.FLOAT,
    gl.FALSE,
    VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT,
    COORD_OFFSET
  );
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
  // look up the divcontainer
  let divContainerElement = document.getElementById("divcontainer");
  while(divContainerElement.firstChild) {
    divContainerElement.removeChild(divContainerElement.firstChild);
  }

  let canvas = $(".tree-surface")[0];

  let pixelX = 0;
  let pixelY = 0;
  let count = 0;
  for(let label = Object.keys(labels).length - 1; label >= 0; --label) {
    let objSpace = vec4.fromValues(labels[label].x, labels[label].y, 0, 1);
    let clipSpace = vec4.create();

    vec4.transformMat4(clipSpace, objSpace, shaderProgram.mvpMat);
    clipSpace[0] /= clipSpace[3];
    clipSpace[1] /= clipSpace[3];
    pixelX = (clipSpace[0] * 0.5 + 0.5) * canvas.offsetWidth;
    pixelY = (clipSpace[1] * -0.5 + 0.5)* canvas.offsetHeight;
    if(0 <= pixelX &&  pixelX <= canvas.offsetWidth &&
       0 <= pixelY && pixelY <= canvas.offsetHeight) {
      // make the div
      let div = document.createElement("div");

      // assign it a CSS class
      div.className = "floating-div";

      // make a text node for its content
      let textNode = document.createTextNode("");
      div.appendChild(textNode);

      // add it to the divcontainer
      divContainerElement.appendChild(div);
      div.style.left = Math.floor(pixelX) + "px";
      div.style.top = Math.floor(pixelY) + "px";
      textNode.nodeValue = [labels[label].label];
      div.id = labels[label].label;
      count++;
      if(count >10) {
        break;
      }
    }
  }
}

/*
 * Draws the tree
 */
function setUpCamera() {
  shaderProgram.viewMat  = mat4.create();
  const identityMat = mat4.create();
  let treeNormVec = vec3.create();

  vec3.set(treeNormVec, 1.0 / drawingData.largeDim * 3, 1.0 / drawingData.largeDim * 3, 1.0 / drawingData.largeDim * 3);
  mat4.fromScaling(shaderProgram.worldMat, treeNormVec);

  // define virtal camera properties
  const CAM_POS = [0, 0, 5];
  const CAM_LOOK_DIR = [0, 0, 0];
  const CAM_UP_DIR = [0, 1, 0];

  // make the virtual camera sit in from of the tree and look at the center tree
  mat4.lookAt(shaderProgram.viewMat, CAM_POS, CAM_LOOK_DIR, CAM_UP_DIR);

  // defines the matrix used to represent what fov of the virtual camera
  shaderProgram.projMat = mat4.create();
  mat4.perspective(shaderProgram.projMat, glMatrix.toRadian(45),
                   gl.canvas.width / gl.canvas.height,
                   0.1,10);

  // draw tree
  requestAnimationFrame(loop);
}
