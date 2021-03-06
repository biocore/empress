define(["LayoutsUtil"], function (LayoutsUtil) {
	function TreeHandler(tree) {
		this._tree = tree;
		this._originalTreeSize = this._tree.size;
		this._oldTree = tree;
		this._newIndxToOld = {};
		this._currentLayout = "Unrooted";

		/**
         * Used to index into _treeData
         * @type {Object}
         * @private
         */
        this._tdToInd = {
            // all nodes (non-layout parameters)
            color: 0,
            isColored: 1,
            visible: 2,
            // unrooted layout
            x2: 3,
            y2: 4,
            // rectangular layout
            xr: 3,
            yr: 4,
            highestchildyr: 5,
            lowestchildyr: 6,
            // circular layout
            xc0: 3,
            yc0: 4,
            xc1: 5,
            yc1: 6,
            angle: 7,
            arcx0: 8,
            arcy0: 9,
            arcstartangle: 10,
            arcendangle: 11,
        };
	}

	TreeHandler.prototype.shear = function(tips, treeData) {
		var result = this._tree.shear(tips);
		this._oldTree = this._tree;
		this._tree = result.tree;
		this._newIndxToOld = result.newIndxToOld;
	}

	TreeHandler.prototype.assignCoords = function(treeData) {
        var data, i, j = 1;

        for (i = 1; i <= this._originalTreeSize; i++) {
            treeData[i][this._tdToInd.visible] = false;
        }
        console.log(this._currentLayout)
        // Rectangular
        if (this._currentLayout === "Rectangular") {
            data = LayoutsUtil.rectangularLayout(
                this._tree,
                4020,
                4020,
                // since lengths for "ignoreLengths" are set by `lengthGetter`,
                // we don't need (and should likely deprecate) the ignoreLengths
                // option for the Layout functions since the layout function only
                // needs to know lengths in order to layout a tree, it doesn't
                // really need encapsulate all of the logic for determining
                // what lengths it should lay out.
                "descending",
                undefined
                // lengthGetter,
                // checkLengthsChange
            );
            // this._yrscf = data.yScalingFactor;
            for (i of this.postorder()) {
                // remove old layout information
                treeData[i].length = 3;

                // store new layout information
                treeData[i][this._tdToInd.xr] = data.xCoord[j];
                treeData[i][this._tdToInd.yr] = data.yCoord[j];
                treeData[i][this._tdToInd.highestchildyr] =
                    data.highestChildYr[j];
                treeData[i][this._tdToInd.lowestchildyr] =
                    data.lowestChildYr[j];
                treeData[i][this._tdToInd.visible] = true;
                j++;
            }
        } else if (this._currentLayout === "Circular") {
            data = LayoutsUtil.circularLayout(
                this._tree,
                4020,
                4020,
                "descending",
                undefined,
                // lengthGetter,
                // checkLengthsChange
            );
            for (i of this.postorder()) {
                // remove old layout information
                treeData[i].length = 3;

                // store new layout information
                treeData[i][this._tdToInd.xc0] = data.x0[j];
                treeData[i][this._tdToInd.yc0] = data.y0[j];
                treeData[i][this._tdToInd.xc1] = data.x1[j];
                treeData[i][this._tdToInd.yc1] = data.y1[j];
                treeData[i][this._tdToInd.angle] = data.angle[j];
                treeData[i][this._tdToInd.arcx0] = data.arcx0[j];
                treeData[i][this._tdToInd.arcy0] = data.arcy0[j];
                treeData[i][this._tdToInd.arcstartangle] =
                    data.arcStartAngle[j];
                treeData[i][this._tdToInd.arcendangle] =
                    data.arcEndAngle[j];
                treeData[i][this._tdToInd.visible] = true;
                j++;
            }
        } else {
            data = LayoutsUtil.unrootedLayout(
                this._tree,
                4020,
                4020,
                undefined,
                // lengthGetter,
                // checkLengthsChange
            );
            for (i of this.postorder()) {
                // remove old layout information
                treeData[i].length = 3;

                // store new layout information
                treeData[i][this._tdToInd.x2] = data.xCoord[j];
                treeData[i][this._tdToInd.y2] = data.yCoord[j];
                treeData[i][this._tdToInd.visible] = true;
                j++;
            }
        }
        console.log(j, treeData)
        
        
        // var j = 1;
        // data = LayoutsUtil.circularLayout(
        //         this._tree,
        //     4020,
        //     4020,
        //     "ascending",
        //     undefined,
        // );
        // for (var i of this.postorder()) {	
        //     // remove old layout information
        //     treeData[i].length = 3;

        //     // store new layout information
        //     treeData[i][this._tdToInd.xc0] = data.x0[j];
        //     treeData[i][this._tdToInd.yc0] = data.y0[j];
        //     treeData[i][this._tdToInd.xc1] = data.x1[j];
        //     treeData[i][this._tdToInd.yc1] = data.y1[j];
        //     treeData[i][this._tdToInd.angle] = data.angle[j];
        //     treeData[i][this._tdToInd.arcx0] = data.arcx0[j];
        //     treeData[i][this._tdToInd.arcy0] = data.arcy0[j];
        //     treeData[i][this._tdToInd.arcstartangle] =
        //         data.arcStartAngle[j];
        //     treeData[i][this._tdToInd.arcendangle] =
        //         data.arcEndAngle[j];
        //     treeData[i][this._tdToInd.visible] = true;
        //     j++;
        // }
	}

	TreeHandler.prototype.postorder = function*(includeRoot=false) {
		var nodes = [],
			i;
		if (Object.keys(this._newIndxToOld).length === 0) {
			for (i = 1; i <= this._tree.size; i++) {
				nodes.push(i);
			}
		} else {
			for (i in this._newIndxToOld) {
				nodes.push(this._newIndxToOld[i])
			}
		}
		yield* nodes;
	};

	return TreeHandler;
});