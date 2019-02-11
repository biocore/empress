/**
 *
 */
function mouseHandler(event) {
  const SHFT_KEY = 16;
  const CLEAR_SIZE = 0;

  if(clearSelectBox(event)) {
    $(".square").css({height: CLEAR_SIZE + "px", width: CLEAR_SIZE + "px"});
  }
  if(event.type === "mousedown") {
    drawingData.lastMouseX = drawingData.mouseDownX = event.clientX;
    drawingData.lastMouseY = drawingData.mouseDownY = event.clientY;
    drawingData.isMouseDown = true;
    if(shftPress) {
      let boxCoords = toTreeCoords(drawingData.lastMouseX, drawingData.lastMouseY);
      placeSelectBox(boxCoords);
    }
    else {
      $('body').css('cursor', 'none');
    }
  }
  else if(event.type === "mouseup") {
    mouseUp(event);
  }
  else if(event.type === "mousemove") {
    if(drawingData.isMouseDown) {
      shftPress ? resizeSelectBox(event) : moveTree(event);
    }
  }
  else if(event.type === "wheel" && !shftPress) {
    mouseWheel(event);
  }
  else if(event.type === "dblclick") {
    if(shftPress){
      getOldTree(event);
    } else {
      clearSelectedTreeCollapse(event);
    }
  }

}

/**
 * tests to see whether or not the select box should be cleared.
 */
function clearSelectBox(event) {
  return (event.type === "wheel" || event.type === "mousemove" && drawingData.isMouseDown
      || event.type === "mousedown")
    ? true  : false;
}

function toTreeCoords(x, y) {
  const HALF = 2;
  const CENTER = $(window).width() / HALF;
  const SCALE_BY = (camera.pos[2] + shaderProgram.zTransMat[14]) / CENTER;
  x = (x - CENTER) * SCALE_BY;
  y = (CENTER - y) * SCALE_BY;

  // calculate the screen coordinate of the label
  let treeSpace = vec4.fromValues(x, y, 0, 1);
  vec4.transformMat4(treeSpace, treeSpace, shaderProgram.xyTransMat);

  return treeSpace;
}

/**
 */
function placeSelectBox(coords) {
  let canvas = $(".tree-surface")[0];

  let screenSpace = vec4.create();
  vec4.transformMat4(screenSpace, coords, shaderProgram.mvpMat);

  screenSpace[0] /= screenSpace[3];
  screenSpace[1] /= screenSpace[3];
  let pixelX = (screenSpace[0] * 0.5 + 0.5) * canvas.offsetWidth;
  let pixelY = (screenSpace[1] * -0.5 + 0.5)* canvas.offsetHeight;

  // make the div
  $(".square").css({top: Math.floor(pixelY) + "px", left: Math.floor(pixelX) + "px"});
}

function resizeSelectBox(event) {
  let dX = event.clientX - drawingData.lastMouseX;
  let dY = event.clientY- drawingData.lastMouseY;
  let curPos = $(".square").position();
  if(dX >= 0 && dY >= 0) {
    $(".square").css({height: (dY) + "px", width: (dX) + "px"});
  }
  else if (dX <= 0 && dY <= 0){
    let boxCoords = toTreeCoords(event.clientX, event.clientY);
    placeSelectBox(boxCoords);
    $(".square").css({height: (Math.abs(dY)) + "px", width: (Math.abs(dX)) + "px"});
  }
  else if(dX < 0) {
    let boxCoords = toTreeCoords(event.clientX, drawingData.lastMouseY);
    placeSelectBox(boxCoords);
    $(".square").css({height: (Math.abs(dY)) + "px", width: (Math.abs(dX)) + "px"});
  }
  else if(dY < 0) {
    let boxCoords = toTreeCoords(drawingData.lastMouseX, event.clientY);
    placeSelectBox(boxCoords);
    $(".square").css({height: (Math.abs(dY)) + "px", width: (Math.abs(dX)) + "px"});
  }
}

/**
 * unsets the mouse down flag
 *
 * @param {Object} mouseup event used to unset the mouse down flag.
 * This prevent unnecessary calculations when the mouse is being moved and
 * the user is not pressing the mouse down.
 */
function mouseUp(event) {
  if(event.clientX === drawingData.mouseDownX && event.clientY === drawingData.mouseDownY) {
    drawingData.selectTree = [];//extractInfo(edgeMetadata, field.edgeFields);
    // updateGridData(edgeMetadata);
    fillBufferData(shaderProgram.selectBuffer, drawingData.selectTree);
    $(".selected-tree-menu").css({top: drawingData.lastMouseY, left: drawingData.lastMouseX, visibility: "hidden"});
    requestAnimationFrame(loop);
  }
  drawingData.isMouseDown = false;
  $('body').css('cursor', 'default');
}


/**
 * Moves the virtual camera in the xy-plane
 *
 * @param {Object} mousemove event used to collect the (x,y) coordinates of mouse. This
 * will be used to determine which direction the user moved the mouse in order to move
 * the tree accordingly.
 */
function moveTree(event) {
  // grab x,y coordinate of mouse
  const newX = event.clientX;
  const newY = event.clientY;

  // note (0, 0) of the canvas is top left corner with +x going right and +y going down
  // calculate which direction the mouse moved
  const dx = (drawingData.lastMouseX - newX);
  const dy = (newY - drawingData.lastMouseY);
  const dirVec = vec3.fromValues(dx, dy,0);
  let transVec = vec3.create();
  vec3.normalize(transVec, dirVec);
  vec3.scale(transVec, transVec, drawingData.currentZoom / 50.0);
  let addTransMat = mat4.create();

  // modify matrix to move camera in xy-plane in the direction the mouse moved
  mat4.fromTranslation(addTransMat,transVec);
  mat4.multiply(shaderProgram.xyTransMat, addTransMat, shaderProgram.xyTransMat);

  // save current mouse coordinates
  drawingData.lastMouseX = newX;
  drawingData.lastMouseY = newY;

  // redraw tree
  requestAnimationFrame(loop);
}

/**
 * Moves the virtual camera along the z axis
 *
 * @param {Object} mousewheel event used to detemine if the camera should zoom in or
 * zoom out on the tree.
 */
function mouseWheel(event) {
  // the index that stores the cameras z coordinate
  const CAM_Z =2;

  // index that traslation matrix that tells webgl how much to move camera in the z-direction
  const Z_TRANS = 14;

  let zoomByMat = new Float32Array(16);
  let zoomAmount = (event.deltaY < 0) ? drawingData.zoomAmount : -1 * drawingData.zoomAmount;

  // check to see if camera is maxed zoomed
  let camPos = Math.abs(shaderProgram.zTransMat[Z_TRANS] + camera.pos[CAM_Z]);
  if(camPos <= drawingData.maxZoom && zoomAmount < 0) {
    return;
  }

  // modify the camera translation matrix
  let zoomVec = vec3.fromValues(0, 0, zoomAmount);
  mat4.fromTranslation(zoomByMat, zoomVec);
  mat4.mul(shaderProgram.zTransMat, zoomByMat, shaderProgram.zTransMat);
  drawingData.currentZoom += zoomAmount;
  // redraw tree
  requestAnimationFrame(loop);

}

