"use strict";

/**
 * tells javasript what function to call for mouse/keyboard events
 */
function initCallbacks(){
  const SHFT_KEY = 16;
  $(".tree-surface")[0].onmousedown = mouseHandler;
  document.onmouseup = mouseHandler;
  document.onmousemove = mouseHandler;
  $(".tree-surface")[0].onwheel = mouseHandler;

  window.onresize = resizeCanvas;

  $(".tree-surface")[0].ondblclick = mouseHandler;

  $(document).keydown(function(e) {
    shftPress = (e.which === SHFT_KEY) ? true : false;
  });
  $(document).keyup(function() {
    if(shftPress) {
      shftPress = false;
      let square = $(".square");
      let offset = square.offset();
      drawingData.lastMouseX = offset.left, drawingData.lastMouseY = offset.top;
      let width = square.width(), height = square.height();
      let topCorner = toTreeCoords(drawingData.lastMouseX, drawingData.lastMouseY);
      let bottomCorner = toTreeCoords(drawingData.lastMouseX + width, drawingData.lastMouseY + height);
      let edgeMetadata;
      $.getJSON(urls.selectTreeURL, {x1: topCorner[0], y1: topCorner[1],
                x2: bottomCorner[0], y2: bottomCorner[1]}, function(data) {
        edgeMetadata = data;
      }).done(function() {
        if(edgeMetadata.length === 0) {
          $(".selected-tree-menu").css({top: drawingData.lastMouseY, left: drawingData.lastMouseX, visibility: "hidden"});
          return;
        }
        drawingData.selectTree = extractInfo(edgeMetadata, field.edgeFields);
        updateGridData(edgeMetadata);
        fillBufferData(shaderProgram.selectBuffer, drawingData.selectTree);
        $(".selected-tree-menu").css({top: drawingData.lastMouseY, left: drawingData.lastMouseX, visibility: "visible"});
        requestAnimationFrame(loop);
      });
    }
  });
}

function autoCollapseTree() {
  console.log('Auto Collapse Tree')
  let collapsLevel = $("#collapse-level").val();
  const cm = $("#color-options-collapse").val();
  const attribute = $("#collapse-options").val();
  $.getJSON(urls.autoCollapseURL, {attribute: attribute, collapse_level: collapsLevel, cm : cm}, function(data){
    console.log("Auto Collapse Tree data return")
    let edgeData = extractInfo(data, field.edgeFields);
    drawingData.numBranches = edgeData.length
    fillBufferData(shaderProgram.treeVertBuffer, edgeData);
    $.getJSON(urls.trianglesURL, {}, function(data) {
      drawingData.triangles = extractInfo(data, field.triangleFields);
      fillBufferData(shaderProgram.triangleBuffer, drawingData.triangles);
    }).done(function() {
      requestAnimationFrame(loop);
    });
  });
}
function selectedTreeCollapse() {
  $(".selected-tree-menu").css({visibility: "hidden"})
  $.getJSON(urls.collapseSTreeURL, {}, function(data) {
    let edgeData = extractInfo(data, field.edgeFields);
    drawingData.numBranches = edgeData.length
    fillBufferData(shaderProgram.treeVertBuffer, edgeData);
    drawingData.selectTree = [];
    fillBufferData(shaderProgram.selectBuffer, drawingData.selectTree);
    $.getJSON(urls.trianglesURL, {}, function(data) {
      drawingData.triangles = extractInfo(data, field.triangleFields);
      fillBufferData(shaderProgram.triangleBuffer, drawingData.triangles);
    }).done(function() {
      requestAnimationFrame(loop);
    });
  });
}


