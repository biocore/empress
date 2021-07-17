define(["EnableDisableTab"], function (EnableDisableTab) {
    /**
     * @class EnableDisableAnimationTab
     *
     * Adds the the ability to enable and disable the Animation tab by
     * encapsulating it in an enabled/disabled container.
     * Two new containers will be created:
     *  - an "enable container" that holds the original content of the tab
     *  - a "disable container" that will display a message describing why
     *    the tab has been disabled and how to re-enable it
     *
     * @param{object} tab The div container to encapsulate
     *
     * @returns{EnableDisableAnimationTab}
     * @constructs EnableDisableAnimationTab
     */
    function EnableDisableAnimationTab(tab) {
        // call EnableDisableTab constructor
        EnableDisableTab.call(this, tab);

        // add disable text message
        this.disableContainer.innerHTML =
            '<p class="side-panel-notes">' +
            "This tab has been disabled while an animation is active within " +
            "the Emperor interface." +
            "</p>";

        // add instructions to re-enable the tab
        this.disableContainer.innerHTML +=
            '<p class="side-panel-notes">' +
            "To re-enable this tab, " +
            'please click on the "Reset the animation" button located within ' +
            'the "Animations" tab of Emperor.' +
            "</p>";
    }

    // inherit EnableDisableTab functions
    EnableDisableAnimationTab.prototype = Object.create(
        EnableDisableTab.prototype
    );

    // set EnableDisableAnimationTab's constructor
    EnableDisableAnimationTab.prototype.constructor = EnableDisableAnimationTab;

    return EnableDisableAnimationTab;
});
