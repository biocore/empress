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
    function BIOMTable(obs, samp) {
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
    }

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
        return Array(result);
    };

    /**
     * Returns a dictionary of observation ids whose keys are the values of a sample
     * category.
     *
     * @param {String} cat The category to return observation
     *
     * @return {Dictionary}
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
     * Returns number of unique observations in samples.
     *
     * @return {Number}
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

    return BIOMTable;
});
