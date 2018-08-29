"use strict";

/**
 * tells javasript what function to call for mouse/keyboard events
 */
function initCallbacks(){
  $(".tree-surface")[0].onmousedown = mouseDown;
  document.onmouseup = mouseUp;
  document.onmousemove = mouseMove;
  $(".tree-surface")[0].onwheel = mouseWheel;
  window.onresize = resizeCanvas;
  $(".tree-surface")[0].ondblclick = getOldTree;
}

/**
 * stores (x,y) coord of mouse
 *
 * @param {Object} mousedown event used to collect the (x,y) where the mouse was
 * pressed. This will be used when the user starts dragging the mouse to determine
 * how much to move the tree.
 */
function mouseDown(event) {
  drawingData.isMouseDown = true;
  $('body').css('cursor', 'none');
  drawingData.lastMouseX = event.clientX;
  drawingData.lastMouseY = event.clientY;
}

/**
 * unsets the mouse down flag
 *
 * @param {Object} mouseup event used to unset the mouse down flag.
 * This prevent unnecessary calculations when the mouse is being moved and
 * the user is not pressing the mouse down.
 */
function mouseUp(event) {
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
function mouseMove(event) {
  // dont move camera if user is not pressing down on the mouse
  if (!drawingData.isMouseDown) {
    return;
  }

  // grab x,y coordinate of mouse
  const newX = event.clientX;
  const newY = event.clientY;

  // note (0, 0) of the canvas is top left corner with +x going right and +y going down
  // calculate which direction the mouse moved
  const dx = (drawingData.lastMouseX - newX);
  const dy = (newY - drawingData.lastMouseY);
  const transVec = vec3.fromValues(dx, dy,0);
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

  // redraw tree
  requestAnimationFrame(loop);
}

/**
 * resizes the drawing canvas to fix the screen
 *
 * @param {Object} resize event used to dynamically resize the html document.
 */
function resizeCanvas(event) {
  setCanvasSize(gl.canvas);
  setPerspective();
  requestAnimationFrame(loop);
}

/**
 * Event called when user presses the select-data button. This method is responsible
 * for coordinating the highlight tip feature.
 */
function userHighlightSelect() {
  const attr = $("#highlight-options").val();
  const cat = "branch_color";
  const val = $("#color-selector").val().toUpperCase().slice(1);
  const l = $("#lower-bound").val();
  const u = $("#upper-bound").val();
  const e = $("#category").val();

  selectHighlight(attr, cat, val, l, u, e);
  $.getJSON(urls.tableChangeURL, {attribute: attr, lower: l, equal: e,
            upper: u}, function(data){
    updateGridData(data);
  });
  addHighlightItem(attr, val, l, u, e);
}

/**
 * Creates html an html object that is used to show users the history of
 * what they have choosen to highlight. Users can use this object to change
 * the color of the highlighted feature or delete it.
 *
 * @param {String} the attribute that has been highlighted
 * @param {String} the color of the highlighted feature
 * @param {integer} the lower bound of the search value (if any)
 * @param {integer} the upper bound of the search value (if any)
 * @param {integer/string} an exact value of the search value (if any)
 */
function addHighlightItem(attr, val, l, u, e) {
  numUserSelects++;

  // the container for the highlighted item
  let newAttrItem = document.createElement("div");
  newAttrItem.setAttribute("class", "attr-item");
  newAttrItem.setAttribute("id", numAttr);

  // the button used to display the highlighted tips in SlickGrid
  let select = document.createElement("INPUT");
  select.setAttribute("class", "btn")
  select.setAttribute("type", "button");
  select.setAttribute("value", "Show in table");
  select.setAttribute("onclick", "selectTable(this)");
  newAttrItem.appendChild(select);

  // the color input used to change the color of the highlighted tips
  let colorSelector = document.createElement("INPUT");
  colorSelector.setAttribute("type", "color");
  colorSelector.setAttribute("value", "#" + val);
  colorSelector.setAttribute("onchange", "changeHighlightSelect(this)");
  newAttrItem.appendChild(colorSelector);

  // the clear button to clear the highlighted tips
  let clear = document.createElement("INPUT");
  clear.setAttribute("type", "button");
  clear.setAttribute("value", "clear");
  clear.setAttribute("onclick", "clearSelection(this)");
  newAttrItem.appendChild(clear);

  // The label used to show the user what the search criteria
  let attrLabel = document.createElement("label");
  attrLabel.setAttribute("class", "attr");

  // create the label
  let operator;
  let compVal;
  if(l !== "") {
    operator = " > ";
    compVal = l;
  } else if (u !== "") {
    operator = " < ";
    compVal = u;
  } else {
    operator = " ==  ";
    compVal = e;
  }
  let item = {
    attr : attr,
    operator : operator,
    compVal : compVal,
    color : val
  };
  attrItem[numAttr++] = item;
  attrLabel.innerHTML = attr + operator + compVal;
  newAttrItem.appendChild(attrLabel);

  // add item to html document
  $(".metadata-tabs")[0].appendChild(newAttrItem);
}

/**
 * Creates html an html object that is used to show users the history of
 * what clades they have choosen to color. Users can use this object to change
 * the color of the clade or delete it.
 *
 * @param {string} the name the clade
 * @param {string} a hex string that represent the color of the clade
 */
function addCladeItem(clade, color) {
  // container for the item
  let newAttrItem = document.createElement("div");
  newAttrItem.setAttribute("class", "color-item");
  newAttrItem.setAttribute("id", "clade-" + labelPos++);

  // the clear button
  let clear = document.createElement("INPUT");
  clear.setAttribute("type", "button");
  clear.setAttribute("class", "clr");
  clear.setAttribute("value", "clear");
  clear.setAttribute("onclick", "clearColorSelection(this)");
  newAttrItem.appendChild(clear);

  // the color select
  let colorSelector = document.createElement("INPUT");
  colorSelector.setAttribute("type", "color");
  colorSelector.setAttribute("value", "#" + color);
  colorSelector.setAttribute("id", "arc-color");
  colorSelector.setAttribute("onchange", "changeColorSelection(this)");
  newAttrItem.appendChild(colorSelector);

  // label to show users which clade this item belongs to
  let attrLabel = document.createElement("label");
  attrLabel.setAttribute("class", "cld");
  attrLabel.innerHTML = clade;
  newAttrItem.appendChild(attrLabel);

  // add item to html document
  $(".metadata-tabs")[0].appendChild(newAttrItem);
}

/**
 * The event that is called when users presses the clear button in the clade color
 * item
 *
 * @param {Object} the clear button that the user pressed. The button id is used to
 * determine where the clade in located in drawingData.coloredClades
 */
function clearColorSelection(obj) {
  let arcID = obj.parentElement.id;
  updateColorSelection(arcID, CLEAR_COLOR_HEX);
  obj.parentNode.remove();
}

/**
 * The event that is called when users change the color of a clade.
 *
 * @param {Object} the color input the user used to change the color.
 */
function changeColorSelection(obj) {
  let arcID = obj.parentElement.id;
  let color = obj.value.slice(1);
  updateColorSelection(arcID, color)
}

/**
 * Changes the color of a clade
 *
 * @param {integer} The position of a clade within drawingData.coloredClades
 * @param {string} a hex string that represent what color to change the clade to
 */
function updateColorSelection(arcID, color) {
  const MAX_NUM = 255;
  color = color.match(/.{1,2}/g);
  // convert the 2 digit hex string into a float
  color = color.map(function(element) {
    return parseInt("0x" + element) / MAX_NUM;
  });
  const CLADE_ID = "clade-";
  const BASE = 10;
  const RED_VERT = 2;
  const GREEN_VERT = 3;
  const BLUE_VERT = 4;
  const RED = 0;
  const GREEN = 1;
  const BLUE = 2;

  // Calculate where the clade vertices begin and end
  let start = parseInt(arcID.replace(CLADE_ID, ''), BASE);
  start *= TRI_PER_ARC * ELEMENTS_PER_VERT * VERT_PER_TRI;
  let end = start + TRI_PER_ARC * ELEMENTS_PER_VERT * VERT_PER_TRI;

  // Change the color of the clade to be equal to the background color
  for(let i = start; i < end; i += ELEMENTS_PER_VERT) {
    drawingData.coloredClades[i + RED_VERT] = color[RED];
    drawingData.coloredClades[i + GREEN_VERT] = color[GREEN];
    drawingData.coloredClades[i + BLUE_VERT] = color[BLUE];
  }

  // update webgl buffer
  fillBufferData(shaderProgram.cladeVertBuffer, drawingData.coloredClades);
  requestAnimationFrame(loop);
}

/*
 * Highlights the user selected metadata
 *
 * @param {string} the feature to highlght
 * @param {string} the feature that holds the color
 * @param {integer} the lower bound of the search value (if any)
 * @param {integer} the upper bound of the search value (if any)
 * @param {integer/string} an exact value of the search value (if any)
 */
function selectHighlight(attr, cat, val, l, u, e) {
  let edges;
  $.getJSON(urls.highlightURL, {attribute: attr, category: cat,
            value: val, lower: l, equal: e, upper: u}, function(data) {
    edges = data;
  }).done(function() {
    drawingData.edgeCoords = extractInfo(edges, field.edgeFields);
    fillBufferData(shaderProgram.treeVertBuffer, drawingData.edgeCoords);
    requestAnimationFrame(loop);
  });
}

/**
 * The event called when a user want to highlight a clade.
 */
function userCladeColor() {
  const color = $("#clade-color-selector").val().toUpperCase().slice(1);
  const clade = $("#clade").val();
  let nodeCoords;

  $.getJSON(urls.cladeColorURL, { clade: clade,
            color: color}, function(data) {
    let center = vec2.create();
    vec2.set(center, data.center_x, data.center_y);
    let arcLength = data.arc_length;
    let startTheta = data.starting_angle;
    let totalTheta = data.theta;
    let color = data.color;
    let sector = createArcSector(center, arcLength, startTheta, totalTheta, color);
    drawingData.coloredClades = drawingData.coloredClades.concat(sector);
  }).done(function() {
    fillBufferData(shaderProgram.cladeVertBuffer, drawingData.coloredClades);
    requestAnimationFrame(loop);
  });

  addCladeItem(clade, color);
}

/*
 * Shows the selected menu and hides the other ones
 *
 * @param {string} the menu to show
 */
function showMenu(menuName) {
  if(menuName === "highlight") {
    $("#highlight-input").show();
    $("#color-input").hide();
    $("#select-highlight").attr("onclick", "userHighlightSelect()");
    $("#color-selector").show();
  }
  else {
    $("#highlight-input").hide();
    $("#color-input").show();
  }
  if(menuName === "subTree") {
    $("#highlight-input").show();
    $("#color-input").hide();
    $("#select-highlight").attr("onclick", "newTree()");
    $("#color-selector").hide();
  }
}

/**
 * The event called when the user wants to remove a highlighted feature
 *
 * @param{Object} the clear button.
 */
function clearSelection(obj) {
  let item = attrItem[obj.parentElement.id];
  let attr = item.attr;
  let cat = "branch_color";
  let val = item.color;
  let l = '';
  let u = '';
  let e = '';

  if(item.operator === " > " ) {
    l = item.compVal;
  } else if(item.operator === " < ") {
    u = item.compVal;
  } else {
    e = item.compVal;
  }
  selectHighlight(attr, cat, "FFFFFF", l, u, e);

  delete attrItem[obj.parentElement.id];
  obj.parentNode.remove();
  gridInfo.grid.invalidate();

  numUserSelects--;
  if(numUserSelects === 0) {
    updateGridData(gridInfo.initData);
    requestAnimationFrame(loop);
  }
  else {
    let oldItem;
    for(let i in attrItem) {
      oldItem = attrItem[i];
      l = '';
      u = '';
      e = '';
      if(oldItem.operator === " > " ) {
        l = oldItem.compVal;
      } else if(oldItem.operator === " < ") {
        u = oldItem.compVal;
      } else {
        e = oldItem.compVal;
      }
      selectHighlight(oldItem.attr, cat, oldItem.color, l, u, e)
    }
  }
}

/**
 * Changes the metadata shown in SlickGrid to match the highlighted feature that
 * was selected.
 *
 * @param {Object} The button that corresponds to the highlighted feature.
 */
function selectTable(obj) {
  const item = attrItem[obj.parentElement.id];
  let l = '', u = '', e = '';
  if(item.operator === " > " ) {
    l = item.compVal;
  } else if(item.operator === " < ") {
    u = item.compVal;
  } else {
    e = item.compVal;
  }
  $.getJSON(urls.tableChangeURL, {attribute: item.attr, lower: l, equal: e,
            upper: u}, function(data){
    updateGridData(data);
  });
}

/**
 * Changes the color of a highlighted feature
 *
 * @param {Object} The color select of the highlighted feature
 */
function changeHighlightSelect(obj) {
  const item = attrItem[obj.parentElement.id];
  const attr = item.attr;
  const cat = "branch_color";
  const color = obj.value.toUpperCase().slice(1);
  attrItem[obj.parentElement.id].color = color;
  let l = '';
  let u = '';
  let e = '';

  if(item.operator === " > " ) {
    l = item.compVal;
  } else if(item.operator === " < ") {
    u = item.compVal;
  } else {
    e = item.compVal;
  }

  selectHighlight(attr, cat, color, l, u, e);
}

/**
 *
 */
function extractLabels(labs, labId) {
  let tempLabels = {};
  for(let i in labs) {
    let label = labs[i];
    let l = {
      x : label["x"],
      y : label["y"],
      label : label[labId]
    };
    tempLabels[i] = l;
  }
  let numLabels = Object.keys(tempLabels).length;
  labels = new Array(numLabels);
  for(let i = 0; i < numLabels; ++i) {
    labels[i] = [tempLabels[i].x, tempLabels[i].y, tempLabels[i].label];
  }
  requestAnimationFrame(loop);
}

function fillBufferData(buffer, data) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
}

