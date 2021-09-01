define([
    "underscore",
    "util",
    "AbstractObserverPattern",
    "MetadataSlickGridMenu",
], function (_, util, AbstractObserverPattern, MetadataSlickGridMenu) {
    class PathSelector extends AbstractObserverPattern {
        constructor(cols) {
            super("pathSelectorUpdate");
            this.container = document.getElementById("path-selector-div");
            this.nodeLayer = new NodeLayer(
                "Selected nodes",
                this.container,
                this
            );
            this.nodeLayer.registerObserver(this);
            this.statLayer = new StatLayer("Statistics", this.container);
            this.metadataCols = cols;
            // nodeInfo - key: nodeid, val: {name: String, metadata: {col1: val1,  col2:val2, ...}, selected: Boolean}
            this.nodeInfo = {};
            this.metadataGrid = new MetadataSlickGridMenu(
                this.metadataCols,
                [],
                document.getElementById("metadata-slick-grid-container"),
                false,
                "Name",
                Math.floor(window.innerHeight * 0.75),
                null
            );
            this.hideLayers();
        }

        triggerEvent() {
            if (this.getSelectedNodes().length < 1) {
                return;
            }
            this.notify(this.getSelectedNodes());
        }

        hideLayers() {
            this.nodeLayer.hide();
            this.statLayer.hide();
        }

        showLayers() {
            this.nodeLayer.show();
            this.statLayer.show();
        }

        toggleLayers() {
            if (_.isEmpty(this.nodeInfo)) {
                this.hideLayers();
            } else {
                this.showLayers();
            }
        }

        addNode(nodeId, nodeName, metadata) {
            if (this.nodeInfo.hasOwnProperty(nodeId)) {
                this.nodeLayer.removeNode(nodeId);
                return;
            }
            this.nodeLayer.addNode(nodeId, nodeName);
            this.nodeInfo[nodeId] = {
                name: nodeName,
                metadata: metadata,
                selected: true,
            };
            this.toggleLayers();
            this.notify(this.getSelectedNodes());
        }

        addDistance(distance) {
            this.statLayer.setDistance(distance);
        }

        setNumNodesOnPath(numNodes) {
            this.statLayer.setNumNodesOnPath(numNodes);
        }

        layerUpdate(obj) {
            var scope = this;
            if (obj.remove !== undefined) {
                delete this.nodeInfo[obj.remove];
            }

            if (obj.hide !== undefined) {
                this.nodeInfo[obj.hide].selected = false;
            }

            if (obj.visible !== undefined) {
                this.nodeInfo[obj.visible].selected = true;
            }
            this.toggleLayers();
            this.notify(this.getSelectedNodes());
        }

        showAllMetadata() {
            var scope = this;
            var selectedNodes = this.getSelectedNodes();
            var metadata = [];
            _.each(selectedNodes, function (node) {
                metadata.push(scope.nodeInfo[node].metadata);
            });
            this.metadataGrid.show(this.metadataCols, metadata);
        }

        showSameMetadata() {
            if (this.getSelectedNodes().length <= 1) {
                this.showAllMetadata();
                return;
            }

            // 1) initialize result
            // key: column name, value: {columnValue: [nodeIds]}
            var result = {};
            for (var cName of this.metadataCols) {
                result[cName] = {};
            }
            var nodeId, info, col, val, colInfo, nodes, node, metadata;

            // 2) extract unique values in each column and a list of nodes
            //    with that value
            // iterate over nodes
            for ([nodeId, info] of Object.entries(this.nodeInfo)) {
                if (!info.selected) continue;
                // iterate over columns
                for ([col, val] of Object.entries(info.metadata)) {
                    // get the column object from result
                    var colVals = result[col];

                    // check if the val has been seen in col
                    if (colVals.hasOwnProperty(val)) {
                        // nodeId's value has already been been seen
                        // so we will just addit to the entry
                        colVals[val].push(nodeId);
                    } else {
                        // nodeId's value for col has not yet been seen
                        // so we will create a new entry
                        colVals[val] = [nodeId];
                    }
                }
            }

            // 3) get columns with same values and format metadata to be used
            //    in slick grid
            // sameMetadata - key: nodeId, value: {col1: val1, col2: val2, ...}
            var sameMetadata = {};
            var sameCols = ["Name"];
            // iterate over cols
            for ([col, colInfo] of Object.entries(result)) {
                // iterate over each value in col
                for ([val, nodes] of Object.entries(colInfo)) {
                    // check if multiple nodes shared same value
                    if (nodes.length > 1) {
                        for (node of nodes) {
                            if (!sameMetadata.hasOwnProperty(node)) {
                                sameMetadata[node] = {
                                    Name: this.nodeInfo[node].name,
                                };
                            }
                            sameMetadata[node][col] = val;
                        }

                        if (!sameCols.includes(col)) {
                            sameCols.push(col);
                        }
                    }
                }
            }

            var sameMetadataArray = [];
            for ([node, metadata] of Object.entries(sameMetadata)) {
                sameMetadataArray.push(metadata);
            }

            // 4) show table
            this.metadataGrid.show(sameCols, sameMetadataArray);
        }

        showDifferentMetadata() {
            if (this.getSelectedNodes().length <= 1) {
                this.showAllMetadata();
                return;
            }

            // 1) initialize result
            // key: column name, value: {columnValue: [nodeIds]}
            var result = {};
            for (var cName of this.metadataCols) {
                result[cName] = {};
            }

            var nodeId, info, col, val, colInfo, nodes, node, metadata;

            // 2) extract unique values in each column and a list of nodes
            //    with that value
            // iterate over nodes
            for ([nodeId, info] of Object.entries(this.nodeInfo)) {
                if (!info.selected) continue;
                // iterate over columns
                for ([col, val] of Object.entries(info.metadata)) {
                    // get the column object from result
                    var colVals = result[col];

                    // check if the val has been seen in col
                    if (colVals.hasOwnProperty(val)) {
                        // nodeId's value has already been been seen
                        // so we will just addit to the entry
                        colVals[val].push(nodeId);
                    } else {
                        // nodeId's value for col has not yet been seen
                        // so we will create a new entry
                        colVals[val] = [nodeId];
                    }
                }
            }

            // 3) get columns with different values and format metadata to be used
            //    in slick grid
            // diffMetadata - key: nodeId, value: {col1: val1, col2: val2, ...}
            var diffMetadata = {};
            var diffCols = ["Name"];
            // iterate over cols
            for ([col, colInfo] of Object.entries(result)) {
                // iterate over each value in col
                for ([val, nodes] of Object.entries(colInfo)) {
                    // check if multiple nodes shared same value
                    if (nodes.length === 1) {
                        node = nodes[0];
                        if (!diffMetadata.hasOwnProperty(node)) {
                            diffMetadata[node] = {
                                Name: this.nodeInfo[node].name,
                            };
                        }
                        diffMetadata[node][col] = val;

                        if (!diffCols.includes(col)) {
                            diffCols.push(col);
                        }
                    }
                }
            }

            var diffMetadataArray = [];
            for ([node, metadata] of Object.entries(diffMetadata)) {
                diffMetadataArray.push(metadata);
            }

            // 4) show table
            this.metadataGrid.show(diffCols, diffMetadataArray);
        }

        getSelectedNodes() {
            var scope = this;
            var selectedNodes = [];
            _.each(this.nodeInfo, function (info, nodeId) {
                if (info.selected) selectedNodes.push(nodeId);
            });
            return selectedNodes;
        }
    }

    //************************************************************************//
    //                           NodeLayer class                              //
    //************************************************************************//
    var uniqueNum = 1;
    class NodeLayer extends AbstractObserverPattern {
        constructor(title, container, pathSelector) {
            super("layerUpdate");
            this.title = title; // "Selected nodes"
            this.container = container; // div
            this.layerDiv = null;
            this.inputs = []; // checkboxes for each node
            this.selectedVals = [];
            this.pathSelector = pathSelector;
            this.nodeRows = [];

            var scope = this;

            // create layer div
            this.layerDiv = this.container.appendChild(
                document.createElement("div")
            );

            // create border line
            this.layerDiv.appendChild(document.createElement("hr"));

            // create checkbox legend title
            var legendTitle = this.layerDiv.appendChild(
                document.createElement("div")
            );
            legendTitle.innerText = this.title;
            legendTitle.classList.add("legend-title");

            // create container for metadata buttons
            var p = this.layerDiv.appendChild(document.createElement("p"));

            // button to show metadata fields with same value across all nodes
            var button = p.appendChild(document.createElement("button"));
            button.innerText = "Same metadata";
            button.setAttribute("style", "margin: 0 auto;");
            button.onclick = () => {
                this.pathSelector.showSameMetadata();
            };

            // button to show all metadata fields
            button = p.appendChild(document.createElement("button"));
            button.innerText = "All metadata";
            button.setAttribute("style", "margin: 0 auto;");
            button.onclick = () => {
                this.pathSelector.showAllMetadata();
            };

            // button to show metadata fields with diff value across all nodes
            button = p.appendChild(document.createElement("button"));
            button.innerText = "Different metadata";
            button.setAttribute("style", "margin: 0 auto;");
            button.onclick = () => {
                this.pathSelector.showDifferentMetadata();
            };

            // create checkbox legend div
            var chkBoxLegendDiv = this.layerDiv.appendChild(
                document.createElement("div")
            );
            chkBoxLegendDiv.classList.add("barplot-layer-legend");
            chkBoxLegendDiv.classList.add("legend");

            // create chcbox div
            var legendChkBoxs = chkBoxLegendDiv.appendChild(
                document.createElement("div")
            );

            // create checkboxes
            this.table = legendChkBoxs.appendChild(
                document.createElement("table")
            );
            this.table.style.width = "100%";
            this.table.style["table-layout"] = "fixed";

            // clear all button
        }

        addNode(nodeId, nodeName) {
            var row = document.createElement("tr");
            row.style.width = "100%";
            row.value = nodeName;
            var id =
                this.title.replaceAll(" ", "-") +
                "-" +
                nodeName.replaceAll(" ", "-") +
                uniqueNum++;

            // add checkbox
            var dataCheck = document.createElement("td");
            dataCheck.style.width = "5%";
            var input = document.createElement("input");
            input.id = id;
            input.setAttribute("type", "checkbox");
            input.checked = true;

            this.inputs.push(input);
            dataCheck.appendChild(input);
            row.appendChild(dataCheck);

            // add checkbox label
            var dataLabel = document.createElement("label");
            dataLabel.setAttribute("for", input.id);
            dataLabel.innerText = nodeName;
            var labelTD = document.createElement("td");
            labelTD.appendChild(dataLabel);
            labelTD.style.width = "79%";
            labelTD.style.overflow = "hidden";
            labelTD.style["text-overflow"] = "ellipsis";
            labelTD.style["white-space"] = "nowrap";
            row.appendChild(labelTD);
            this.nodeRows[nodeId] = row;

            // add remove button
            var removeTd = row.appendChild(document.createElement("td"));
            var removeBtn = removeTd.appendChild(
                document.createElement("button")
            );
            removeBtn.innerText = "Remove";

            // add click events for checkbox/remove button
            var scope = this;
            input.onclick = function () {
                var obj = {};
                if (this.checked) {
                    obj = scope.getNotifyObject({ visible: nodeId });
                } else {
                    obj = scope.getNotifyObject({ hide: nodeId });
                }
                scope.notify(obj);
            };
            removeBtn.onclick = function () {
                scope.removeNode(nodeId);
            };

            // add row to table
            this.table.appendChild(row);

            // value is selected by default
            this.selectedVals.push(nodeName);
        }

        removeNode(nodeId) {
            var row = this.nodeRows[nodeId];
            this.table.deleteRow(row.rowIndex);
            this.notify(this.getNotifyObject({ remove: nodeId }));
        }

        getNotifyObject(params) {
            var obj = {
                remove: undefined,
                hide: undefined,
                visible: undefined,
                showAll: undefined,
                showSame: undefined,
                showDiff: undefined,
            };

            _.each(params, function (val, key) {
                obj[key] = val;
            });

            return obj;
        }

        hide() {
            this.layerDiv.classList.add("hidden");
        }

        show() {
            this.layerDiv.classList.remove("hidden");
        }
    }

    //************************************************************************//
    //                           StatLayer class                              //
    //************************************************************************//
    class StatLayer {
        constructor(title, container) {
            this.title = title; // "Selected nodes"
            this.container = container; // div
            this.layerDiv = null;
            this.numNodesDiv = 0;

            var scope = this;

            // create layer div
            this.layerDiv = this.container.appendChild(
                document.createElement("div")
            );

            // create border line
            this.layerDiv.appendChild(document.createElement("hr"));

            // create checkbox legend title
            var legendTitle = this.layerDiv.appendChild(
                document.createElement("div")
            );
            legendTitle.innerText = this.title;
            legendTitle.classList.add("legend-title");

            // create stat div
            var statDiv = this.layerDiv.appendChild(
                document.createElement("div")
            );

            // create checkboxes
            this.table = statDiv.appendChild(document.createElement("table"));
            this.table.style["table-layout"] = "fixed";

            // create number of nodes row
            var row = this.table.appendChild(document.createElement("tr"));
            var td = row.appendChild(document.createElement("td"));
            var numNodesLabel = td.appendChild(document.createElement("label"));
            numNodesLabel.innerHTML =
                "<span style='font-weight: bold;'>" +
                "Number of nodes on path" +
                "</span>";
            td = row.appendChild(document.createElement("td"));
            this.numNodesDiv = td.appendChild(document.createElement("div"));
            this.numNodesDiv.innerText = 0;

            // create distance row
            row = this.table.appendChild(document.createElement("tr"));
            td = row.appendChild(document.createElement("td"));
            var distLabel = td.appendChild(document.createElement("label"));
            distLabel.innerHTML =
                "<span style='font-weight: bold;'>" +
                "Total Distance" +
                "</span>";
            td = row.appendChild(document.createElement("td"));
            this.distanceDiv = td.appendChild(document.createElement("div"));
            this.distanceDiv.innerText = 0;
        }

        hide() {
            this.layerDiv.classList.add("hidden");
        }

        show() {
            this.layerDiv.classList.remove("hidden");
        }

        setDistance(distance) {
            this.distanceDiv.textContent = distance.toLocaleString(undefined, {
                maximumSignificantDigits: 6,
            });
        }

        setNumNodesOnPath(numNodes) {
            this.numNodesDiv.textContent = numNodes;
        }
    }

    return PathSelector;
});
