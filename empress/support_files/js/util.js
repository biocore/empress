define(["underscore"], function (_) {
    /**
     * Remove all non unique keys
     * Note: keys are referring to empress._treeData (i.e. postorder position of
     *       tree nodes starting at 1)
     *
     * @param {Object} keys Maps groups to sets of keys.
     * @param {Set} removeAll Set of keys to remove regardless of whether or not
     *              they are unique.
     *
     * @return {Object} A new object with the non unique keys removed
     */
    function keepUniqueKeys(keys, removeAll) {
        // get unique keys
        var items = Object.keys(keys);
        var allKeys = new Set();
        var dupKeys = new Set();
        var i, itemKeys;
        for (var item in keys) {
            itemKeys = Array.from(keys[item]);
            for (i in itemKeys) {
                var key = itemKeys[i];
                if (allKeys.has(key)) {
                    dupKeys.add(key);
                } else {
                    allKeys.add(key);
                }
            }
        }

        // get the unique keys in each item
        var result = {};
        items = Object.keys(keys);
        for (i = 0; i < items.length; i++) {
            itemKeys = [...keys[items[i]]];
            var keep = new Set();
            for (var j = 0; j < itemKeys.length; j++) {
                if (removeAll.has(itemKeys[j])) continue;

                if (!dupKeys.has(itemKeys[j])) {
                    keep.add(itemKeys[j]);
                }
            }
            result[items[i]] = keep;
        }

        return result;
    }

    /**
     * Sorting function that deals with alpha and numeric elements.
     *
     * This function was taken from Emperor's code:
     * https://github.com/biocore/emperor/blob/659b62a9f02a6423b6258c814d0e83dbfd05220e/emperor/support_files/js/util.js#L12
     *
     * @param {String[]} list A list of strings to sort
     *
     * @return {String[]} The sorted list of strings
     * @function naturalSort
     */
    function naturalSort(list) {
        var numericPart = [],
            alphaPart = [],
            result = [];

        // separate the numeric and the alpha elements of the array
        // Note that NaN and +/- Infinity are not considered numeric elements
        for (var index = 0; index < list.length; index++) {
            var element = list[index];
            if (!isValidNumber(element)) {
                alphaPart.push(element);
            } else {
                numericPart.push(element);
            }
        }

        // ignore casing of the strings, taken from:
        // http://stackoverflow.com/a/9645447/379593
        alphaPart.sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });

        // sort in ascending order
        numericPart.sort(function (a, b) {
            return parseFloat(a) - parseFloat(b);
        });

        return result.concat(alphaPart, numericPart);
    }

    /**
     * Returns true if a string represents a finite number, false otherwise.
     *
     * Note that number parsing / type conversions in general are extremely
     * hairy in JS. This function seems to work well for a wide range of cases,
     * but it may not be perfect.
     *
     * This function was created from code that was originally in
     * splitNumericValues() in Emperor's codebase. That code, in turn, was
     * based on http://stackoverflow.com/a/9716488.
     *
     * @param {String} value Value to check for validity
     * @return {Boolean} true if value represents a finite number, else false
     */
    function isValidNumber(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    /**
     * Split list of string values into numeric and non-numeric values
     *
     * This function was taken from Emperor's code:
     * https://github.com/biocore/emperor/blob/659b62a9f02a6423b6258c814d0e83dbfd05220e/emperor/support_files/js/util.js#L99
     *
     * @param {String[]} values The values to check
     * @return {Object} Object with two keys, `numeric` and `nonNumeric`.
     * `numeric` holds an array of all numeric values found. `nonNumeric` holds
     * an array of the remaining values.
     */
    function splitNumericValues(values) {
        var numeric = [];
        var nonNumeric = [];
        _.each(values, function (element) {
            if (isValidNumber(element)) {
                numeric.push(element);
            } else {
                nonNumeric.push(element);
            }
        });
        return { numeric: numeric, nonNumeric: nonNumeric };
    }

    /**
     * Display a message in a toast element.
     *
     * @param {String} msg - message to display
     * @param {Number} duration - milliseconds to keep toast visible (optional)
     *                            Defaults to 3000 ms (i.e. 3 seconds).
     */
    function toastMsg(msg, duration = 3000) {
        var toast = document.getElementById("toast");
        toast.innerHTML = msg;
        toast.classList.remove("hidden");
        setTimeout(function () {
            toast.classList.add("hidden");
        }, duration);
    }

    /**
     * Returns a numeric representation of a line width <input> element.
     *
     * If the value of the input is in some way "invalid" (i.e. isValidNumber()
     * is false for this value, or the number is less than min) then we will
     * 1) set the value of the <input> to min ourselves, and
     * 2) return min.
     *
     * @param {HTMLElement} inputEle A reference to an <input> element
     *                               describing a line width to use in coloring
     *                               the tree. This should ideally have
     *                               type="number" and min="[min value]" set
     *                               so that the user experience is consistent,
     *                               but none of these things are checked for
     *                               here -- we only look at the value of this
     *                               element.
     * @param {Number} min Defaults to 0. Minimum acceptable value for line
     *                     width/for whatever numeric quality is being
     *                     considered.
     * @return {Number} Sanitized number that can be used as input to
     *                  Empress.thickenColoredNodes().
     */
    function parseAndValidateNum(inputEle, min = 0) {
        if (isValidNumber(inputEle.value)) {
            var pfVal = parseFloat(inputEle.value);
            if (pfVal >= min) {
                return pfVal;
            }
        }
        // If we're still here, the number was invalid.
        inputEle.value = min;
        return min;
    }

    /**
     * Produces an Object mapping feature metadata values to barplot lengths.
     *
     * This code was based on ColorViewController.getScaledColors() in Emperor:
     * https://github.com/biocore/emperor/blob/b959aed7ffcb9fa3e4d019c6e93a1af3850564d9/emperor/support_files/js/color-view-controller.js#L398
     *
     * @param {Array} sortedUniqueValues Array of unique values present in a
     *                                   feature metadata field. Should have
     *                                   been sorted using util.naturalSort().
     *                                   Since these are expected to already be
     *                                   *unique*, there shouldn't be any
     *                                   duplicate values in this array.
     * @param {Number} minLength Minimum length value to use for scaling: the
     *                           minimum numeric value in sortedUniqueValues
     *                           will get assigned this length.
     * @param {Number} maxLength Maximum length value to use for scaling; works
     *                           analogously to minLength above.
     * @param {Number} layerNum Number of the barplot layer for which these
     *                          scaling computations are being done. This
     *                          will only be used if something goes wrong and
     *                          this function needs to throw an error message.
     * @param {String} fieldName Name of the feature metadata field represented
     *                           by sortedUniqueValues. As with layerNum, this
     *                           will only be used if this throws an error
     *                           message.
     * @return {Array} lengthInfo An Array with three elements. In order:
     *                            1. fm2length: Object that maps the numeric
     *                               items in sortedUniqueValues to their
     *                               corresponding barplot lengths. Each length
     *                               is guaranteed to be within the inclusive
     *                               range [minLength, maxLength].
     *                            2. valMin: Number corresponding to the
     *                               minimum numeric value in
     *                               sortedUniqueValues. Note that this is a
     *                               Number, not a String: i.e. parseFloat()
     *                               has been called on it (so mapping this
     *                               back to a String in sortedUniqueValues is
     *                               neither straightforward nor recommended).
     *                               Should be used when creating a legend.
     *                            3. valMax: Number corresponding to the max
     *                               numeric value in sortedUniqueValues.
     *                               Analogous to valMin.
     */
    function assignBarplotLengths(
        sortedUniqueValues,
        minLength,
        maxLength,
        layerNum,
        fieldName
    ) {
        var split = splitNumericValues(sortedUniqueValues);
        if (split.numeric.length < 2) {
            throw new Error(
                "Error with scaling lengths in barplot layer " +
                    layerNum +
                    ': the feature metadata field "' +
                    fieldName +
                    '" has less than 2 unique numeric values.'
            );
        }
        fm2length = {};
        // Compute the maximum and minimum values in the field to use to
        // scale length by
        var nums = _.map(split.numeric, parseFloat);
        var valMin = _.min(nums);
        var valMax = _.max(nums);
        // Compute the value range (based on the min/max values in the
        // field) and the length range (based on the min/max length that
        // the user has set for this barplot layer)
        var valRange = valMax - valMin;
        var lengthRange = maxLength - minLength;
        if (lengthRange < 0) {
            throw new Error(
                "Error with scaling lengths in barplot layer " +
                    layerNum +
                    ": Maximum length is greater than minimum length."
            );
        }
        _.each(split.numeric, function (n) {
            // uses linear interpolation (we could add fancier
            // scaling methods in the future as options if desired)
            //
            // NOTE: we purposefully use the original feature metadata value
            // (i.e. n) as the key in fm2length, not parseFloat(n). This is
            // because parseFloat(n) can have a different string representation
            // than n, so using parseFloat(n) as a key would make these lengths
            // unretrievable without calling parseFloat() multiple times. (An
            // example of this is the metadata value "0.0", which parseFloat()
            // converts to 0.)
            fm2length[n] =
                ((parseFloat(n) - valMin) / valRange) * lengthRange + minLength;
        });
        return [fm2length, valMin, valMax];
    }

    return {
        keepUniqueKeys: keepUniqueKeys,
        naturalSort: naturalSort,
        splitNumericValues: splitNumericValues,
        isValidNumber: isValidNumber,
        parseAndValidateNum: parseAndValidateNum,
        toastMsg: toastMsg,
        assignBarplotLengths: assignBarplotLengths,
    };
});
