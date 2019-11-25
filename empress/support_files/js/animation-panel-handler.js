define(['Colorer'], function(Colorer) {
    /**
     *
     * @class AnimationPanel
     *
     * Creates table for the animation panel and handles their events events.
     */
    // function AnimatePanel(animator, timeframe) {
    function AnimatePanel(animator, legend) {
        // used to event triggers
        this.animator = animator;
        this.legend = legend;

        // animation GUI components
        this.colorSelect = document.getElementById('animate-color-select');
        this.gradient = document.getElementById('animate-gradient');
        this.trajectory = document.getElementById('animate-trajectory');
        this.hideChk = document.getElementById('animate-hide-non-feature');
        this.lWidth = document.getElementById('animate-line-width');
        this.rewindBtn = document.getElementById('animate-rewind-btn');
        this.playBtn = document.getElementById('animate-play-btn');
        this.pauseBtn = document.getElementById('animate-pause-btn');
    };

    /**
     * Initializes sample components
     */
    AnimatePanel.prototype.addAnimationTab = function() {
        // for use in closers
        var ap = this;

        // The color map selector
        Colorer.addColorsToSelect(this.colorSelect);

        // gradient/trajectory categories
        var categories = this.animator.getSampleCategories();
         for (var i = 0; i < categories.length; i++) {
            var opt = document.createElement('option');
            opt.value = categories[i];
            opt.innerHTML = categories[i];
            this.gradient.appendChild(opt);
        }
        var options = this.gradient.innerHTML;
        this.trajectory.innerHTML = options;

        this.playBtn.onclick = function() {
            // ap.__showAnimation();
            var gradient = ap.gradient.value;
            var trajectory = ap.trajectory.value;
            var cm = ap.colorSelect.value;
            var hide = ap.hideChk;
            var lWidth = ap.lWidth.value;
            ap.animator.setAnimationParameters(trajectory, gradient, cm, hide,
                                               lWidth);
            ap.__showAnimation()
        }


        this.rewindBtn.onclick = function() {
            // ap.__clearAnimation();
            ap.__nextTimeframe();
        }
    };

    // TODO: make this play automatically
    AnimatePanel.prototype.__showAnimation = function() {
        console.log("Play animations!")

        // var colBy = this.catSelect.value;
        // var col = this.colorSelect.value;
        // var hide = this.hideChk.checked;
        // var lWidth = this.lWidth.value;

        // startAnimation() *************************
        // Folowing code is temp while creating animations
        this.legend.clearAllLegends();
        var result = this.animator.showCurFrame();
        this.legend.addColorKey(result.name, result.keyInfo, "node", false);
        // ******************************************

        // var keyInfo = this.animator.colorCurFrame(colBy, col, hide, lWidth);
        // this.legend.addColorKey(colBy, keyInfo, 'node', false);
    }

    AnimatePanel.prototype.__clearAnimation = function() {
        // clear animation class
    }

    AnimatePanel.prototype.__prevTimeframe = function() {
        // this.legend.clearAllLegends();
        // this.animator.prevFrame();
        // this.__showAnimation();
    }

    AnimatePanel.prototype.__nextTimeframe = function() {
        // this.legend.clearAllLegends();
        // this.animator.nextFrame();
        // this.__showAnimation();
        this.__showAnimation();
    }

     return AnimatePanel;
});