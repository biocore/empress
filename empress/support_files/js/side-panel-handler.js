define(["Colorer"], function (Colorer) {
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

        // feature metadata GUI components
        this.fChk = document.getElementById("feature-chk");
        this.fSel = document.getElementById("feature-options");
        this.fAddOpts = document.getElementById("feature-add");
        this.fColor = document.getElementById("feature-color");
        this.fLineWidth = document.getElementById("feature-line-width");
        this.fUpdateBtn = document.getElementById("feature-update");

        // layout GUI components
        this.layoutDiv = document.getElementById("layout-div");

        // uncheck button
        this.sHideChk.checked = false;

        // used in event closers
        var panel = this;

        // hides the side menu
        var collapse = document.getElementById(this.COLLAPSE_ID);
        collapse.onclick = function () {
            document
                .getElementById(panel.SIDE_PANEL_ID)
                .classList.add("hidden");
            document.getElementById(panel.SHOW_ID).classList.remove("hidden");
        };

        // // shows the side menu
        var show = document.getElementById(this.SHOW_ID);
        show.onclick = function () {
            document.getElementById(panel.SHOW_ID).classList.add("hidden");
            document
                .getElementById(panel.SIDE_PANEL_ID)
                .classList.remove("hidden");
        };
    }

    /**
     * Sets the components of the samples panel back to there default value
     */
    SidePanel.prototype.__samplePanelReset = function () {
        // set color map back to default
        this.sColor.value = "discrete-coloring-qiime";

        // uncheck button
        this.sHideChk.checked = false;

        // set default branch length back to 1
        var thickenBranch = document.getElementById("sample-line-width");
        this.sLineWidth.value = 1;

        // hide update button
        this.sUpdateBtn.classList.add("hidden");
    };

    /**
     * Analogue to SidePanel.__samplePanelReset() for feature coloring
     */
    SidePanel.prototype.__featurePanelReset = function () {
        // set color map back to default
        this.fColor.value = "discrete-coloring-qiime";

        // set default branch length back to 1
        this.fLineWidth.value = 1;

        // hide update button
        this.fUpdateBtn.classList.add("hidden");
    };

    /**
     * Sets the components of the samples panel back to their default value
     * and hides the additional options
     */
    SidePanel.prototype.__samplePanelClose = function () {
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
     * Analogue to SidePanel.__samplePanelClose() for feature coloring
     */
    SidePanel.prototype.__featurePanelClose = function () {
        // disable sample check box
        this.fChk.checked = false;

        // disable the sample category select
        this.fSel.disabled = true;

        // hide the additional options
        this.fAddOpts.classList.add("hidden");

        // reset panel
        this.__featurePanelReset();

        //reset tree
        this.empress.resetTree();
        this.empress.drawTree();

        // clear legends
        this.legend.clearAllLegends();
    };

    /**
     * Updates/redraws the tree for sample coloring
     */
    SidePanel.prototype._updateSampleColoring = function () {
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
     * Updates/redraws the tree for feature coloring
     */
    SidePanel.prototype._updateFeatureColoring = function () {
        this.empress.resetTree();

        // clear legends
        this.legend.clearAllLegends();

        // color tree
        this._colorFeatureTree();

        var lWidth = this.fLineWidth.value;
        // TODO analogue of this but for feature metadata
        // if (lWidth !== 1) {
        //     this.empress.thickenSameSampleLines(lWidth - 1);
        // }
        this.empress.drawTree();

        // hide update button
        this.fUpdateBtn.classList.add("hidden");
    };

    /**
     * Colors the tree
     */
    SidePanel.prototype._colorSampleTree = function () {
        var colBy = this.sSel.value;
        var col = this.sColor.value;
        var hide = this.sHideChk.checked;
        var keyInfo = this.empress.colorBySampleCat(colBy, col);
        this.empress.setNonSampleBranchVisibility(hide);
        this.legend.addColorKey(colBy, keyInfo, "node", false);
    };

    /**
     * Analogue of _colorSampleTree()
     */
    SidePanel.prototype._colorFeatureTree = function () {
        var colBy = this.fSel.value;
        var col = this.fColor.value;
        var keyInfo = this.empress.colorByFeatureMetadata(colBy, col);
        this.legend.addColorKey(colBy, keyInfo, "node", false);
    };

    /**
     * Redraws the tree with a different layout.
     */
    SidePanel.prototype._updateLayout = function () {
        this.empress.resetTree();
        this.empress.drawTree();
    };

    /**
     * Initializes layout options.
     * (These are pretty simple compared to the sample metadata options.)
     */
    SidePanel.prototype.addLayoutTab = function () {
        var sp = this;
        var LAYOUT_RADIO_BUTTON_NAME = "layoutoptions";
        // Get layout info from the Empress instance
        var layouts = this.empress.getAvailableLayouts();
        var default_layout = this.empress.getDefaultLayout();
        // Placeholder variables to be used when creating elements
        var pele, lele, iele;

        var radioBtnOnClickFunc = function () {
            sp.empress.updateLayout(this.value);
        };

        for (var i = 0; i < layouts.length; i++) {
            // Each layout option is represented by three tags:
            // <p>
            //    <label></label>
            //    <input></input>
            // </p>
            // The <p> breaks lines in a way that looks nice, and the
            // label/input just define the radio buttons as is normal in HTML:
            // see https://www.w3schools.com/tags/att_input_type_radio.asp.
            pele = document.createElement("p");
            lele = document.createElement("label");
            iele = document.createElement("input");

            // Initialize the radio button for this layout
            iele.value = layouts[i];
            iele.type = "radio";
            iele.name = LAYOUT_RADIO_BUTTON_NAME;
            iele.id = "layoutRadioBtn" + layouts[i];
            if (layouts[i] === default_layout) {
                iele.checked = true;
            }

            // Initialize the label pointing to that radio button
            // https://stackoverflow.com/a/15750291
            lele.htmlFor = iele.id;
            lele.innerHTML = layouts[i];

            // Use of onclick based on
            // https://www.dyn-web.com/tutorials/forms/radio/onclick-onchange.php.
            // Long story short, either onchange or onclick works for most
            // browsers, but IE 9 is inconsistent with onchange -- hence our
            // use of onclick here. (That being said, you probably shouldn't
            // use IE 9 with Empress anyway...)
            // Anyway, if the same layout button is clicked a bunch of times,
            // nothing will change -- Empress.updateLayout() stores the current
            // layout name.
            iele.onclick = radioBtnOnClickFunc;
            // Now that we've created these three elements, add them!
            pele.appendChild(lele);
            pele.appendChild(iele);
            this.layoutDiv.appendChild(pele);
        }
    };

    /**
     * Initializes sample components
     */
    SidePanel.prototype.addSampleTab = function () {
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

        // The color map selector
        Colorer.addColorsToSelect(this.sColor);

        // toggle the sample/color map selectors
        this.sChk.onclick = function () {
            if (sp.sChk.checked) {
                sp.sSel.disabled = false;
                sp.sAddOpts.classList.remove("hidden");
                sp.sUpdateBtn.classList.remove("hidden");
            } else {
                sp.__samplePanelClose();
            }
        };

        this.sSel.onchange = function () {
            sp.sUpdateBtn.classList.remove("hidden");
        };

        this.sColor.onchange = function () {
            sp.sUpdateBtn.classList.remove("hidden");
        };

        this.sLineWidth.onchange = function () {
            sp.sUpdateBtn.classList.remove("hidden");
        };

        // deterines whether to show features not in samples
        this.sHideChk.onclick = function () {
            sp.empress.setNonSampleBranchVisibility(this.checked);
            sp.empress.drawTree();
        };

        this.sUpdateBtn.onclick = function () {
            sp._updateSampleColoring();
        };
    };

    /**
     * Initializes feature metadata coloring components
     */
    SidePanel.prototype.addFeatureTab = function () {
        var sp = this;

        var i, opt;
        // add feature metadata categories / "columns"
        var selOpts = this.empress.getFeatureMetadataCategories();
        for (i = 0; i < selOpts.length; i++) {
            opt = document.createElement("option");
            opt.value = selOpts[i];
            opt.innerHTML = selOpts[i];
            this.fSel.appendChild(opt);
        }

        // The color map selector
        Colorer.addColorsToSelect(this.fColor);

        // toggle the sample/color map selectors
        this.fChk.onclick = function () {
            if (sp.fChk.checked) {
                sp.fSel.disabled = false;
                sp.fAddOpts.classList.remove("hidden");
                sp.fUpdateBtn.classList.remove("hidden");
            } else {
                sp.__featurePanelClose();
            }
        };

        this.fSel.onchange = function () {
            sp.fUpdateBtn.classList.remove("hidden");
        };

        this.fColor.onchange = function () {
            sp.fUpdateBtn.classList.remove("hidden");
        };

        this.fLineWidth.onchange = function () {
            sp.fUpdateBtn.classList.remove("hidden");
        };

        this.fUpdateBtn.onclick = function () {
            sp._updateFeatureColoring();
        };
    };

    return SidePanel;
});
