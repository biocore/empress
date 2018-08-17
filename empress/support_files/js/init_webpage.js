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
          result = (value1 === value2 ? 0 : (value1 <= value2 ? 1 : -1)) * sign;
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

  // flatten the array
  data = [].concat.apply([], data);

  // convert the 2 digit hex string into a float
  data = data.map(function(element) {
    return (typeof element === "string" ? parseInt("0x" + element) / 255 : element)
  });

  return data;
}

/*
 * creates a sector composed of triangles. Each triangle is made out of three vertices.
 * The first vertice is always center and the other two vertices with line on the arc
 * starting from startTheta and ending of totalTheta. Here is an example of what a triangle
 * will look like [cx, cy, r, g, b, sx, sy, r, g, b, ex, ey, r, g, b].
 * cx, cy, sx, sy, ex, ey represent the first, second, and third verties respectifully.
 * r, g, b represent the color of the vertice.
 */
function createArcSector(center, arcLength, startTheta, totalTheta, color) {
  const TRI_PER_CIRCLE = 100;
  let sector = [];
  let NUM_TRI = 100;
  let theta = totalTheta / NUM_TRI;
  let rad = startTheta;
  let c = extractColor([color]);

  // creating the sector
  for (let i = 0; i < NUM_TRI; i++) {

    // first vertice of triangle
    sector.push(center[0]);
    sector.push(center[1]);
    sector.push(c[0]);
    sector.push(c[1]);
    sector.push(c[2]);

    // second vertice of triangle
    sector.push(Math.cos(rad) * arcLength + center[0]);
    sector.push(Math.sin(rad) * arcLength + center[1]);
    sector.push(c[0]);
    sector.push(c[1]);
    sector.push(c[2]);

    rad += theta;

    // third vertice of triangle
    sector.push(Math.cos(rad) * arcLength + center[0]);
    sector.push(Math.sin(rad) * arcLength + center[1]);
    sector.push(c[0]);
    sector.push(c[1]);
    sector.push(c[2]);
  }
  return sector;
}

/*
 * Find length along the x or y axis of the tree so webgl can fit tree into a 1x1 square
 */
function normalizeTree(edgeMeta) {
  const xCoords = edgeMeta.map(edge => edge.x);
  const yCoords = edgeMeta.map(edge => edge.y);
  const [maxX,minX] = [Math.max(...xCoords), Math.min(...xCoords)];
  const [maxY,minY] = [Math.max(...yCoords), Math.min(...yCoords)];
  const [xDim, yDim] = [Math.abs(maxX - minX), Math.abs(maxY - minY)];

  return Math.max(xDim, yDim)
}