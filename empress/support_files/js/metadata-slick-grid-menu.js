define([
    "underscore",
    "util",
    "AbstractObserverPattern",
    "SlickGridMenu",
    "Colorer",
], function (
    _,
    util,
    AbstractObserverPattern,
    SlickGridMenu,
    Colorer
) {
    class MetadataSlickGridMenu  extends SlickGridMenu {
        constructor(
            metadataCols,
            metadataRows,
            container,
            hideIdCol = false,
            idCol = null,
            maxTableHeight = 400,
            onClick = null
        ) {
            // create slick grid container
            var slickGridContainer = container.appendChild(
                document.createElement("div")
            );
            slickGridContainer.style.width = "100%";

            // need to unhide container otherwise slickgrid will think the
            // width of the container is 0 and not setup correctly
            container.classList.remove("hidden");
            super(
                metadataCols,
                metadataRows,
                slickGridContainer,
                hideIdCol,
                idCol,
                maxTableHeight,
                onClick,
                0
            );
            this.metadataCols = metadataCols;
            this.metadataSlickGridContainer = container;
            this.notifyFunction = "metadataSlickGridUpdate";
            this.greyScreen = document.getElementById("greyout-empress-screen");
            var closeBar = this.metadataSlickGridContainer.insertBefore(
                document.createElement("div"),
                this.metadataSlickGridContainer.firstChild
            );
            closeBar.classList.add("close-bar")
            this.closeBtn = closeBar.appendChild(
                document.createElement("button"),
            );
            this.closeBtn.style.float = "right";
            this.closeBtn.innerText = "X";
            this.closeBtn.classList.add("close-button")
            this.closeBtn.onclick = () => {
                this.hide();
            }

            // re-hide the container
            this.metadataSlickGridContainer.classList.add("hidden");

            // sort column and color cells based on similar values
            var scope = this;
            this.grid.onSort.subscribe(function (e, args) {
                var field = args.columnId;
                var sign = args.sortAsc ? 1: -1;

                var uniqueVals = new Set();
                scope.dataView.sort(function(row1, row2) {
                    var val1 = row1[field], val2 = row2[field];
                    uniqueVals.add(val1), uniqueVals.add(val2);
                    if (val1 === undefined) return 1;
                    if (val2 === undefined) return -1;
                    return (val1 > val2 ? 1: -1) * sign;
                });
                uniqueVals.delete(undefined)
                var colorMap = new Colorer(
                    "discrete-coloring-qiime",
                    [...uniqueVals],
                ).getMapHex();
                console.log(colorMap, uniqueVals)
                var columnOptions = scope.grid.getColumns();
                for (var columnOption of columnOptions) {
                    columnOption.formatter = function(row, cell, value, columnDef, dataContext) {
                        if (value === undefined) return;
                        var color = colorMap[value];
                        if (columnDef.name === field) {
                            return "<span style='color:" + color + "'>" + value + "</span>";
                        } else {
                            return value;
                        }
                    }
                }
            });
        }

        hide() {
            this.metadataSlickGridContainer.classList.add("hidden");
            this.greyScreen.classList.add("hidden");
        }

        show(cols, metadata) {
            this.metadataSlickGridContainer.classList.remove("hidden");
            this.greyScreen.classList.remove("hidden");
            this.metadataSlickGridContainer.classList.remove("hidden");
            this.greyScreen.classList.remove("hidden");
            this.setData(metadata);
            this.setColumns(cols);
        }

        addItem(item) {
            // again need to enable container otherwise slickgrid will assume
            // its width is 0
            this.show();
            // add new item to data view
            this.dataView.addItem(item);
            this.dataView.refresh();


            // find new height of grid
            var height = Math.min(
                this.maxTableHeight,
                25 * (this.dataView.getLength() + 1) + 15
            );
            this.container.style.height = "" + height + "px";
            this.grid.resizeCanvas();
            this.hide();
        }
    }

    return MetadataSlickGridMenu;
});