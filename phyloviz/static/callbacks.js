"use strict";

//global variables
window.isMouseDown = false;
window.lastMouseX = null;
window.lastMouseY = null;
window.zoomAmount = 1; //used to make pan look uniformed when zooming
window.zoomLevel = 0; //current zoom level - used for selective rendering
window.highlightURL = 'http://localhost:8080/highlight';
window.collapseURL = 'http://localhost:8080/collapse';
window.edgeURL = 'http://localhost:8080/api/edges';
window.colorURL = 'http://localhost:8080/color';

/*
 * tells javasript what function to call for mouse/keyboard events
 */
function initCallbacks(){
  console.log("init callbacks");
  window.canvas[0].onmousedown = mouseDown;
  document.onmouseup = mouseUp;
  document.onmousemove = mouseMove;
  window.canvas[0].onwheel = mouseWheel;
}

/*
 * stores (x,y) coord of mouse
 */
function mouseDown(event) {
  window.isMouseDown = true;
  window.lastMouseX = event.clientX;
  window.lastMouseY = event.clientY;
}

/*
 * unsets the mouse down flag
 */
function mouseUp(event) {
  console.log("test up");
  window.isMouseDown = false;
}

/*
 * Pans the tree if mouse down flag is set
 */
function mouseMove(event) {
  if (!window.isMouseDown) {
    return;
  }
  const newX = event.clientX;
  const newY = event.clientY;

  const dx = (newX - window.lastMouseX) * window.zoomAmount;
  const dy = (newY - window.lastMouseY) * window.zoomAmount;
  const transVec = vec3.fromValues(dx,dy,0);
  let addTransMat = mat4.create();
  mat4.fromTranslation(addTransMat,transVec);
  mat4.multiply(window.worldMat, window.worldMat,addTransMat);

  window.lastMouseX = newX
  window.lastMouseY = newY;
  requestAnimationFrame(loop);
}

/*
 * zooms tree and this is where selective rendering will take place
 */
function mouseWheel(event) {
  let scaleByMat = new Float32Array(16);
  const scaleAmount = (event.deltaY >= 0) ? window.scaleFactor : 1 / window.scaleFactor;
  window.zoomAmount = window.zoomAmount / scaleAmount;
  var scaleFactorVec = vec3.fromValues(scaleAmount, scaleAmount, scaleAmount);
  mat4.fromScaling(scaleByMat, scaleFactorVec);
  mat4.mul(window.worldMat, scaleByMat, window.worldMat);
  window.zoomLevel = (event.deltaY >= 0)  ? window.zoomLevel + 1 : window.zoomLevel - 1;

  requestAnimationFrame(loop);
}

/*
 * Highlights the user selected metadata
 */
function selectHighlight() {
  console.log("Highlight option selected");
  let edges;
  const attr = $("#highlight-options").val();
  const cat = "branch_color";
  const val = $("#color-selector").val().toUpperCase().slice(1);
  const l = $("#lower-bound").val();
  const u = $("#upper-bound").val();
  const e = $("#category").val();
  $.getJSON(window.highlightURL, {attribute : attr, category : cat,
            value : val, lower : l, equal : e, upper : u}, function(data) {
    edges = data;
  }).done(function() {
    window.result = extractEdgeInfo(edges);
    window.largeDim = normalizeTree(edges);
    window.gl.bufferSubData(window.gl.ARRAY_BUFFER,0,new Float32Array(window.result));
    requestAnimationFrame(loop);
  });
}

/*
 * Collapses clades based on the slider scale
 */
function collapseClades() {
  const ss = $("#collapse-range").val();
  console.log("collapse clade", ss);

  let triangles;
  let edges;
  $.getJSON(window.collapseURL, {sliderScale: ss}, function(data) {
    triangles = data;
  }).done(function() {
    $.getJSON(window.edgeURL, function(data2) {
      edges = data2;
    }).done(function() {
      window.result = extractEdgeInfo(edges);
      window.largeDim = normalizeTree(edges);
      window.gl.bufferSubData(window.gl.ARRAY_BUFFER,0,new Float32Array(window.result));
      requestAnimationFrame(loop);
    });
  });

}

/*
 * Shows the selected menu and hides the other ones
 */
function showMenu(evt, menuName) {
  let menus = $(".menu");

  for(let i = 0; i < menus.length; i++) {
    menus.eq(i).hide();
  }

  let tabs = document.getElementsByClassName("tabs");
  for(let i = 0; i < tabs.length; i++) {
    tabs[i].className = tabs[i].className.replace("active","");
  }

  $("#" + menuName).show()
  evt.currentTarget.className += "active"
}