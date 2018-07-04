"use strict";

function initWebPage(edgeMetadata) {
  $("#highlight-menu").show();

  let templateMetadata = edgeMetadata[0];
  let x = $("#highlight-options")[0];
  const exclude = ["px", "py", "x", "y", "branch_color","branch_is_visible",
    "longest","node_color","node_is_visible","shortest","size","width","Node_id","Parent_id"];
  for (let property in templateMetadata) {
    if (templateMetadata.hasOwnProperty(property)) {
      if (!($.inArray(property, exclude) >= 0)) {
        let option = document.createElement("option");
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
  const extractedFieldsMultiDimensional = edgeMeta.map(function(edge) {
    return [edge.px, edge.py, edge.branch_color, edge. x, edge.y,
            edge.branch_color];
  });
  const extractedFieldsFlattend = [].concat.apply([], extractedFieldsMultiDimensional);

  let expandHexString = extractedFieldsFlattend.map(function(element) {
      return (typeof element === "string" ? element.match(/.{1,2}/g) : element)
  });
  expandHexString = [].concat.apply([], expandHexString);

  const edgeCoordsFlattened = expandHexString.map(function(element) {
    return (typeof element === "string" ? parseInt("0x" + element) / 256 : element)
  });

  console.log("Finish Extracting");
  return edgeCoordsFlattened;
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