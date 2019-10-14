define(['Camera', 'Drawer', 'Colorer', 'VectorOps'],
        function(Camera, Drawer, Colorer, VectorOps) {
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
     *                 TODO: revert treeData back to using actual name.
     * @param {BIOMTable} biom The BIOM table used to color the tree
     * @param {Array} pToName An array that contains the name of the nodes in
     *                preorder.
     *                Note: This is currently being used to traslate observation
     *                      ids (i.e. branch tips) to their preorder position
     *                      in order to look up their metadata in treeData.
     * @param {Canvas} canvas The HTML canvas that the tree will be drawn on.
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
         * @tyoe {Array}
         * Translates between a nodes preorder position and its name
         * @private
         */
        this._pToName = pToName;

        /**
         * @type {Object}
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
        // size of branch coordinates. 2 coordinates represent a single branch
        var coords_size = (this._tree.size - 1) * this._drawer.VERTEX_SIZE * 2;

        // the coordinate of the tree.
        var coords = new Float32Array(coords_size);

        // iterate throught the tree in preorder, skip root
        var coords_index = 0;
        for (var i = 2; i <= this._tree.size ; i++) {
            // name of current node
            var node = this._tree.name(i);
            var parent = this._tree.preorder(
                    this._tree.parent(this._tree.preorderselect(i)));

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

            // coordinate info for current node
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
    Empress.prototype.setUncoloredTipVisibility = function(hide) {
        var visible = !hide;

        // check sample Value for all branches
        for (var node in this._treeData) {
            if (this._treeData[node].sampVal === this.DEFAULT_BRANCH_VAL) {
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
        // the coordinate of the tree.
        var coords = [];
        this._drawer.loadSampleThickBuf([]);

        // iterate throught the tree in preorder, skip root
        for (var i = 2; i <= this._tree.size ; i++) {
            // name of current node
            var node = this._tree.name(i);
            var parent = this._tree.preorder(
                    this._tree.parent(this._tree.preorderselect(i)));

            if (!this._treeData[node].visible) {
                continue;
            }

            var c1 = this._treeData[parent].color;
            if (c1[0] === 0.75 && c1[1] === 0.75 && c1[2] === 0.75) {
                continue;
            }

            // center branch such that parent node is at (0,0)
            var x1 = this._treeData[parent].x;
            var y1 = this._treeData[parent].y;
            var x2 = this._treeData[node].x;
            var y2 = this._treeData[node].y;
            var point =  VectorOps.translate([x1, y1], -1*x2, -1*y2);

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
            var bL = [0, -1*amount];
            bL = VectorOps.rotate(bL, angle, over);
            bL = VectorOps.translate(bL, x2, y2);

            var bR = [length, -1*amount];
            bR = VectorOps.rotate(bR, angle, over);
            bR = VectorOps.translate(bR, x2, y2);

            // t1 v1
            coords.push(...tL);
            coords.push(...c1);

            // t1 v2
            coords.push(...bL);
            coords.push(...c1);

            // t1 v3
            coords.push(...bR);
            coords.push(...c1);

            // t2 v1
            coords.push(...tL);
            coords.push(...c1);

            // t2 v2
            coords.push(...tR);
            coords.push(...c1);

            // t2 v3
            coords.push(...bR);
            coords.push(...c1);
        }

        this._drawer.loadSampleThickBuf(coords);
    }

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
     * Color the tree using sample data
     *
     * @param {String} cat The sample category to use
     * @param {String} color - the Color map to use
     *
     * @return {dictionary} Maps keys to colors
     */
    Empress.prototype.colorBySampleCat = function(cat, color) {
        var tree = this._tree;
        var obs = this._biom.getObsBy(cat);
        var primes = [2, 3, 5, 7];
        var cTips = this._biom.getObservations().size;
        var curPrime = 0;

         // create color brewer
        var colorer = new Colorer(color, primes[0], primes[primes.length-1]);

        // assign colors to primes
        var cm = {};

        // legend key
        var keyInfo = {};

        // color tips
        var keys = Object.keys(obs);
        keys.sort();
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            var prime = primes[curPrime];
            cm[prime] = colorer.getColorRGB(prime);
            keyInfo[key] = {
                color : colorer.getColorHex(prime),
                tPercent : 0,
                rPercent : 0};
            for (var i = 0; i < obs[key].length; i++) {
                // set color for current node
                var node = this._pToName[obs[key][i]];
                this._treeData[node].sampVal = prime;
            }
            curPrime++;
        }

        // project sampVal up tree
        // iterate using postorder.
        for (var i = 1; i <= tree.size; i++) {
            if (tree.postorderselect(i) !== tree.root()) {
                var node = tree.name(tree.preorder(tree.postorderselect(i)));
                var parent = tree.name(tree.preorder(tree.parent(
                                tree.postorderselect(i))));

                for (var j = 0; j < primes.length; j++) {
                    var prime = primes[j];
                    if (this._treeData[node].sampVal % prime === 0 &&
                            this._treeData[parent].sampVal % prime !== 0) {
                        this._treeData[parent].sampVal *= prime;
                    }
                }
            }
        }

        // color tree
        keys = Object.keys(this._treeData);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var item = this._treeData[key];
            if (item.sampVal === this.DEFAULT_BRANCH_VAL) {
                item.color = this.DEFAULT_COLOR;
            } else if (item.sampVal in cm) {
                item.color = cm[item.sampVal];
            }
        }

        // get percent of branches belonging to unique category (i.e. just gut)
        keys = Object.keys(obs);
        keys.sort();
        var p = 0;
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            for (var j = 1; j <= this._tree.size; j++) {
                if (this._treeData[j].sampVal === primes[p]) {
                    keyInfo[key].tPercent++;
                    keyInfo[key].rPercent++;
                }
            }
            p++;
            keyInfo[key].tPercent /= this._tree.size;
            keyInfo[key].rPercent /= cTips;
        }

        return keyInfo;
    };

    /**
     * Sets the color of the tree back to default
     */
    Empress.prototype.resetTree = function() {
        var keys = Object.keys(this._treeData);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            this._treeData[key].color = this.DEFAULT_COLOR;                                                                                         this._treeData[key].visible = true;
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