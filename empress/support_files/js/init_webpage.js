"use strict";

function fillDropDownMenu(headers) {
  $("#highlight-menu").show(); // dont need?

  let menu = $("#highlight-options").empty()[0];
  for (let header of headers) {
    let option = document.createElement("option");
      option.text = header;
      option.label = header;
      menu.add(option);
  }
}

function fillTable(color) {
  let tableValues;
  $.getJSON(urls.tableURL, {color : color}, function(data) {
    tableValues = data;
  }).done(function() {
    let templateMetadata = tableValues[0];
    let grid;

    // add the header row to the table
    let columns = [];
    for (let property in templateMetadata) {
      let col = {
        id  : property,
        name : property,
        field : property,
        sortable: true
      };
      columns.push(col);
    }

    let datarows = [];
    for(let i = 0; i < tableValues.length; i++) {
      let dr = {};
      for(let property in templateMetadata) {
        dr[property] = (tableValues[i])[property];
      }
      datarows.push(dr);
    }
    let options = {
      enableCellNavigation: true,
      enableColumnReorder: false,
      topPanelHeight : 0,
      multiColumnSort: true
    };
    grid = new Slick.Grid("#scrolltable", datarows, columns, options);

    // taken from https://github.com/mleibman/SlickGrid/blob/gh-pages/examples/example-multi-column-sort.html
    grid.onSort.subscribe(function (e, args) {
      let cols = args.sortCols;
      datarows.sort(function (dataRow1, dataRow2) {
        let field = {};
        let sign = {};
        let value1 = {};
        let value2 = {};
        let result = {};
        for (let i = 0, l = cols.length; i < l; i++) {
          field = cols[i].sortCol.field;
          sign = cols[i].sortAsc ? 1 : -1;
          value1 = dataRow1[field];
          value2 = dataRow2[field];
          result = (value1 == value2 ? 0 : (value1 > value2 ? 1 : -1)) * sign;
          if (result != 0) {
            return result;
          }
        }
        return 0;
      });
      grid.invalidate();
      grid.render();
      extractLabels(grid.getData());
    });
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

  return Math.max(xDim, yDim)
}