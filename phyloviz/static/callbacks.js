//global variables
window.isMouseDown = false;
window.lastMouseX = null;
window.lastMouseY = null;
window.zoomAmount = 1; //used to make pan look uniformed when zooming
window.zoomLevel = 0; //current zoom level - used for selective rendering

/*
 * tells javasript what function to call for mouse/keyboard events
 */
function initCallbacks(){
	console.log('init callbacks');
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
    var newX = event.clientX;
    var newY = event.clientY;

    var dx = (newX - window.lastMouseX) * window.zoomAmount;
    var dy = (newY - window.lastMouseY) * window.zoomAmount;
   	var transVec = vec3.fromValues(dx,dy,0);
   	var addTransMat = mat4.create();
   	mat4.fromTranslation(addTransMat,transVec);
   	mat4.multiply(window.worldMat, window.worldMat,addTransMat);

    window.lastMouseX = newX
    window.lastMouseY = newY;
}

/*
 * zooms tree and this is where selective rendering will take place
 */
function mouseWheel(event) {
	if(event.deltaY > 0){
		var scaleByMat = new Float32Array(16);
		var scaleAmount = window.scaleFactor;
		window.zoomAmount = window.zoomAmount / scaleAmount;
		var scaleFactorVec = vec3.fromValues(scaleAmount, scaleAmount, scaleAmount);
		mat4.fromScaling(scaleByMat, scaleFactorVec);
		mat4.mul(window.worldMat, scaleByMat, window.worldMat);
		window.zoomLevel++;
	}
	else if(event.deltaY < 0) {
		var scaleByMat = new Float32Array(16);
		var scaleAmount = 1 / window.scaleFactor;
		window.zoomAmount = window.zoomAmount / scaleAmount;
		var scaleFactorVec = vec3.fromValues(scaleAmount, scaleAmount, scaleAmount);
		mat4.fromScaling(scaleByMat, scaleFactorVec);
		mat4.mul(window.worldMat, scaleByMat, window.worldMat);
		window.zoomLevel--;
	}
}

/*
TODO: need to change edge metadata to hold color as "#RRGGBB" hex string and the enable webgl to parse it
*/

/*
 * Highlights the user selected metadata
 */
function selectHighlight() {
	console.log('Highlight option selected');
	let edges;
	let attr = $('#highlight-options').val();
	let l = $('#lower-bound').val();
	let u = $('#upper-bound').val();
	let e = $('#category').val();
	$.getJSON('http://localhost:8080/highlight', {attribute : attr, lower : l, equal : e, upper : u}, function(data) {
		edges = data;
	}).done(function() {
		window.result = extractEdgeInfo(edges);
		window.largeDim = normalizeTree(edges);
		window.gl.bufferSubData(window.gl.ARRAY_BUFFER,0,new Float32Array(window.result));
	});
}

/*
 * Collapses clades based on the slider scale
 */
function collapseClades() {
	var ss = $('#collapse-range').val();
	console.log('collapse clade', ss);

	var triangles;
	var edges;
	$.getJSON('http://localhost:8080/collapse', {sliderScale: ss}, function(data) {
		triangles = data;
	}).done(function() {
		$.getJSON('http://localhost:8080/api/edges', function(data2) {
			edges = data2;
		}).done(function() {
			window.result = extractEdgeInfo(edges);
			window.largeDim = normalizeTree(edges);
			window.gl.bufferSubData(window.gl.ARRAY_BUFFER,0,new Float32Array(window.result));
		});
	});
}

function showMenu(evt, menuName) {
	var i;
	var menus = $('.menu');

	for(i = 0; i < menus.length; i++) {
		menus.eq(i).hide();
	}

	var tabs = document.getElementsByClassName("tabs");
	for(i = 0; i < tabs.length; i++) {
		tabs[i].className = tabs[i].className.replace("active","");
	}

	$('#' + menuName).show()
	evt.currentTarget.className += "active"
}