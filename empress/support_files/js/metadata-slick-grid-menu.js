define([
    "underscore",
    "util",
    "AbstractObserverPattern",
    "SlickGridMenu",
    "Colorer",
], function (_, util, AbstractObserverPattern, SlickGridMenu, Colorer) {
    class MetadataSlickGridMenu extends SlickGridMenu {
        constructor(
            metadataCols,
            metadataRows,
            container,
            hideIdCol = false,
            idCol = null,
            maxTableHeight = 400,
            onClick = null,
            frozenColumn = 0,
            sortCols=false,
            placeIdColFirst=false
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
                frozenColumn,
                sortCols,
                placeIdColFirst
            );
            this.metadataCols = metadataCols;
            this.metadataSlickGridContainer = container;
            this.notifyFunction = "metadataSlickGridUpdate";
            this.greyScreen = document.getElementById("greyout-empress-screen");
            var closeBar = this.metadataSlickGridContainer.insertBefore(
                document.createElement("div"),
                this.metadataSlickGridContainer.firstChild
            );
            closeBar.classList.add("close-bar");
            this.closeBtn = closeBar.appendChild(
                document.createElement("button")
            );
            this.closeBtn.style.float = "right";
            this.closeBtn.innerText = "X";
            this.closeBtn.classList.add("close-button");
            this.closeBtn.onclick = () => {
                this.hide();
            };

            this.titleDiv = this.metadataSlickGridContainer.insertBefore(
                document.createElement("div"),
                this.container
            );
            this.titleDiv.classList.add("legend-title");

            this.descriptionDiv = this.metadataSlickGridContainer.insertBefore(
                document.createElement("div"),
                this.container
            );
            this.descriptionDiv.style.width = "100%";
            this.descriptionDiv.style.display = "flex";
            this.descriptionDiv.style["justify-content"] = "center";

            this.descriptionP = this.descriptionDiv.appendChild(
                document.createElement("div")
            );
            this.descriptionP.classList.add("side-panel-notes");
            this.descriptionP.style.width = "95%";

            // re-hide the container
            this.metadataSlickGridContainer.classList.add("hidden");

            // sort column and color cells based on similar values
            var scope = this;
            this.grid.onSort.subscribe(function (e, args) {
                var field = args.columnId;
                var sign = args.sortAsc ? 1 : -1;

                var uniqueVals = new Set();
                scope.dataView.sort(function (row1, row2) {
                    var val1 = row1[field],
                        val2 = row2[field];
                    uniqueVals.add(val1);
                    uniqueVals.add(val2);
                    if (val1 === undefined) return 1;
                    if (val2 === undefined) return -1;
                    return (val1 > val2 ? 1 : -1) * sign;
                });
            });
        }

        hide() {
            this.metadataSlickGridContainer.classList.add("hidden");
            this.greyScreen.classList.add("hidden");
        }

        show(cols, metadata, style) {
            this.metadataSlickGridContainer.classList.remove("hidden");
            this.greyScreen.classList.remove("hidden");
            this.metadataSlickGridContainer.classList.remove("hidden");
            this.greyScreen.classList.remove("hidden");
            this.setStyleInfo(style);
            this.setData(metadata);
            this.setColumns(cols);
        }

        setStyleInfo(style) {
            var title, description;
            if (style === "all") {
                title = "All metadata";
                description =
                    "This table includes all available feature metadata " +
                    "for the selected nodes. " +
                    "Clicking on a column header will sort the features " +
                    "based on their value for the selected column. " +
                    "Additionally, features with the same value will be colored the same.";
            } else if (style === "same") {
                title = "Same metadata";
                description =
                    "This table only contains feature values present in " +
                    "at least two features. All unique feature values have been removed. " +
                    "Clicking on a column header will sort the features " +
                    "based on their value for the selected column. " +
                    "Additionally, features with the same value will be colored the same.";
            } else if (style === "diff") {
                title = "Different metadata";
                description =
                    "This table only contains the feature values that are present in " +
                    "a single feature. All non-unique feature values have been removed. " +
                    "Clicking on a column header will sort the features " +
                    "based on their value for the selected column. " +
                    "Additionally, features with the same value will be colored the same.";
            }

            this.titleDiv.innerText = title;
            this.descriptionP.innerText = description;
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
