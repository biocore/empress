define(["Legend"], function (Legend) {
    /**
     * @class SampleFeatureColorLegend
     */
    function BarplotLegend(container) {
        // call Legend constructor
        Legend.call(this, container);

        /**
         * @type {String}
         * Text to display at the bottom of the continuous legend when some
         * values in a field are either missing or non-numeric.
         */
        this.continuousMissingNonNumericWarning =
            "Some value(s) in this field were missing and/or not numeric. " +
            "These value(s) have been left out of the gradient, and no " +
            "bar(s) have been drawn for them.";

        /**
         * @type {String}
         * Short version of the above warning, shown for the same legends when
         * exported to SVG
         */
        this.continuousMissingNonNumericWarningShort =
            "Missing / non-numeric value(s) omitted.";
    }

    // inherit Legend functions
    BarplotLegend.prototype = Object.create(Legend.prototype);

    // set BarplotLegend's constructor
    BarplotLegend.prototype.constructor = BarplotLegend;

    return BarplotLegend;
});
