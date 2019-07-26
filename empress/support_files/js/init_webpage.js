"use strict";

function fillDropDownMenu(headers, menuName) {
  $(menuName).val(0);


  let menu = $(menuName)[0];
  headers.sort().sort(function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });
  for (let header of headers) {
    let option = document.createElement("option");
      option.text = header;
      option.label = header;
      menu.add(option);
  }
}

function loadColorClades(data) {
  drawingData.coloredClades = [];
  for(let clade in data) {
    drawingData.coloredClades.push(data[clade])
  }
  // convert to 1d-array
  drawingData.coloredClades = [].concat.apply([], drawingData.coloredClades);
  fillBufferData(shaderProgram.cladeVertBuffer, drawingData.coloredClades);
  requestAnimationFrame(loop);
}

function loadTree(data) {
  let edgeData = extractInfo(data, field.edgeFields);
  drawingData.numBranches = edgeData.length
  fillBufferData(shaderProgram.treeVertBuffer, edgeData);
  updateGridData(data);
  labels = {}
  drawingData.triangles = [];
  fillBufferData(shaderProgram.triangleBuffer, drawingData.triangles);
  requestAnimationFrame(loop);
}
