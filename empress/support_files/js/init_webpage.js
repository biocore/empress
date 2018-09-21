"use strict";

function fillDropDownMenu(headers, menuName) {
  $("#highlight-menu").show();

  let menu = $(menuName).empty()[0];
  for (let header of headers) {
    let option = document.createElement("option");
      option.text = header;
      option.label = header;
      menu.add(option);
  }
}

function initGridTable(data) {
  let templateMetadata = data[0];

  // create the header row for the table
  for (let property in templateMetadata) {
    let col = {
      id  : property,
      name : property,
      field : property,
      sortable: true
    };
    gridInfo.columns.push(col);
  }

  // get the rest of the data for the grid
  for(let i = 0; i < data.length; i++) {
    let dr = {};
    for(let property in templateMetadata) {
      dr[property] = (data[i])[property];
    }
    gridInfo.data.push(dr);
  }
  gridInfo.initData = gridInfo.data;

  // create the options that slickgrid will use
  gridInfo.options = {
    enableCellNavigation: true,
    enableColumnReorder: false,
    topPanelHeight : 0,
    multiColumnSort: true
  };
  gridInfo.grid = new Slick.Grid("#scrolltable", gridInfo.data, gridInfo.columns, gridInfo.options);

  // taken from https://github.com/mleibman/SlickGrid/blob/gh-pages/examples/example-multi-column-sort.html
  gridInfo.grid.onSort.subscribe(function (e, args) {
    let cols = args.sortCols;
    let field, sign, value1, value2, result;
    gridInfo.data.sort(function (dataRow1, dataRow2) {
      for (let i = 0, l = cols.length; i < l; i++) {
        field = cols[i].sortCol.field;
        sign = cols[i].sortAsc ? -1 : 1;
        value1 = dataRow1[field];
        value2 = dataRow2[field];
        if(value1 === null){
          return 1;
        }
        if(value2 === null){
          return -1;
        }
        result = (value1 === value2 ? 0 : (value1 > value2 ? 1 : -1)) * sign;
        if (result != 0) {
          return result;
        }
      }
      return 0;
    });
    gridInfo.grid.invalidate();
    gridInfo.grid.render();
  });
}

function updateGridData(data) {
  const SCROLL_TO_TOP = true;
  let templateMetadata = data[0];
  gridInfo.data = [];
  for(let i = 0; i < data.length; i++) {
    let dr = {};
    for(let property in templateMetadata) {
      dr[property] = (data[i])[property];
    }
    gridInfo.data.push(dr);
  }
  gridInfo.grid.setData(gridInfo.data, SCROLL_TO_TOP);
  gridInfo.grid.render();
}

/*
 * Extracts the coordinates/color info from metadata and format it for webgl
 */
function extractInfo(metaData, fields) {
  // create an array containing all entries that belong to a "field" and ignore the rest
  let extractedFields = metaData.map(function(edge) {
    let extracted = [];
    for (let prop of fields) {
      extracted.push(edge[prop]);
    };
    return extracted;
  });

  // flatten array
  extractedFields = [].concat.apply([], extractedFields);

  // convert convert color hex string into three floats
  extractedFields = extractColor(extractedFields);

  return extractedFields;
}

/*
 * takes an array contain color info represented as a hex string and converts the
 * hex string in place to three floating point numbers between 0 and 1 for rgb
 */
function extractColor(data) {
  // cut the 6 digit hex string into groups of 2
  data = data.map(function(element) {
      return (typeof element === "string" ? element.match(/.{1,2}/g) : element)
  });

  // convert to array
  data = [].concat.apply([], data);

  // convert the 2 digit hex string into a float
  data = data.map(function(element) {
    return (typeof element === "string" ? parseInt("0x" + element) / 255 : element)
  });

  return data;
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
  drawingData.edgeCoords = extractInfo(data, field.edgeFields);
  fillBufferData(shaderProgram.treeVertBuffer, drawingData.edgeCoords);
  updateGridData(data);
  labels = {}
  drawingData.triangles = [];
  fillBufferData(shaderProgram.triangleBuffer, drawingData.triangles);
  requestAnimationFrame(loop);
}

/*
 * Find length along the x or y axis of the tree so webgl can fit tree into a 1x1 square
 */
function normalizeTree(edgeMeta) {
  const xCoords = edgeMeta.map(edge => edge.x);
  const yCoords = edgeMeta.map(edge => edge.y);
  let maxX, maxY, minX, minY;
  [maxX, minX] = [Math.abs(Math.max(...xCoords)), Math.abs(Math.min(...xCoords))];
  [maxY, minY] = [Math.abs(Math.max(...yCoords)), Math.abs(Math.min(...yCoords))];
  const [xDim, yDim] = [Math.max(maxX, minX), Math.max(maxY, minY)];
  drawingData.initZoom = Math.max(xDim, yDim);
}
