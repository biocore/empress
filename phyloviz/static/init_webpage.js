"use strict";

function initWebPage(edgeMetadata) {
  $("#highlight-menu").show();

  let templateMetadata = edgeMetadata[0];
  let x = $("#highlight-options")[0];
  const exclude = ["px", "py", "x", "y", "branch_color","branch_is_visible",
    "longest","node_color","node_is_visible","shortest","size","width","Node_id","Parent_id"];

  //add metadata categories to drop down menu
  for (let property in templateMetadata) {
    if (!($.inArray(property, exclude) >= 0)) {
      let option = document.createElement("option");
      option.text = property;
      option.label = property;
      x.add(option);
    }
  }
}

/*
 * Extracts the coordinates/color info from metadata and format it for webgl
 */
function extractEdgeInfo(edgeMeta) {
  let extractedFields = edgeMeta.map(function(edge) {
    return [edge.px, edge.py, edge.branch_color, edge.x, edge.y,
            edge.branch_color];
  });
  extractedFields = [].concat.apply([], extractedFields);

  extractedFields = extractedFields.map(function(element) {
      return (typeof element === "string" ? element.match(/.{1,2}/g) : element)
  });
  extractedFields = [].concat.apply([], extractedFields);

  extractedFields = extractedFields.map(function(element) {
    return (typeof element === "string" ? parseInt("0x" + element) / 255 : element)
  });

  return extractedFields;
}

/*
 *Find length along the x or y axis of the tree so webgl can fit tree into a 1x1 square
 */
function normalizeTree(edgeMeta) {
  const xCoords = edgeMeta.map(edge => edge.x);
  const yCoords = edgeMeta.map(edge => edge.y);
  const [maxX,minX] = [Math.max(...xCoords), Math.min(...xCoords)];
  const [maxY,minY] = [Math.max(...yCoords), Math.min(...yCoords)];
  const [xDim, yDim] = [Math.abs(maxX - minX), Math.abs(maxY - minY)];

  return (xDim > yDim) ? xDim : yDim;
}