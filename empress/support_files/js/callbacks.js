"use strict";

/**
 * tells javasript what function to call for mouse/keyboard events
 */
function initCallbacks(){
  const SHFT_KEY = 16;
  const DELAY = 500;
  window.onTreeSurface = false;
  $(".tree-surface").on("mousedown", mouseHandler);
  $(document).on("mouseup", mouseHandler);
  $(document).on("mousemove", mouseHandler);
  $(".tree-surface").mouseleave(function() {
    console.log("cancel hover");
    clearTimeout(window.hoverTimer);
    let box = document.getElementById("hover-box");
    box.classList.add("hidden");
    })
  $(".tree-surface")[0].onwheel = mouseHandler;
  $(".tree-surface").hover(function() {window.onTreeSurface = true;},
      function(){window.onTreeSurface=false;})
  $(window).on("resize", resizeCanvas);

  $(".tree-surface")[0].ondblclick = mouseHandler;

  $(document).keydown(function(e) {
    shftPress = (e.which === SHFT_KEY) ? true : false;
  });
  $(document).keyup(function() {
    if(shftPress) {
      shftPress = false;
    }
  });
}

/**
 * Canvas hover event.
 * @function hover
 * @param {number} x - x-coordinate
 * @param {number} y - y-coordinate
 */
function hover(x, y) {
  if ($("body").css("cursor") !== "none") {
    nodeHover(x, y);
    triangleHover(x, y);
  }
}


/**
 * Hover on node.
 * @function nodeHover
 * @param {number} x - x-coordinate
 * @param {number} y - y-coordinate
 * @returns true if node hover box was create, false otherwise
 */
function nodeHover(x, y) {
  let id;
  let close = 10;
  let columns = ["Node_id"];
  let canvas = $(".tree-surface")[0];
  let info;
  let point = toTreeCoords(x,y)
  $.getJSON(urls.nodeHoverURL, {x: point[0], y: point[1]}, function(data) {
    info = data;
  }).done(function() {
      let box = document.getElementById("hover-box");
      box.classList.add("hidden");
    if(Object.keys(info).length !== 0) {
      // generate hover box
      let nx = info["x"][0];
      let ny = info["y"][0];
      drawingData.hoveredNode = [nx, ny, 0, 1, 0];

      // nodeHoverBox(info["Node_id"][0]);
      nodeHoverBox(info);

      // calculate the screen coordinate of the label
      let treeSpace = vec4.fromValues(nx, ny, 0, 1);
      let screenSpace = vec4.create();
      vec4.transformMat4(screenSpace, treeSpace, shaderProgram.mvpMat);
      screenSpace[0] /= screenSpace[3];
      screenSpace[1] /= screenSpace[3];
      let pixelX = (screenSpace[0] * 0.5 + 0.5) * canvas.offsetWidth;
      let pixelY = (screenSpace[1] * -0.5 + 0.5) * canvas.offsetHeight;

      // show hover box
      box.style.left = Math.floor(pixelX + 23) + "px";
      box.style.top = Math.floor(pixelY - 43) + "px";
      box.classList.remove("hidden");
    }

    fillBufferData(shaderProgram.hoverNodeBuffer, drawingData.hoveredNode);
    requestAnimationFrame(loop);
  });
}


/**
 * Hover on clade.
 * @function triangleHover
 * @param {number} x - x-coordinate
 * @param {number} y - y-coordinate
 */
function triangleHover(x, y) {
  let treeCoords = toTreeCoords(x, y);
  let info;
  let canvas = $(".tree-surface")[0];
  $.getJSON(urls.triangleHoverURL, {"x": treeCoords[0], "y": treeCoords[1]}, function(data){
    info = data;
  }).done(function(){
    let box = document.getElementById("hover-box");
    if(Object.keys(info).length !== 0) {
      // generate hover box
      cladeHoverBox(info);

      // show hover box
      box.style.left = Math.floor(x + 23) + "px";
      box.style.top = Math.floor(y - 43) + "px";
      box.classList.remove("hidden");
    }
  });
}


/**
 * Refresh hover box for node.
 * @function nodeHoverBox
 * @param {number} clsID - node ID
 */
function nodeHoverBox(info) {
  // let taxPrefix = getTaxPrefix();
  let table = document.getElementById("hover-table");
  table.innerHTML = "";

  // add items to hover box
  let row, cell, k;
  for(k in info) {
    row = table.insertRow(-1);
    cell = row.insertCell(-1);
    cell.innerHTML = k;
    cell = row.insertCell(-1);
    cell.innerHTML = info[k][0];
  }
}


