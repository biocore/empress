define(["underscore", "Colorer", "util"], function (_, Colorer, util) {
    var TotalColorOptionsHandlers = 0;

    function ColorOptionsHandler(container, enableContinuousColoring = false) {
        // add count
        TotalColorOptionsHandlers += 1;

        this.container = container;
        this.observers = [];
        this.defaultColor = "discrete-coloring-qiime";
        this.defaultReverseChk = false;
        // create unique num
        this.uniqueNum = TotalColorOptionsHandlers;
        this.enableContinuousColoring = enableContinuousColoring;

        // Add a row for choosing the color map
        var colormapP = this.container.appendChild(document.createElement("p"));
        var colormapLbl = colormapP.appendChild(
            document.createElement("label")
        );
        colormapLbl.innerText = "Color Map";
        var colormapSC = colormapP.appendChild(document.createElement("label"));
        colormapSC.classList.add("select-container");
        this.colormapSelector = document.createElement("select");
        Colorer.addColorsToSelect(this.colormapSelector);
        colormapSC.appendChild(this.colormapSelector);
        this.colormapSelector.id =
            "color-options-handler-" + this.uniqueNum + "-colormap-select";
        colormapLbl.setAttribute("for", this.colormapSelector.id);

        // Add a row for choosing whether the color scale should
        // be reversed
        var reverseColormapP = this.container.appendChild(
            document.createElement("p")
        );
        var reverseColormapLbl = reverseColormapP.appendChild(
            document.createElement("label")
        );
        reverseColormapLbl.innerText = "Reverse Color Map";
        this.reverseColormapCheckbox = reverseColormapP.appendChild(
            document.createElement("input")
        );
        this.reverseColormapCheckbox.id =
            "color-options-handler-" + this.uniqueNum + "-reverse-chk";
        this.reverseColormapCheckbox.setAttribute("type", "checkbox");
        this.reverseColormapCheckbox.classList.add("empress-input");
        reverseColormapLbl.setAttribute("for", this.reverseColormapCheckbox.id);

        var scope = this;
        var notify = function () {
            var options = scope.getOptions();
            _.each(scope.observers, function (obs) {
                obs.colorOptionsUpdate(options);
            });
        };

        if (this.enableContinuousColoring) {
            // add continuous values checkbox
            var continuousValP = this.container.appendChild(
                document.createElement("p")
            );
            var continuousValLbl = continuousValP.appendChild(
                document.createElement("label")
            );
            continuousValLbl.innerText = "Continuous values?";
            this.continuousValCheckbox = continuousValP.appendChild(
                document.createElement("input")
            );
            this.continuousValCheckbox.id =
                "color-options-handler-" + this.uniqueNum + "-continuous-chk";
            this.continuousValCheckbox.setAttribute("type", "checkbox");
            this.continuousValCheckbox.classList.add("empress-input");
            continuousValLbl.setAttribute("for", this.continuousValCheckbox.id);
            // Hide the "Continuous values?" stuff by default, since the default
            // colormap is discrete
            continuousValP.classList.add("hidden");

            // When we're working with a continuous colormap, provide users
            // the ability to set the min/max of the input manually. See
            // https://github.com/biocore/empress/pull/521.
            var continuousManualScaleDiv = this.container.appendChild(
                document.createElement("div")
            );
            continuousManualScaleDiv.classList.add("hidden");
            continuousManualScaleDiv.classList.add("indented");
            var continuousManualScaleManualP = continuousManualScaleDiv.appendChild(
                document.createElement("p")
            );
            var continuousManualScaleLbl = continuousManualScaleManualP.appendChild(
                document.createElement("label")
            );
            continuousManualScaleLbl.innerText =
                "Manually set gradient boundaries?";
            this.continuousManualScaleCheckbox = continuousManualScaleManualP.appendChild(
                document.createElement("input")
            );
            this.continuousManualScaleCheckbox.id =
                "color-options-handler-" +
                this.uniqueNum +
                "-continuous-scale-chk";
            this.continuousManualScaleCheckbox.setAttribute("type", "checkbox");
            this.continuousManualScaleCheckbox.classList.add("empress-input");
            continuousManualScaleLbl.setAttribute(
                "for",
                this.continuousManualScaleCheckbox.id
            );
            var continuousMinMaxDiv = continuousManualScaleDiv.appendChild(
                document.createElement("div")
            );
            continuousMinMaxDiv.classList.add("hidden");
            continuousMinMaxDiv.classList.add("indented");

            // add min scale input
            var continuousMinP = continuousMinMaxDiv.appendChild(
                document.createElement("p")
            );
            var continuousMinLbl = continuousMinP.appendChild(
                document.createElement("label")
            );
            continuousMinLbl.innerText = "Minimum value";
            this.continuousMinInput = continuousMinP.appendChild(
                document.createElement("input")
            );
            this.continuousMinInput.setAttribute("type", "number");
            this.continuousMinInput.classList.add("empress-input");
            this.continuousMinInput.value = null;
            this.continuousMinInput.id =
                "color-options-handler-" +
                this.uniqueNum +
                "-continuous-min-input";
            continuousMinLbl.setAttribute("for", this.continuousMinInput.id);

            // add max scale input
            var continuousMaxP = continuousMinMaxDiv.appendChild(
                document.createElement("p")
            );
            var continuousMaxLbl = continuousMaxP.appendChild(
                document.createElement("label")
            );
            continuousMaxLbl.innerText = "Maximum value";
            this.continuousMaxInput = continuousMaxP.appendChild(
                document.createElement("input")
            );
            this.continuousMaxInput.setAttribute("type", "number");
            this.continuousMaxInput.classList.add("empress-input");
            this.continuousMaxInput.value = null;
            this.continuousMaxInput.id =
                "color-options-handler-" +
                this.uniqueNum +
                "-continuous-max-input";
            continuousMaxLbl.setAttribute("for", this.continuousMaxInput.id);

            var validateNumInput = function (input) {
                util.parseAndValidateNum(input, null);
            };

            // add events
            this.continuousValCheckbox.onchange = () => {
                if (scope.continuousValCheckbox.checked) {
                    continuousManualScaleDiv.classList.remove("hidden");
                } else {
                    continuousManualScaleDiv.classList.add("hidden");
                }
                notify();
            };
            this.continuousManualScaleCheckbox.onchange = () => {
                if (scope.continuousManualScaleCheckbox.checked) {
                    continuousMinMaxDiv.classList.remove("hidden");
                } else {
                    continuousMinMaxDiv.classList.add("hidden");
                }
                notify();
            };
            this.continuousMinInput.onchange = () => {
                validateNumInput(scope.continuousMinInput, null);
                notify();
            };
            this.continuousMinInput.addEventListener("focusout", () => {
                validateNumInput(scope.continuousMinInput, null);
                notify();
            });
            this.continuousMaxInput.onchange = () => {
                validateNumInput(scope.continuousMaxInput, null);
                notify();
            };
            this.continuousMaxInput.addEventListener("focusout", () => {
                validateNumInput(scope.continuousMaxInput, null);
                notify();
            });
        }

        this.colormapSelector.onchange = () => {
            if (scope.enableContinuousColoring) {
                if (Colorer.isColorMapDiscrete(scope.colormapSelector.value)) {
                    scope.continuousValCheckbox.checked = false;
                    continuousValP.classList.add("hidden");
                    continuousManualScaleDiv.classList.add("hidden");
                } else {
                    continuousValP.classList.remove("hidden");
                }
            }
            notify();
        };
        this.reverseColormapCheckbox.onchange = notify;
    }

    ColorOptionsHandler.prototype.registerObserver = function (obs) {
        this.observers.push(obs);
    };

    ColorOptionsHandler.prototype.getOptions = function () {
        var options = {
            color: this.colormapSelector.value,
            reverse: this.reverseColormapCheckbox.checked,
        };
        if (this.enableContinuousColoring) {
            this._getContinuousColoringOptions(options);
        }
        return options;
    };

    ColorOptionsHandler.prototype._getContinuousColoringOptions = function (
        options
    ) {
        options.continuousColoring = this.continuousValCheckbox.checked;
        options.continuousManualScale = this.continuousManualScaleCheckbox.checked;
        options.min = this.verifyMinBoundary();
        options.max = this.verifyMaxBoundary();

        if (!options.continuousColoring) {
            // set options to not use continuous coloring
            options.continuousManualScale = false;
            options.min = null;
            options.max = null;
        } else if (!options.continuousManualScale) {
            // set options to use default continuous scale
            options.min = null;
            options.max = null;
        }
    };

    ColorOptionsHandler.prototype.reset = function () {
        this.colormapSelector.value = this.defaultColor;
        this.reverseColormapCheckbox.checked = this.defaultReverseChk;
    };

    ColorOptionsHandler.prototype.verifyMinBoundary = function () {
        var min = parseFloat(this.continuousMinInput.value);

        if (isNaN(min)) {
            return "Minimum boundary value is missing.";
        }

        return min;
    };

    ColorOptionsHandler.prototype.verifyMaxBoundary = function () {
        var min = parseFloat(this.continuousMinInput.value);
        var max = parseFloat(this.continuousMaxInput.value);

        if (isNaN(max)) {
            return "Maximum boundary value is missing.";
        }

        // It should be noted that if min isNaN that this will always return
        // false
        if (max <= min) {
            return "Maximum boundary must be greater than minimum boundary.";
        }

        return max;
    };

    return ColorOptionsHandler;
});
