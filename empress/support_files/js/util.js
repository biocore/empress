define(["underscore"], function (_) {
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
    _.each(values, function(element) {
        // http://stackoverflow.com/a/9716488
        if (!isNaN(parseFloat(element)) && isFinite(element)) {
          numeric.push(element);
        }
        else {
          nonNumeric.push(element);
        }
      });
    return {numeric: numeric, nonNumeric: nonNumeric};
   }

    return { naturalSort: naturalSort, splitNumericValues: splitNumericValues };
});
