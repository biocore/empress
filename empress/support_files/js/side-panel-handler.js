define(["underscore", "Colorer", "util"], function (_, Colorer, util) {
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
        // used in event closures
        var scope = this;

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

        // tree properties components
        this.treeNodesChk = document.getElementById("display-nodes-chk");
        this.recenterBtn = document.getElementById("center-tree-btn");
        this.focusOnNodeChk = document.getElementById("focus-on-node-chk");
        this.absentTipChk = document.getElementById("absent-tip-chk");

        this.focusOnNodeChk.onclick = function () {
            empress.focusOnSelectedNode = this.checked;
        };
        this.absentTipChk.onclick = function () {
            empress.ignoreAbsentTips = this.checked;

            // only update the tree if sample selection is enabled
            if (scope.sChk.checked) {
                scope.sUpdateBtn.click();
            }
        };

        // sample GUI components
        this.sChk = document.getElementById("sample-chk");
        this.sSel = document.getElementById("sample-options");
        this.sAddOpts = document.getElementById("sample-add");
        this.sColor = document.getElementById("sample-color");
        this.sCollapseCladesChk = document.getElementById(
            "sample-collapse-chk"
        );
        this.sLineWidth = document.getElementById("sample-line-width");
        this.sUpdateBtn = document.getElementById("sample-update");

        // feature metadata GUI components
        this.fChk = document.getElementById("feature-chk");
        this.fSel = document.getElementById("feature-options");
        this.fAddOpts = document.getElementById("feature-add");
        this.fColor = document.getElementById("feature-color");
        this.fCollapseCladesChk = document.getElementById(
            "feature-collapse-chk"
        );
        this.fLineWidth = document.getElementById("feature-line-width");
        this.fUpdateBtn = document.getElementById("feature-update");
        this.fMethodChk = document.getElementById("fm-method-chk");
        this.fMethodDesc = document.getElementById("fm-method-desc");

        // layout GUI components
        this.layoutDiv = document.getElementById("layout-div");

        // global clade collapse GUI
        this.normalCladeMethod = document.getElementById("normal");
        this.symmetricCladeMethod = document.getElementById("symmetric");

        // export GUI components
        this.eExportSvgBtn = document.getElementById("export-btn-svg");

        // hides the side menu
        var collapse = document.getElementById(this.COLLAPSE_ID);
        collapse.onclick = function () {
            document
                .getElementById(scope.SIDE_PANEL_ID)
                .classList.add("hidden");
            document.getElementById(scope.SHOW_ID).classList.remove("hidden");
        };

        // // shows the side menu
        var show = document.getElementById(this.SHOW_ID);
        show.onclick = function () {
            document.getElementById(scope.SHOW_ID).classList.add("hidden");
            document
                .getElementById(scope.SIDE_PANEL_ID)
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
        var scope = this;
        _.each(eleNameToProperties, function (properties, eleName) {
            _.each(properties, function (propVal, prop) {
                scope[eleName][prop] = propVal;
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

    /* Resets the sample metadata coloring tab. */
    SidePanel.prototype._resetSampleTab = function () {
        this._resetTab(
            {
                sChk: { checked: false },
                sSel: { disabled: true },
                sColor: { value: "discrete-coloring-qiime" },
                sLineWidth: { value: 0 },
                sCollapseCladesChk: { checked: false },
            },
            [this.sAddOpts, this.sUpdateBtn]
        );
    };

    /* Resets the feature metadata coloring tab. */
    SidePanel.prototype._resetFeatureTab = function () {
        this._resetTab(
            {
                fChk: { checked: false },
                fSel: { disabled: true },
                fColor: { value: "discrete-coloring-qiime" },
                fLineWidth: { value: 0 },
                fMethodChk: { checked: true },
                fCollapseCladesChk: { checked: false },
            },
            [this.fAddOpts, this.fUpdateBtn]
        );
        // Since we reset fMethodChk above to its "default" of being checked,
        // we also update fMethodDesc to be consistent. Note that updating
        // fMethodDesc here is technically unnecessary, since
        // updateFeatureMethodDesc() will be called anyway when expanding the
        // feature metadata coloring tab again. However, we do this here just
        // so the state of the page can remain consistent, even if the user
        // won't notice due to most of the feature tab (everything under
        // fAddOpts) being hidden.
        this.updateFeatureMethodDesc();
    };

    /**
     * Resets and then re-colors the tree, using an arbitrary "coloring
     * function" as well as a few other configurable things.
     *
     * This function was designed to encapsulate shared code between the sample
     * and feature metadata coloring settings. (There is definitely more work
     * to be done on removing shared code, but this is a start.)
     *
     * @param {String} colorMethodName The name of a method of SidePanel to
     *                                 call to re-color the tree: for example,
     *                                 "_colorSampleTree". (Passing the actual
     *                                 method as an argument seems to cause
     *                                 problems due to "this" not working
     *                                 properly. This was the easiest
     *                                 solution.)
     * @param {HTMLElement} lwInput An <input> with type="number" from which
     *                              we'll get the .value indicating the line
     *                              width to use when thickening lines.
     * @param {HTMLElement} updateBtn This element will be hidden at the end of
     *                                this function. It should correspond to
     *                                the "Update" button for the sample or
     *                                feature metadata coloring tab.
     */
    SidePanel.prototype._updateColoring = function (
        colorMethodName,
        collapseChk,
        lwInput,
        updateBtn
    ) {
        this.empress.resetTree();

        // clear legends
        this.legend.clearAllLegends();

        // hide update button
        updateBtn.classList.add("hidden");

        // color tree
        this[colorMethodName]();

        if (collapseChk.checked) {
            this.empress.collapseClades();
        }
        var lw = util.parseAndValidateNum(lwInput);
        this.empress.thickenColoredNodes(lw);
        this.empress.drawTree();
    };

    /**
     * Colors the tree based on the sample metadata coloring settings.
     */
    SidePanel.prototype._colorSampleTree = function () {
        var colBy = this.sSel.value;
        var col = this.sColor.value;
        var keyInfo = this.empress.colorBySampleCat(colBy, col);
        if (keyInfo === null) {
            util.toastMsg(
                "No unique branches found for this metadata category"
            );
            this.sUpdateBtn.classList.remove("hidden");
            return;
        }
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
        var scope = this;
        var LAYOUT_RADIO_BUTTON_NAME = "layoutoptions";
        // Get layout info from the Empress instance
        var layouts = this.empress.getAvailableLayouts();
        var default_layout = this.empress.getDefaultLayout();
        // Placeholder variables to be used when creating elements
        var pele, lele, iele;

        var radioBtnOnClickFunc = function () {
            scope.empress.updateLayout(this.value);
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
            iele.classList.add("empress-input");

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
     * Initializes export components
     */
    SidePanel.prototype.addExportTab = function () {
        // for use in closures
        var scope = this;

        this.eExportSvgBtn.onclick = function () {
            // create SVG tags to draw the tree and determine viewbox for whole figure
            [svg_tree, svg_viewbox] = scope.empress.exportSvg();
            // create SVG tags for legend, collected from the HTML document
            svg_legend = scope.empress.exportSVG_legend(document);
            // add all SVG elements into one string ...
            svg =
                '<svg xmlns="http://www.w3.org/2000/svg" ' +
                svg_viewbox +
                " >\n" +
                svg_tree +
                "\n" +
                svg_legend +
                "</svg>\n";
            // ... and present user as a downloadable file
            var blob = new Blob([svg], { type: "image/svg+xml" });
            saveAs(blob, "empress-tree.svg");
        };
    };

    /**
     * Initializes sample components
     */
    SidePanel.prototype.addSampleTab = function () {
        // for use in closures
        var scope = this;

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
            if (scope.sChk.checked) {
                scope._resetFeatureTab();
                scope.sSel.disabled = false;
                scope.sAddOpts.classList.remove("hidden");
                scope.sUpdateBtn.classList.remove("hidden");
            } else {
                scope._resetSampleTab();
            }
        };

        var showUpdateBtn = function () {
            scope.sUpdateBtn.classList.remove("hidden");
        };
        this.sSel.onchange = showUpdateBtn;
        this.sColor.onchange = showUpdateBtn;
        this.sLineWidth.onchange = showUpdateBtn;

        this.sUpdateBtn.onclick = function () {
            scope._updateColoring(
                "_colorSampleTree",
                scope.sCollapseCladesChk,
                scope.sLineWidth,
                scope.sUpdateBtn
            );
        };

        this.sCollapseCladesChk.onclick = function () {
            scope.sUpdateBtn.click();
        };
    };

    /**
     * Add the callback events for the global tree properties tab. The callback
     * events include things like centering the tree and showing tree nodes.
     *
     * Other things such as changing the defualt color of the tree will be
     * added.
     */
    SidePanel.prototype.addTreePropertiesTab = function () {
        var scope = this;
        this.treeNodesChk.onchange = function () {
            scope.empress.setTreeNodeVisibility(scope.treeNodesChk.checked);
        };
        this.recenterBtn.onclick = function () {
            scope.empress.centerLayoutAvgPoint();
        };
        var updateCladeCollapseMethod = function () {
            scope.empress.updateCollapseMethod(this.value);
        };
        this.normalCladeMethod.onclick = updateCladeCollapseMethod;
        this.symmetricCladeMethod.onclick = updateCladeCollapseMethod;
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
        var scope = this;

        var i, opt;
        // add feature metadata categories / "columns"
        var selOpts = this.empress.getFeatureMetadataCategories();
        for (i = 0; i < selOpts.length; i++) {
            opt = document.createElement("option");
            opt.innerHTML = selOpts[i];
            opt.value = selOpts[i];
            this.fSel.appendChild(opt);
        }

        // The color map selector
        Colorer.addColorsToSelect(this.fColor);

        // toggle the sample/color map selectors
        this.fChk.onclick = function () {
            if (scope.fChk.checked) {
                scope._resetSampleTab();
                scope.updateFeatureMethodDesc();
                scope.fSel.disabled = false;
                scope.fAddOpts.classList.remove("hidden");
                scope.fUpdateBtn.classList.remove("hidden");
            } else {
                scope._resetFeatureTab();
            }
        };

        var showUpdateBtn = function () {
            scope.fUpdateBtn.classList.remove("hidden");
        };
        this.fSel.onchange = showUpdateBtn;
        this.fColor.onchange = showUpdateBtn;
        this.fLineWidth.onchange = showUpdateBtn;
        this.fMethodChk.onchange = function () {
            scope.updateFeatureMethodDesc();
            showUpdateBtn();
        };

        this.fUpdateBtn.onclick = function () {
            scope._updateColoring(
                "_colorFeatureTree",
                scope.fCollapseCladesChk,
                scope.fLineWidth,
                scope.fUpdateBtn
            );
        };

        this.fCollapseCladesChk.onclick = function () {
            scope.fUpdateBtn.click();
        };
    };

    return SidePanel;
});
