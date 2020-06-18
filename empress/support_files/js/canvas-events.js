define(["glMatrix", "SelectedNodeMenu"], function (gl, SelectedNodeMenu) {
    /**
     * @class CanvasEvents
     *
     * Handles the tree canvas events. These events include all tree movement
     * events as well as quick search events.
     *
     * @param {Empress} empress The core class. Entry point for all metadata and
     *                  tree operations.
     */
    function CanvasEvents(empress) {
        this.empress = empress;
        this.drawer = empress._drawer;
        this.canvas = empress._canvas;

        // the current mouse coordinates in screen space
        this.mouseX = null;
        this.mouseY = null;

        /*
         * This flag is set when the last event cause the tree move in the xy
         * plane.
         *
         * if this flag is not set when user clicks on canvas, then the
         * selected node menu will be reset. Otherwise, if this flag is set,
         * the selected node menu's location will be updated to follow its
         * respective node.
         */
        this.mouseMove = false;
        this.selectedNodeMenu = new SelectedNodeMenu(this.empress, this.drawer);
        this.selectedNodeMenu.initialize();

        // the quick search bar
        this.quickSearchBar = document.getElementById("quick-search");

        // quick-search button
        this.quickSearchBtn = document.getElementById("side-header-search-btn");

        // The div container that holds the quick search bar.
        // Autocomplete options will also be added to the end of this container
        this.autocompleteContainer = document.getElementById(
            "autocomplete-container"
        );
    }

    /**
     * Creates the mouse events to handle moving/zooming the tree
     *
     * modified from
     * https://www.w3schools.com/howto/howto_js_draggable.asp
     */
    CanvasEvents.prototype.setMouseEvents = function () {
        // need for use in closures
        var canvasEvents = this;
        var canvas = this.canvas;
        var drawer = this.drawer;
        var empress = this.empress;
        var selectedNodeMenu = this.selectedNodeMenu;
        var newX = 0,
            newY = 0;

        // moves tree as long as mouse is pressed down
        var moveTree = function (e) {
            // set move flag
            canvasEvents.mouseMove = true;

            // grab mouse location
            var center = canvas.offsetWidth / 2;
            newX = e.clientX - center;
            newY = center - e.clientY;

            // find how far mouse move in tree space
            var curTreeCoords = gl.vec4.fromValues(
                canvasEvents.mouseX,
                canvasEvents.mouseY,
                0,
                1
            );
            var newTreeCoords = gl.vec4.fromValues(newX, newY, 0, 1);
            var transVec = gl.vec4.create();
            gl.vec4.sub(transVec, newTreeCoords, curTreeCoords);

            // create translation matrix
            var transMat = gl.mat4.create();
            gl.mat4.fromTranslation(transMat, transVec);
            gl.mat4.multiply(drawer.worldMat, transMat, drawer.worldMat);

            // update current mouse position
            canvasEvents.mouseX = newX;
            canvasEvents.mouseY = newY;

            // draw tree
            drawer.draw();

            // update the hover node menu
            selectedNodeMenu.updateMenuPosition();
        };

        // stops moving tree when mouse is released
        var stopMove = function (e) {
            document.onmouseup = null;
            document.onmousemove = null;
            canvasEvents.mouseX = null;
            canvasEvents.mouseY = null;
            canvas.style.cursor = "default";
        };

        // adds the listeners to the document to move tree
        var mouseDown = function (e) {
            canvasEvents.mouseMove = false;
            var center = canvas.offsetWidth / 2;
            canvasEvents.mouseX = e.clientX - center;
            canvasEvents.mouseY = center - e.clientY;
            document.onmouseup = stopMove;
            document.onmousemove = moveTree;
            canvas.style.cursor = "none";
        };

        // zooms the tree in/out
        var zoomTree = function (e) {
            // find position of cursor before zoom. This allows the zoom to
            // occur at cursor rather than at origin
            var center = canvas.offsetWidth / 2;
            var mX = e.clientX - center;
            var mY = center - e.clientY;
            var curPos = gl.vec4.fromValues(mX, mY, 0, 1);

            // move tree
            var transVec = gl.vec3.create();
            gl.vec3.sub(transVec, transVec, curPos);
            var transMat = gl.mat4.create();
            gl.mat4.fromTranslation(transMat, transVec);
            gl.mat4.multiply(drawer.worldMat, transMat, drawer.worldMat);

            // zoom tree
            var zoomBy = e.deltaY < 0 ? drawer.scaleBy : 1 / drawer.scaleBy;
            var zoomVec = gl.vec3.fromValues(zoomBy, zoomBy, zoomBy);
            var zoomMat = gl.mat4.create();
            gl.mat4.fromScaling(zoomMat, zoomVec);
            gl.mat4.multiply(drawer.worldMat, zoomMat, drawer.worldMat);

            // move tree back to original place
            transVec = gl.vec3.fromValues(curPos[0], curPos[1], curPos[2]);
            transMat = gl.mat4.create();
            gl.mat4.fromTranslation(transMat, transVec);
            gl.mat4.multiply(drawer.worldMat, transMat, drawer.worldMat);

            // draw tree
            drawer.draw();

            // update the hover node menu
            selectedNodeMenu.updateMenuPosition();
        };

        // removes the selected node menu if the mouseMove flag is not set
        var mouseClick = function (e) {
            if (!canvasEvents.mouseMove) {
                // clear old select menu
                selectedNodeMenu.clearSelectedNode();

                var treeSpace = drawer.toTreeCoords(e.clientX, e.clientY);
                var x = treeSpace.x;
                var y = treeSpace.y;

                // margin of error for mouse click to still register a node sel
                var epsilon = 10;

                var closestDist = Infinity;
                var closestNode = null;
                var xDist, yDist;
                for (var i = 1; i <= empress._tree.size; i++) {
                    var node = empress._treeData[i];
                    var nodeX = empress.getX(node);
                    var nodeY = empress.getY(node);
                    xDist = x - nodeX;
                    yDist = y - nodeY;
                    var squareDist = xDist * xDist + yDist * yDist;
                    if (squareDist < closestDist) {
                        closestDist = squareDist;
                        closeNode = node;
                    }
                }

                // check if node is within epsilon pixels away from mouse click
                var nX = empress.getX(closeNode);
                var nY = empress.getY(closeNode);
                var screenSpace = drawer.toScreenSpace(nX, nY);
                nX = screenSpace.x;
                nY = screenSpace.y;
                xDist = e.clientX - nX;
                yDist = e.clientY - nY;
                var screenDist = Math.sqrt(xDist * xDist + yDist * yDist);
                if (screenDist < epsilon) {
                    canvasEvents.placeHoverNodeBox(closeNode.name, false);
                }
            }
        };

        canvas.onmousedown = mouseDown;
        canvas.onclick = mouseClick;
        canvas.onwheel = zoomTree;
    };

    /**
     * Creates an autocomplete menu for possible node ids as the user types
     * in the quick-search bar
     *
     * @param{Array} ids A list of node ids. Note: ids should only contain the
     *                   user defined ids and not the ones generated by Empress
     *
     * modified from https://www.w3schools.com/howto/howto_js_autocomplete.asp
     */
    CanvasEvents.prototype.autocomplete = function (ids) {
        // need for use in closures
        var autocompleteContainer = this.autocompleteContainer;
        var quickSearchBar = this.quickSearchBar;
        var canvasEvents = this;
        var searchBtn = this.quickSearchBtn;

        var createClickEvent = function (e) {
            var nodeId = this.id;

            // set text of quick-search to match suggested word
            quickSearchBar.value = nodeId;
            quickSearchBar.innerHTML = nodeId;

            // show the selected node menu
            canvasEvents.placeHoverNodeBox(nodeId);

            // clear possible words menu
            removeSuggestionMenu();
        };

        /**
         * oninput event for quickSearchBar
         * This function will add all nodesto the suggested node id menu that
         * begin with the users query as they type into the quick-search bar.
         * As long as quickSearchBar has focus, this function is called on every
         * time the quick-search query is updated (i.e. pretty much every
         * keystroke)
         *
         * Note: 'this' refers to quickSearchBar
         */
        var addSuggestions = function () {
            // remove old suggestions
            removeSuggestionMenu();

            // grab the quick-search query
            var query = this.value;

            // if quick search bar is empty then do nothing
            if (!query) {
                return;
            }

            // create container for the possible nodes ids
            var suggestionMenu = document.createElement("DIV");
            suggestionMenu.setAttribute("id", "autocomplete-list");
            suggestionMenu.setAttribute("class", "autocomplete-items");
            suggestionMenu.setAttribute(
                "style",
                "width:" + this.offsetWidth + "px;"
            );
            autocompleteContainer.appendChild(suggestionMenu);

            // search ids array for all possible words
            for (var i = 0; i < ids.length; i++) {
                var word = ids[i];

                // if node id begins with user query, add it to suggestionMenu
                if (
                    word.substr(0, query.length).toUpperCase() ===
                    query.toUpperCase()
                ) {
                    // create a container to hold the text/click event for the
                    // suggested id
                    var suggestId = document.createElement("DIV");
                    suggestId.id = word;

                    suggestId.innerHTML =
                        "<strong>" + word.substr(0, query.length) + "</strong>";
                    suggestId.innerHTML += word.substr(query.length);

                    // add click event so user can select id from menu
                    suggestId.addEventListener("mousedown", createClickEvent);

                    // add suggested id to the suggstions menu
                    suggestionMenu.appendChild(suggestId);
                }
            }
        };

        /**
         * onkeydown event for quickSearchBar
         * This function will display the selected node menu for the node id
         * in the quick-search bar whenever the user presses the <ENTER> key.
         * Note: 'this' refers to quickSearchBar
         *
         * @param{Object} key The key the user pressed
         */
        var searchId = function (key) {
            // <ENTER> key is pressed
            if (key.keyCode === 13) {
                removeSuggestionMenu();
                canvasEvents.placeHoverNodeBox(this.value);
            }
        };

        /**
         * onblur event for quickSearchBar and is also called from other events
         * Removes the suggestionMenu
         * Note: 'this' refers to quickSearchBar
         */
        var removeSuggestionMenu = function () {
            var suggestionMenu = document.getElementById("autocomplete-list");
            quickSearchBar.classList.remove("invalid-search");
            if (suggestionMenu) {
                autocompleteContainer.removeChild(suggestionMenu);
            }
        };

        // add events to quick-search bar
        quickSearchBar.oninput = addSuggestions;
        quickSearchBar.onkeydown = searchId;
        quickSearchBar.onblur = removeSuggestionMenu;

        /**
         * click event for quickSearchBtn
         */
        var search = function () {
            var nodeId = quickSearchBar.value;
            canvasEvents.placeHoverNodeBox(nodeId);
        };
        searchBtn.onclick = search;
    };

    /**
     * Creates a node-hover box for nodeId. If nodeId does not exist, then this
     * this method will make the background color of the quick search bar red.
     * This method is call from the both the quick search btn and when the user
     * clicks on the canvas.
     *
     * @param{String} nodeId The node id to make a node-hover box for.
     * @param{Boolean} moveTree If true, then this method will move the viewing
     *                          window of the tree to the node.
     */
    CanvasEvents.prototype.placeHoverNodeBox = function (
        nodeId,
        moveTree = true
    ) {
        var empress = this.empress;
        var selectedNodeMenu = this.selectedNodeMenu;
        var drawer = this.drawer;

        // multiple nodes can have the same name
        var idList = empress._nameToKeys[nodeId];

        if (idList !== undefined) {
            // get first node
            var node = empress._treeData[idList[0]];

            if (idList.length > 1) {
                node = empress._treeData[empress._tree.size - 1];
            }

            if (moveTree) {
                // create matrix to translate node to center of screen
                var center = gl.vec3.fromValues(
                    drawer.treeSpaceCenterX,
                    drawer.treeSpaceCenterY,
                    1
                );
                var centerMat = gl.mat4.create();
                gl.mat4.fromTranslation(centerMat, center);

                var nodePos = gl.vec3.fromValues(
                    -1 * empress.getX(node),
                    -1 * empress.getY(node),
                    1
                );
                var worldMat = gl.mat4.create();
                gl.mat4.fromTranslation(drawer.worldMat, nodePos);
                gl.mat4.multiply(drawer.worldMat, drawer.worldMat, centerMat);
            }

            // show menu
            selectedNodeMenu.setSelectedNodes(idList);
            selectedNodeMenu.showNodeMenu();

            empress.drawTree();
        } else {
            this.quickSearchBar.classList.add("invalid-search");
        }
    };

    return CanvasEvents;
});
