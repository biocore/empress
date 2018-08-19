"use strict";

/*
 * tells javasript what function to call for mouse/keyboard events
 */
function initCallbacks(){
  $(".tree-surface")[0].onmousedown = mouseDown;
  document.onmouseup = mouseUp;
  document.onmousemove = mouseMove;
  $(".tree-surface")[0].onwheel = mouseWheel;
  window.onresize = resizeCanvas;
}

/*
 * stores (x,y) coord of mouse
 */
function mouseDown(event) {
  drawingData.isMouseDown = true;
  drawingData.lastMouseX = event.clientX;
  drawingData.lastMouseY = event.clientY;
}

/*
 * unsets the mouse down flag
 */
function mouseUp(event) {
  drawingData.isMouseDown = false;
}


/*
 * Moves the virtual camera in the xy-plane
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
  const dx = (drawingData.lastMouseX - newX);
  const dy = (newY - drawingData.lastMouseY);
  const transVec = vec3.fromValues(dx, dy,0);
  let addTransMat = mat4.create();

  // modify matrix to move camera in xy-plane
  mat4.fromTranslation(addTransMat,transVec);
  mat4.multiply(shaderProgram.xyTransMat, addTransMat, shaderProgram.xyTransMat);

  // save current mouse coordinates
  drawingData.lastMouseX = newX;
  drawingData.lastMouseY = newY;

  // redraw tree
  requestAnimationFrame(loop);
}

/*
 * Moves the virtual camera along the z axis
 */
function mouseWheel(event) {
  const CAM_Z =2;
  const Z_TRANS = 14;

  let zoomByMat = new Float32Array(16);
  let zoomAmount = (event.deltaY < 0) ? drawingData.zoomAmount : -1 * drawingData.zoomAmount;

  // check to see if camera is maxed zoomed
  let camPos = Math.abs(shaderProgram.zTransMat[Z_TRANS] + camera.pos[CAM_Z]);
  if(camPos <= drawingData.maxZoom && zoomAmount < 0) {
    return;
  }

  // modify the camera
  let zoomVec = vec3.fromValues(0, 0, zoomAmount);
  mat4.fromTranslation(zoomByMat, zoomVec);
  mat4.mul(shaderProgram.zTransMat, zoomByMat, shaderProgram.zTransMat);

  // redraw tree
  requestAnimationFrame(loop);
}

/*
 * resizes the drawing canvas to fix the screen
 */
function resizeCanvas(event) {
  setCanvasSize(gl.canvas);
  setPerspective();
  requestAnimationFrame(loop);
}

function userHighlightSelect() {
  const attr = $("#highlight-options").val();
  const cat = "branch_color";
  const val = $("#color-selector").val().toUpperCase().slice(1);
  const l = $("#lower-bound").val();
  const u = $("#upper-bound").val();
  const e = $("#category").val();

  selectHighlight(attr, cat, val, l, u, e);
  fillTable(val);
  addAttrItem(attr, val, l, u, e);
}

function addAttrItem(attr, val, l, u, e) {
  numUserSelects++;
  let newAttrItem = document.createElement("div");
  newAttrItem.setAttribute("class", "attr-item");
  newAttrItem.setAttribute("id", numAttr);

  // let group = document.createElement("SELECT");
  // group.setAttribute("id", "group-number");
  // newAttrItem.appendChild(group);

  let select = document.createElement("INPUT");
  select.setAttribute("class", "btn")
  select.setAttribute("type", "button");
  select.setAttribute("value", "Show in table");
  select.setAttribute("onclick", "selectTable(this)");
  newAttrItem.appendChild(select);

  let colorSelector = document.createElement("INPUT");
  colorSelector.setAttribute("type", "color");
  colorSelector.setAttribute("value", "#" + val);
  colorSelector.setAttribute("onchange", "changeHighlightSelect(this)");
  newAttrItem.appendChild(colorSelector);

  let clear = document.createElement("INPUT");
  clear.setAttribute("type", "button");
  clear.setAttribute("value", "clear");
  clear.setAttribute("onclick", "clearSelection(this)");
  newAttrItem.appendChild(clear);

  let attrLabel = document.createElement("label");
  attrLabel.setAttribute("class", "attr");
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

  $(".metadata-tabs")[0].appendChild(newAttrItem);
}

function test(arg1) {
  console.log("blah blah");
}

/*
 * Highlights the user selected metadata
 */
function selectHighlight(attr, cat, val, l, u, e) {
  let edges;
  $.getJSON(urls.highlightURL, {attribute: attr, category: cat,
            value: val, lower: l, equal: e, upper: u}, function(data) {
    edges = data;
  }).done(function() {
    drawingData.edgeCoords = extractInfo(edges, field.edgeFields);
    gl.bindBuffer(gl.ARRAY_BUFFER, shaderProgram.treeVertBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER,0,new Float32Array(drawingData.edgeCoords));
    requestAnimationFrame(loop);
  });
}

function userCladeColor() {
  const attr = $("#highlight-options").val();
  const color = $("#color-selector").val().toUpperCase().slice(1);
  const clade = $("#category").val();
  let nodeCoords;

  $.getJSON(urls.cladeColorURL, {attribute: attr, clade: clade,
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
    gl.bindBuffer(gl.ARRAY_BUFFER, shaderProgram.cladeVertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawingData.coloredClades), gl.DYNAMIC_DRAW);
    requestAnimationFrame(loop);
  });

  addAttrItem(attr, color, "", "", clade);
}
/*
 * Shows the selected menu and hides the other ones
 */
function showMenu(menuName) {
  if(menuName === "highlight") {
    fillDropDownMenu(field.leaf_headers.headers);
    // $("#select-data").attr("onclick", "userHighlightSelect()");
    $("#highlight-input").show();
  }
  else {
    fillDropDownMenu(field.internal_headers.headers);
    $("#highlight-input").hide();
  }
}

function clearSelection(obj) {
  let item = attrItem[obj.parentElement.id];
  const attr = item.attr;
  const cat = "branch_color";
  const val = item.color;
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
  fillTable(val);

  obj.parentNode.remove();

  numUserSelects--;
  if(numUserSelects === 0) {
    fillTable(INIT_COLOR);
  }
}

function selectTable(obj) {
  const item = attrItem[obj.parentElement.id];
  const color = item.color;
  fillTable(color);
}

function changeHighlightSelect(obj) {
  const item = attrItem[obj.parentElement.id];
  const attr = item.attr;
  const cat = "branch_color";
  console.log(obj)
  const color = obj.value.toUpperCase().slice(1);
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
  fillTable(color);
}

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
