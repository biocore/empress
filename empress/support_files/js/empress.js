define(["underscore", "Camera", "Drawer", "Colorer", "VectorOps"], function(
    _,
    Camera,
    Drawer,
    Colorer,
    VectorOps
) {
    // The index position of the color array
    const RED = 0;
    const GREEN = 1;
    const BLUE = 2;

    /**
     * @class EmpressTree
     *
     * @param {BPTree} tree The phylogentic tree
     * @param {Object} treeData The metadata associated with the tree
     *                 Note: currently treeData uses the preorder position of
     *                       each node as a key. Originally this was to save a
     *                       a bit of space but it be better if it used the
     *                       actual name of the name in tree.
     * @param {Object} nameToKeys Converts tree node names to an array of keys.
     * @param {BIOMTable} biom The BIOM table used to color the tree
     * @param {Canvas} canvas The HTML canvas that the tree will be drawn on.
     */
    function Empress(tree, treeData, nameToKeys, biom, canvas) {
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
        this.DEFAULT_COLOR_HEX = "#c0c0c0";

        this.DEFAULT_BRANCH_VAL = 1;

        /**
         * @type {BPTree}
         * The phylogentic balance parenthesis tree
         * @private
         */
        this._tree = tree;
        this._numTips = 0;
        for (var i = 0; i < this._tree.size; i++) {
            if (this._tree.isleaf(this._tree.postorderselect(i))) {
                this._numTips++;
            }
        }

        /**
         * @type {Object}
         * The metadata associated with the tree branches
         * Note: postorder positions are used as keys because node names are not
         *       assumed to be unique. Use nameToKeys to convert a name to list
         *       of keys associated with it. Keys start at 1
         * @private
         */
        this._treeData = treeData;

        /**
         * @type{Object}
         * Converts tree node names to an array of _treeData keys.
         * @private
         */
        this._nameToKeys = nameToKeys;

        /**
         * @type {BiomTable}
         * Sample metadata
         * @private
         */
        this._biom = biom;
    }

    /**
     * Initializes WebGL and then draws the tree
     */
    Empress.prototype.initialize = function() {
        this._drawer.initialize();
        this.drawTree();
    };

    /**
     * Draws the tree
     */
    Empress.prototype.drawTree = function() {
        this._drawer.loadTreeBuf(this.getCoords());
        this._drawer.draw();
    };

    /**
     * Retrives the coordinate info of the tree.
     *  format of coordinate info: [x, y, red, green, blue, ...]
     *
     * @return {Array}
     */
    Empress.prototype.getCoords = function() {
        var tree = this._tree;

        // size of branch coordinates. 2 coordinates represent a single branch
        var coords_size = (tree.size - 1) * this._drawer.VERTEX_SIZE * 2;

        // the coordinate of the tree.
        var coords = new Float32Array(coords_size);

        // iterate throught the tree in postorder, skip root
        var coords_index = 0;
        for (var i = 1; i < tree.size; i++) {
            // name of current node
            var node = i;
            var parent = tree.postorder(tree.parent(tree.postorderselect(i)));

            if (!this._treeData[node].visible) {
                continue;
            }

            // branch color
            var color = this._treeData[node].color;

            // coordinate info for parent
            coords[coords_index++] = this._treeData[parent].x;
            coords[coords_index++] = this._treeData[parent].y;
            coords.set(color, coords_index);
            coords_index += 3;

            // coordinate info for current nodeN
            coords[coords_index++] = this._treeData[node].x;
            coords[coords_index++] = this._treeData[node].y;
            coords.set(color, coords_index);
            coords_index += 3;
        }

        return coords;
    };

    /**
     * Sets flag to hide branches not in samples
     *
     * @param {Boolean} hide If true then hide uncolored tips
     *                       if false then show uncolored tips
     */
    Empress.prototype.setNonSampleBranchVisibility = function(hide) {
        var visible = !hide;

        // check sample Value for all branches
        for (var node in this._treeData) {
            if (!this._treeData[node].inSample) {
                this._treeData[node].visible = visible;
            }
        }
    };

    /**
     * Thickens the branches that belong to unique sample categories
     * (i.e. features that are only in gut)
     *
     * @param {Number} amount - How thick to make branch
     */
    Empress.prototype.thickenSameSampleLines = function(amount) {
        var tree = this._tree;

        // the coordinate of the tree.
        var coords = [];
        this._drawer.loadSampleThickBuf([]);

        // iterate throught the tree in postorder, skip root
        for (var i = 1; i < this._tree.size; i++) {
            // name of current node
            var node = i;
            var parent = tree.postorder(tree.parent(tree.postorderselect(i)));

            if (!this._treeData[node].sampleColored) {
                continue;
            }

            var color = this._treeData[node].color;

            // center branch such that parent node is at (0,0)
            var x1 = this._treeData[parent].x;
            var y1 = this._treeData[parent].y;
            var x2 = this._treeData[node].x;
            var y2 = this._treeData[node].y;
            var point = VectorOps.translate([x1, y1], -1 * x2, -1 * y2);

            // find angle/length of branch
            var angle = VectorOps.getAngle(point);
            var length = VectorOps.magnitude(point);
            var over = point[1] < 0;

            //find top left of box of think line
            var tL = [0, amount];
            tL = VectorOps.rotate(tL, angle, over);
            tL = VectorOps.translate(tL, x2, y2);

            var tR = [length, amount];
            tR = VectorOps.rotate(tR, angle, over);
            tR = VectorOps.translate(tR, x2, y2);

            // find bottom point of think line
            var bL = [0, -1 * amount];
            bL = VectorOps.rotate(bL, angle, over);
            bL = VectorOps.translate(bL, x2, y2);

            var bR = [length, -1 * amount];
            bR = VectorOps.rotate(bR, angle, over);
            bR = VectorOps.translate(bR, x2, y2);

            // t1 v1
            coords.push(...tL);
            coords.push(...color);

            // t1 v2
            coords.push(...bL);
            coords.push(...color);

            // t1 v3
            coords.push(...bR);
            coords.push(...color);

            // t2 v1
            coords.push(...tL);
            coords.push(...color);

            // t2 v2
            coords.push(...tR);
            coords.push(...color);

            // t2 v3
            coords.push(...bR);
            coords.push(...color);
        }

        this._drawer.loadSampleThickBuf(coords);
    };

    /**
     * Color the tree by sample IDs
     *
     * @param {Array} sID - The sample IDs
     * @param {Array} rgb - The rgb array which defines the color
     */
    Empress.prototype.colorSampleIDs = function(sIds, rgb) {
        var tree = this._tree;
        var obs = this._biom.getSampleObs(sIds);
        for (var i = 0; i < obs.length; i++) {
            this._treeData[obs].color = rgb;
        }
    };

    /**
     * Converts a list of tree node names to their respectives keys in _treeData
     *
     * @param {Array} names Array of tree node names
     *
     * @return {Array} A list of keys cooresponding to entries in _treeData
     */
    Empress.prototype._namesToKeys = function(names) {
        var keys = [];
        for (var i = 0; i < names.length; i++) {
            keys.push(...this._nameToKeys[names[i]]);
        }
        return keys;
    };

    /**
     * Remove all non unique keys
     *
     * @param {Object} keys An object containing multiple lists of keys
     *
     * @return {Object} A new object with the non unique keys removed
     */
    Empress.prototype._keepUniqueKeys = function(keys) {
        // get unique keys
        var uniqueKeys = _.chain(keys)
            .values()
            .map(function(item) {
                return [...item];
            })
            .flatten()
            .groupBy(function(key) {
                return key;
            })
            .filter(function(key) {
                return key.length === 1;
            })
            .flatten()
            .value();

        // get the unique keys in each item
        var result = {};
        var items = Object.keys(keys);
        for (var i = 0; i < items.length; i++) {
            var itemKeys = [...keys[items[i]]];
            result[items[i]] = _.intersection(itemKeys, uniqueKeys);
        }

        return result;
    };

    /**
     * Creates a color map for each categoy in items
     *
     * @param {Array} items List of categories
     * @param {String} color The chroma color map to use
     * @param {Boolean} rbg if true then a webGL color map will be created
     *                      if false then a javascript color map will be created
     *
     * @return {Object} A color map that uses the categories in items as keys
     */
    Empress.prototype._assignColor = function(items, color, forWebGl) {
        // create color brewer
        var colorer = new Colorer(color, 0, Math.pow(2, items.length));
        var colorFunction = forWebGl ? "getColorRGB" : "getColorHex";
        var colorBlockSize = Math.pow(2, items.length) / items.length;

        var cm = {};
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            cm[item] = {
                color: colorer[colorFunction](i * colorBlockSize)
            };
        }

        return cm;
    };

    /**
     * Color the tree using sample data
     *
     * @param {String} cat The sample category to use
     * @param {String} color - the Color map to use
     *
     * @return {Object} Maps keys to colors
     */
    Empress.prototype.colorBySampleCat = function(cat, color) {
        var tree = this._tree;
        var obs = this._biom.getObsBy(cat);
        var categories = Object.keys(obs);
        categories.sort();

        // shared by the following for loops
        var i, j, category;

        // convert observation IDs to _treeData keys
        for (i = 0; i < categories.length; i++) {
            category = categories[i];
            obs[category] = new Set([...this._namesToKeys(obs[category])]);
        }

        // assign colors to categories
        var cm = this._assignColor(categories, color, true);

        // legend key
        var keyInfo = this._assignColor(categories, color, false);

        // assign internal nodes to approperiate category based on its children
        // iterate using postorder
        for (i = 1; i < tree.size; i++) {
            var node = i;
            var parent = tree.postorder(tree.parent(tree.postorderselect(i)));

            for (j = 0; j < categories.length; j++) {
                category = categories[j];
                if (obs[category].has(node)) {
                    this._treeData[node].inSample = true;
                    obs[category].add(parent);
                }
            }
        }
        obs = this._keepUniqueKeys(obs);

        // color tree
        for (i = 0; i < categories.length; i++) {
            category = categories[i];
            var keys = [...obs[category]];

            for (j = 0; j < keys.length; j++) {
                var key = keys[j];
                this._treeData[key].color = cm[category].color;
                this._treeData[key].sampleColored = true;
            }
        }

        // get percent of branches belonging to unique category (i.e. just gut)
        this.percentColoredBySample(obs, keyInfo);

        return keyInfo;
    };

    /**
     * Cacluates the total and relative pertange of the tree that was colored by
     * each category in sampleObs
     *
     * @param {Object} sampleObs The object containing which tree branches are
     *                colored by which sample category
     * @param {Object} keyInfo The object containing the information to be
     *                 displayed in the sample legend
     */
    Empress.prototype.percentColoredBySample = function(sampleObs, keyInfo) {
        // calculate relative tree size i.e. the subtree spanned by the samples
        // iterate over tree using postorder

        var i,
            relativeTreeSize = 0;
        for (i = 1; i <= this._tree.size; i++) {
            if (this._treeData[i].inSample) {
                relativeTreeSize++;
            }
        }

        // calculate total and relative percentages in each group
        var sampleCategies = Object.keys(sampleObs);
        for (i = 0; i < sampleCategies.length; i++) {
            var category = sampleCategies[i];
            var branchesInCategory = sampleObs[category].length;
            keyInfo[category].tPercent = branchesInCategory / this._tree.size;
            keyInfo[category].rPercent = branchesInCategory / relativeTreeSize;
        }
    };

    /**
     * Sets the color of the tree back to default
     */
    Empress.prototype.resetTree = function() {
        var keys = Object.keys(this._treeData);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            this._treeData[key].color = this.DEFAULT_COLOR;
            this._treeData[key].inSample = false;
            this._treeData[key].sampleColored = false;
            this._treeData[key].visible = true;
        }
        this._drawer.loadSampleThickBuf([]);
    };

    /**
     * Returns a list of sample categories
     *
     * @return {Array}
     */
    Empress.prototype.getSampleCategories = function() {
        return this._biom.getSampleCategories();
    };

    return Empress;
});
