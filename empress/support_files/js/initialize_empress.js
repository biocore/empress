function initialize(){
  console.log('Start')

  $(".metadata-container").hide();
  drawingData.nodeCoords = [0, 0, 0, 0, 0];
  drawingData.highTri = [];

  // get metadata information
  $.getJSON(urls.edgeURL, function(data) {
    // grab tree coord info from tree, this will be used to intialize WebGl
    drawingData.numBranches = data.edges.length
    drawingData.initZoom = data.max;
    drawingData.currentZoom = drawingData.initZoom;

    // intializes webgl and creates callback events for users inputs
    initWebGl(data.edges);
    initCallbacks();
    setPerspective();
    requestAnimationFrame(loop);
  });

  $.getJSON(urls.headersURL, function(data) {
    // TODO: should we have option of spliting headers into tips/nodes

    // // fill the internal node drop down menus
    ["#branch-color-options", "#nodes-find-level"].forEach(function(id) {
        fillDropDownMenu(data.node, id);
      });

    // // fill the tip drop down menus
    ["#tip-color-options", "#tips-find-level"].forEach(function(id) {
        fillDropDownMenu(data.tip, id);
      });

    // fill the collapse menu
    fillDropDownMenu(data.node, "#collapse-level");

    // fill the rank menu
    fillDropDownMenu(data.node, "#rank-color-options")

    // TODO: create coloring drop box
  });

  $("#show-metadata").prop('checked', true);
}