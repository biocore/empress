define([
    "underscore",
    "util",
], function (_, util,) {
    class HTMLTable {
        constructor(container, tableInfo=undefined) {
            this.container = container;
            
            // create table
            this.table = this.container.appendChild(
                document.createElement("table")
            );
            this.table.style.width = "100%";

            // table headers (not required)
            this.colHeaders = undefined;
            this.rowHeaders = undefined;

            /**
             * {rowNum | rowHeader: HTML elemement row}
             */
            this.tableData = {}; // indexed by row number or row header

            // initialize table
            if (tableInfo) {
                this.setTableInfo(tableInfo);
            }
        }

        setTableInfo(tableInfo) {
            var scope = this;

            // clear table
            util.clearChildHTMLElement(this.table);

            var row;

            var hasColHeader = tableInfo.hasOwnProperty("colHead");
            var hasRowHeader = tableInfo.hasOwnProperty("rowHead");

            // add header row
            if (hasColHeader) {
                this.colHeaders = tableInfo.colHead;
                var header = this.table.appendChild(
                    document.createElement("thead")
                );
                var hRow = header.appendChild(document.createElement("tr"));
                
                // add blank cell to make room for row headers
                if (hasRowHeader) {
                    hRow.appendChild(document.createElement("td"));
                }

                // add column headers
                _.each(this.colHeaders, (colHeader) => {
                    var cHeaderCell = hRow.appendChild(document.createElement("td"));
                    cHeaderCell.textContent = colHeader;
                    cHeaderCell.style["font-weight"] = "bold";
                });
            }

            var tableBody = this.table.appendChild(
                document.createElement("tbody")
            );
            if (hasRowHeader) {
                this.rowHeaders = tableInfo.rowHead;
                _.each(this.rowHeaders, (rowHeader) => {
                    // add row to table
                    scope.tableData[rowHeader] = tableBody.appendChild(
                        document.createElement("tr")
                    );

                    // add header cell to row
                    var rHeaderCell = scope.tableData[rowHeader].appendChild(
                        document.createElement("td")
                    );
                    rHeaderCell.textContent = rowHeader;
                    rHeaderCell.style["font-weight"] = "bold";
                });
            } else {
                _.each(_.range(tableInfo.data.length), (rowNum) => {
                    // add row to table
                    scope.tableData[rowNum] = tableBody.appendChild(
                        document.createElement("tr")
                    );
                });
            }

            this.setTableData(tableInfo.data)
        }

        /*
         * either array or dict.
         */
        setTableData(data) {
            var scope = this;
            // add data to table
            _.each(data, (rowData, indx) => {
                _.each(rowData, (item) => {
                    var dataCell = scope.tableData[indx].appendChild(
                        document.createElement("td")
                    );
                    dataCell.innerText = item;
                });
            });
        }

        // {rowName | rowIndx: {colName | colIndx: val}} 
        modifyRowVals(data) {
            var scope = this;
            _.each(data, (rowData, rowIndx) => {
                if (scope.rowHeaders) {
                    rowIndx = _.indexOf(scope.rowHeaders, rowIndx);
                }

                // account for column header
                if (scope.colHeaders) rowIndx +=1
                _.each(rowData, (item, colIndx) => {
                    if (scope.colHeaders) {
                        colIndx = _.indexOf(scope.colHeaders, colIndx);
                    }

                    // account for row header
                    if (scope.rowHeaders) colIndx += 1
                    var dataCell = scope.table.rows[rowIndx].cells[colIndx];
                    dataCell.innerText = item;
                });
            });
        }
    }

    return HTMLTable;
});