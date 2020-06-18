define(["underscore", "Colorer"], function (_, Colorer) {
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
        this.fMethodChk = document.getElementById("fm-method-chk");
        this.fMethodDesc = document.getElementById("fm-method-desc");

        // layout GUI components
        this.layoutDiv = document.getElementById("layout-div");

        // uncheck button
        this.sHideChk.checked = false;

        // used in event closures
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
     * Utility function that resets various HTML elements, then resets the
     * tree and its legends.
     *
     * This is intended to be used when the user un-checks the "Color by..."
     * checkbox for sample / feature metadata coloring.
     *
     * @param{Object} eleNameToProperties Maps strings (defining the name of a
     *                                    HTMLElement which is saved as an
     *                                    attribute of SidePanel, e.g. "sChk")
     *                                    to another Object, which maps
     *                                    property names of this attribute to
     *                                    the desired value to which this
     *                                    element's property should be set.
     *                                    e.g. {sChk: {checked: false}}
     * @param{Array} elesToHide Array of HTMLElements to hide. Each of the
     *                          elements in this array will have "hidden" added
     *                          to its classList.
     */
    SidePanel.prototype._resetTab = function (eleNameToProperties, elesToHide) {
        var sp = this;
        _.each(eleNameToProperties, function (properties, eleName) {
            _.each(properties, function (propVal, prop) {
                sp[eleName][prop] = propVal;
            });
        });
        _.each(elesToHide, function (ele) {
            ele.classList.add("hidden");
        });
        // Reset tree and then clear legends
        this.empress.resetTree();
        this.empress.drawTree();
        this.legend.clearAllLegends();
    };

    /**
     * Resets and then re-colors the tree, using an arbitrary "coloring
     * function" as well as a few other configurable things.
     *
     * This function was designed to encapsulate shared code between the sample
     * and feature metadata coloring settings. (There is definitely more work
     * to be done on removing shared code, but this is a start.)
     *
     * @param{String} colorMethodName The name of a method of SidePanel to call
     *                                to re-color the tree: for example,
     *                                "_colorSampleTree".
     * @param{lwInput} HTMLElement An <input> with type="number" from which
     *                             we'll get the .value indicating the line
     *                             width to use when thickening lines.
     * @param{updateBtn} HTMLElement This element will be hidden at the end of
     *                               this function. It should correspond to the
     *                               "Update" button for the sample or feature
     *                               metadata coloring tab.
     */
    SidePanel.prototype._updateColoring = function (
        colorMethodName,
        lwInput,
        updateBtn
    ) {
        this.empress.resetTree();

        // clear legends
        this.legend.clearAllLegends();

        // color tree
        this[colorMethodName]();

        var lWidth = lwInput.value;
        if (lWidth !== 1) {
            this.empress.thickenSameSampleLines(lWidth - 1);
        }
        this.empress.drawTree();

        // hide update button
        updateBtn.classList.add("hidden");
    };

    /**
     * Colors the tree based on the sample metadata coloring settings.
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
     * Colors the tree based on the feature metadata coloring settings.
     */
    SidePanel.prototype._colorFeatureTree = function () {
        var colBy = this.fSel.value;
        var col = this.fColor.value;
        var coloringMethod = this.fMethodChk.checked ? "tip" : "all";
        var keyInfo = this.empress.colorByFeatureMetadata(
            colBy,
            col,
            coloringMethod
        );
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
        // for use in closures
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
                sp._resetTab(
                    {
                        sChk: { checked: false },
                        sSel: { disabled: true },
                        sColor: { value: "discrete-coloring-qiime" },
                        sHideChk: { checked: false },
                        sLineWidth: { value: 1 },
                    },
                    [sp.sAddOpts, sp.sUpdateBtn]
                );
            }
        };

        var showUpdateBtn = function () {
            sp.sUpdateBtn.classList.remove("hidden");
        };
        this.sSel.onchange = showUpdateBtn;
        this.sColor.onchange = showUpdateBtn;
        this.sLineWidth.onchange = showUpdateBtn;

        // deterines whether to show features not in samples
        this.sHideChk.onclick = function () {
            sp.empress.setNonSampleBranchVisibility(this.checked);
            sp.empress.drawTree();
        };

        this.sUpdateBtn.onclick = function () {
            sp._updateColoring(
                "_colorSampleTree",
                sp.sLineWidth,
                sp.sUpdateBtn
            );
        };
    };

    SidePanel.prototype.updateFeatureMethodDesc = function () {
        if (this.fMethodChk.checked) {
            this.fMethodDesc.textContent =
                "With this checkbox setting, only tip metadata will be " +
                "used: internal nodes where all descendants have the same " +
                "feature metadata value are themselves considered to have " +
                "that value.";
        } else {
            this.fMethodDesc.textContent =
                "With this checkbox setting, both tip and internal node " +
                "metadata will be used, without any sort of upwards " +
                '"propagation."';
        }
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
                sp.updateFeatureMethodDesc();
                sp.fSel.disabled = false;
                sp.fAddOpts.classList.remove("hidden");
                sp.fUpdateBtn.classList.remove("hidden");
            } else {
                sp._resetTab(
                    {
                        fChk: { checked: false },
                        fSel: { disabled: true },
                        fColor: { value: "discrete-coloring-qiime" },
                        fLineWidth: { value: 1 },
                    },
                    [sp.fAddOpts, sp.fUpdateBtn]
                );
            }
        };

        var showUpdateBtn = function () {
            sp.fUpdateBtn.classList.remove("hidden");
        };
        this.fSel.onchange = showUpdateBtn;
        this.fColor.onchange = showUpdateBtn;
        this.fLineWidth.onchange = showUpdateBtn;
        this.fMethodChk.onchange = function () {
            sp.updateFeatureMethodDesc();
            showUpdateBtn();
        };

        this.fUpdateBtn.onclick = function () {
            sp._updateColoring(
                "_colorFeatureTree",
                sp.fLineWidth,
                sp.fUpdateBtn
            );
        };
    };

    return SidePanel;
});
