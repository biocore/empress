/*
 * Draws the tree
 */
function draw() {
	//pointers to uniforms in shader programs defined in init_webgl
	var matWorldUniform = window.gl.getUniformLocation(window.program, 'mWorld');
	var matViewUniform = window.gl.getUniformLocation(window.program,'mView');
	var matProjUniform = window.gl.getUniformLocation(window.program,'mProj');


	vec3.set(window.treeNormVec, 1.0 / window.largeDim * 3, 1.0 / window.largeDim * 3, 1.0 / window.largeDim * 3);
	mat4.fromScaling(window.worldMat, window.treeNormVec);
	mat4.lookAt(window.viewMat, [0,0,-5], [0,0,0],[0,1,0]);
	mat4.perspective(window.projMat, glMatrix.toRadian(45), window.canvas.width / window.canvas.height, 0.1,1000.0);

	window.gl.uniformMatrix4fv(matWorldUniform, window.gl.FALSE, window.worldMat);
	window.gl.uniformMatrix4fv(matViewUniform, window.gl.FALSE, window.viewMat);
	window.gl.uniformMatrix4fv(matProjUniform, window.gl.FALSE, window.projMat);

	
	var rotateMat = mat4.create();
	var angle = Math.PI;
	mat4.rotate(rotateMat, window.identityMat, angle, [0,0,1]);
	mat4.mul(window.worldMat, window.worldMat, rotateMat);
	
	//
	// Main render loop
	//
	var loop = function() {
		window.gl.uniformMatrix4fv(matWorldUniform, window.gl.FALSE, window.worldMat);

		window.gl.clearColor(0.75, 0.85, 0.8, 1.0);
		window.gl.clear(window.gl.COLOR_BUFFER_BIT | window.gl.DEPTH_BUFFER_BIT);
		window.gl.drawArrays(window.gl.LINES, 0, window.result.length / 3 );
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}