define(["underscore"], function (_) {
    /**
     * Remove all non unique keys
     *
     * @param {Object} keys An object containing multiple lists of keys
     *
     * @return {Object} A new object with the non unique keys removed
     */
    function keepUniqueKeys(keys) {
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
        var hasKey = function (key) {
            return uniqueKeys.has(key);
        };

        // get the unique keys in each item
        var result = {};
        items = Object.keys(keys);
        for (i = 0; i < items.length; i++) {
            var itemKeys = [...keys[items[i]]];
            result[items[i]] = _.filter(itemKeys, hasKey);
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
        for (var index = 0; index < list.length; index++) {
            if (isNaN(parseFloat(list[index]))) {
                alphaPart.push(list[index]);
            } else {
                numericPart.push(list[index]);
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
            // http://stackoverflow.com/a/9716488
            if (!isNaN(parseFloat(element)) && isFinite(element)) {
                numeric.push(element);
            } else {
                nonNumeric.push(element);
            }
        });
        return { numeric: numeric, nonNumeric: nonNumeric };
    }

    return {
        keepUniqueKeys: keepUniqueKeys,
        naturalSort: naturalSort,
        splitNumericValues: splitNumericValues,
    };
});