function clearSelectedTreeCollapse(event) {
  let treeCoords = toTreeCoords(event.clientX, event.clientY);
  $.getJSON(urls.uncollapseSTreeURL, {x1: treeCoords[0], y1: treeCoords[1]}, function(data) {
    let edgeData = extractInfo(data, field.edgeFields);
    drawingData.numBranches = edgeData.length
    fillBufferData(shaderProgram.treeVertBuffer, edgeData);
    drawingData.selectTree = [];
    fillBufferData(shaderProgram.selectBuffer, drawingData.selectTree);
    $.getJSON(urls.trianglesURL, {}, function(data) {
      drawingData.triangles = extractInfo(data, field.triangleFields);
      fillBufferData(shaderProgram.triangleBuffer, drawingData.triangles);
    }).done(function() {
      requestAnimationFrame(loop);
    });
  });
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
  const cm = $("#color-options").val();
  selectHighlight(attr, cm);

  // update table?
  // $.getJSON(urls.tableChangeURL, {attribute: attr, lower: l, equal: e,
  //           upper: u}, function(data){
  //   updateGridData(data);
  // });

  //DELETE?
  // addHighlightItem(attr, val, l, u, e);
}

// /** OLD VERSION
//  * Event called when user presses the select-data button. This method is responsible
//  * for coordinating the highlight tip feature.
//  */
// function userHighlightSelect() {
//   const attr = $("#highlight-options").val();
//   const cat = "branch_color";
//   const val = $("#color-selector").val().toUpperCase().slice(1);
//   const l = $("#lower-bound").val();
//   const u = $("#upper-bound").val();
//   const e = $("#category").val();

//   selectHighlight(attr, cat, val, l, u, e);
//   $.getJSON(urls.tableChangeURL, {attribute: attr, lower: l, equal: e,
//             upper: u}, function(data){
//     updateGridData(data);
//   });
//   addHighlightItem(attr, val, l, u, e);
// }

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
  $("#highlight-history")[0].appendChild(newAttrItem);
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
  newAttrItem.setAttribute("id", clade);

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
  $.getJSON(urls.clearColorCladeURL, { clade: arcID}, function(data) {
    loadColorClades(data);
    obj.parentNode.remove();
  });
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
  $.getJSON(urls.cladeColorURL, {cat: "None", clade: arcID, color: color}, function(data) {
    loadColorClades(data);
  });
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
function selectHighlight(attr, cm) {
  let highlight;
  $.getJSON(urls.newHighlightURL, {attribute: attr, cm: cm}, function(data) {
    highlight = data;
  }).done(function() {
    // console.log('start parse')
    // console.log(JSON.parse(highlight.edges))
    let edgeData = extractInfo(JSON.parse(highlight.edges), field.edgeFields);
    drawingData.numBranches = edgeData.length
    // update_selection_grid(highlght);
    fillBufferData(shaderProgram.treeVertBuffer, edgeData);
    requestAnimationFrame(loop);
    console.log('done')
  });
}

function userCladeColor(){
  console.log('ColorClades')
  const attribute = $('#clade-options').val();
  const taxLevel = $("#tax-level").val();
  const cm = $("#color-options-tax").val();
  $.getJSON(urls.newCladeColor, {attribute: attribute, tax_level: taxLevel, cm: cm}, function(data){
    // if(!data.hasOwnProperty('empty')) {
      console.log('loadColorClades');
      loadColorClades(data);
    // }
  })
}
// /**
//  * OLD VERSION
//  * The event called when a user want to highlight a clade.
//  */
// function userCladeColor() {
//   const cat = $("#clade-options").val();
//   const color = $("#clade-color-selector").val().toUpperCase().slice(1);
//   const clade = $("#clade").val();
//   let nodeCoords;

//   $.getJSON(urls.cladeColorURL, {cat: cat, clade: clade, color: color}, function(data) {
//     if(!data.hasOwnProperty('empty')) {
//       loadColorClades(data);
//       addCladeItem(clade, color);
//     }
//   });
// }

/*
 * Shows the selected menu and hides the other ones
 *
 * @param {string} the menu to show
 */
