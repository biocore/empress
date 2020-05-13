define(["glMatrix", "SelectedNodeMenu"], function (gl, SelectedNodeMenu) {
    function CanvasEvents(empress, drawer, canvas) {
        this.empress = empress;
        this.drawer = drawer;
        this.canvas = canvas;

        // the current mouse coordinates in screen space
        this.mouseX = null;
        this.mouseY = null;
        this.mouseMove = false;

        // the search bar
        this.SEARCH_ID = "quick-search";

        this.selectedNodeMenu = new SelectedNodeMenu(this.empress, this.drawer);
        this.selectedNodeMenu.initialize();
    }

    /**
     * Creates the mouse events to handle moving/zooming the tree
     *
     * modified from
     * https://www.w3schools.com/howto/howto_js_draggable.asp
     */
    CanvasEvents.prototype.setMouseEvents = function () {
        // need for use in closures
        var events = this;
        var canvas = this.canvas;
        var drawer = this.drawer;
        var empress = this.empress;
        var selectedNodeMenu = this.selectedNodeMenu;
        var newX = 0,
            newY = 0;

        // moves tree as long as mouse is pressed down
        var moveTree = function (e) {
            // set move flag
            events.mouseMove = true;

            // grab mouse location
            var center = $(window).width() / 2;
            newX = e.clientX - center;
            newY = center - e.clientY;

            // find how far mouse move in tree space
            var curTreeCoords = gl.vec4.fromValues(
                events.mouseX,
                events.mouseY,
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
            events.mouseX = newX;
            events.mouseY = newY;

            // draw tree
            drawer.draw();

            // update the hover node menu
            selectedNodeMenu.updateMenuPosition();
        };

        // stops moving tree when mouse is released
        var stopMove = function (e) {
            document.onmouseup = null;
            document.onmousemove = null;
            events.mouseX = null;
            events.mouseY = null;
            canvas.style.cursor = "default";
        };

        // adds the listenrs to the document to move tree
        var mouseDown = function (e) {
            events.mouseMove = false;
            var center = $(window).width() / 2;
            events.mouseX = e.clientX - center;
            events.mouseY = center - e.clientY;
            document.onmouseup = stopMove;
            document.onmousemove = moveTree;
            canvas.style.cursor = "none";
        };

        // zooms the tree in/out
        var zoomTree = function (e) {
            // find position of cursor before zoom. This allows the zoom to
            // occur at cursor rather than at origin
            var center = $(window).width() / 2;
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

        var mouseClick = function (e) {
            if (!events.mouseMove) {
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
                for (var i = 1; i < empress._tree.size; i++) {
                    var node = empress._treeData[i];
                    var nodeX = empress.getX(node);
                    var nodeY = empress.getY(node);
                    xDist = x - nodeX;
                    yDist = y - nodeY;
                    var squareDist = xDist * xDist + yDist * yDist;
                    if (squareDist < closeDist) {
                        closeDist = squareDist;
                        closeNode = node;
                    }
                }

                // check if node is within epsilo pixels away from mouse click
                var nX = empress.getX(closeNode);
                var nY = empress.getY(closeNode);
                var screenSpace = drawer.toScreeSpace(nX, nY);
                nX = screenSpace.x;
                nY = screenSpace.y;
                xDist = e.clientX - nX;
                yDist = e.clientY - nY;
                var screenDist = Math.sqrt(xDist * xDist + yDist * yDist);
                if (screenDist < epsilon) {
                    selectedNodeMenu.setSelectedNode(closeNode);
                    empress.drawTree();
                }
            }
        };

        canvas.onmousedown = mouseDown;
        canvas.onclick = mouseClick;
        canvas.onwheel = zoomTree;

        // triggers search when enter key is pressed in search menu
        var search = document.getElementById(this.SEARCH_ID);
        search.onkeyup = function (e) {
            e.preventDefault();
            if (e.keyCode === 13) {
                // multiple nodes can have the same name
                var idList = empress._nameToKeys[this.value];

                if (idList !== null) {
                    // get first node
                    var node = empress._treeData[idList[0]];

                    // show menu
                    selectedNodeMenu.setSelectedNode(node);
                    empress.drawTree();
                }
            }
        };

        // triggers the 'active' look when user enters the search bar
        search.focus = function () {
            document
                .getElementById(panel.SIDE_PANEL_ID)
                .classList.add("panel-active");
        };

        // triggers the 'unactive' look when user leaves search bar
        search.blur = function () {
            document
                .getElementById(panel.SIDE_PANEL_ID)
                .classList.toggle(
                    "panel-active",
                    document.querySelector(".side-content:not(.hidden)")
                );
        };
    };

    return CanvasEvents;
});
