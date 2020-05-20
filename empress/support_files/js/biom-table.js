define([], function () {
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
     * @param{Object} types Maps sample column to datatype n - num, o - obj
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
         * {categoryName: 'n' or 'o'}
         */
        this._types = types;
    }

    /**
     * Returns a list of observations in the sample
     * Example: countArray is [1,0], obsIDs is ['OTU1', 'OTU2'] => returns ['OTU1']
     *
     * @param {Array} countArray - Array of counts for different tips
     * @param {Array} obsIDs - Array of observation IDs for each index of the
     *                countArray
     *
     * @return {Array}
     */
    BIOMTable.convertToObs = function (countArray, obsIDs) {
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
    BIOMTable.prototype.getObjservationUnionForSamples = function (sIds) {
        var result = new Set();
        var addToResult = function (ob) {
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
    BIOMTable.prototype.getObsBy = function (cat) {
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
     * Returns a object that maps values of a sample category to number of
     * samples obID was seen in.
     * category.
     *
     * @param {String} cat The category to return observation
     * @param {String} obID The observation to count
     *
     * @return {Object}
     */
    BIOMTable.prototype.getObsCountsBy = function (cat, obID) {
        var result = {};
        var cVal;
        for (var sample in this._samp) {
            cVal = this._samp[sample][cat];
            if (!(cVal in result)) {
                result[cVal] = 0;
            }
            for (var i = 0; i < this._obs[sample].length; i++) {
                if (this._obs[sample][i] === obID) {
                    result[cVal] += 1;
                    break;
                }
            }
        }

        return result;
    };

    /**
     * Returns the set of unique observations in samples.
     *
     * @return {Set}
     */
    BIOMTable.prototype.getObservations = function () {
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
    BIOMTable.prototype.getSampleCategories = function () {
        return Object.keys(Object.values(this._samp)[0]).sort();
    };

    /**
     * Returns an array of unique values in a metadata column. If column is
     * numeric then the array is sorted in ascending order.
     *
     * @param{Object} field The column of data
     *
     * @return{Object}
     */
    BIOMTable.prototype.getUniqueSampleValues = function (field) {
        var values = new Set();
        var isNumeric = this._types[field] === "n";
        for (var sample in this._samp) {
            // grab next value in column
            var cVal = this._samp[sample][field];

            // ignore missing data
            values.add(cVal);
        }

        // convert result to array and sort
        values = [...values];
        return isNumeric ? values.sort((a, b) => a - b) : values.sort();
    };

    /**
     * Returns a mapping of trajectory values to observations given a gradient
     * and trajectory. Ignores trajectories which represent missing data. (i.e.
     * 'unknown' for non-numberic and NaN for numeric)
     *
     * @param{String} cat The column in metadata the gradient belongs to.
     * @param{String} grad The value for the gradient. observations that have
     *                this value will only be returned.
     * @param{Object} traj The column for the trajectory. All observations with
     *                missing data in this column will be ignored.
     *
     * @return{Object} return a mapping of trajectory values to observations.
     */
    BIOMTable.prototype.getGradientStep = function (cat, grad, traj) {
        var obs = {};
        var samples = Object.keys(this._samp);
        var isNumeric = this._types[traj] === "n";

        // add observations to mapping object
        var addItems = function (items, container) {
            items.forEach((x) => container.add(x));
        };

        // for all sample's whose gradient is the same as grad
        // add sample feature observations to the samples trajectory value
        for (var i = 0; i < samples.length; i++) {
            var sId = samples[i];
            var sample = this._samp[sId];
            if (grad === sample[cat]) {
                var cVal = sample[traj];

                // checking if trajectory value is missing

                // add sample observations to the appropriate mapping
                if (!(sample[traj] in obs)) {
                    obs[sample[traj]] = new Set();
                }
                addItems(this._obs[sId], obs[sample[traj]]);
            }
        }

        // convert sets arrays
        for (var key in obs) {
            obs[key] = Array.from(obs[key]);
        }
        return obs;
    };

    /**
     * Returns a list of samples that contain an oberservation in obIDs
     *
     * @param{Array} obIDs A list of observationIds (i.e. tip names)
     *
     * @return{Array} a list of samples
     */
    BIOMTable.prototype.getSamplesByObservations = function (obIDs) {
        var samples = Object.keys(this._obs);
        var result = [];

        var checkSampleForObservations = function (sample, obs) {
            return obs.some((id) => sample.includes(id));
        };
        // find all samples that contain at least one obersvation in obIDs
        for (var i = 0; i < samples.length; i++) {
            var sample = samples[i];
            if (checkSampleForObservations(this._obs[sample], obIDs)) {
                result.push(sample);
            }
        }

        return result;
    };

    /**
     * Returns an Object mapping sample field values to the number of samples
     * with that value.
     *
     * For example if field == 'body_site' then this function will return an
     * an object that maps each body site (oral, gut,...) to the number of
     * samples in 'samples' labelled as being from that body site.
     *
     * @param{Array} samples A list of sample ids
     * @param{String} field The category to count
     *
     * @return{Object}
     */
    BIOMTable.prototype.getSampleValuesCount = function (samples, field) {
        var result = {};
        for (var i = 0; i < samples.length; i++) {
            var fVal = this._samp[samples[i]][field];
            if (fVal in result) {
                result[fVal] += 1;
            } else {
                result[fVal] = 1;
            }
        }

        return result;
    };

    return BIOMTable;
});
