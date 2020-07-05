define(["underscore", "util"], function (_, util) {
    /**
     * @class BIOMTable
     *
     * Create a BIOM table that describes the features contained within each
     * sample and the metadata associated with each sample.
     *
     * @param{Array} sIDs Array of sample IDs in the table.
     * @param{Array} fIDs Array of feature (or "observation") IDs in the table.
     * @param{Object} sID2Idx Mapping of sample IDs (the values in sIDs) to
     *                        their 0-based indices in sIDs.
     * @param{Object} fID2Idx Mapping of feature IDs (the values in fIDs) to
     *                        their 0-based indices in fIDs.
     * @param{Array} tbl Two-dimensional array where the outermost layer has
     *                   the same length as sIDs. Each position i within tbl
     *                   contains an "inner list" of arbitrary (but in the
     *                   range [1, fIDs.length]) length, containing the fIDs
     *                   indices of the features present within the sample
     *                   in sIDs at index i.
     * @param{Array} smCols Array of sample metadata column names.
     * @param{Array} sm Two-dimensional array where the outermost layer has the
     *                  same length as sIDs. Each position i within sm contains
     *                  an "inner list" of length smCols.length, and sm[i][c]
     *                  refers to the c-th sample metadata column (in smCols)'s
     *                  value for the i-th sample (in sIDs).
     *
     * @return {BIOMTable}
     * constructs BIOMTable
     */
    function BIOMTable(sIDs, fIDs, sID2Idx, fID2Idx, tbl, smCols, sm) {
        this._sIDs = sIDs;
        this._fIDs = fIDs;
        this._sID2Idx = sID2Idx;
        this._fID2Idx = fID2Idx;
        this._tbl = tbl;
        this._smCols = smCols;
        this._sm = sm;
        // TODO add validation and error handling? i.e. verify that table
        // arrays are sorted in asc. order
    }

    /**
     * Converts a set of feature indices to an array of feature IDs.
     *
     * This is a utility method; this conversion operation is surprisingly
     * common in this class' methods.
     *
     * @param {Set} fIdxSet set of feature indices
     *
     * @return {Array} fIDs array of feature IDs
     *
     * @throws {Error} If any of the feature indices are unrecognized.
     */
    BIOMTable.prototype._featureIndexSetToIDArray = function (fIdxSet) {
        var scope = this;
        var fIdxArray = Array.from(fIdxSet);
        return _.map(fIdxArray, function(idx) {
            fID = scope._fIDs[idx];
            if (_.isUndefined(fID)) {
                throw new Error('Feature index "' + idx + '" unrecognized.');
            }
            return fID;
        });
    }

    /**
     * Returns a list of observations (features) present in the input samples.
     *
     * @param {Array} samples Array of sample IDs
     *
     * @return {Array} features Array of feature IDs
     *
     * @throws {Error} If any of the sample IDs are unrecognized.
     */
    BIOMTable.prototype.getObservationUnionForSamples = function (samples) {
        var scope = this;
        var totalFeatureIndices = new Set();
        // For each sample...
        _.each(samples, function(sID) {
            // Figure out the indices of the features in this sample.
            // Add these indices to totalFeatureIndices (which is a set,
            // so duplicate indices are implicitly ignored)
            var sampleIdx = scope._sID2Idx[sID];
            if (_.isUndefined(sampleIdx)) {
                throw new Error(
                    'Sample ID "' + sID + '" not recognized in BIOM table.'
                );
            }
            var featureIndices = scope._tbl[sampleIdx];
            _.each(featureIndices, function(fIdx) {
                totalFeatureIndices.add(fIdx);
            });
        });
        // Finally, convert totalFeatureIndices from indices to IDs
        return this._featureIndexSetToIDArray(totalFeatureIndices);
    };

    /**
     * Returns a object mapping all values of a sample metadata column
     * to an array of all the features present within all samples with each
     * value.
     *
     * @param {String} smCol Sample metadata column (e.g. "body site")
     *
     * @return {Object} valueToFeatureIDs
     *
     * @throws {Error} If the sample metadata column is unrecognized.
     */
    BIOMTable.prototype.getObsBy = function (col) {
        var colIdx = _.indexOf(this._smCols, col);
        if (colIdx < 0) {
            throw new Error(
                'Sample metadata column "' + col + '" not present in data.'
            );
        }
        var valueToFeatureIdxs = {};
        var cVal;
        var scope = this;
        var addSampleFeatures = function (sIdx, cVal) {
            _.each(scope._tbl[sIdx], function(fIdx) {
                valueToFeatureIdxs[cVal].add(fIdx);
            });
        }
        // For each sample...
        _.each(this._sm, function(smRow, sIdx) {
            // Figure out what value this sample has for the specified column
            cVal = smRow[colIdx];
            // Record this sample's features for the sample's value
            if (!_.has(valueToFeatureIdxs, cVal)) {
                valueToFeatureIdxs[cVal] = new Set();
            }
            addSampleFeatures(sIdx, cVal);
        });
        // Produce a version of valueToFeatureIdxs where
        // 1) The Sets of feature indices are converted to Arrays
        // 2) The feature indices are replaced with IDs
        return _.mapObject(valueToFeatureIdxs, function(fIdxSet) {
            return scope._featureIndexSetToIDArray(fIdxSet);
        });
    };

    /**
     * Returns a object that maps the unique values of a sample metadata column
     * to the number of samples with that metadata value containing a given
     * feature.
     *
     * @param {String} col Sample metadata column
     * @param {String} fID Feature (aka observation) ID
     *
     * @return {Object} valueToCountOfSampleWithObs
     *
     * @throws {Error} If the sample metadata column is unrecognized.
     *                 If the feature ID is unrecognized.
     */
    BIOMTable.prototype.getObsCountsBy = function (col, fID) {
        // TODO: abstract all of these indexing operations to their own
        // internal BIOM functions and test those
        var colIdx = _.indexOf(this._smCols, col);
        if (colIdx < 0) {
            throw new Error(
                'Sample metadata column "' + col + '" not present in data.'
            );
        }
        var fIdx = this._fID2Idx[fID];
        if (_.isUndefined(fIdx)) {
            throw new Error(
                'Feature ID "' + fID + '" not recognized in BIOM table.'
            );
        }
        var valueToCountOfSampleWithObs = {};
        var cVal, fIdxPos;
        var scope = this;
        // Iterate through each sample of the BIOM table
        _.each(this._tbl, function(presentFeatureIndices, sIdx) {
            // Figure out what metadata value this sample has at the column.
            // If we haven't recorded it as a key in our output Object yet, do
            // so and set it to default to 0.
            cVal = scope._sm[sIdx][colIdx];
            if (!_.has(valueToCountOfSampleWithObs, cVal)) {
                valueToCountOfSampleWithObs[cVal] = 0;
            }
            // Now, we check if we need to update the cVal entry by 1
            // (indicating that one more sample with cVal contains the
            // specified feature). We do this using presentFeatureIndices,
            // which is an array of the indices of the features within this
            // sample.
            //
            // We know that presentFeatureIndices is sorted in ascending order,
            // so we can do this check using _.indexOf() while setting the
            // "isSorted" parameter to true. This will use a binary search,
            // making this check likely faster than manual iteration.
            // See https://underscorejs.org/#indexOf.
            fIdxPos = _.indexOf(presentFeatureIndices, fIdx, true);
            if (fIdxPos >= 0) {
                // This sample actually contains the feature!
                cVal = scope._sm[sIdx][colIdx];
                // Update our output Object's count info accordingly.
                valueToCountOfSampleWithObs[cVal] += 1;
            }
        });
        return valueToCountOfSampleWithObs;
    };

    /**
     * Returns an array of sample categories, sorted using util.naturalSort().
     *
     * @return {Array}
     */
    BIOMTable.prototype.getSampleCategories = function () {
        return util.naturalSort(this._smCols);
    };

    /**
     * Returns an array of unique values in a metadata column, sorted using
     * util.naturalSort().
     *
     * @param {String} col The sample metadata column to find unique values of
     *
     * @return {Array}
     */
    BIOMTable.prototype.getUniqueSampleValues = function (col) {
        var colIdx = _.indexOf(this._smCols, col);
        if (colIdx < 0) {
            throw new Error(
                'Sample metadata column "' + col + '" not present in data.'
            );
        }
        var values = new Set();
        _.each(this._sm, function(smRow) {
            values.add(smRow[colIdx]);
        });
        return util.naturalSort(Array.from(values));
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
     * Returns a list of samples that contain an observation in obIDs
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
        // find all samples that contain at least one observation in obIDs
        for (var i = 0; i < samples.length; i++) {
            var sample = samples[i];
            if (checkSampleForObservations(this._obs[sample], obIDs)) {
                result.push(sample);
            }
        }

        return result;
    };

    /**
     * Given an array of sample IDs and a sample metadata column,
     * returns an Object mapping sample metadata values for that column
     * to the number of samples in the array with that value.
     *
     * For example, if col == 'body_site', then this function will return an
     * an object that maps each body site (oral, gut,...) to the number of
     * samples in 'samples' labelled as being from that body site.
     *
     * @param {Array} samples Array of sample IDs
     * @param {String} col Sample metadata column
     *
     * @return {Object} valueToSampleCount
     */
    BIOMTable.prototype.getSampleValuesCount = function (samples, col) {
        var colIdx = _.indexOf(this._smCols, col);
        if (colIdx < 0) {
            throw new Error(
                'Sample metadata column "' + col + '" not present in data.'
            );
        }
        var scope = this;
        var valueToSampleCount = {};
        _.each(samples, function(sID) {
            var sampleIdx = scope._sID2Idx[sID];
            if (_.isUndefined(sampleIdx)) {
                throw new Error(
                    'Sample ID "' + sID + '" not recognized in BIOM table.'
                );
            }
            var cVal = scope._sm[sampleIdx][colIdx];
            if (_.has(valueToSampleCount, cVal)) {
                valueToSampleCount[cVal] += 1;
            } else {
                valueToSampleCount[cVal] = 1;
            }
        });
        return valueToSampleCount;
    };

    return BIOMTable;
});