function showMenu(menuName) {
  if(menuName === "highlight") {
    if($("#highlight-input").is(":visible") && $("#color-selector").is(":visible")) {
      hideMenu();
      $(".metadata-tabs").css({opacity: 0.5});
    }
    else {
      hideMenu();
      $("#highlight-input").show();
      $("#color-selector").show();
      $("#select-highlight").attr("onclick", "userHighlightSelect()");
      $("#highlight-history").show();
      $(".metadata-tabs").css({opacity: 1});
    }
  }
  else if(menuName === "subTree") {
    if($("#highlight-input").is(":visible") && !$("#color-selector").is(":visible")) {
      hideMenu();
      $(".metadata-tabs").css({opacity: 0.5});
    }
    else {
      hideMenu();
      $("#highlight-input").show();
      $("#select-highlight").attr("onclick", "newTree()");
      $(".metadata-tabs").css({opacity: 1});
    }
  }
  else if (menuName === "color") {
    if($("#color-input").is(":visible")) {
      hideMenu();
      $(".metadata-tabs").css({opacity: 0.5});
    }
    else {
      hideMenu()
      $("#color-input").show();
      $(".metadata-tabs").css({opacity: 1});
    }
  }
  else if(menuName === 'metadata'){
    if($("#metadata-options").is(":visible")) {
      hideMenu();
      $(".metadata-tabs").css({opacity: 0.5});
    }
    else {
      hideMenu();
      $("#metadata-options").show();
      $(".metadata-tabs").css({opacity: 1});
    }
  }
  else if(menuName === "labels") {
    if($("#label-input").is(":visible")) {
      hideMenu();
      $(".metadata-tabs").css({opacity: 0.5});
    }
    else {
      hideMenu()
      $('#label-input').show();
      $(".metadata-tabs").css({opacity: 1});
    }
  }
  else {
    if($('#collapse-options').is(':visible')){
      hideMenu();
      $(".metadata-tabs").css({opacity: 0.5});
    }
    else {
      hideMenu();
      $('#collapse-options').show();
      $(".metadata-tabs").css({opacity: 1});
    }
  }

}

/**
 * Resets the user menu
 */
function hideMenu() {
  $('#highlight-input').hide();
  $('#color-selector').hide();
  $('#color-input').hide();
  $('#metadata-options').hide();
  $("#highlight-history").hide();
  $('#label-input').hide();
  $('#collapse-options').hide();
}

function showLables() {
  const attr = $("#highlight-options").val();
  let labelsToShow = $("#show-options").val();
  let prioritizeLabel = $("#prioritize-options").val();
  let lbls = gridInfo.grid.getData();
  let sign = $("#descending-toggle").prop("checked") ? -1 : 1;
  let val1, val2, result;
  lbls = lbls.sort(function(dataRow1, dataRow2) {
      val1 = dataRow1[prioritizeLabel];
      val2 = dataRow2[prioritizeLabel];
      if(val1 === null){
        return 1;
      }
      if(val2 === null){
        return -1;
      }
      result = (val1 > val2 ? 1 : -1) * sign;
      return result;
  });
  extractLabels(lbls, labelsToShow);
}

function clearLabels() {
  labels = {};
  requestAnimationFrame(drawLabels);
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
  selectHighlight(attr, cat, "DEFAULT", l, u, e);

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
    loadTree(data);
  }).done(function() {
    $.getJSON(urls.cladeURL, {}, function(data) {
      loadColorClades(data);
    });
  });
}

function getOldTree(event) {
  $.getJSON(urls.oldTreeURL, {}, function(data){
    if(data.length == 0) {
      return;
    }
    loadTree(data);
  }).done(function() {
    $.getJSON(urls.cladeURL, {}, function(data) {
      loadColorClades(data);
    });
  });
}

function toggleMetadata() {
  if($("#show-metadata").prop("checked")) {
    $("#scrolltable").show();
  }
  else {
    $("#scrolltable").hide();
  }
}

function autoCollapse() {
  let tps = $('#tip-slider').val();
  let thrshld = $('#threshold-slider').val();
  $.getJSON(urls.autoCollapse, {tips: tps, threshold: thrshld}, function(data) {
    loadTree(data);
    $.getJSON(urls.trianglesURL, {}, function(data) {
      drawingData.triangles = extractInfo(data, field.triangleFields);
      fillBufferData(shaderProgram.triangleBuffer, drawingData.triangles);
    }).done(function() {
      requestAnimationFrame(loop);
    });
  });
}
