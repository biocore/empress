define([], function() {
    /**
     * @class BIOM-table
     *
     * create a BIOM table that contains sample IDs along with the observations
     * seen in each sample and the metadata associated with each sample.
     *
     * @param{Object} obs An object whose keys are sampleIds and values are a
     *                list of observationIDs.
     * @param{Object} samp An object whose keys are sampleIDs and values are the
     *                associated metadata.
     *
     * @return {BIOMTable}
     * constructs BIOMTable
     */
    function BIOMTable(obs, samp, types) {
        /**
         * @type {Object}
         * The observation table format:
         * {sampleID1: [observationIDs],
         *  sampleID2: [observationIDs],
         *   ...}
         * @private
         */
        this._obs = obs;

        /**
         * @type {Object}
         * Sample metedata format:
         * {sampleID1: {cat1: val, cat2: val, ...},
         *  sampleID2: {cat1: val, cat2: val, ...},
         *  ...}
         * @private
         */
        this._samp = samp;

        /**
         * @type {Object}
         * The datatypes of sample metadata
         * 'n' => numeric
         * 'o' => object/string
         * {category1: 'n' or 'o'}
         */
        this._types = types;
    }

    /**
     * Returns a list of observations in the sample
     * Example: countArray is [1,0], obsIDs is ['OTU1', 'OTU2'] => returns ['OTU1']
     *
     * @param {Array} countArray - Array of counts for different tips
     * @param {Array} obsIDs - Array of observation IDs for each index of the countArray
     *
     * @return {Array}
     */
    BIOMTable.convertToObs = function(countArray, obsIDs) {
        var obs = [];
        for (var i = 0; i < countArray.length; i++) {
            if (countArray[i] != 0) {
                obs.push(obsIDs[i]);
            }
        }
        return obs;
    };

    /**
     * Returns a list of observations in the samples
     *
     * @param {Array} sIds - Array of sample Ids
     *
     * @return {Array}
     */
    BIOMTable.prototype.getObjservationUnionForSamples = function(sIds) {
        var result = new Set();
        var addToResult = function(ob) {
            result.add(ob);
        };
        for (var i = 0; i < sIds.length; i++) {
            var obs = this._obs[sIds[i]];
            obs.forEach(addToResult);
        }
        return Array.from(result);
    };

    /**
     * Returns a object of observation ids whose keys are the values of a sample
     * category.
     *
     * @param {String} cat The category to return observation
     *
     * @return {Object}
     */
    BIOMTable.prototype.getObsBy = function(cat) {
        var result = {};
        var cVal;
        for (var sample in this._samp) {
            cVal = this._samp[sample][cat];
            if (!(cVal in result)) {
                result[cVal] = new Set();
            }
            for (var i = 0; i < this._obs[sample].length; i++) {
                result[cVal].add(this._obs[sample][i]);
            }
        }

        for (var key in result) {
            result[key] = Array.from(result[key]);
        }

        return result;
    };

    /**
     * Returns the set of unique observations in samples.
     *
     * @return {Set}
     */
    BIOMTable.prototype.getObservations = function() {
        var obs = new Set();

        for (var sample in this._samp) {
            for (var i = 0; i < this._obs[sample].length; i++) {
                obs.add(this._obs[sample][i]);
            }
        }

        return obs;
    };

    /**
     * Returns a sorted list of sample categories
     *
     * @return{Array}
     */
    BIOMTable.prototype.getSampleCategories = function() {
        return Object.keys(Object.values(this._samp)[0]).sort();
    };

    BIOMTable.prototype.getUniqueSampleValues = function(category) {
        var values = new Set();
        var isNumeric = this._types[category] === 'n';
        for (var sample in this._samp) {
            var cVal = this._samp[sample][category];
            if(cVal === "unknown" || (isNumeric &&isNaN(cVal))) {
                continue;
            }
            values.add(cVal);
        }
        values = [...values];
        return isNumeric ? values.sort((a,b) => a-b) : values.sort();
    };

    BIOMTable.prototype.getTrajectory = function(cat, traj, grad) {
        var obs = {};
        var sIds = {};
        var samples = Object.keys(this._samp);
        var isNumeric = this._types[grad] === 'n';
        for (var i = 0; i < samples.length; i++) {
            var sId = samples[i];
            var sample = this._samp[sId];
            if (traj === sample[cat]) {
                var cVal = sample[grad];
                if (cVal === "unknown" || (isNumeric &&isNaN(cVal))) {
                    continue;
                }
                if (!(sample[grad] in obs)) {
                    obs[sample[grad]] = new Set();
                }
                if (!(sample[grad] in sIds)) {
                    sIds[sample[grad]] = new Set();
                }
                this._obs[sId].forEach(x => obs[sample[grad]].add(x))
                sIds[sample[grad]].add(sId);
            }
        }

        for (var key in obs) {
            obs[key] = Array.from(obs[key]);
        }

        return {obs:obs, sIds: sIds};
    };

    return BIOMTable;
});
