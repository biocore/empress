define(['Camera', 'Drawer'], function(Camera, Drawer) {
    // The index position of the color array
    const RED = 0;
    const GREEN = 1;
    const BLUE = 2;

    /**
     *
     * @class EmpressTree
     *
     */
    function Empress(tree, treeData, biom, pToName, canvas ) {
        /**
         * @type {Camera}
         * The camera used to look at the tree
         * @private
         */
        this._cam = new Camera();

        /**
         * @type {Drawer}
         * used to draw the tree
         * @private
         */
        this._drawer = new Drawer(canvas, this._cam);

        /**
         * @type {Array}
         * The default color of the tree
         */
        this.DEFAULT_COLOR = [0.75, 0.75, 0.75];

        /**
         * @type {BPTree}
         * The phylogentic balance parenthesis tree
         * @private
         */
        this._tree = tree;

        /**
         * @tyoe {Array}
         * Translates between a nodes preorder position and its name
         * @private
         */
        this._pToName = pToName;
        /**
         * @type {Dictionary}
         * The metadata associated with the tree branches
         * @private
         */
        this._treeData = treeData;

        /**
         * @type {BiomTable}
         * Sample metadata
         * @private
         */
        this._biom = biom;
    };

    Empress.prototype.initialize = function() {
        this._drawer.initialize();
        this.drawTree();
    };

    Empress.prototype.drawTree = function() {
        this._drawer.loadTreeBuf(this.getCoords());
        this._drawer.draw();
    };

    /**
     * Retrives the coordinates of the tree. formated like [x, y, r, g, b, ...]
     *
     * @return {Array}
     */
    Empress.prototype.getCoords = function() {
        // the coordinate of the tree.
        var coords = new Array((this._tree.size - 1) * 5);
        var curIndex = 0;
        // iterate throught the tree in preorder
        for (var i = 1; i <= this._tree.size ; i++) {
            // name of current node
            var name = this._tree.name(i);

            // grab index position of first child of current node
            var child = this._tree.fchild(this._tree.preorderselect(i));
            while (child) {

                // coordinate info the the child of current node
                var cName = this._tree.name(this._tree.preorder(child));
                var color = this._treeData[cName]['color'];
                coords[curIndex++] = this._treeData[cName]['x'];
                coords[curIndex++] = this._treeData[cName]['y'];
                coords[curIndex++] = color[RED];
                coords[curIndex++] = color[GREEN];
                coords[curIndex++] = color[BLUE];

                // coordinate info for current node
                color = this._treeData[name]['color'];
                coords[curIndex++] = this._treeData[name]['x'];
                coords[curIndex++] = this._treeData[name]['y'];
                coords[curIndex++] = color[RED];
                coords[curIndex++] = color[GREEN];
                coords[curIndex++] = color[BLUE];

                // get next child
                child = this._tree.nsibling(child);
            }
        }
        return coords;
    };

    /**
     * Color the tree using sample data
     *
     * @param {String} cat The sample category to use
     */
    Empress.prototype.colorBySample = function(cat) {
        var obs = this._biom.getObsBy('env_package');
        var prms = [2, 3, 5];
        for (var i = 0; i < obs['human-oral'].length; i++) {
            // set color for current node
            var node = this._pToName[obs['human-oral'][i]]
            this._treeData[node]['sampVal'] *= 2;

            // project color up tree
            var p = this._tree.parent(this._tree.preorderselect(node));
            while (p !== -1) {
                var pName = this._tree.name(this._tree.preorder(p));
                if (this._treeData[pName]['sampVal'] % 2 !== 0) {
                    this._treeData[pName]['sampVal'] *= 2;
                }

                // get next parent
                p = this._tree.parent(p);
            }
        }

        for (var i = 0; i < obs['human-skin'].length; i++) {
            // set color for current node
            var node = this._pToName[obs['human-skin'][i]];
            this._treeData[node]['sampVal'] *= 3;

            // project color up tree
            var p = this._tree.parent(this._tree.preorderselect(node));
            while (p !== -1) {
                var pName = this._tree.name(this._tree.preorder(p));
                if (this._treeData[pName]['sampVal'] % 3 !== 0) {
                    this._treeData[pName]['sampVal'] *= 3;
                }

                // get next parent
                p = this._tree.parent(p);
            }
        }

        for (var i = 0; i < obs['human-gut'].length; i++) {
            // set color for current node
            var node = this._pToName[obs['human-gut'][i]];
            this._treeData[node]['sampVal'] *= 5;

            // project color up tree
            var p = this._tree.parent(this._tree.preorderselect(node));
            while (p !== -1) {
                var pName = this._tree.name(this._tree.preorder(p));
                if (this._treeData[pName]['sampVal'] % 5 !== 0) {
                    this._treeData[pName]['sampVal'] *= 5;
                }

                // get next parent
                p = this._tree.parent(p);
            }
        }

        // colo tree
        for (var key in this._treeData) {
            var item = this._treeData[key];
            if (item['sampVal'] === 1) {
                item['color'] = this.DEFAULT_COLOR;
            } else if (item['sampVal'] === 2) {
                item['color'] = [1, 0, 0];
            } else if (item['sampVal'] === 3) {
                item['color'] = [0, 1, 0];
            } else if (item['sampVal'] === 5) {
                item['color'] = [0, 0, 1];
            } else if (item['sampVal'] === 6) {
                item['color'] = [1, 1, 0];
            } else if (item['sampVal'] === 10) {
                item['color'] = [1, 0, 1];
            } else if (item['sampVal'] === 15) {
                item['color'] = [0, 1, 1];
            } else if (item['sampVal'] === 30) {
                item['color'] = [0, 0, 0];
            }
        }
    };

    /**
     * Sets the color of the tree back to default
     */
    Empress.prototype.resetTree = function() {
        for (var key in this._treeData) {
            this._treeData[key]['color'] = this.DEFAULT_COLOR;
            this._treeData[key]['sampVal'] = 1;
        }
    };

    /**
     * Returns a list of sample categories
     *
     * @return {Array}
     */
    Empress.prototype.getSampleCats = function() {
        return this._biom.getSampleCats();
    };

    return Empress;
});