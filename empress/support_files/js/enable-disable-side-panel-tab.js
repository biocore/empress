define(["EnableDisableTab"], function (EnableDisableTab) {
    /**
     * @class EnableDisableSidePanelTab
     *
     * Adds the the ability to enable and disable a side panel tab by
     * encapsulating a side-panel tab in an enabled/disabled container.
     * Two new containers will be created:
     * 		- an "enable container" that holds the original content of tab
     * 		- a "disable container" that will display a message describing why the
     *        tab has been disabled and how to re-enable it.
     *
     * @param{String} tabName The name of the tab
     * @param{object} tab The div container to encapsulate
     * @param{Boolean} isEmpirePlot true if we should show info about Empire
     *                              plot animations, false otherwise
     *
     * @returns{EnableDisableSidePanelTab}
     * @constructs EnableDisableSidePanelTab
     */
    function EnableDisableSidePanelTab(tabName, tab, isEmpirePlot) {
        // call EnableDisableTab constructor
        EnableDisableTab.call(this, tab);

        // add disable text message
        this.disableContainer.innerHTML =
            '<p class="side-panel-notes">' +
            'This tab is disabled while an "' +
            "animation is active. " +
            'To re-enable this tab, stop the animation."' +
            "</p>";

        // add instructions to disable animations from empress
        this.disableContainer.innerHTML +=
            '<p class="side-panel-notes">' +
            '<span style="font-weight: bold;">If this animation was started by Empress,</span> ' +
            "you can stop the animation by going to the " +
            '"Animation" ' +
            "tab and clicking on the " +
            '"Stop Animation"' +
            "button." +
            "</p>";

        if (isEmpirePlot) {
            // add instructions to disable animations from emperor
            this.disableContainer.innerHTML +=
                '<p class="side-panel-notes">' +
                '<span style="font-weight: bold;">If this animation was started ' +
                "by the Emperor interface of an Empire plot,</span> " +
                'you can stop the animation by clicking on the "Restart the ' +
                'animation" button located within the "Animations" tab of Emperor.' +
                "</p>";
        }
    }

    // inherit EnableDisableTab functions
    EnableDisableSidePanelTab.prototype = Object.create(
        EnableDisableTab.prototype
    );

    // set EnableDisableSidePanelTab's constructor
    EnableDisableSidePanelTab.prototype.constructor = EnableDisableSidePanelTab;

    return EnableDisableSidePanelTab;
});
