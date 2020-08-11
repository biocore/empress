define(["Colorer", "util"], function (Colorer, util) {
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
        this.collapseChk = document.getElementById("animate-collapse-chk");
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
    AnimationPanel.prototype._toggleSelects = function (disableStatus) {
        this.colorSelect.disabled = disableStatus;
        this.gradient.disabled = disableStatus;
        this.trajectory.disabled = disableStatus;
    };

    /**
     * Initializes GUI components/set up callback events
     */
    AnimationPanel.prototype.addAnimationTab = function () {
        // used in closures
        var scope = this;

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
         * Event: triggers when user changes value of collapse check box
         * Sets collapse parameter in the animation state machine
         */
        this.collapseChk.onclick = function () {
            scope.animator.setCollapse(this.checked);
            scope.animator.drawFrame();
        };

        /**
         * Event: triggers when user changes value of line width.
         * Sets line width parameter in animation state machine.
         */
        this.lWidth.onchange = function () {
            var lw = util.parseAndValidateNum(scope.lWidth);
            // pass line width to state machine
            scope.animator.setLineWidth(lw);
            scope.animator.drawFrame();
        };

        /**
         * Event: triggers when user clicks on the start button.
         * Starts the animation.
         *
         * @return {null}
         */
        this.startBtn.onclick = function () {
            // change GUI components
            scope._toggleSelects(true);
            scope.__pauseOptions();

            // collect starting conditions for the animation
            var gradient = scope.gradient.value;
            var trajectory = scope.trajectory.value;
            var cm = scope.colorSelect.value;
            var collapse = scope.collapseChk.checked;
            var lWidth = scope.lWidth.value;

            // pass parameters to state machine
            scope.animator.setAnimationParameters(
                trajectory,
                gradient,
                cm,
                collapse,
                lWidth
            );

            // start animation
            scope.animator.startAnimation();
        };

        /**
         * Event: triggers when user clicks on pause button.
         * Pauses the animation.
         */
        this.pauseBtn.onclick = function () {
            scope.__resumeOptions();
            scope.animator.pauseAnimation();
        };

        /**
         * Event: triggers when user clicks on resume button.
         * Resumes the animation.
         */
        this.resumeBtn.onclick = function () {
            scope.__pauseOptions();
            scope.animator.resumeAnimation();
        };

        /**
         * Event: triggers when user clicks on stop button.
         * Stops the animation and clears the state machine
         */
        this.stopBtn.onclick = function () {
            scope._toggleSelects(false);
            scope.__startOptions();
            scope.animator.stopAnimation();
        };

        /**
         * Event: triggers when user clicks on previous button.
         * Shows the previous frame in the animation
         */
        this.prevFrameBtn.onclick = function () {
            scope.animator.prevFrame();
            scope.__resumeOptions();
        };

        /**
         * Event: triggers when user clicks on next button.
         * Shows the next frame in the animation.
         */
        this.nextFrameBtn.onclick = function () {
            scope.animator.nextFrame();
            scope.__resumeOptions();
        };
    };

    return AnimationPanel;
});
