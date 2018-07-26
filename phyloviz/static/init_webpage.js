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

function fillTable(color) {
  $("#dataTable tr").remove();
  let tableValues;
  $.getJSON(urls.tableURL, {color : color}, function(data) {
    tableValues = data;
  }).done(function() {
    let templateMetadata = tableValues[0];
    let table = $("#dataTable")[0];
    let header = table.createTHead();
    let rowNum = 0;
    let row = header.insertRow(rowNum++);
    let cellNum = 0;
    let cell;
    row["id"] = "fixedRow";

    // add the header row to the table
    for (let property in templateMetadata) {
      cell = row.insertCell(cellNum++);
      cell["id"] = "fixedCell";
      cell.innerHTML = "<b>" + property + "</b>";
    }

    cellNum = 0;
    row = table.insertRow(rowNum++);

    for(let i = 0; i < tableValues.length; i++) {
      cellNum = 0;
      for(let property in tableValues[i]) {
        cell = row.insertCell(cellNum++);
        cell.innerHTML = (tableValues[i])[property];
        if(property == "Node_id") {
          cell.setAttribute("onclick", "selectLabel(this)");
        }
      }
      row = table.insertRow(rowNum++);
    }
  });
}

/*
 * Extracts the coordinates/color info from metadata and format it for webgl
 */
function extractInfo(metaData, fields) {
  let extractedFields = metaData.map(function(edge) {
    let extracted = [];
    for (let prop of fields) {
      extracted.push(edge[prop]);
  };
  return extracted;
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

// TODO: finish this method
function createCircles(nodes) {
  const xCenter = 0;
  const yCenter = 1;
  const RED = 2;
  const GREEN = 3;
  const BLUE = 4;
  let circles = [];
  let rad = 0;
  for (let i = 0; i < nodes.lenth / 5; i = i + 5) {
    while(rad < Math.PI) {
      circles.push(Math.cos(rad, 1) + nodes[i + xCenter]);
      circles.push(Math.sin(rad, 1) + nodes[i + yCenter]);
      circles.push(nodes[i + RED]);
      circles.push(nodes[i + GREEN]);
      circles.push(nodes[i + BLUE]);
      rad += Math.PI / 10;
    }
  }
  return circles
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