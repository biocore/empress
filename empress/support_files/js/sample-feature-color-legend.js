define(["Legend"], function (Legend) {
    /**
     * @class SampleFeatureColorLegend
     */
    function SampleFeatureColorLegend(container) {
        // call Legend constructor
        Legend.call(this, container);

        /**
         * @type {String}
         * Text to display at the bottom of the continuous legend when some
         *  values in a continuous are either missing or non-numeric.
         */
        this.continuousMissingNonNumericWarning =
            "Some value(s) in this field were missing and/or not numeric. " +
            "These value(s) have been left out of the gradient, and the " +
            "corresponding nodes have been set to the default color.";

        /**
         * @type {String}
         * Short version of the above warning, shown for the same legends when
         * exported to SVG
         */
        this.continuousMissingNonNumericWarningShort =
            "Missing / non-numeric value(s)' associated nodes left as " +
            "default color.";
    }

    // inherit Legend functions
    SampleFeatureColorLegend.prototype = Object.create(Legend.prototype);

    // set SampleFeatureColorLegend's constructor
    SampleFeatureColorLegend.prototype.constructor = SampleFeatureColorLegend;

    return SampleFeatureColorLegend;
});
