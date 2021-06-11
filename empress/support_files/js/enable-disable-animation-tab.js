define(["EnableDisableTab"], function (EnableDisableTab) {
	/**
	 * @class EnableDisableAnimationTab
	 * 
	 * Adds the the ability to enable and disable the Animation tab by 
	 * encapsulating it in an enabled/disabled container.
	 * Two new containers will be created:
	 * 		- an enable container that holds the original content of tab
	 * 		- a disable container that will display a message describing why the
	 *        tab has been disabled an how to re-enable it.
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
      			'<span style="font-weight: bold;">This tab</span> ' +
      			'has been disabled while the animation is active from within ' +
      			'the Emperor interface.' +  
		    '</p>'

		// add instructions to re-enable the tab
		this.disableContainer.innerHTML +=
    		'<p class="side-panel-notes">' +
      			'<span style="font-weight: bold;">To re-enable</span> ' +
      			'this tab please click on the ' +
      			'<span style="font-style: italic;">Reset the animation</span>' +
      			' button located within the ' +
      			'<span style="font-style: italic;">Animations</span> ' +
      			'tab of Emperor.' +
		    '</p>'
	}

	// inherit EnableDisableTab functions
	EnableDisableAnimationTab.prototype = Object.create(
			EnableDisableTab.prototype
	);

	// set EnableDisableAnimationTab's constructor
	EnableDisableAnimationTab.prototype.constructor =
		EnableDisableAnimationTab;

	return EnableDisableAnimationTab;
});