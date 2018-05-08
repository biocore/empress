function initWebPage(edgeMetadata) {
  $("#highlight-menu").show();

  let templateMetadata = edgeMetadata[0];
  var x = $("#highlight-options")[0];
  for (var property in templateMetadata) {
    if (templateMetadata.hasOwnProperty(property)) {
      if (!($.inArray(property, ["px", "py", "x", "y", "alpha"]) >= 0)) {
        var option = document.createElement("option");
        option.text = property;
        option.label = property; //TODO: check to see if property is numeric or categorical
        x.add(option);
      }
    }
  }
}

/*
 * Extracts the coordinates/other info from metadata and formats it for webgl
 */
function extractEdgeInfo(edgeMeta) {
  console.log("Start Extracting");
  const edgeCoordsMultiDimensional = edgeMeta.map(function(edge) {
    return [edge.px, edge.py, edge.alpha, edge. x, edge.y, edge.alpha];
  });
  const edgeCoordsFlattend = [].concat.apply([], edgeCoordsMultiDimensional);
  console.log("Finish Extracting");
  return edgeCoordsFlattend;
}

/*
 *Find largest dimension of the tree so webgl can fit tree into a 1x1 square
 */
function normalizeTree(edgeMeta) {
  console.log("Normalizing tree")
  const xCoords = edgeMeta.map(edge => edge.x);
  const yCoords = edgeMeta.map(edge => edge.y);
  const [maxX,minX] = [Math.max(...xCoords), Math.min(...xCoords)];
  const [maxY,minY] = [Math.max(...yCoords), Math.min(...yCoords)];
  const [xDim, yDim] = [Math.abs(maxX - minX), Math.abs(maxY - minY)];
  console.log("Finish Normalizing");

  return (xDim > yDim) ? xDim : yDim;
}