/**
 * Refresh hover box for collapsed clade.
 * @function cladeHoverBox
 * @param {number} clsID - node ID
 */
function cladeHoverBox(info) {
  let table = document.getElementById("hover-table");
  table.innerHTML = "";

  // add items to hover box
  let row, cell, k;
  for(k in info) {
    row = table.insertRow(-1);
    cell = row.insertCell(-1);
    cell.innerHTML = k;
    cell = row.insertCell(-1);
    cell.innerHTML = info[k];
  }
}


function autoCollapseTree() {
  let selectElm = $("#collapse-level");
  let taxLevel = $("#collapse-cb").is(":checked") ? selectElm.val() : "reset";
  let disabled = !$("#collapse-cb").is(":checked");
  let result;
  selectElm.attr("disabled", disabled);
  $.getJSON(urls.collapseURL, {tax_level: taxLevel}, function(data) {
    result = data;
  }).done(function() {
    let edgeData = result.edges;
    drawingData.numBranches = edgeData.length;
    drawingData.triangles = result.triData;
    fillBufferData(shaderProgram.treeVertBuffer, edgeData);
    fillBufferData(shaderProgram.triangleBuffer, drawingData.triangles);
    requestAnimationFrame(loop);
  });
}

/**
 * Resize the drawing canvas to fix the screen.
 * @param {Object} resize - event used to dynamically resize the html document.
 */
function resizeCanvas(event) {
  setCanvasSize(gl.canvas);
  setPerspective();
  requestAnimationFrame(loop);
}


/**
 * Display a color key in the legend box.
 * @param {string} name - key name
 * @param {Object} info - key information
 * @param {Object} container - container DOM
 * @param {boolean} gradient - gradient or discrete
 */
function addColorKey(name, info, container, gradient) {
  if (name) {
    let div = document.createElement("div");
    div.classList.add("legend-title");
    div.innerHTML = name;
    container.appendChild(div);
  }
  if (gradient) {
    addContinuousKey(info, container);
  } else {
    addCategoricalKey(info, container);
  }
}


/**
 * Format a number that is to be displayed in a label.
 * @param {number} num - number to be formatted
 * @returns {string} formatted number
 */
function formatNumLabel(num) {
  return num.toPrecision(4).replace(/\.?0+$/, "");
}


/**
 * Display a continuous color key.
 * @param {Object} info - key information
 * @param {Object} container - container DOM
 */
function addContinuousKey(info, container) {
  // create key container
  let div = document.createElement("div");
  div.classList.add("gradient-bar");

  // min label
  let component = document.createElement("label");
  component.classList.add("gradient-label");
  component.innerHTML = formatNumLabel(info.min[0]);
  div.appendChild(component);

  // color gradient
  component = document.createElement("div");
  component.classList.add("gradient-color");
  component.setAttribute("style", "background: linear-gradient(to right, " +
    info.min[1] + " 0%, " + info.max[1] + " 100%);");
  div.appendChild(component);

  // max label
  component = document.createElement("label");
  component.classList.add("gradient-label");
  component.innerHTML = formatNumLabel(info.max[0]);
  div.appendChild(component);

  container.appendChild(div);
}


/**
 * Display a categorical color key.
 * @param {Object} info - key information
 * @param {Object} container - container DOM
 */
function addCategoricalKey(info, container) {
  let key;
  let category = container.innerText;
  let i = 0;
  for (key in info) {
    // create key container
    let div = document.createElement("div");
    div.classList.add("gradient-bar");

    // color gradient
    let component = document.createElement("div");
    component.classList.add("category-color");
    component.setAttribute("style", "background: " + info[key] + ";");
    component.addEventListener("click", function(color, cat, val) { return function () {
        test(color, cat, val);
      };
    }(info[key], category, key), false)
    div.appendChild(component);

    // label
    component = document.createElement("label");
    component.classList.add("gradient-label");
    component.innerHTML = key;
    component.title = key;
    div.appendChild(component);

    container.appendChild(div);
  }
}

/**
 * Event called when user presses the select-data button.
 * @function userHighlightSelect
 * This method is responsible for coordinating the highlight tip feature.
 */
