"use strict";

function loop() {
  window.gl.uniformMatrix4fv(matWorldUniform, window.gl.FALSE, window.worldMat);

  window.gl.clearColor(0.75, 0.85, 0.8, 1.0);
  window.gl.clear(window.gl.COLOR_BUFFER_BIT | window.gl.DEPTH_BUFFER_BIT);
  window.gl.drawArrays(window.gl.LINES, 0, window.result.length / 5 );
}

/*
 * Draws the tree
 */
function draw() {
  //pointers to uniforms in shader programs defined in init_webgl
  window.matWorldUniform = window.gl.getUniformLocation(window.program, "mWorld");
  let matViewUniform = window.gl.getUniformLocation(window.program,"mView");
  let matProjUniform = window.gl.getUniformLocation(window.program,"mProj");
  let viewMat  = mat4.create();
  let projMat = mat4.create();
  let treeNormVec = vec3.create();
  const identityMat = mat4.create();

  vec3.set(treeNormVec, 1.0 / window.largeDim * 3, 1.0 / window.largeDim * 3, 1.0 / window.largeDim * 3);
  mat4.fromScaling(window.worldMat, treeNormVec);
  mat4.lookAt(viewMat, [0,0,-5], [0,0,0],[0,1,0]);
  mat4.perspective(projMat, glMatrix.toRadian(45), window.canvas.width() / window.canvas.height(), 0.1,1000.0);

  window.gl.uniformMatrix4fv(matWorldUniform, window.gl.FALSE, window.worldMat);
  window.gl.uniformMatrix4fv(matViewUniform, window.gl.FALSE, viewMat);
  window.gl.uniformMatrix4fv(matProjUniform, window.gl.FALSE, projMat);


  let rotateMat = mat4.create();
  const angle = Math.PI;
  mat4.rotate(rotateMat, identityMat, angle, [0,0,1]);
  mat4.mul(window.worldMat, window.worldMat, rotateMat);

  console.log("Start Draw");
  requestAnimationFrame(loop);
}