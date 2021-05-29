define(["underscore", "Colorer", "util"], function (_, Colorer, util) {
    var TotalColorOptionsHanlders = 0;

    function ColorOptionsHandler(container, enableContinuousColoring = false) {
        this.container = container;
        this.observers = [];
        this.defaultColor = "discrete-coloring-qiime";
        this.defaultReverseChk = false;
        // create unique num
        TotalColorOptionsHanlders += 1;
        this.uniqueNum = TotalColorOptionsHanlders;
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
            "color-options-hanlder-" + this.uniqueNum + "-colormap-select";
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
            "color-options-hanlder-" + this.uniqueNum + "-reverse-chk";
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
                "color-options-hanlder-" + this.uniqueNum + "-continuous-chk";
            this.continuousValCheckbox.setAttribute("type", "checkbox");
            this.continuousValCheckbox.classList.add("empress-input");
            continuousValLbl.setAttribute("for", this.continuousValCheckbox.id);
            // Hide the "Continuous values?" stuff by default, since the default
            // colormap is discrete
            continuousValP.classList.add("hidden");

            // add continuous values min/middle/max inputs
            var continuousScaleDiv = this.container.appendChild(
                document.createElement("div")
            );
            continuousScaleDiv.classList.add("hidden");
            var continuousScaleP = continuousScaleDiv.appendChild(
                document.createElement("p")
            );
            var continuousScaleLbl = continuousScaleP.appendChild(
                document.createElement("label")
            );
            continuousScaleLbl.innerText = "Manually set boundaries";
            this.continuousScaleCheckbox = continuousScaleP.appendChild(
                document.createElement("input")
            );
            this.continuousScaleCheckbox.id =
                "color-options-hanlder-" +
                this.uniqueNum +
                "-continuous-scale-chk";
            this.continuousScaleCheckbox.setAttribute("type", "checkbox");
            this.continuousScaleCheckbox.classList.add("empress-input");
            continuousScaleLbl.setAttribute(
                "for",
                this.continuousScaleCheckbox.id
            );
            var continuousMinMaxDiv = continuousScaleDiv.appendChild(
                document.createElement("div")
            );
            continuousMinMaxDiv.classList.add("hidden");

            // add min scale input
            var continuousMinP = continuousMinMaxDiv.appendChild(
                document.createElement("p")
            );
            var continuousMinLbl = continuousMinP.appendChild(
                document.createElement("label")
            );
            continuousMinLbl.innerText = "Min";
            this.continuousMinInput = continuousMinP.appendChild(
                document.createElement("input")
            );
            this.continuousMinInput.setAttribute("type", "number");
            this.continuousMinInput.classList.add("empress-input");
            this.continuousMinInput.value = null;
            this.continuousMinInput.id =
                "color-options-hanlder-" +
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
            continuousMaxLbl.innerText = "Max";
            this.continuousMaxInput = continuousMaxP.appendChild(
                document.createElement("input")
            );
            this.continuousMaxInput.setAttribute("type", "number");
            this.continuousMaxInput.classList.add("empress-input");
            this.continuousMaxInput.value = null;
            this.continuousMaxInput.id =
                "color-options-hanlder-" +
                this.uniqueNum +
                "-continuous-max-input";
            continuousMaxLbl.setAttribute("for", this.continuousMaxInput.id);

            var validateNumInput = function (input) {
                util.parseAndValidateNum(input, null);
            };

            // add events
            this.continuousValCheckbox.onchange = () => {
                if (scope.continuousValCheckbox.checked) {
                    continuousScaleDiv.classList.remove("hidden");
                } else {
                    continuousScaleDiv.classList.add("hidden");
                }
                notify();
            };
            this.continuousScaleCheckbox.onchange = () => {
                if (scope.continuousScaleCheckbox.checked) {
                    scope.continuousMinInput.value = null;
                    scope.continuousMaxInput.value = null;
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
                    continuousValP.classList.add("hidden");
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
            options.continuousColoring = this.continuousValCheckbox.checked;
            options.continuousScale = this.continuousScaleCheckbox.checked;
            options.min = this.verifyMinBoundary();
            options.max = this.verifyMaxBoundary();
        }
        return options;
    };

    ColorOptionsHandler.prototype.reset = function () {
        this.colormapSelector.value = this.defaultColor;
        this.reverseColormapCheckbox.checked = this.defaultReverseChk;
    };

    ColorOptionsHandler.prototype.verifyMinBoundary = function () {
        var min = parseFloat(this.continuousMinInput.value);

        if (isNaN(min)) {
            return "Min boundary field is missing.";
        }

        return min;
    };

    ColorOptionsHandler.prototype.verifyMaxBoundary = function () {
        var min = parseFloat(this.continuousMinInput.value);
        var max = parseFloat(this.continuousMaxInput.value);

        if (isNaN(max)) {
            return "Max boundary field is missing.";
        }

        // It should be noted that if min isNaN that this will always return
        // false
        if (max <= min) {
            return "Max boundary must be greater than Min boundary.";
        }

        return max;
    };

    return ColorOptionsHandler;
});
