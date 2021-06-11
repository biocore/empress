define(["EnableDisableTab"], function (EnableDisableTab) {
    /**
     * @class EnableDisableSidePanelTab
     *
     * Adds the the ability to enable and disable a side panel tab by
     * encapsulates a side-panel tab in an enabled/disabled container.
     * Two new containers will be created:
     * 		- an enable container that holds the original content of tab
     * 		- a disable container that will display a message describing why the
     *        tab has been disabled an how to re-enable it.
     *
     * @param{String} tabName The name of the tab
     * @param{object} tab The div container to encapsulate
     *
     * @returns{EnableDisableSidePanelTab}
     * @constructs EnableDisableSidePanelTab
     */
    function EnableDisableSidePanelTab(tabName, tab) {
        // call EnableDisableTab constructor
        EnableDisableTab.call(this, tab);

        // add disable text message
        this.disableContainer.innerHTML =
            '<p class="side-panel-notes">' +
            '<span style="font-weight: bold;">' +
            tabName +
            "</span> is disabled while an " +
            '<span style="font-style: italic;">animation is active</span>. ' +
            'To enable <span style="font-style: italic;">' +
            tabName +
            "</span>, stop the animation." +
            "</p>";

        // add instructions to disable animations from empress
        this.disableContainer.innerHTML +=
            '<p class="side-panel-notes">' +
            '<span style="font-weight: bold;">To stop</span> ' +
            "the animation go to the " +
            '<span style="font-style: italic;">Animation</span> ' +
            "tab and click on the " +
            '<span style="font-style: italic;">Stop Animation</span> ' +
            "button." +
            "</p>";

        // add instructions to disable animations from emperor
        this.disableContainer.innerHTML +=
            '<p class="side-panel-notes">' +
            '<span style="font-weight: bold;">Note</span> ' +
            "if the animation was triggered using the " +
            '<span style="font-style: italic;">Emperor</span> ' +
            "interface of an Empire plot, it can be stop by clicking " +
            'on the <span style="font-style: italic;">Restart the ' +
            "animation</span> button located within the " +
            '<span style="font-style: italic;">Animations</span> ' +
            "tab of Emperor." +
            "</p>";
    }

    // inherit EnableDisableTab functions
    EnableDisableSidePanelTab.prototype = Object.create(
        EnableDisableTab.prototype
    );

    // set EnableDisableSidePanelTab's constructor
    EnableDisableSidePanelTab.prototype.constructor = EnableDisableSidePanelTab;

    return EnableDisableSidePanelTab;
});
