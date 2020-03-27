define(["Colorer"], function(Colorer) {
    /**
     * @class Animator
     *
     * The animation state machine. This class is responsible for creating the
     * times frames and updating the canvas to display them.
     *
     * @param{Object} empress The core class. Entry point for all metadata and
     *                        tree operations.
     * @param
     */
    function Animator(empress, biom, legend) {
        this.empress = empress;
        this.biom = biom;
        this.legend = legend;

        /**
         * @type {string}
         * The metadata category in biom that will be used to order
         * animation frames.
         * @private
         */
        this.gradient = null;

        /**
         * @type {string}
         * The metadata category in biom that will be used to group samples
         * in each animation frame.
         * @private
         */
        this.trajectory = null;

        /**
         * @type {object}
         * Maps each unique trajectory to a color.
         * @private
         */
        this.cm = null;

        /**
         *
         */
        this.legendCM = {};
        this.timeframes = null;
        this.totalFrames = null;
        this.curFrame = null;
        this.colorer = null;
        this.hide = null;
        this.lWidth = null;

        /**
         * @type {number}
         * The total time of the animation
         */
        this.TOTAL_TIME = 30000;

        /**
         * @type {number}
         * The time between each time frame
         */
        this.timePerFram = 0;

        this.framesRdy = null;
        this.queuedFrames = null;
        this.pause = true;
        this.animationID = null;
        this.INIT_DELAY = 500;
    }

    /**
     * Sets the parameters for the animation state machine.
     *
     * @param {object} params - stores the state machine parames.
     *                          if set is true then parameters get updated
     *                          if set is false then parameters are set to null
     *                          and other params are ignored
     *                 format {
     *                           set<boolean>: true/false,
     *                           traj<string>: trajectory category,
     *                           grad<string>: gradient category,
     *                           cm<string>: color map,
     *                           hide<boolean>: hide uncolored branches
     *                           lWidth<int>: line width of colored branches
     *                        }
     */
    Animator.prototype.setAnimationParameters = function(
        trajectory,
        gradient,
        cm,
        hide,
        lWidth
    ) {
        var animator = this;

        this.gradient = gradient;
        this.timeframes = this.biom.getUniqueSampleValues(gradient);
        this.totalFrames = Object.keys(this.timeframes).length;
        this.curFrame = 0;

        this.timePerFram = this.TOTAL_TIME / this.totalFrames;

        // Retrive list of unique categories to display during the animation.
        this.trajectory = trajectory;
        var trajectories = this.biom.getUniqueSampleValues(trajectory);

        // Assign a color to each unique category
        this.cm = {};
        this.legendCM = {};
        this.colorer = new Colorer(cm, 0, trajectories.length);
        trajectories.forEach(function(x, i) {
            animator.cm[x] = { color: animator.colorer.getColorRGB(i) };
            animator.legendCM[x] = { color: animator.colorer.getColorHex(i) };
        });

        // TODO: this should be handled by empress state machine
        this.hide = hide;
        this.lWidth = lWidth;
    };

    Animator.prototype.__resetParams = function() {
        this.gradient = null;
        this.trajectory = null;
        this.cm = null;
        this.legendCM = {};
        this.timeframes = null;
        this.totalFrames = null;
        this.curFrame = null;
        this.colorer = null;
        this.hide = null;
        this.lWidth = null;
        this.timePerFram = 0;
        this.framesRdy = null;
        this.queuedFrames = null;
        this.pause = true;
        this.animationID = null;
    };

    Animator.prototype.setLineWidth = function(lWidth) {
        this.lWidth = lWidth;
    };

    Animator.prototype.setHide = function(hide) {
        this.hide = hide;
    };

    Animator.prototype.collectFrames = async function() {
        // get observations for each time frame. This operation is async so
        // that the future timeframes can be calculated during the down time
        // between animation frames.
        console.log("start collect rames");
        for (var i = 0; i < this.totalFrames; i++) {
            this.queuedFrames[i] = this.retriveCurFrame(i);
            this.framesRdy[i] = true;
        }
        console.log("end collect frame");
    };

    Animator.prototype.drawFrame = function() {
        var frame = this.queuedFrames[this.curFrame];
        var name = frame.name;
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

    Animator.prototype.playAnimation = async function() {
        // used in closure
        var animator = this;

        // Animation loop
        this.animationID = setTimeout(function loop() {
            // continue looping animation until last frame or user pauses
            if (!animator.pause && animator.curFrame != animator.totalFrames) {
                if (animator.framesRdy[animator.curFrame]) {
                    animator.drawFrame();
                }
                setTimeout(loop, animator.timePerFram);
            }
        }, 0);
    };

    Animator.prototype.startAnimation = function() {
        this.curFrame = 0;
        this.pause = false;
        this.framesRdy = new Array(this.totalFrames).fill(false);
        this.queuedFrames = [];

        console.log("playAnimation");
        this.playAnimation();
        this.collectFrames();
    };

    Animator.prototype.pauseAnimation = function() {
        this.pause = true;
    };

    Animator.prototype.resumeAnimation = function() {
        this.pause = false;
        this.playAnimation();
    };

    Animator.prototype.resetAnimation = function() {
        this.curFrame = 0;
        this.pause = false;
        this.framesRdy = new Array(this.totalFrames).fill(false);
        this.queuedFrames = [];
    };

    Animator.prototype.stopAnimation = function() {
        this.__resetParams();
        this.legend.clearAllLegends();
        this.empress.resetTree();
        this.empress.drawTree();
    };

    Animator.prototype.retriveCurFrame = function(frame) {
        // The name (or value) of current timeframe
        var name = this.gradient + ": " + this.timeframes[frame];

        // get observations/samples seen in current timeframe
        var trajectories = this.biom.getGradientStep(
            this.gradient,
            this.timeframes[frame],
            this.trajectory
        );

        // reset tree
        var obs = trajectories.obs;
        var sIds = trajectories.sIds;
        // this.empress.resetTree();

        // convert observation IDs to _treeData keys
        var categories = Object.keys(obs);
        for (var i = 0; i < categories.length; i++) {
            category = categories[i];
            obs[category] = this.empress._namesToKeys(obs[category]);
        }
        obs = this.empress._projectObservations(obs);

        return { name: name, keyInfo: this.legendCM, obs: obs };
    };

    Animator.prototype.getSampleCategories = function() {
        return this.empress.getSampleCategories();
    };

    Animator.prototype.prevFrame = function() {
        // subtract two curFrame is the next frame.
        this.curFrame -= 2;
        this.curFrame = this.curFrame >= 0 ? this.curFrame : 0;
        this.drawFrame();
    };

    Animator.prototype.nextFrame = function() {
        // curFrame is the next frame to draw
        // make sure curFrame is not passed last frame
        if (this.curFrame >= this.totalFrames) {
            this.curFrame = this.totalFrames - 1;
        }
        this.drawFrame();
    };

    Animator.prototype.onFirstFrame = function() {
        // curFrame is always the next frame to draw so if curFrame is 1 then
        // the first frame was just drawn
        return this.curFrame == 1;
    };

    Animator.prototype.onLastFrame = function() {
        // curFrame is always the next frame to draw so if curFrame is
        // equal to totalFrames, the last frame was just drawn
        return this.curFrame == this.totalFrames;
    };

    return Animator;
});
