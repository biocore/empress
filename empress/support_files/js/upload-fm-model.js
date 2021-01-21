define(["underscore", "util"], function (_, util) {
    
    function UploadFMModel(ids, fmCols) {
    	this.validIds = ids;
    	this.fmCols = fmCols;
    	this.metadataObj = undefined;

    	// observers that want to be notified whenever metadata is uploaded
    	// these observers will be sent both metadata and columns 
    	this.observers = [];
    }

    UploadFMModel.prototype.addFMObject = function(metadataObj) {
    	this.metadataObj = metadataObj
    }

    UploadFMModel.prototype._validateMetadata = function (idCol, metadata) {
    	var invalidIds = [];
        var validIds = [];
    	var scope = this;
    	var checkId = function(id) {
    		return (_.indexOf(scope.validIds, id) !== -1) ?  true : false;
    	}
    	_.each(metadata, (item) => {
    		if (!checkId(item[idCol])) {
                invalidIds.push(item[idCol])
            } else {
                validIds.push(item[idCol]);
            }
    	});
    	return {
            invalidIds : invalidIds,
            validIds : validIds
        };
    };

    UploadFMModel.prototype._valideColumns = function(fmCols) {
        return fmCols.length === _.uniq(fmCols).length;
    }

    UploadFMModel.prototype.uploadFMetadata = function (fmCols, metadata) {
        if (!this._valideColumns(fmCols)) {
            window.alert("Error: File contains non-unique columns!");
            return;
        }
        var ids = this._validateMetadata(fmCols[0], metadata); 
        if (ids.validIds.length > 0) {
        	if (window.confirm(
        		"File contains " +
                ids.validIds.length + " ids found in the tree and " +
        		ids.invalidIds.length +
        		" ids not found in the tree\n" +
                "Would you like to continue?"
        	    )
        	) {
            	this._upload(fmCols, metadata);
        	} 
        } else {
        	window.alert("Error: No feature ids were found in the tree!");
        }
    };

    UploadFMModel.prototype._upload = function(fmCols, metadata) {
    	var idCol = fmCols[0];
    	fmCols.shift(); // remove id column
    	_.each(fmCols, (col) => {
    		if (_.indexOf(this.fmCols, col) === -1) {
    			this.fmCols.push(col);
    		}
    	});
    	fmCols.unshift(idCol);
    	this.metadataObj.updateFMetadata(this.fmCols, fmCols, metadata);
		this._notify(fmCols, metadata); 
    }

    UploadFMModel.prototype.registerObserver = function (observer) {
    	this.observers.push(observer)
    };

    UploadFMModel.prototype._notify = function (fmCols, metadata) {
    	_.each(this.observers, (obs) => 
    		obs.updateFMetadata(this.fmCols, fmCols, metadata)
    	);
    };

    return UploadFMModel;
});
