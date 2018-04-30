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
	console.log('init callbacks');
	window.canvas.onmousedown = mousedown;
	document.onmouseup = mouseup;
	document.onmousemove = mousemove;
	window.canvas.onwheel = mousewheel;
}

/*
 * stores (x,y) coord of mouse
 */
function mousedown(event) {
	window.isMouseDown = true;
	window.lastMouseX = event.clientX;
    window.lastMouseY = event.clientY;
}

/*
 * unsets the mouse down flag
 */
function mouseup(event) {
	window.isMouseDown = false;
}

/*
 * Pans the tree if mouse down flag is set
 */
function mousemove(event) {
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
function mousewheel(event) {
	if(event.deltaY > 0){
		var scaleByMat = new Float32Array(16);
		var scaleAmount = window.scaleFactor;
		window.zoomAmount = window.zoomAmount / scaleAmount;
		var scaleFactorVec = vec3.fromValues(scaleAmount, scaleAmount, scaleAmount);
		mat4.fromScaling(scaleByMat, scaleFactorVec);
		mat4.mul(window.worldMat, scaleByMat, window.worldMat);
		window.zoomLevel++;

		//selective render -- when zooming in
		/*if(window.zoomLevel % 5 === 0 ) {
			console.log("zoom expand");
			var edges;
			$.getJSON('http://localhost:8080/zoom', {level : window.zoomLevel}, function(data) {
			 	edges = JSON.parse(JSON.stringify(data));
			 }).done(function() {
				extractEdges(edges);
				window.gl.bufferSubData(window.gl.ARRAY_BUFFER,0,new Float32Array(window.result));
			});

		}*/
	}
	else if(event.deltaY < 0) {
		var scaleByMat = new Float32Array(16);
		var scaleAmount = 1 / window.scaleFactor;
		window.zoomAmount = window.zoomAmount / scaleAmount;
		var scaleFactorVec = vec3.fromValues(scaleAmount, scaleAmount, scaleAmount);
		mat4.fromScaling(scaleByMat, scaleFactorVec);
		mat4.mul(window.worldMat, scaleByMat, window.worldMat);
		window.zoomLevel--;

		//selective render --  when zooming out
		/*if(window.zoomLevel % 5 === 0) {
			console.log("zoom collapse");
		}*/
	}
}


/*
 * Highlights the user selected metadata
 */
function selectHighlight() {
	console.log('Highlight option selected');
	var edges;
	var attr = document.getElementById("metadataOptions").value;
	var l = document.getElementById("lowerBound").value;
	var u = document.getElementById("upperBound").value;
	var e = document.getElementById("category").value;
	$.getJSON(window.highlightURL, {attribute : attr, lower : l, equal : e, upper : u}, function(data) {
		edges = JSON.parse(JSON.stringify(data));
	}).done(function() {
		extractEdges(edges);
		window.gl.bufferSubData(window.gl.ARRAY_BUFFER,0,new Float32Array(window.result));
	});
}

/*
 * Collapses clades based on the slider scale
 */
function collapseClades() {
	var ss = document.getElementById("collapseRange").value;
	console.log('collapse clade', ss);

	var triangles;
	var edges;
	$.getJSON(window.collapseURL, {sliderScale: ss}, function(data) {
		triangles = data;
	}).done(function() {
		$.getJSON(window.edgeURL, function(data2) {
			edges = data2;
		}).done(function() {
			extractEdges(edges);
			window.gl.bufferSubData(window.gl.ARRAY_BUFFER,0,new Float32Array(window.result));
		});
	});
}

function selectColor() {
	console.log('Color option selected');
	var edges;
	var attr = document.getElementById("metadataOptions").value;
	var l = document.getElementById("lowerBound").value;
	var u = document.getElementById("upperBound").value;
	var e = document.getElementById("category").value;
	$.getJSON(window.colorURL, {attribute : attr, lower : l, equal : e, upper : u}, function(data) {
		edges = JSON.parse(JSON.stringify(data));
	}).done(function() {
		extractEdges(edges);
		window.gl.bufferSubData(window.gl.ARRAY_BUFFER,0,new Float32Array(window.result));
	});
}

function showMenu(evt, menuName) {
	var i, menus, tabs;
	menus = document.getElementsByClassName("menu");

	for(i = 0; i < menus.length; i++) {
		menus[i].style.display = "none";
	}

	tabs = document.getElementsByClassName("tabs");
	for(i = 0; i < tabs.length; i++) {
		tabs[i].className = tabs[i].className.replace("active","");
	}

	document.getElementById(menuName).style.display = "block";
	evt.currentTarget.className += "active"
}
