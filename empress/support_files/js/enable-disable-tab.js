define([], function () {
    /**
     * @Abstract
     * @class EnableDisableTab
     *
     * This is an abstract class that encapsulates a div container in an
     * enabled/disabled container.
     * Two new containers will be created:
     *  - an "enable container" that holds the original content of the tab
     *  - a "disable container" that will display a message describing why
     *    the tab has been disabled and how to re-enable it
     *
     * @param{object} tab The div container to encapsulate
     *
     * @returns{EnableDisableTab}
     */
    function EnableDisableTab(tab) {
        this._tab = tab;

        // capture contents of tab;
        var content = this._tab.innerHTML;

        // clear contents of tab so that we can add the enable/disable
        // containers
        this._tab.innerHTML = "";

        // create enable container
        this.enableContainer = this._tab.appendChild(
            document.createElement("div")
        );
        this.enableContainer.innerHTML = content;
        // this.enableContainer.classList.add("hidden");

        // create Disable container
        this.disableContainer = this._tab.appendChild(
            document.createElement("div")
        );

        // add disable text message
        this.disableContainer.classList.add("hidden");

        if (this.constructor === EnableDisableTab) {
            throw new Error(
                "Abstract class EnableDisableTab cannot be instantiated."
            );
        }
    }

    /*
     * Shows the enabled container which contains the content of the original
     * tab. This method will also hide the disabled tab.
     */
    EnableDisableTab.prototype.enableTab = function () {
        this.enableContainer.classList.remove("hidden");
        this.disableContainer.classList.add("hidden");
    };

    /**
     * Shows the disabled container which will contain a message describing
     * why the tab has been disabled and how to re-enable it. This method will
     * also hide the enabled container.
     */
    EnableDisableTab.prototype.disableTab = function () {
        this.enableContainer.classList.add("hidden");
        this.disableContainer.classList.remove("hidden");
    };

    return EnableDisableTab;
});
