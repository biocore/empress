define(["LayoutsUtil", "Colorer"], function (LayoutsUtil, Colorer) {
    function TreeModel(tree) {
        this.currentTree = tree;
        this.originalTree = tree;
        this.curToOrig = {};
        this.origToCur = {};

        // initialize
        for (var i = 1; i <= this.currentTree.size; i++) {
            this.origToCur[i] = i;
            this.curToOrig[i] = i;
        }
    }

    TreeModel.prototype.shear = function(tips, keepNames=false) {
        var result = this.originalTree.shear(tips, keepNames);
        this.currentTree = result.tree;
        this.curToOrig = result.newToOld;
        this.origToCur = result.oldToNew;
        console.log(this.curToOrig)
        console.log(this.origToCur)
    }

    TreeModel.prototype.unshear = function() {
        this.currentTree = this.originalTree;
        // initialize
        for (var i = 1; i <= this.currentTree.size; i++) {
            this.origToCur[i] = i;
            this.curToOrig[i] = i;
        }
    }

    TreeModel.prototype.postorderTraversal = function*(includeRoot=false) {
        var nodes = [],
            i;
        for (i = 1; i <= Object.keys(this.curToOrig).length; i++) {
            nodes.push(this.curToOrig[i])
        }
        if (!includeRoot) {
            nodes.pop();
        }

        yield* nodes;
    }

	function TreeController(tree) {
	   this.model = new TreeModel(tree);
       this.size = this.model.originalTree.size;
	}

    TreeController.prototype.indexInCurrentTree = function(i) {
        var node = this.model.originalTree.postorder(i);
        return this.model.origToCur.hasOwnProperty(node);
    }

    /**
     * tips - Set
     */
	TreeController.prototype.shear = function(tips, keepNames=false) {
		this.model.shear(tips, keepNames);
	}


    // add option for original
	TreeController.prototype.postorderTraversal = function*(includeRoot=false) {
		yield* this.model.postorderTraversal(includeRoot);
	};

    /**
     * Returns an Object describing the minimum, maximum, and average of all
     * non-root node lengths.
     *
     * @param{Boolean} original if true returns the length stats of the original
     *                          tree else returns the length stats of the
     *                          sheared tree.
     *                           
     * @return {Object} Contains three keys: "min", "max", and "avg", mapping
     *                  to Numbers representing the minimum, maximum, and
     *                  average non-root node length in the tree.
     */
    TreeController.prototype.getLengthStats = function(origianl=false) {
        if (origianl) {
            return this.model.originalTree.getLengthStats();
        } else {
            return this.model.currentTree.getLengthStats();
        }
    }

    /**
     *
     * The name of the ith node in the ORIGINAL bp tree
     *
     * @param{Number} i Node i in the ORIGINAL bp tree
     *
     * @return{String}
     */
    TreeController.prototype.name = function(i) {
        // check for error
        // if (!this.indexInCurrentTree(i)) {
        //     throw "Node index " + i + " is not in currentTree";
        // }
        return this.model.originalTree.name(i);
    }

    /**
     * Returns an array of all node names in tree.
     *
     * @param{Boolean} original if true returns the length stats of the original
     *                          tree else returns the length stats of the
     *                          sheared tree.
     *                           
     */
    TreeController.prototype.getAllNames = function(original=false) {
        if (original) {
            return this.model.originalTree.getAllNames();
        } else {
            return this.model.currentTree.getAllNames();
        }
    };

    /**
     *
     * The number of leaf nodes in tree
     *
     * @param{Boolean} original if true returns the length stats of the original
     *                          tree else returns the length stats of the
     *                          sheared tree.
     *                           
     * @return {Number}
     */
    TreeController.prototype.numleaves = function(original=false) {
        if (original) {
            return this.model.originalTree.numleaves();
        } else {
            return this.model.currentTree.numleaves();
        }
    };

    /**
     *
     * The length of the ith node in bp tree
     *
     * @param{Number} i Node i in bp tree
     *
     * @return{Number}
     */
    TreeController.prototype.length = function (i) {
        return this.model.originalTree.length(i);
    };

    /**
     * The opening index of the smallest matching pair that contains the node
     * represented by i in the ORIGINAL tree.
     *
     * @param{Number} i Current node
     *                i can be either an open or close parenthesis
     *
     * @return {Number}
     */
    TreeController.prototype.parent = function (i) {
        return this.model.originalTree.parent(i);
    }

    /**
     * returns the index of the opening index of the root node
     *
     * @return {Number}
     */
    TreeController.prototype.root = function () {
        return this.model.originalTree.root();
    }

    /**
     * Return true if i represents a leaf node
     *
     * @return {Boolean}
     */
    TreeController.prototype.isleaf = function (i) {
        // check for err
        return this.model.originalTree.isleaf(i);
    };

    TreeController.prototype._curToOrigNodeFunction = function(i, func) {
        var curTree = this.model.currentTree;
        var origTree = this.model.originalTree;

        // check for err
        var node = curTree.postorderselect(
            this.model.origToCur[origTree.postorder(i)]
        );

        var node = curTree.postorder(curTree[func](node));
        node = origTree.postorderselect(
            this.model.curToOrig[node]
        );
        return node;
    }

    /**
     * returns the opening index the first child of the node represented by i
     *
     * @param {Number} i Current node
     *                 i can be either an open or close parenthesis
     *
     * @return {Number} return 0 if i is a leaf node
     */
    TreeController.prototype.fchild = function (i) {
        return this._curToOrigNodeFunction(i, "fchild");
    };

    /**
     * returns the opening index the last child of the node represented by i
     *
     * @param {Number} i Current node
     *                 i can be either an open or close parenthesis
     * @return {Number} return 0 if i is a leaf node
     */
    TreeController.prototype.lchild = function (i) {
        return this._curToOrigNodeFunction(i, "lchild")
    };

    /**
     * returns the opening index of the next sibling of i
     *
     * @param {Number} i Current node.
     *                 i can be either an open or close parenthesis
     *
     * @return {Number}
     */
    TreeController.prototype.nsibling = function (i) {
        return this._curToOrigNodeFunction(i, "nsibling");
    };

    /**
     * returns the opening index of the previous sibling of i
     *
     * @param {Number} i Current node.
     *                 i can be either an open or close parenthesis
     *
     * @return {Number} returns 0 if no previous sibling
     */
    TreeController.prototype.psibling = function (i) {
        return this._curToOrigNodeFunction(i, "psibling");
    };

     /**
     * Finds postorder rank of node i
     *
     * @param {Number} i The node index to asses postorder rank
     *
     * @return {Number} The postorder rank of node i
     */
    TreeController.prototype.postorder = function (i) {
        // check error
        return this.model.originalTree.postorder(i);
    };

    /**
     * Find the index of the node with postorder k
     *
     * @param {Number} k The postorder to search for
     *                 Note: k starts at 1
     *
     * @return {Number} The index position of the node in the tree
     */
    TreeController.prototype.postorderselect = function (k) {
        // check error
        return this.model.originalTree.postorderselect(k);
    };

    /**
     * Finds preorder rank of node i
     *
     * @param {Number} i The node index to asses preorder rank
     *
     * @return {Number} The preorder rank of node i
     */
    TreeController.prototype.preorder = function (i) {
        // check error
        return this.model.originalTree.preorder(i);
    };

    /**
     * Find the index of the node with preorder k
     *
     * @param {Number} k The preorder to search for.
     *                 Note: k starts at 1.
     *
     * @return {Number} The index position of the node in the tree
     */
    TreeController.prototype.preorderselect = function (k) {
        // check error
        return this.model.originalTree.preorderselect(k);
    };

    /**
     * Returns an array of nodes sorted by their inorder position.
     *
     * Note: empress uses a nodes postorder position as its key in _treeData
     *       so this method will use a nodes postorder position to represent
     *       it in the resulting array.
     *       This method will also cache the resulting array.
     */
    TreeController.prototype.inOrderTraversal = function*(includeRoot=false) {
        var inOrderNodes = this.model.currentTree.inOrderNodes();
        if (Object.keys(this.model.curToOrig).length !== 0) {
            for (var i = 0; i < inOrderNodes.length; i++) {
                inOrderNodes[i] = this.model.curToOrig[inOrderNodes[i]];
            }
        }
        if (!includeRoot) {
            inOrderNodes.shift();
        }
        console.log("inorder", inOrderNodes)
        yield* inOrderNodes;
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
     * @param {Boolean} ignoreLengths If truthy, treat all node lengths as 1;
     *                                if falsy, actually consider node lengths
     *
     * @return {Number} the sum of length from start to end
     */
    TreeController.prototype.getTotalLength = function (start, end, ignoreLengths) {
        start = this.model.origToCur[start];
        end = this.model.origToCur[end];
        return this.model.currentTree.getTotalLength(start, end, ignoreLengths);
    };

    /**
     * Retrieve the tips in the subtree of a given (internal) node key.
     *
     * @param {Number} nodeKey Key value of internal node.
     * @return {Array} tips Tips of the subtree.
     */
    TreeController.prototype.findTips = function (nodeKey) {
        // throw error
        nodeKey = this.model.origToCur[nodeKey];
        var tips = this.model.currentTree.findTips(nodeKey);
        for (var i = 0; i < tips.length; i++) {
            tips[i] = this.model.curToOrig[tips[i]]
        }
        return tips;
    };

    /**
     * Retrieve number of tips in the subtree of a given node.
     *
     * @param {Integer} nodeKey The postorder position of a node
     * @return {Integer} The number of tips on the subtree rooted at nodeKey.
     */
    TreeController.prototype.getNumTips = function (nodeKey) {
        nodeKey = this.model.origToCur[nodeKey];
        return this.model.currentTree.getNumTips(nodeKey);
    };


    /**
     * True if name is in the names array for the tree
     *
     * @param {String} name The name to search for.
     * @return {Boolean} If the name is in the tree.
     */
    TreeController.prototype.containsNode = function (name) {
        return this.model.currentTree.containsNode(name);
    };

    /**
     * Returns all nodes with a given name. Once a name has been searched for,
     * the returned object is cached in this._nameToNodes.
     *
     * NOTE: Care should be taken to make sure that this._nameToNodes is not
     * populated with a literal null at any point, since Objects in JS store
     * all keys as Strings (so having a literal null in this._nameToNodes [due
     * to unnamed nodes] will cause this null to get confused with node(s)
     * literally named "null" in the Newick file). I don't think this is
     * currently possible in the code, but we should probably add tests that
     * verify this.
     *
     * @param {String} name The name of node(s)
     * @return {Array} An array of postorder positions of nodes with a given
     *                 name. If no nodes have the specified name, this will be
     *                 an empty array.
     */
    TreeController.prototype.getNodesWithName = function (name) {
        // check for error
        var nodes = this.model.currentTree.getNodesWithName(name);
        for (var i = 0; i < nodes.length; i++) {
            nodes[i] = this.model.curToOrig[nodes[i]];
        }
        return nodes;
    };

	return TreeController;
});