define(["Colorer"], function(Colorer) {
    // class name for css tags
    var COLLAPSE_CLASS = "collapsible";
    /**
     *
     * @class SidePanel
     *
     * Creates table for the side panel and handles their events. This
     * class will init a side panel with the search bar and collapse button.
     * Additional tabs such as Sample Metadata can be added by calling their
     * initialization function.
     *
     * @param {div} container Container where the side panel will live.
     * @param {Empress} empress The empress tree
     * @param {div} legend Container that holds the legend
     *
     * @return {SidePanel}
     * @constructs SidePanel
     */
    function SidePanel(container, empress, legend) {
        // the container for the side menu
        this.container = container;
        this.SIDE_PANEL_ID = container.id;

        // names of header components
        this.HEADER_CLASS = "side-header";
        this.SEARCH_ID = "quick-search";
        this.COLLAPSE_ID = "hide-ctrl";
        this.SHOW_ID = "show-ctrl";

        // used to event triggers
        this.empress = empress;

        this.legend = legend;

        // sample GUI components
        this.sChk = document.getElementById("sample-chk");
        this.sSel = document.getElementById("sample-options");
        this.sAddOpts = document.getElementById("sample-add");
        this.sColor = document.getElementById("sample-color");
        this.sHideChk = document.getElementById("sample-hide-non-feature");
        this.sLineWidth = document.getElementById("sample-line-width");
        this.sUpdateBtn = document.getElementById("sample-update");

        // used in event closers
        var panel = this;

        // // triggers search when enter key is pressed in search menu
        var search = document.getElementById(this.SEARCH_ID);
        search.keyup = function(e) {
            e.preventDefault();
            if (e.keyCode === 13) {
                // TODO: model search function goes here
            }
        };

        // triggers the 'active' look when user enters the search bar
        search.focus = function() {
            document
                .getElementById(panel.SIDE_PANEL_ID)
                .classList.add("panel-active");
        };

        // triggers the 'unactive' look when user leaves search bar
        search.blur = function() {
            document
                .getElementById(panel.SIDE_PANEL_ID)
                .classList.toggle(
                    "panel-active",
                    document.querySelector(".side-content:not(.hidden)")
                );
        };

        // // hides the side menu
        var collapse = document.getElementById(this.COLLAPSE_ID);
        collapse.onclick = function() {
            document
                .getElementById(panel.SIDE_PANEL_ID)
                .classList.add("hidden");
            document.getElementById(panel.SHOW_ID).classList.remove("hidden");
        };

        // // shows the side menu
        var show = document.getElementById(this.SHOW_ID);
        show.onclick = function() {
            document.getElementById(panel.SHOW_ID).classList.add("hidden");
            document
                .getElementById(panel.SIDE_PANEL_ID)
                .classList.remove("hidden");
        };
    }

    /**
     * Sets the components of the samples panel back to there default value
     */
    SidePanel.prototype.__samplePanelReset = function() {
        // set color map back to default
        this.sColor.value = "discrete-coloring-qiime";

        // uncheck button
        this.sHideChk.checked = true;

        // set default branch length back to 1
        var thickenBranch = document.getElementById("sample-line-width");
        this.sLineWidth.value = 1;

        // hide update button
        this.sUpdateBtn.classList.add("hidden");
    };

    /**
     * Sets the components of the samples panel back to there default value
     * and hides the additional options
     */
    SidePanel.prototype.__samplePanelClose = function() {
        // disable sample check box
        this.sChk.checked = false;

        // disable the sample category select
        this.sSel.disabled = true;

        // hide the additional options
        this.sAddOpts.classList.add("hidden");

        // reset panel
        this.__samplePanelReset();

        //reset tree
        this.empress.resetTree();
        this.empress.drawTree();

        // clear legends
        this.legend.clearAllLegends();
    };

    /**
     * Updates/redraws the tree
     */
    SidePanel.prototype._updateSample = function() {
        this.empress.resetTree();

        // clear legends
        this.legend.clearAllLegends();

        // color tree
        this._colorSampleTree();

        var lWidth = this.sLineWidth.value;
        if (lWidth !== 1) {
            this.empress.thickenSameSampleLines(lWidth - 1);
        }
        this.empress.drawTree();

        // hide update button
        this.sUpdateBtn.classList.add("hidden");
    };

    /**
     * Colors the tree
     */
    SidePanel.prototype._colorSampleTree = function() {
        var colBy = this.sSel.value;
        var col = this.sColor.value;
        var hide = this.sHideChk.checked;
        var keyInfo = this.empress.colorBySampleCat(colBy, col);
        this.empress.setNonSampleBranchVisibility(hide);
        this.legend.addColorKey(colBy, keyInfo, "node", false);
    };

    /**
     * Initializes sample components
     */
    SidePanel.prototype.addSampleTab = function() {
        // for use in closers
        var sp = this;

        var i, opt;
        // add sample categories
        var selOpts = this.empress.getSampleCategories();
        for (i = 0; i < selOpts.length; i++) {
            opt = document.createElement("option");
            opt.value = selOpts[i];
            opt.innerHTML = selOpts[i];
            this.sSel.appendChild(opt);
        }

        // // The color map selector
        for (i = 0; i < Colorer.__Colormaps.length; i++) {
            var map = Colorer.__Colormaps[i];
            opt = document.createElement("option");
            opt.innerHTML = map.name;
            opt.value = map.id;

            if (map.type == "Header") {
                opt.disabled = true;
            }
            this.sColor.appendChild(opt);
        }

        // toggle the sample/color map selectors
        this.sChk.onclick = function() {
            if (sp.sChk.checked) {
                sp.sSel.disabled = false;
                sp.sAddOpts.classList.remove("hidden");
                sp.sUpdateBtn.classList.remove("hidden");
            } else {
                sp.__samplePanelClose();
            }
        };

        this.sSel.onchange = function() {
            sp.sUpdateBtn.classList.remove("hidden");
        };

        this.sColor.onchange = function() {
            sp.sUpdateBtn.classList.remove("hidden");
        };

        this.sLineWidth.onchange = function() {
            sp.sUpdateBtn.classList.remove("hidden");
        };

        // deterines whether to show features not in samples
        this.sHideChk.onclick = function() {
            sp.empress.setNonSampleBranchVisibility(this.checked);
            sp.empress.drawTree();
        };

        this.sUpdateBtn.onclick = function() {
            sp._updateSample();
        };
    };

    return SidePanel;
});
