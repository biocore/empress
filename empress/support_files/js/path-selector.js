define(["util", "AbstractObserverPattern"], function (
    util,
    AbstractObserverPattern
) {
    class PathSelector extends AbstractObserverPattern {
        constructor() {
            super("pathSelectorUpdate");
            this.selectedNodeIDs = [];
            this.selectedNodeNames = [];
            this.n1Container = document.getElementById("shortest-path-n1-div");
            this.n2Container = document.getElementById("shortest-path-n2-div");
            this.distContainer = document.getElementById(
                "shortest-path-distance-div"
            );
            this.resetBtn = document.getElementById("reset-shorest-path");
            this.resetBtn.onclick = () => {
                this.reset();
            };
        }

        addNode(nodeId, nodeName) {
            if (this.selectedNodeIDs.length >= 2) {
                util.toastMsg(
                    "test",
                    "Max nodes selected. Press the reset to clear the selected" +
                        "nodes.",
                    3000,
                    "warning"
                );
                return;
            }

            this.selectedNodeIDs.push(nodeId);
            this.selectedNodeNames.push(nodeName);
            if (this.selectedNodeIDs.length === 1) {
                this.n1Container.innerText = nodeName;
            } else {
                this.n2Container.innerText = nodeName;
                this.notify(this.selectedNodeIDs);
            }
        }

        addDistance(distance) {
            util.populateNum("shortest-path-distance-div", distance);
        }

        reset() {
            this.selectedNodeIDs = [];
            this.selectedNodeNames = [];
            this.n1Container.innerText = "";
            this.n2Container.innerText = "";
            this.distContainer.innerText = "";
            this.notify([]);
        }
    }

    return PathSelector;
});