function userHighlightSelect(triggerBy) {
  const RANKS = ["kingdom", "phylum", "class", "order", "family", "genus", "species"  ];
  let  prefix;
  let edgeData;
  let selectElm = $("#collapse-level");
  let tipKey = document.getElementById("tip-color-key");
  let nodeKey = document.getElementById("node-color-key");
  let result;

  let tipChecked = document.getElementById("tip-color").checked;
  let branchChecked = document.getElementById("branch-color").checked;

  // check to see if tips should be colored
  let colorTip = triggerBy.type === "checkbox" && triggerBy.checked && triggerBy.id.includes("tip")
                 || triggerBy.id === "tip-color-options" || triggerBy.id === "tip-color-number"
                 || triggerBy.id === "tip-color-cm";

  // check to see if internal nodes should be colored
  let colorNode = triggerBy.type === "checkbox" && triggerBy.checked && triggerBy.id.includes("branch")
                 || triggerBy.id === "branch-color-options" || triggerBy.id === "branch-color-number"
                 || triggerBy.id === "branch-color-cm";

  let tip = triggerBy.id.includes("tip");
  let totalUnique = (tip) ? $("#tip-color-number").val() : $("#branch-color-number").val();
  let color = (tip) ? $("#tip-color-cm").val() : $("#branch-color-cm").val()

  $("#tip-color-number").attr("disabled", !tipChecked);
  $("#branch-color-number").attr("disabled", !branchChecked);

  // toogle the tip color map select box
  if (tipChecked) {
    document.getElementById("tip-color-cm-label").classList.remove("hidden");
    document.getElementById("tip-color-cm").classList.remove("hidden");
  }
  else {
    document.getElementById("tip-color-cm-label").classList.add("hidden");
    document.getElementById("tip-color-cm").classList.add("hidden");
  }

  if (branchChecked) {
    document.getElementById("branch-color-cm-label").classList.remove("hidden");
    document.getElementById("branch-color-cm").classList.remove("hidden");
  } else {
    document.getElementById("branch-color-cm-label").classList.add("hidden");
    document.getElementById("branch-color-cm").classList.add("hidden");
  }

  // clear either the tip or internal node color
  if(triggerBy.type === "checkbox" && !triggerBy.checked) {
    if(tip) {
      $("#tip-color-options").attr("disabled", true);
      tipKey.innerHTML = "";
      tipKey.classList.add("hidden");
    }
    else {
      $("#branch-color-options").attr("disabled", true);
      nodeKey.innerHTML = "";
      nodeKey.classList.add("hidden");
    }
    $.getJSON(urls.newHighlightURL, {attribute: "reset", cm: "color", total_unique: 0, "tip": tip}, function(data) {
      result = data;
    }).done(function() {
      // draw new tree
      drawingData.numBranches = result.edgeData.length
      fillBufferData(shaderProgram.treeVertBuffer, result.edgeData);
      requestAnimationFrame(loop);
    });
  }

  // color branches
  if(colorTip || colorNode) {
    let key = (tip) ? tipKey : nodeKey;
    let option = (tip) ? "#tip-color-options" : "#branch-color-options";

    // reset tip color key
    key.innerHTML = "";

    // extract the categroy used to color tree
    let cat = $(option).val();

    // call the model to color tree
    let result;
    $(option).attr("disabled", false);
    $.getJSON(urls.newHighlightURL, {attribute: cat, cm: color, total_unique: totalUnique, "tip": tip}, function(data) {
      result = data;
    }).done(function() {
      // create the tip key
      key.classList.remove("hidden");
      let postfix = (tip) ? " (tips)" : " (branches)";
      addColorKey(cat + postfix, result["keyInfo"], key, result["gradient"]);

      // draw new tree
      drawingData.numBranches = result.edgeData.length
      fillBufferData(shaderProgram.treeVertBuffer, result.edgeData);
      requestAnimationFrame(loop);
    });
  }

  $.getJSON(urls.updateCollapseCladeURL, {}, function(data) {
    result = data;
  }).done(function() {
    drawingData.triangles = result.triData;
    fillBufferData(shaderProgram.triangleBuffer, drawingData.triangles);
    requestAnimationFrame(loop);
  });
}

