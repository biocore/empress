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
    	console.log("???")
    	var invalidIds = []
    	var scope = this;
    	var checkId = function(id) {
    		return (_.indexOf(scope.validIds, id) !== -1) ?  true : false;
    	}
    	_.each(metadata, (item) => {
    		if (!checkId(item[idCol])) {invalidIds.push(item[idCol])}
    	});
    	return invalidIds;
    };

    UploadFMModel.prototype.uploadFMetadata = function (fmCols, metadata) {
    	console.log("return", fmCols, metadata);
        console.log("validate");
        var invalidIds = this._validateMetadata(fmCols[0], metadata); 
        if (invalidIds.length > 0) {
        	if (window.confirm(
        		"file contains " +
        		invalidIds.length +
        		" ids not found in the tree. Would you like to continue?"
        	    )
        	) {
      			console.log("continue");
	        	this._upload(fmCols, metadata);
        	} else {
        		console.log("not continue")
        	}
        } else {
        	console.log("notify");
        	this._upload(fmCols, metadata);
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
    	console.log("register observer")
    	this.observers.push(observer)
    };

    UploadFMModel.prototype._notify = function (fmCols, metadata) {
    	_.each(this.observers, (obs) => 
    		obs.updateFMetadata(this.fmCols, fmCols, metadata)
    	);
    };

    return UploadFMModel;
});
