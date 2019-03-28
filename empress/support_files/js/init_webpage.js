"use strict";

function switchContainers() {
  let BUFFER = 15;
  if($("#switch-btn").text() == "Metadata") {
    $(".tree-container").hide();
    $(".metadata-container").css({top: "" +  ($("#switch-btn").height() + BUFFER) + "px"}).show();
    $("#switch-btn").text("Tree");
  }
  else{
    $(".tree-container").show();
    $(".metadata-container").hide();
    $("#switch-btn").text("Metadata");
  }
}

function fillDropDownMenu(headers, menuName) {
  // $("#highlight-menu").show();
  $(menuName).val(0);


  let menu = $(menuName)[0];
  // let menu = $(menuName).empty()[0];
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

function initGridTable(data) {
  let columns = data[0];
  let columnNames = Object.keys(columns).sort();
  let key_column = "Node_id"
  gridInfo.columns.push({id: key_column, name: key_column, field: key_column, sortable: true})

  // create the header row for the table
  // for (let property in templateMetadata) {
  let name = ""
  for(let i = 0; i < columnNames.length; i++) {
    name = columnNames[i];
    if(name !== key_column) {
      let col = {
        id  : columnNames[i],
        name : columnNames[i],
        field : columnNames[i],
        sortable: true
      };
      gridInfo.columns.push(col);
    }
  }

  // get the rest of the data for the grid
  let property = "";
  for(let i = 0; i < data.length; i++) {
    let dr = {};
    for(property in columns) {
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

// TODO: change this so columns are sorted
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
  extractedFields = extractedFields.flat();

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

  data = data.flat();

  // convert the 2 digit hex string into a float
  data = data.map(function(element) {
    return (typeof element === "string" ? parseInt("0x" + element) / 255 : element)
  });
  return data;
}

function updateBranches(data, replace) {
  const XCOORD = 3, YCOORD = 4;
  const PCOLOR = 2, CCOLOR = 5;
  let dataI = 0, replaceI = 0;
  while(replace != replace.length) {
    if(data[dataI + XCOORD] == replace[replaceI + XCOORD] &&
          data[dataI + YCOORD] == replace[replaceI + YCOORD]) {
      data[dataI + PCOLOR] = replace[replaceI + PCOLOR];
      data[dataI + CCOLOR] = replace[replaceI + CCOLOR];
      replaceI += 1;
    }
    dataI += 1;
  }
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
  let edgeData = extractInfo(data, field.edgeFields);
  drawingData.numBranches = edgeData.length
  fillBufferData(shaderProgram.treeVertBuffer, edgeData);
  updateGridData(data);
  labels = {}
  drawingData.triangles = [];
  fillBufferData(shaderProgram.triangleBuffer, drawingData.triangles);
  requestAnimationFrame(loop);
}

/*
 * Find length along the x or y axis of the tree so webgl can fit tree into a 1x1 square
 */
function normalizeTree(edgeData) {
  // const xCoords = edgeData.map(edge => edge.x);
  // const yCoords = edgeData.map(edge => edge.y);
  // let maxX = 0, maxY = 0, minX = 0, minY = 0;
  // let x = 0, y = 0;
  // for(let x in xCoords) {
  //   if(Math.abs(xCoords[x]) > maxX){
  //     maxX = Math.abs((xCoords[x]));
  //   }
  // }
  // for(let y in yCoords) {
  //   if(Math.abs(yCoords[y]) > maxY){
  //     maxY = Math.abs((yCoords[x]));
  //   }
  // }
  let max = 0;
  let val;
  let i;
  for(i = 0; i < edgeData.length; i++) {
    if( i == 1) {
      console.log(edgeData[i])
    }
    if(edgeData[i] >max) {
      max = edgeData[i];
    }
  }
  console.log(max)
  drawingData.initZoom = max;
  // let max = Math.max(maxY, maxY);
  // console.log(max);
  drawingData.initZoom = max;
  drawingData.currentZoom = drawingData.initZoom;
}
