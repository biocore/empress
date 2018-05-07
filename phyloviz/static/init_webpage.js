function initWebPage() {
  document.getElementById("showHighlightMenu").style.display = "block";

  //This will be the new meta_labels
  // var templateMetadata = edgeMetadata[0];
  // window.hlMeta = document.getElementById("highlightOptions");
  // window.cMeta = document.getElementById("colorOptions");
  // for (var property in templateMetadata) {
  //     if (templateMetadata.hasOwnProperty(property)) {
  //      if (!($.inArray(property, ['px', 'py', 'x', 'y', 'color']) >= 0)) {
  //          var hlOpt = document.createElement("option");
  //          var cOpt = document.createElement("option");
  //          hlOpt.text = property;
  //          hlOpt.label = property; //TODO: check to see if property is numeric or categorical
  //          cOpt.text = property;
  //          cOpt.label = property; //TODO: check to see if property is numeric or categorical
  //          cMeta.add(hlOpt);
  //          hlMeta.add(cOpt);
  //      }
  //     }
  // }

  initCallbacks();
}

/*
 * Extracts the coordinates of the tree from edge_metadata
 */
function extractEdges(viewCoords) {
  var minX = Infinity;
  var maxX = -Infinity;
  var minY = Infinity;
  var maxY = -Infinity;
  window.result = [];
  var i;
  for(i = 0; i < viewCoords.length; i++){
    //console.log(edgeMetadata[i].px);
    if(viewCoords[i].x > maxX){
      maxX =  viewCoords[i].x;
    }
    if(viewCoords[i].y > maxY){
      maxY =  viewCoords[i].y;
    }
    if(viewCoords[i].x < minX){
      minX =  viewCoords[i].x;
    }
    if(viewCoords[i].y < minY){
      minY =  viewCoords[i].y;
    }
    window.result.push(viewCoords[i].px);
    window.result.push(viewCoords[i].py);
    window.result.push(viewCoords[i].red);
    window.result.push(viewCoords[i].green);
    window.result.push(viewCoords[i].blue);
    window.result.push(viewCoords[i].x);
    window.result.push(viewCoords[i].y);
    window.result.push(viewCoords[i].red);
    window.result.push(viewCoords[i].green);
    window.result.push(viewCoords[i].blue);
  }

  var xDim = Math.abs(maxX - minX);
  var yDim = Math.abs(maxY - minY);
  if(xDim > yDim) {
    window.largeDim = xDim;
  }
  else{
    window.largeDim = yDim;
  }
}
