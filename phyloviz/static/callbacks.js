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
function selectOption() {
	console.log('option selected');
	var edges;
	var attr = document.getElementById("metadataOptions").value;
	var l = document.getElementById("lowerBound").value;
	var u = document.getElementById("upperBound").value;
	var e = document.getElementById("category").value;
	$.getJSON('http://localhost:8080/select', {attribute : attr, lower : l, equal : e, upper : u}, function(data) {
		edges = JSON.parse(JSON.stringify(data));		 
	}).done(function() {
		extractEdges(edges);
		window.gl.bufferSubData(window.gl.ARRAY_BUFFER,0,new Float32Array(window.result));
	});
}