function userCladeColor(triggerBy){
  const taxLevel = $("#rank-color-options").val();
  let rankChecked = document.getElementById("rank-color").checked;
  let key = document.getElementById("clade-color-key");
  key.classList.add("hidden");
  if (rankChecked) {
    document.getElementById("rank-color-cm-label").classList.remove("hidden");
    document.getElementById("rank-color-cm").classList.remove("hidden");
  } else {
    document.getElementById("rank-color-cm-label").classList.add("hidden");
    document.getElementById("rank-color-cm").classList.add("hidden");
  }
  // const cm = $("#color-options-tax").val();
  $("#rank-color-number").attr("disabled", !rankChecked);
  if(triggerBy.type === "checkbox" && triggerBy.checked || triggerBy.id === "rank-color-options"
     || triggerBy.id === "rank-color-number" || triggerBy.id === "rank-color-cm") {
    $("#rank-color-options").attr("disabled", false);
    let totalUnique = $("#rank-color-number").val()
    let color = $("#rank-color-cm").val();
    $.getJSON(urls.newCladeColor, {tax_level: taxLevel, total_unique: totalUnique, color: color}, function(result){
      key.innerHTML = "";
      key.classList.remove("hidden");
      loadColorClades(result["clades"]);
      addColorKey(taxLevel + " (clades)", result["keyInfo"], key, false);
    });
  }
  else {
    $("#rank-color-options").attr("disabled", true);
    $.getJSON(urls.newCladeColor, {tax_level: "reset", total_unique: 0, color: ""}, function(result) {
      loadColorClades(result["clades"]);
    })
  }
}

function retrieveTaxonNodes(triggerBy) {
  let attribute;
  let node;
  let selectElm, numElm;
  const NEGATE = -1;
  const X = 0;
  const Y = 1;
  const VALUE = 2;
  const NODE = 4;

  // // find the top left corner of the viewing window in tree space
  let boundingBoxDim = camera.pos[2] + shaderProgram.zTransMat[14];
  let topLeft = vec4.fromValues(NEGATE * boundingBoxDim, boundingBoxDim, 0, 1);
  vec4.transformMat4(topLeft, topLeft, shaderProgram.xyTransMat);

  // find the bottom right corner of the viewing window in tree space
  let bottom = NEGATE * camera["bottomSlope"] * boundingBoxDim;
  let bottomRight = vec4.fromValues(boundingBoxDim, bottom, 0, 1);
  vec4.transformMat4(bottomRight, bottomRight, shaderProgram.xyTransMat);

  // find where the range of the viewing window along the the x/y axis
  let minX = topLeft[X], maxX = bottomRight[X];
  let minY = bottomRight[Y], maxY = topLeft[Y];

  if($("#tips").is(":checked")) {
    selectElm = $("#tips-find-level");
    numElm = $("#tips-number");
    selectElm.attr("disabled", false);
    numElm.attr("disabled", false);
    attribute = selectElm.val();
    let n = numElm.val();
    let result;
    $.getJSON(urls.labelsURL, {min_x: minX, max_x: maxX, min_y: minY, max_y: maxY, attribute: attribute, n: n, tip:true}, function(data){
      result = data;
    }). done(function(){
      tipLabels = result.labels;
      requestAnimationFrame(loop);
    });
  } else {
    tipLabels = [];
    requestAnimationFrame(loop);
  }

  if($("#internal-nodes").is(":checked")) {
    console.log("???")
    selectElm = $("#nodes-find-level");
    numElm = $("#internal-nodes-number");
    selectElm.attr("disabled", false);
    numElm.attr("disabled", false);
    attribute = selectElm.val();
    let n = numElm.val();
    let result;
    $.getJSON(urls.labelsURL, {min_x: minX, max_x: maxX, min_y: minY, max_y: maxY, attribute: attribute, n: n, tip:false}, function(data){
      result = data;
    }). done(function(){
      nodeLabels = result.labels;
      requestAnimationFrame(loop);
    });
  } else {
    nodeLabels = [];
    requestAnimationFrame(loop);
  }
}

function clearLabels(container) {
   let divContainerElement = document.getElementById(container);
    while(divContainerElement.firstChild) {
      divContainerElement.removeChild(divContainerElement.firstChild);
    }
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

/**
 * Sort genome/node IDs by numeric part from 2nd character
 * @function sort2ndNum
 * @param {string} a - left side
 * @param {string} b - right side
 */
function sort2ndNum(a, b) {
  return parseInt(a.slice(1)) - parseInt(b.slice(1));
}

/**
 * Display a message in toast.
 * @function toastMsg
 * @param {string} msg - message to display
 * @param {number} duration - milliseconds to keep toast visible
 */
function toastMsg(msg, duration) {
  duration = duration || 2000;
  var toast = document.getElementById("toast");
  toast.innerHTML = msg;
  toast.classList.remove("hidden");
  setTimeout(function(){
    toast.classList.add("hidden");
  }, duration);
}
