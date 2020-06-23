define(["Colorer"], function (Colorer) {
    /**
     * @class Animator
     *
     * The animation state machine. This class is responsible for creating the
     * times frames and updating the canvas to display them.
     *
     * @param{Empress} empress The core class. Entry point for all metadata and
     *                tree operations.
     * @param{Legend} legend Display on the left side of screen. The legend will
     *                show the current time frame and the color assigned the
     *                trajectories.
     *
     * @returns{Animator}
     * @constructs Animator
     */
    function Animator(empress, legend) {
        /**
         * @type {Empress}
         * The Empress state machine
         */
        this.empress = empress;

        /**
         * @type {Legend}
         * Used to display current time frame and the color assigned the
         * trajectories.
         */
        this.legend = legend;

        /**
         * @type {Object}
         * Stores the legend info for each timeframe
         */
        this.legendInfo = {};

        /**
         * @type {String}
         * The metadata column that will be used to order animation frames.
         */
        this.gradientCol = null;

        /**
         * @type {String}
         * The metadata column that will be used to group samples in each frame
         * in each animation frame.
         */
        this.trajectoryCol = null;

        /**
         * @type {Object}
         * Maps each unique trajectory value to a color.
         */
        this.cm = null;

        /**
         * @type {Object}
         * Stores all the information associated with each timeframe.
         * This is fairly memory intensive. playAnimation() is set up calculate
         * the timeframes async during the animation. This data structure is
         * mainly used to make switching between timeframes when user
         * paused animation quicker.
         */
        this.gradientSteps = null;

        /**
         * @type {Number}
         * The total number of frames in the animations. This is mainly to make
         * code shorted. It might be better to just use timeframes.length.
         * Storing totalFrames in a seperate variable may lead to errors if they
         * become unsynced.
         */
        this.totalFrames = null;

        /**
         * @type {Number}
         * Stores the current timeframe that WILL BE DISPLAYED NEXT not the one
         * that is currently shown on screen.
         */
        this.curFrame = null;

        /**
         * @type {number}
         * The total duration of the animation in milliseconds.
         */
        this.TOTAL_TIME = 30000;

        /**
         * @type {number}
         * The time between each time frame
         */
        this.timePerFram = -1;

        /**
         * @type {Object}
         * If index i === true, then frame i is ready to be displayed
         */
        this.framesRdy = null;

        /**
         * @type {Object}
         * Stores the timeframes
         */
        this.queuedFrames = null;

        /**
         * @type {Boolean}
         * Flag for animation
         */
        this.pause = true;

        /**
         * @type {Boolean}
         * Hides uncolored branches if true.
         */
        this.hide = null;

        /**
         * @type {Number}
         * How thick to make branches
         */
        this.lWidth = null;
    }

    /**
     * Sets the parameters for the animation state machine.
     *
     * @param {String} trajectory Metadata column to use for trajectory
     * @param {String} gradient Metadata column to user for gradient
     * @param {String} cm The color map to use for the animation
     * @param {Boolean} hide Tells animator to hide uncolored branches
     * @param {Number} lWidth Tells animator how think to make colored tree
     *                 branches
     */
    Animator.prototype.setAnimationParameters = function (
        trajectory,
        gradient,
        cm,
        hide,
        lWidth
    ) {
        this.gradientCol = gradient;
        this.gradientSteps = this.empress.getUniqueSampleValues(gradient);
        this.totalFrames = Object.keys(this.gradientSteps).length;
        this.curFrame = 0;

        // each timeframe will be displayed for same amount of time
        this.timePerFram = this.TOTAL_TIME / this.totalFrames;

        // Retrive list of unique categories to display during the animation.
        this.trajectoryCol = trajectory;
        var trajectories = this.empress.getUniqueSampleValues(trajectory);
        // Assign a color to each unique category
        var colorer = new Colorer(cm, trajectories);
        this.cm = colorer.getMapRGB();
        this.legendInfo = colorer.getMapHex();

        this.hide = hide;
        this.lWidth = lWidth;
    };

    /**
     * Clears state parameters
     */
    Animator.prototype.__resetParams = function () {
        this.gradientCol = null;
        this.trajectoryCol = null;
        this.cm = null;
        this.legendInfo = {};
        this.gradientSteps = null;
        this.totalFrames = null;
        this.curFrame = null;
        this.hide = null;
        this.lWidth = null;
        this.timePerFram = -1;
        this.framesRdy = null;
        this.queuedFrames = null;
        this.pause = true;
    };

    /**
     * Set thickness of colored branches
     *
     * @param {Number} lWidth How thick to make branches
     */
    Animator.prototype.setLineWidth = function (lWidth) {
        this.lWidth = lWidth;
    };

    /**
     * Set the hide status of uncolored branches
     *
     * @param {Boolean} hide If true, then Animator will hide all uncolored
     *                  branches
     */
    Animator.prototype.setHide = function (hide) {
        this.hide = hide;
    };

    /**
     * Collects all the frames in the animation. This method is called while
     * the asynchronous animation loop is running and is respondible for setting
     * the timeframe ready flag to true once is has been collected.
     *
     * @private
     */
    Animator.prototype.__collectFrames = async function () {
        for (var i = 0; i < this.totalFrames; i++) {
            this.queuedFrames[i] = this.retriveFrame(i);
            this.framesRdy[i] = true;
        }
    };

    /**
     * Draws the current frame and updates the legend.
     */
    Animator.prototype.drawFrame = function () {
        var frame = this.queuedFrames[this.curFrame];
        var name = `${frame.name} (${this.curFrame + 1} / ${this.totalFrames})`;
        var keyInfo = frame.keyInfo;
        var obs = frame.obs;

        // draw new legend
        this.legend.clearAllLegends();
        this.legend.addColorKey(name, keyInfo, "node", false);

        //draw tree
        this.empress.resetTree();
        this.empress._colorTree(obs, this.cm);
        this.empress.thickenSameSampleLines(this.lWidth);

        // TODO: hide should be taken care of in empress state machine
        this.empress.setNonSampleBranchVisibility(this.hide);
        this.empress.drawTree();
        this.curFrame += 1;
    };

    /**
     * The asynchronous animation loop. This method will continously create
     * timeout events until animation is done or user pauses animation. If a
     * frame is reached before it is ready, then a new timeout event will be
     * created.
     */
    Animator.prototype.playAnimation = async function () {
        // used in closure
        var animator = this;

        // Animation loop
        setTimeout(function loop() {
            if (!animator.pause && animator.curFrame != animator.totalFrames) {
                if (animator.framesRdy[animator.curFrame]) {
                    animator.drawFrame();
                }
                setTimeout(loop, animator.timePerFram);
            }
        }, 0);
    };

    /**
     * This method is the entry point for the animation. This method will
     * start the animation loop and collect the timeframes.
     */
    Animator.prototype.startAnimation = function () {
        this.curFrame = 0;
        this.pause = false;
        this.framesRdy = new Array(this.totalFrames).fill(false);
        this.queuedFrames = [];

        // start animation loop
        // Note: This method is async and will create timeout events until
        // animation is complete or user pauses.
        this.playAnimation();

        // create timeframes while the animation loop runs
        this.__collectFrames();
    };

    /**
     * Sets the pause parameter of the state machine to true.
     */
    Animator.prototype.pauseAnimation = function () {
        this.pause = true;
    };

    /**
     * Sets the pause parameter of the state machine to false and resumes the
     * animation.
     */
    Animator.prototype.resumeAnimation = function () {
        this.pause = false;
        this.playAnimation();
    };

    /**
     * Stops the animation and clears state machine parameters
     */
    Animator.prototype.stopAnimation = function () {
        this.__resetParams();
        this.legend.clearAllLegends();
        this.empress.resetTree();
        this.empress.drawTree();
    };

    /**
     * Finds unique observations in the trajectory for a given timeframe. Note
     * each timeframe is defined by the gradient.
     *
     * @param{Number} frame The index in this.gradientSteps.
     *
     * @return {Object} The timeframe.
     */
    Animator.prototype.retriveFrame = function (frame) {
        // The name (or value) of current timeframe
        var name = this.gradientCol + ": " + this.gradientSteps[frame];

        // get observations in current timeframe
        var obs = this.empress.getGradientStep(
            this.gradientCol,
            this.gradientSteps[frame],
            this.trajectoryCol
        );

        var categories = Object.keys(obs);
        for (var i = 0; i < categories.length; i++) {
            category = categories[i];
            obs[category] = this.empress._namesToKeys(obs[category]);
        }
        obs = this.empress._projectObservations(obs);

        return { name: name, keyInfo: this.legendInfo, obs: obs };
    };

    /**
     * Retrives the sample metedata columns.
     */
    Animator.prototype.getSampleCategories = function () {
        return this.empress.getSampleCategories();
    };

    /**
     * Show the previous timeframe. This method is only called when animation
     * is paused and user presses the previous button.
     */
    Animator.prototype.prevFrame = function () {
        // subtract two curFrame is the next frame.
        this.curFrame -= 2;
        this.curFrame = this.curFrame >= 0 ? this.curFrame : 0;
        this.drawFrame();
    };

    /**
     * Show the next timeframe. This method is only called when animation is
     * paused and user presses the next button.
     */
    Animator.prototype.nextFrame = function () {
        // curFrame is the next frame to draw
        // make sure curFrame is not passed last frame
        if (this.curFrame >= this.totalFrames) {
            this.curFrame = this.totalFrames - 1;
        }
        this.drawFrame();
    };

    /**
     * Checks to see if state machine is on first frame
     *
     * @return {Boolean} true if animatior is on first frame
     */
    Animator.prototype.onFirstFrame = function () {
        // curFrame is always the next frame to draw so if curFrame is 1 then
        // the first frame was just drawn
        return this.curFrame == 1;
    };

    /**
     * Checks to see if state machine is on last frame
     *
     * @return {Boolean} true if animator is on last frame
     */
    Animator.prototype.onLastFrame = function () {
        // curFrame is always the next frame to draw so if curFrame is
        // equal to totalFrames, the last frame was just drawn
        return this.curFrame == this.totalFrames;
    };

    return Animator;
});
