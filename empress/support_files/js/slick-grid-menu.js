define([
    "underscore",
    "util",
    "slickgrid",
    "AbstractObserverPattern",
], function (_, util, SlickGrid, AbstractObserverPattern) {
    class SlickGridMenu extends AbstractObserverPattern {
        constructor(
            metadataCols,
            metadataRows,
            container,
            hideIdCol = false,
            idCol = null,
            maxTableHeight = 400,
            onClick = null,
            frozenColumn = -1,
            sortCols=false,
            placeIdColFirst=false
        ) {
            super("slickGridUpdate");

            this.container = container;
            this.maxTableHeight = maxTableHeight;
            var height = Math.min(
                maxTableHeight,
                25 * (metadataRows.length + 1) + 15
            );
            this.container.style.height = "" + height + "px";
            // this.metadata = metadata;
            this.idCol = idCol;
            this.selectedCol = null;
            this.hideIdCol = hideIdCol;
            this.sortCols = sortCols;
            this.placeIdColFirst = placeIdColFirst;
            this.colNames = this.sortColumns(metadataCols);
            if (this.idCol === null) {
                // create unique id col for upload metadata
                this.colNames.push("slick-grid-id");
                var id = 0;
                for (var row of metadataRows) {
                    row["slick-grid-id"] = id++;
                }
                this.idCol = "slick-grid-id";
            }

            // Create the DataView.
            var options = {
                autosizeColsMode: "FCV",
                autosizeColPaddingPx: +0,
                viewportSwitchToScrollModeWidthPercent: +100,
                autosizeTextAvgToMWidthRatio: +0.75,
                frozenColumn: frozenColumn,
            };

            var columns = this.createColumnOptions();

            // create data view to hold tree metadata
            this.dataView = new Slick.Data.DataView();

            // Pass it as a data provider to SlickGrid.
            this.grid = new Slick.Grid(
                this.container,
                this.dataView,
                columns,
                options
            );

            // Make the grid respond to DataView change events.
            var scope = this;
            this.dataView.onRowCountChanged.subscribe(function (e, args) {
                scope.grid.updateRowCount();
                scope.grid.render();
            });

            this.dataView.onRowsChanged.subscribe(function (e, args) {
                scope.grid.invalidateRows(args.rows);
                scope.grid.render();
            });

            // This will fire the change events and update the grid.
            this.dataView.setItems(metadataRows, this.idCol);

            this.grid.autosizeColumns();

            this.grid.onHeaderClick.subscribe(function (e, args) {
                scope.selectedCol = args.column.name;
                scope.grid.invalidateAllRows();
                for (var column of scope.grid.getColumns()) {
                    if (
                        !scope.hideIdCol ||
                        (scope.hideIdCol && column.name !== scope.idCol)
                    ) {
                        column.cssClass = "";
                    }
                }
                args.column.cssClass = "highlight-slick-cell";
                scope.grid.render();
                scope.notify({ selectedCol: scope.selectedCol });
            });

            // when "onBeforeSort" returns false, the "onSort" won't execute (for example a backend server error while calling backend query to sort)
            this.grid.onSort.subscribe(function (e, args) {
                var field = args.columnId;
                var sign = args.sortAsc ? 1 : -1;

                scope.dataView.sort(function (row1, row2) {
                    var val1 = row1[field],
                        val2 = row2[field];
                    if (val1 === undefined) return 1;
                    if (val2 === undefined) return -1;
                    return (val1 > val2 ? 1 : -1) * sign;
                });
            });

            if (onClick !== null) {
                this.grid.onClick.subscribe(function (e, args) {
                    onClick(args.cell, args.row, args.grid);
                });
            }
        }

        getSelectedCol() {
            return this.selectedCol;
        }

        getData() {
            return this.dataView.getItems();
        }

        getColumnMetadata(col) {
            var data = this.getData();
            var metadata = [];
            for (var i = 0; i < data.length; i++) {
                metadata.push(data[i][col]);
            }
            return metadata;
        }

        getMetadataForColumns(cols) {
            var data = this.getData();
            var metadata = [];
            for (var i = 0; i < data.length; i++) {
                var colMeta = [];
                for (var col of cols) {
                    colMeta.push(data[i][col]);
                }
                metadata.push(colMeta);
            }
            return metadata;
        }

        getOptions() {
            return this.grid.getOptions();
        }

        reset() {
            this.grid.resizeCanvas();
            this.selectedCol = null;
        }

        getGrid() {
            return this.grid;
        }

        getColumns() {
            var columnNames = [];
            var gridCols = this.grid.getColumns();
            for (var col of gridCols) {
                var name = col.name;
                if (
                    !this.hideIdCol ||
                    (this.hideIdCol && name !== this.idCol)
                ) {
                    columnNames.push(name);
                }
            }
            return columnNames;
        }

        clearData() {
            this.dataView.setItems([]);
            this.grid.render();
        }

        createColumnOptions() {
            var columns = [];
            for (var column of this.colNames) {
                columns.push({
                    id: column,
                    name: column,
                    field: column,
                    focusable: false,
                    sortable: true,
                    autoSize: {
                        autosizeMode: "CTI",
                        rowSelectionMode: "FS1",
                        valueFilterMode: "NONE",
                        widthEvalMode: "CANV",
                        ignoreHeaderText: false,
                        sizeToRemaining: false,
                        allowAddlPercent: undefined,
                        rowSelectionCount: 100,
                    },
                });
            }

            var scope = this;
            if (this.hideIdCol) {
                var idColNum = _.findIndex(this.colNames, function (col) {
                    return col === scope.idCol;
                });
                if (idColNum !== -1) {
                    var idCol = columns[idColNum];
                    idCol.width = 0;
                    idCol.minWidth = 0;
                    idCol.maxWidth = 0;
                    idCol.cssClass = "hide-slick-cell";
                    idCol.headerCssClass = "hide-slick-cell";
                    idCol.autoSize = {
                        autosizeMode: "LCK",
                    };
                }
            }
            return columns;
        }

        setColumns(metadataCols) {
            this.colNames = this.sortColumns(metadataCols);
            var columns = this.createColumnOptions();
            this.grid.setColumns(columns);
            this.grid.autosizeColumns();
        }

        setData(metadata) {
            this.dataView.setItems(metadata, this.idCol);

            this.refreshTableHeight();
        }

        addItem(item) {
            // add new item to data view
            this.dataView.addItem(item);
            this.dataView.refresh();

            this.refreshTableHeight();
        }

        refreshTableHeight() {
            // find new height of grid
            var height = Math.min(
                this.maxTableHeight,
                25 * (this.dataView.getLength() + 1) + 15
            );
            this.container.style.height = "" + height + "px";
            this.grid.resizeCanvas();
        }

        setCellCss(cellsCss) {
            this.grid.invalidateAllRows();
            this.grid.setCellCssStyles("customCss", cellsCss);
            this.grid.render();
        }

        sortColumns(cols) {
            var columns;
            if (this.sortCols) {
                columns =  util.naturalSort(cols);
            } else {
                columns =  cols;
            }
            if (this.placeIdColFirst) {
                columns = _.filter(columns, (col) => {return col !== this.idCol});
                columns.unshift(this.idCol);
            }

            return columns;
        }
    }

    return SlickGridMenu;
});