function newTree() {
  const attr = $("#highlight-options").val();
  const l = $("#lower-bound").val();
  const u = $("#upper-bound").val();
  const e = $("#category").val();
  $.getJSON(urls.subTreeURL, {attribute: attr, lower: l, equal: e,
            upper: u}, function(data){
    drawingData.edgeCoords = extractInfo(data, field.edgeFields);
    fillBufferData(shaderProgram.treeVertBuffer, drawingData.edgeCoords);
    updateGridData(data);
    labels = {}
    clearCladeHighlights();
    requestAnimationFrame(loop);
  });
}

function getOldTree(event) {
  $.getJSON(urls.oldTreeURL, {}, function(data){
    drawingData.edgeCoords = extractInfo(data, field.edgeFields);
    fillBufferData(shaderProgram.treeVertBuffer, drawingData.edgeCoords);
    updateGridData(data);
    labels = {};
    clearCladeHighlights();
    requestAnimationFrame(loop);
  });
}

function clearCladeHighlights() {
  drawingData.coloredClades = [];
  labelPos = 0;
  fillBufferData(shaderProgram.cladeVertBuffer, drawingData.coloredClades);
  let divContainerElement = document.getElementsByClassName("color-item");
  console.log(divContainerElement);
  let numItems = divContainerElement.length
  const NEXT_CHILD = 0;
  for(let i = 0; i < numItems; i++) {
    divContainerElement[NEXT_CHILD].parentElement.removeChild(divContainerElement[NEXT_CHILD]);
  }
}
