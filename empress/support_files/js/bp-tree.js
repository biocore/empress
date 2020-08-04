define(["ByteArray"], function (ByteArray) {
    /**
     *
     * @class BPTree
     *
     * Initialzes a new BP tree.
     *
     * @param {Array} b The array that represents the tree structure
     * @param {Array} names The names of each node stored in preorder
     * @param {Array} lengths The lengths of each node stored in preorder
     * @param {Number} coding The number of 1/0s coded in the tree, null not coded
     *
     * @return {BPTree}
     * @constructs BPTree
     */
    function BPTree(b, names = null, lengths = null, coding = 51) {
        if (coding !== null) {
            var b_len = b.length - 1;
            var decoded_b = [];

            const _helper_decode = function (s) {
                return s === "1" ? 1 : 0;
            };

            _.each(b, function (value, i) {
                if (value === 0) {
                    decoded_b.push.apply(decoded_b, [0]);
                } else {
                    var element = value
                        .toString(2)
                        .split("")
                        .map(_helper_decode);

                    // We need to pad the number if we are not in the last number of the list
                    // Note that we ae padding with 51, which should match the python code
                    if (i < b_len && element.length < 51) {
                        var padding = new Array(coding - element.length).fill(
                            0
                        );
                        decoded_b.push.apply(decoded_b, padding);
                    }
                    decoded_b.push.apply(decoded_b, element);
                }
            });

            b = decoded_b;
        }

        /**
         * @type {Array}
         * Used to store the structure of the tree
         * @private
         */
        this.b_ = b;

        /**
         * @type {Number}
         * Number of nodes in tree
         */
        this.size = this.b_.length / 2;

        /**
         * @type {Array}
         * @private
         * stores the name of each node in preorder. If names are not provided
         * then the names will be set to null by default.
         * Note: if memory becomes an issue this could be converted into a
         *       Uint16Array
         */
        this.names_ = names ? names : null;

        /**
         * @type{Float32Array}
         * @private
         * stores the length of the nodes in preorder. If lengths are not
         * provided then lengths will be set to 0.
         * Note: lengths are assumed to be smaller that 3.4 * 10^38
         */
        this.lengths_ = lengths ? new Float32Array(lengths) : null;

        /**
         * @type {Uint32Array}
         * @private
         * r0Cache[i] represents rank(0,i) in this.b
         * Note: rank(0,i) = number of 0's between indices [0,i] in this.b
         * TODO: implement a rmM tree and calculate this on the fly
         */
        this.r0Cache_ = ByteArray.sumVal(this.b_, Uint32Array, 0);

        /**
         * @type {Uint32Array}
         * @private
         * r1Cache[i] represents rank(1,i) in this.b
         * TODO: implement a rmM tree and calculate this on the fly
         */
        this.r1Cache_ = ByteArray.sumVal(this.b_, Uint32Array, 1);

        /**
         * @type {Uint32Array}
         * @private
         * s0Cache[i] represents select(0,i) in this.b
         * Note: select(0,i) = the index of the ith 0 in this.b
         * TODO: implement a rmM tree and calculate this on the fly
         */
        this.s0Cache_ = ByteArray.seqUniqueIndx(this.r0Cache_, Uint32Array);

        /**
         * @type {Uint32Array}
         * @private
         * s1Cache[i] represents select(1,i) in this.b
         * TODO: implement a rmM tree and calculate this on the fly
         */
        this.s1Cache_ = ByteArray.seqUniqueIndx(this.r1Cache_, Uint32Array);

        /**
         * @type {Uint32Array}
         * @private
         * excess is used frequently so we can cache it to get a slight
         * performance boost
         */
        var eCache = [];
        for (var i = 0; i < this.b_.length; i++) {
            eCache.push(2 * this.r1Cache_[i] - i - 1);
        }
        this.eCache_ = new Uint32Array(eCache);

        /**
         *
         * @type {Uint32Array}
         * @private
         * open/close cache to boost performance but at cost of memory. This can
         * be optimized with use of rrm-tre
         */
        this.ocCache_ = new Uint32Array(this.b_.length);
        var openInx = 0;
        var oc = [];
        // We don't declare "var i" since it was already declared above
        for (i = 0; i < this.b_.length; i++) {
            if (this.b_[i]) {
                oc.push(i);
            } else {
                openInx = oc.pop();
                this.ocCache_[openInx] = i;
                this.ocCache_[i] = openInx;
            }
        }

        /**
         * @type{Array}
         * @private
         *
         * Stores the order of nodes in an in-order traversal. Elements in this
         * array are node ids
         *
         * Note: In-order is stored because bp-tree doesn't not have
         *       an efficient way of convert a nodes in-order position to tree
         *       index and vice versa like it does with post order through
         *       the use of postorderselect() and postorder(). So it is more
         *       efficient to cache an in-order tree traversal.
         */
        this._inorder = null;
    }

    /**
     *
     * Returns the number of times bit t was observed leading upto bit t
     *
     * @param{Number} t Bit value, 0 is an close paraenthesis and 1 is an
     *      open parenthesis.
     * @param{Number} i Position to evaluate
     *
     * @return{Number}
     */
    BPTree.prototype.rank = function (t, i) {
        var rCache = t ? this.r1Cache_ : this.r0Cache_;
        return rCache[i];
    };

    /**
     *
     * Returns the position of the kth occurance of bit t
     *
     * @param{Number} t Bit value, 0 is an close paraenthesis and 1 is an
     *      open parenthesis.
     * @param{Number} k The rank of bit t to find
     *
     * @return{Number}
     */
    BPTree.prototype.select = function (t, k) {
        var sCache = t ? this.s1Cache_ : this.s0Cache_;
        return sCache[k - 1];
    };

    /**
     *
     * The excess at position i is the number of 1's - 0's.
     * i.e. rank(1,i) - rank(0,i)
     *
     * @oaram{Number} i The position to calculate the excess
     *
     * @return{Number} The excess at position i
     * @private
     */
    BPTree.prototype.excess_ = function (i) {
        // need to subtract 1 since i starts at 0
        // Note: rank(1,i) - rank(0,i) = (2*(rank(1,i)) - i
        return 2 * this.r1Cache_[i] - i - 1;
    };

    /**
     *
     * The depth of the ith node in preorder
     *
     * @param{Number} i Node i in preorder
     *
     * @return{Number} Depth of node i
     */
    BPTree.prototype.depth = function (i) {
        //depth is same as excess
        return this.eCache_[i];
    };

    /**
     *
     * The name of the ith node in bp tree
     *
     * @param{Number} i Node i in bp tree
     *
     * @return{String}
     */
    BPTree.prototype.name = function (i) {
        return this.names_[this.preorder(i) - 1];
    };

    /**
     *
     * The number of leaf nodes in tree
     *
     * @return {Number}
     */
    BPTree.prototype.numleaves = function () {
        var total = 0;
        for (var i = 0; i < this.b_.length - 1; i++) {
            total = this.isleaf(i) ? total + 1 : total;
        }
        return total;
    };

    /**
     *
     * The length of the ith node in bp tree
     *
     * @param{Number} i Node i in bp tree
     *
     * @return{Number}
     */
    BPTree.prototype.length = function (i) {
        return this.lengths_[this.preorder(i) - 1];
    };

    /**
     * Forward search finds the next jth index that has d more excess than i
     *
     * @param {Number} i The index to start the search
     *                 Note: i is the absolue index into this.b and does not
     *                 represent a nodes position unlike other function.
     * @param {Number} d Returns the jth index with d more excess than i
     *
     * @return {Number}
     */
    BPTree.prototype.fwdsearchNaive = function (i, d) {
        var b = this.eCache_[i] + d;
        for (var j = i + 1; i < this.b_.length; j++) {
            if (this.eCache_[j] === b) {
                return j;
            }
        }

        // an index could not be found that satisfies the conditions
        return -1;
    };

    /**
     * Currently this is just place holder
     */
    BPTree.prototype.fwdsearch = function (i, d) {
        return this.fwdsearchNaive(i, d);
    };

    /**
     * Backward search find the previous jth index with d more excess than i
     *
     * @param {Number} i The index to start the search
     *                 Note: i is the absolue index into this.b and does not
     *                 represent a nodes position unlike other function.
     * @param {Number} d Returns the jth index with d more excess than i
     *
     * @return {Number}
     */
    BPTree.prototype.bwdsearchNaive = function (i, d) {
        var b = this.eCache_[i] + d;
        for (var j = i - 1; j >= 0; j--) {
            if (this.eCache_[j] === b) {
                return j;
            }
        }

        // an index could not be found
        return -1;
    };

    /**
     * Currently this is just a place holder
     */
    BPTree.prototype.bwdsearch = function (i, d) {
        return this.bwdsearchNaive(i, d);
    };

    /**
     * Finds the position of the opening parenthesis that matches b[i]
     *
     * @param {Number} i Index to open. i is returned if i is an open paraen
     *                 i can be either an open or close parenthesis
     *
     * @return {Number}
     */
    BPTree.prototype.open = function (i) {
        return this.b_[i] ? i : this.ocCache_[i];
    };

    /**
     * Find the position of the closing parenthesis that matches b[i]
     *
     * @param {Number} i Index to close. i is returned if i is an close paraen
     *                 i can be either an open or close parenthesis
     *
     * @return {Number}
     */
    BPTree.prototype.close = function (i) {
        return this.b_[i] ? this.ocCache_[i] : i;
    };

    /**
     * Returns the opening index of the smallest matching pair that contains i
     *
     * @param {Number} i Index to enclose.
     *                 i can be either an open or close parenthesis
     *
     * @return {Number}
     */
    BPTree.prototype.enclose = function (i) {
        // i is an open paren
        if (this.b_[i]) {
            return this.bwdsearch(i, -2) + 1;
        }

        // i is a close paren
        return this.bwdsearch(i - 1, -2) + 1;
    };

    /**
     * The opening index of the smallest matching pair that contains the node
     * represented by i
     *
     * @param{Number} i Current node
     *                i can be either an open or close parenthesis
     *
     * @return {Number}
     */
    BPTree.prototype.parent = function (i) {
        // i represents the root node
        if (i === this.root() || i === this.b_.length - 1) {
            return -1;
        }

        return this.enclose(i);
    };

    /**
     * returns the index of the opening index of the root node
     *
     * @return {Number}
     */
    BPTree.prototype.root = function () {
        return 0;
    };

    /**
     * Return true if i represents a leaf node
     *
     * @return {Boolean}
     */
    BPTree.prototype.isleaf = function (i) {
        return this.b_[i] && !this.b_[i + 1];
    };

    /**
     * returns the opening index the first child of the node represented by i
     *
     * @param {Number} i Current node
     *                 i can be either an open or close parenthesis
     *
     * @return {Number} return 0 if i is a leaf node
     */
    BPTree.prototype.fchild = function (i) {
        if (this.isleaf(i)) {
            return 0;
        }

        if (this.b_[i]) {
            return i + 1;
        } else {
            return this.fchild(this.open(i));
        }
    };

    /**
     * returns the opening index the last child of the node represented by i
     *
     * @param {Number} i Current node
     *                 i can be either an open or close parenthesis
     * @return {Number} return 0 if i is a leaf node
     */
    BPTree.prototype.lchild = function (i) {
        if (this.isleaf(i)) {
            return 0;
        }

        if (this.b_[i]) {
            return this.open(this.close(i) - 1);
        } else {
            return this.lchild(this.open(i));
        }
    };

    /**
     * returns the opening index of the next sibling of i
     *
     * @param {Number} i Current node.
     *                 i can be either an open or close parenthesis
     *
     * @return {Number}
     */
    BPTree.prototype.nsibling = function (i) {
        // i is a close parenthesis
        if (!this.b_[i]) {
            return this.nsibling(this.open(i));
        }

        var pos = this.close(i) + 1;
        if (pos >= this.b_.length) {
            // i is the root node
            return 0;
        } else if (this.b_[pos]) {
            return pos;
        }

        // i does not have a next sibling
        return 0;
    };

    /**
     * returns the opening index of the previous sibling of i
     *
     * @param {Number} i Current node.
     *                 i can be either an open or close parenthesis
     *
     * @return {Number} returns 0 if no previous sibling
     */
    BPTree.prototype.psibling = function (i) {
        var pos = 0;

        // check to see if i is root
        if (i === this.root()) {
            return 0;
        }

        // i is close paren
        if (!this.b_[i]) {
            return this.psibling(this.open(i));
        }

        // check to see if i open paren
        if (this.b_[i]) {
            // i is fchild
            if (this.b_[i - 1]) {
                return 0;
            }

            pos = this.open(i - 1);
        }

        if (pos < 0) {
            return 0;
        } else if (this.b_[pos]) {
            return pos;
        }

        // no previous found
        return 0;
    };

    /**
     * Finds postorder rank of node i
     *
     * @param {Number} i The node index to asses postorder rank
     *
     * @return {Number} The postorder rank of node i
     */
    BPTree.prototype.postorder = function (i) {
        if (this.b_[i]) {
            return this.rank(0, this.close(i));
        } else {
            return this.rank(0, i);
        }
    };

    /**
     * Find the index of the node with postorder k
     *
     * @param {Number} k The postorder to search for
     *                 Note: k starts at 1
     *
     * @return {Number} The index position of the node in the tree
     */
    BPTree.prototype.postorderselect = function (k) {
        return this.open(this.select(0, k));
    };

    /**
     * Finds preorder rank of node i
     *
     * @param {Number} i The node index to asses preorder rank
     *
     * @return {Number} The preorder rank of node i
     */
    BPTree.prototype.preorder = function (i) {
        if (this.b_[i]) {
            return this.rank(1, i);
        } else {
            return this.preorder(this.open(i));
        }
    };

    /**
     * Find the index of the node with preorder k
     *
     * @param {Number} k The preorder to search for.
     *                 Note: k starts at 1.
     *
     * @return {Number} The index position of the node in the tree
     */
    BPTree.prototype.preorderselect = function (k) {
        return this.select(1, k);
    };

    /**
     * Returns an array of nodes sorted by their inoder position.
     *
     * Note: empress uses a nodes postorder position as its key in _treeData
     *       so this method will use a nodes postorder position to represent
     *       it in the resulting array.
     *       This method will also cache the resulting array.
     */
    BPTree.prototype.inOrderNodes = function () {
        if (this._inorder !== null) {
            return this._inorder;
        }

        // the root node of the tree
        var curNode = this.preorderselect(1);
        var nodeStack = [curNode];
        this._inorder = [];
        while (nodeStack.length > 0) {
            // "visit" node
            curNode = nodeStack.shift();
            this._inorder.push(this.postorder(curNode));

            // append children to stack
            var child = this.fchild(curNode);
            while (child !== 0) {
                nodeStack.push(child);
                child = this.nsibling(child);
            }
        }
        return this._inorder;
    };

    /**
     * Finds the sum of lengths from start to end.
     *
     * Note: start must be a descendant of end. An error will be thrown if start
     *       is not a descendant of end. Also, this method does not take into
     *       account the length of end since that length would represent the
     *       length of end to its parent.
     *
     * @param {Number} start The postorder position of a node
     * @param {Number} end The postorder position of a node
     *
     * @return {Number} the sum of length from start to end
     */
    BPTree.prototype.getTotalLength = function (start, end) {
        var curNode = start;
        var totalLength = 0;
        while (curNode !== end) {
            totalLength += this.length(this.postorderselect(curNode));
            curNode = this.postorder(
                this.parent(this.postorderselect(curNode))
            );
            if (curNode === -1) {
                throw "Node " + start + " must be a descendant of " + end;
            }
        }
        return totalLength;
    };

    /**
     * Retrieve the tips in the subtree of a given (internal) node key.
     *
     * @param {Number} nodeKey Key value of internal node.
     * @return {Array} tips Tips of the subtree.
     */
    BPTree.prototype.findTips = function (nodeKey) {
        // find first and last preorder positions of the subtree spanned
        // by the current internal node
        var n = this.postorderselect(nodeKey);
        if (this.isleaf(n)) {
            throw "Node must be internal!";
        }
        var start = this.preorder(this.fchild(n));
        var end = this.preorder(this.lchild(n));
        while (!this.isleaf(this.preorderselect(end))) {
            end = this.preorder(this.lchild(this.preorderselect(end)));
        }

        // find all tips within the subtree
        var tips = [];
        for (var j = start; j <= end; j++) {
            var node = this.preorderselect(j);
            if (this.isleaf(node)) {
                tips.push(this.name(node));
            }
        }

        return tips;
    };

    /** True if name is in the names array for the tree
     *
     * @param {String} name The name to search for.
     * @return {Boolean} If the name is in the tree.
     */
    BPTree.prototype.containsNode = function (name) {
        return this.names_.indexOf(name) !== -1;
    };

    return BPTree;
});
