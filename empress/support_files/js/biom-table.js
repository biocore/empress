define([], function() {
    /**
     * biom-table
     */
    function BiomTable(obs, samp) {
        /**
         * The observation table format:
         * {sampleID1: [observationIDs],
            sampleID2: [observationIDs],
            ...}
         * @private
         */
        this._obs = obs;

        /**
         * @type {Dictionary}
         * Sample metedata format:
         * {sampleID1: {cat1: val, cat2: val, ...},
            sampleID2: {cat1: val, cat2: val, ...},
            ...}
         * @private
         */
        this._samp = samp;
    };

    /**
     * Returns a list of observations in the samples
     *
     * @param {Array} sIds - Array of sample Ids
     *
     * @return {Array}
     */
    BiomTable.prototype.getSampleObs = function(sIds) {
        var result = new Set();
        for(var i = 0; i < sIds.length; i++) {
            var obs = this._obs[sIds[i]];
            obs.forEach(function(ob) {
                result.add(ob);
            });
        }
        return Array(result);
    };

    BiomTable.prototype.getAllSampleIds = function() {
        return Object.keys(this._samp);
    }
    /**
     * Returns a dictionary of observation ids whose keys are the values of a sample
     * category.
     *
     * @param {String} The category to return observation
     *
     * @return {Dictionary}
     */
    BiomTable.prototype.getObsBy = function(cat, sIds) {
        var result = {};
        for (var i = 0; i < sIds.length; i++) {
            var sample = sIds[i];
            var cVal = this._samp[sample][cat];
            if (!(cVal in result)) {
                result[cVal] = new Set();
            }
            for (var j = 0; j < this._obs[sample].length; j++) {
                result[cVal].add(this._obs[sample][j]);
            }
        }

        for (var key in result) {
            result[key] = Array.from(result[key]);
        }

        return result;
    };

    /**
     * Returns number of unique observations in samples.
     *
     * @return {Number}
     */
    BiomTable.prototype.getNumUniqueObs = function(obs) {
        var uniqueObs = new Set();

        // for (var sample in this._samp) {
        //     for (var i = 0; i < this._obs[sample].length; i++) {
        //         obs.add(this._obs[sample][i]);
        //     }
        // }
        for (var cat in obs) {
            var catObs = obs[cat];
            for (var i = 0; i < catObs.length; i++) {
                uniqueObs.add(catObs[i]);
            }
        }

        return uniqueObs.size;
    };



    /**
     * Returns a list of sample categories
     *
     * @return{Array}
     */
    BiomTable.prototype.getSampleCats = function() {
        return Object.keys((Object.values(this._samp)[0])).sort();
    };

 return BiomTable;
});