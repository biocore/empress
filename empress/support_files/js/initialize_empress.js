function initialize(){
  let edgeData;
  let nodeCoords;

  $(".metadata-container").hide();

  console.log('Start')
  // this may cause some syncing issues
  // $.getJSON(urls.headersURL, function(data) {
  //   console.log('headers')
  //   field.table_headers = data;
  // }).done(function() {
    drawingData.nodeCoords = [0, 0, 0, 0, 0];
    $.getJSON(urls.edgeURL, function(data) {
      edgeData = data.data;
      let max = data.max
      drawingData.numBranches = edgeData.length
      drawingData.initZoom = max;
      drawingData.currentZoom = drawingData.initZoom;
      // normalizeTree(edgeData);
      console.log("recived data")
    }).done(function() {
      $.getJSON(urls.trianglesURL, {}, function(data) {
        drawingData.triangles = extractInfo(data, field.triangleFields);
        fillBufferData(shaderProgram.triangleBuffer, drawingData.triangles);
      }).done(function() {
        requestAnimationFrame(loop);
      });
      fillDropDownMenu(field.table_headers.headers, "#highlight-options");
      fillDropDownMenu(field.table_headers.headers, '#clade-options');
      fillDropDownMenu(field.table_headers.headers, '#collapse-options');

      // fillDropDownMenu(field.table_headers.headers, "#show-options");
      // fillDropDownMenu(field.table_headers.headers, "#prioritize-options");
      // hideMenu();
      $("#show-metadata").prop('checked', true);
      // $.getJSON(urls.tableURL, function(data) {
      //   initGridTable(data);
      // });
      initWebGl(edgeData);
      initCallbacks();
      setPerspective();
      requestAnimationFrame(loop);
    });
  // });
}