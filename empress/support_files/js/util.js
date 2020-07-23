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
        var i;

        // TODO: The current method to get the unique observations
        // belonging to each sample category is slow. Refactoring it will lead
        // to a nice speed boost.
        // https://github.com/biocore/empress/issues/147
        var uniqueKeysArray = _.chain(keys)
            .values()
            .map(function (item) {
                return [...item];
            })
            .flatten()
            .groupBy(function (key) {
                return key;
            })
            .filter(function (key) {
                return key.length === 1;
            })
            .flatten()
            .value();
        var uniqueKeys = new Set(uniqueKeysArray);
        var isUnique = function (key) {
            return uniqueKeys.has(key);
        };

        // get the unique keys in each item
        var result = {};
        items = Object.keys(keys);
        for (i = 0; i < items.length; i++) {
            var itemKeys = [...keys[items[i]]];
            var keep = new Set();
            for (var j = 0; j < itemKeys.length; j++) {
                if (removeAll.has(itemKeys[j])) continue;

                if (isUnique(itemKeys[j])) {
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
     * is false for this value, or the number is less than 0) then we will
     * 1) set the value of the <input> to 0 ourselves, and
     * 2) return 0.
     *
     * @param {HTMLElement} inputEle A reference to an <input> element
     *                               describing a line width to use in coloring
     *                               the tree. This should ideally have
     *                               type="number" and min="0" set so that the
     *                               user experience is consistent, but none of
     *                               these things are checked for here -- we
     *                               only look at the value of this element.
     * @return {Number} Sanitized number that can be used as input to
     *                  Empress.thickenSameSampleLines().
     */
    function parseAndValidateLineWidth(inputEle) {
        if (isValidNumber(inputEle.value)) {
            var pfVal = parseFloat(inputEle.value);
            if (pfVal >= 0) {
                return pfVal;
            }
        }
        // If we're still here, the number was invalid.
        inputEle.value = 0;
        return 0;
    }

    return {
        keepUniqueKeys: keepUniqueKeys,
        naturalSort: naturalSort,
        splitNumericValues: splitNumericValues,
        isValidNumber: isValidNumber,
        parseAndValidateLineWidth: parseAndValidateLineWidth,
        toastMsg: toastMsg,
    };
});
