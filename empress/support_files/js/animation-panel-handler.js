define(["Colorer"], function (Colorer) {
    /**
     *
     * @class AnimationPanel
     *
     * Creates tab for the animation panel and handles their events events.
     *
     * @param{Object} animator The object that creates the animations
     *
     * @return {AnimationPanel}
     * construct AnimationPanel
     */
    function AnimationPanel(animator) {
        // used in event triggers
        this.animator = animator;

        // animation GUI components
        this.colorSelect = document.getElementById("animate-color-select");
        this.gradient = document.getElementById("animate-gradient");
        this.trajectory = document.getElementById("animate-trajectory");
        this.hideChk = document.getElementById("animate-hide-non-feature");
        this.lWidth = document.getElementById("animate-line-width");
        this.startBtn = document.getElementById("animate-start-btn");
        this.stopBtn = document.getElementById("animate-stop-btn");
        this.pauseBtn = document.getElementById("animate-pause-btn");
        this.resumeBtn = document.getElementById("animate-resume-btn");
        this.prevFrameBtn = document.getElementById("animate-prev-btn");
        this.nextFrameBtn = document.getElementById("animate-next-btn");
    }

    /**
     * Makes the play button visible. This is the menu shown before user has
     * started the animation.
     *
     * @private
     */
    AnimationPanel.prototype.__startOptions = function () {
        // hide the following buttons
        this.stopBtn.classList.add("hidden");
        this.pauseBtn.classList.add("hidden");
        this.resumeBtn.classList.add("hidden");
        this.prevFrameBtn.classList.add("hidden");
        this.nextFrameBtn.classList.add("hidden");

        // show the following buttons
        this.startBtn.classList.remove("hidden");
    };

    /**
     * Makes the stop/pause buttons visible. This is the menu shown during the
     * animation.
     *
     * @private
     */
    AnimationPanel.prototype.__pauseOptions = function () {
        // hide the following buttons
        this.startBtn.classList.add("hidden");
        this.resumeBtn.classList.add("hidden");
        this.prevFrameBtn.classList.add("hidden");
        this.nextFrameBtn.classList.add("hidden");

        // show the following buttons
        this.stopBtn.classList.remove("hidden");
        this.pauseBtn.classList.remove("hidden");
    };

    /**
     * Makes the prev/next/stop/resume buttons visible. This is the menu shown
     * when user pauses the animation.
     *
     * @private
     */
    AnimationPanel.prototype.__resumeOptions = function () {
        // hide the following buttons
        this.pauseBtn.classList.add("hidden");
        this.startBtn.classList.add("hidden");

        // show the following buttons
        this.stopBtn.classList.remove("hidden");
        this.resumeBtn.classList.remove("hidden");
        this.prevFrameBtn.classList.remove("hidden");
        this.nextFrameBtn.classList.remove("hidden");

        // dont show previous button on frame 1
        this.prevFrameBtn.disabled = this.animator.onFirstFrame();

        // dont show next button on last frame
        this.nextFrameBtn.disabled = this.animator.onLastFrame();
    };

    /**
     * Enables/disable the drop down menus. When the animation is playing,
     * the drop down menus are disabled in order to prevent user from changing
     * the gradient/trajectory during an animation.
     *
     * @private
     */
    AnimationPanel.prototype.__toogleSelects = function (disableStatus) {
        this.colorSelect.disabled = disableStatus;
        this.gradient.disabled = disableStatus;
        this.trajectory.disabled = disableStatus;
    };

    /**
     * Initializes GUI components/set up callback events
     */
    AnimationPanel.prototype.addAnimationTab = function () {
        // used in closers
        var ap = this;

        // hide play/pause/next/previous/stop buttons
        this.__startOptions();

        // The color map selector
        Colorer.addColorsToSelect(this.colorSelect);

        // retrive gradient/trajectory categories
        var categories = this.animator.getSampleCategories();

        // add categories options to gradient drop down menu
        for (var i = 0; i < categories.length; i++) {
            var opt = document.createElement("option");
            opt.value = categories[i];
            opt.innerHTML = categories[i];
            this.gradient.appendChild(opt);
        }

        // copy options and add them to trajectory drop down menu
        var options = this.gradient.innerHTML;
        this.trajectory.innerHTML = options;

        /**
         * Event: triggers when user clicks on the hide branch checkbox.
         * Sets hide parameter in animation state machine.
         */
        this.hideChk.onchange = function () {
            ap.animator.setHide(ap.hideChk.checked);
        };

        /**
         * Event: triggers when user changes value of line width.
         * Sets line width parameter in animation state machine.
         */
        this.lWidth.onchange = function () {
            var val = ap.lWidth.value;

            // make sure line width is positve
            if (val < 1) {
                val = 1;
                ap.lWidth = val;
            }

            // pass line width to state machine
            ap.animator.setLineWidth(val);
        };

        /**
         * Event: triggers when user clicks on the start button.
         * Starts the animation.
         *
         * @return {null}
         */
        this.startBtn.onclick = function () {
            // change GUI components
            ap.__toogleSelects(true);
            ap.__pauseOptions();

            // collect starting conditions for the animation
            var gradient = ap.gradient.value;
            var trajectory = ap.trajectory.value;
            var cm = ap.colorSelect.value;
            var hide = ap.hideChk.checked;
            var lWidth = ap.lWidth.value;

            // pass parameters to state machine
            ap.animator.setAnimationParameters(
                trajectory,
                gradient,
                cm,
                hide,
                lWidth - 1
            );

            // start animation
            ap.animator.startAnimation();
        };

        /**
         * Event: triggers when user clicks on pause button.
         * Pauses the animation.
         */
        this.pauseBtn.onclick = function () {
            ap.__resumeOptions();
            ap.animator.pauseAnimation();
        };

        /**
         * Event: triggers when user clicks on resume button.
         * Resumes the animation.
         */
        this.resumeBtn.onclick = function () {
            ap.__pauseOptions();
            ap.animator.resumeAnimation();
        };

        /**
         * Event: triggers when user clicks on stop button.
         * Stops the animation and clears the state machine
         */
        this.stopBtn.onclick = function () {
            ap.__toogleSelects(false);
            ap.__startOptions();
            ap.animator.stopAnimation();
        };

        /**
         * Event: triggers when user clicks on previous button.
         * Shows the previous frame in the animation
         */
        this.prevFrameBtn.onclick = function () {
            ap.animator.prevFrame();
            ap.__resumeOptions();
        };

        /**
         * Event: triggers when user clicks on next button.
         * Shows the next frame in the animation.
         */
        this.nextFrameBtn.onclick = function () {
            ap.animator.nextFrame();
            ap.__resumeOptions();
        };
    };

    return AnimationPanel;
});
