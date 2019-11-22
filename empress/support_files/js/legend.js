define([], function() {
    function Legend(tip, node, clade) {
        this.__tipLeg = tip;
        this.__nodeLeg = node;
        this.__cladeLeg = clade;
        this.__legends = ["tip", "node", "clade"];
    }

    /**
     * Display a color key in the legend box.
     * @param {string} name - key name
     * @param {Object} info - key information
     * @param {Object} container - container DOM
     * @param {boolean} gradient - gradient or discrete
     */
    Legend.prototype.addColorKey = function(name, info, container, gradient) {
        var legendContainer = this.__getLegend(container);
        if (name) {
            let div = document.createElement("div");
            div.classList.add("legend-title");
            div.innerHTML = name;
            legendContainer.appendChild(div);
            legendContainer.classList.remove("hidden");
        }
        if (gradient) {
            this.__addContinuousKey(info, legendContainer);
        } else {
            this.__addCategoricalKey(info, legendContainer);
        }
    };

    /**
     * Display a continuous color key.
     * @param {Object} info - key information
     * @param {Object} container - container DOM
     */
    Legend.prototype.__addContinuousKey = function(info, container) {
        // create key container
        let div = document.createElement("div");
        div.classList.add("gradient-bar");

        // min label
        let component = document.createElement("label");
        component.classList.add("gradient-label");
        component.innerHTML = this.__formatNumLabel(info.min[0]);
        div.appendChild(component);

        // color gradient
        component = document.createElement("div");
        component.classList.add("gradient-color");
        component.setAttribute(
            "style",
            "background: linear-gradient(to right, " +
                info.min[1] +
                " 0%, " +
                info.max[1] +
                " 100%);"
        );
        div.appendChild(component);

        // max label
        component = document.createElement("label");
        component.classList.add("gradient-label");
        component.innerHTML = this.__formatNumLabel(info.max[0]);
        div.appendChild(component);

        container.appendChild(div);
    };

    /**
     * Display a categorical color key.
     * @param {Object} info - key information
     * @param {Object} container - container DOM
     */
    Legend.prototype.__addCategoricalKey = function(info, container) {
        let key;
        let category = container.innerText;
        let i = 0;
        for (key in info) {
            // create key container
            let div = document.createElement("div");
            div.classList.add("gradient-bar");

            // color gradient
            let component = document.createElement("div");
            component.classList.add("category-color");
            component.setAttribute(
                "style",
                "background: " + info[key].color + ";"
            );
            div.appendChild(component);

            // label
            component = document.createElement("label");
            component.classList.add("gradient-label");
            component.innerHTML = key;
            component.title = key;
            div.appendChild(component);

            // total percentage of leafs
            component = document.createElement("label");
            component.classList.add("gradient-label");
            component.innerHTML = this.__formatNumLabel(info[key].tPercent);
            div.appendChild(component);
            container.appendChild(div);

            // relative percentage of leafs
            component = document.createElement("label");
            component.classList.add("gradient-label");
            component.innerHTML = this.__formatNumLabel(info[key].rPercent);
            div.appendChild(component);
            container.appendChild(div);
        }
    };

    /**
     * Format a number that is to be displayed in a label.
     *
     * @param {number} num - number to be formatted
     * @returns {string} formatted number
     */
    Legend.prototype.__formatNumLabel = function(num) {
        return num.toPrecision(4).replace(/\.?0+$/, "");
    };

    /**
     * Grabs the approperiate legend
     *
     * @param {string} leg - The type of legend
     *
     * @return {div}
     */
    Legend.prototype.__getLegend = function(leg) {
        var container;
        switch (leg) {
            case "tip":
                container = this.__tipLeg;
                break;
            case "node":
                container = this.__nodeLeg;
                break;
            case "clade":
                container = this.__cladeLeg;
                break;
        }

        return container;
    };

    /**
     * Remove all lengends
     */
    Legend.prototype.clearAllLegends = function() {
        for (var i = 0; i < this.__legends.length; i++) {
            this.clearLegend(this.__legends[i]);
        }
    };

    /**
     * Removes a legend
     * @param {string} leg - The legend to remove
     */
    Legend.prototype.clearLegend = function(leg) {
        var legend = this.__getLegend(leg);
        legend.innerHTML = "";
        legend.classList.add("hidden");
    };

    return Legend;
});
