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
 * Pans the tree if mouse down flag is set
 */
function mouseMove(event) {
  if (!drawingData.isMouseDown) {
    return;
  }

  const newX = event.clientX;
  const newY = event.clientY;
  const dx = (newX - drawingData.lastMouseX) * drawingData.zoomAmount;
  const dy = (newY - drawingData.lastMouseY) * drawingData.zoomAmount;
  const transVec = vec3.fromValues(dx,-dy,0);
  let addTransMat = mat4.create();

  mat4.fromTranslation(addTransMat,transVec);
  mat4.multiply(shaderProgram.worldMat, shaderProgram.worldMat,addTransMat);

  drawingData.lastMouseX = newX;
  drawingData.lastMouseY = newY;
  requestAnimationFrame(loop);
}

/*
 * zooms tree and this is where selective rendering will take place
 */
function mouseWheel(event) {
  let scaleByMat = new Float32Array(16);
  const scaleAmount = (event.deltaY >= 0) ? drawingData.scaleFactor : 1 / drawingData.scaleFactor;
  drawingData.zoomAmount = drawingData.zoomAmount / scaleAmount;
  let scaleFactorVec = vec3.fromValues(scaleAmount, scaleAmount, scaleAmount);
  mat4.fromScaling(scaleByMat, scaleFactorVec);
  mat4.mul(shaderProgram.worldMat, scaleByMat, shaderProgram.worldMat);

  requestAnimationFrame(loop);
}

/*
 * resizes the drawing canvas to fix the screen
 */
function resizeCanvas(event) {
  setCanvasSize(gl.canvas);
  setUpCamera();
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

  let group = document.createElement("SELECT");
  group.setAttribute("id", "group-number");
  newAttrItem.appendChild(group);

  let select = document.createElement("INPUT");
  select.setAttribute("type", "button");
  select.setAttribute("value", "select");
  select.setAttribute("onclick", "selectTable(this)");
  newAttrItem.appendChild(select);

  let colorSelector = document.createElement("INPUT");
  colorSelector.setAttribute("type", "color");
  colorSelector.setAttribute("value", "#" + val);
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

  $(".attr-selector")[0].appendChild(newAttrItem);
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
    drawingData.largeDim = normalizeTree(edges);
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
  if(menuName === "leaf") {
    fillDropDownMenu(field.leaf_headers.headers);
    $("#select-data").attr("onclick", "userHighlightSelect()");
  }
  else {
    fillDropDownMenu(field.internal_headers.headers);
    $("#select-data").attr("onclick", "userCladeColor()");
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

function selectLabel(obj) {
  let label_coords;
  $.getJSON(urls.labelURL, {label : "Node_id", value : "G000005825" }, function(data) {
    label_coords = data;
  }).done(function() {
    labels = {};
    for(let l in label_coords) {
      let label = {
        label : label_coords[l].Node_id,
        x : label_coords[l].x,
        y : label_coords[l].y
      };
      labels[l] = label;
    }
    requestAnimationFrame(loop);
  });
}

function extractLabels(labs) {
  labels = {};
  for(let l in labs) {
    let label = {
      label : labs[l].Node_id,
      x : labs[l].x,
      y : labs[l].y
    };
    labels[l] = label;
  }
  requestAnimationFrame(loop);
}
