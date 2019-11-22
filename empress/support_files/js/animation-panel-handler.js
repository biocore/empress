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
        for (var i = 0; i < Colorer.__Colormaps.length; i++) {
            var map = Colorer.__Colormaps[i];
            var opt = document.createElement('option');
            opt.innerHTML = map.name;
            opt.value = map.id;

            if (map.type == 'Header') {
                opt.disabled = true;
            }
            this.colorSelect.appendChild(opt);
        }

        // gradient/trajectory categories
        var categories = this.animator.getSampleCategories();
         for (var i = 0; i < categories.length; i++) {
            var opt = document.createElement('option');
            opt.value = categories[i];
            opt.innerHTML = categories[i];
            this.gradient.appendChild(opt);
            this.trajectory.appendChild(opt);
        }

        this.playBtn.onclick = function() {
            ap.__showAnimation();
        }


        this.rewindBtn.onclick = function() {
            ap.__clearAnimation();
        }
    };

    AnimatePanel.prototype.__showAnimation = function() {
        this.timeFramePanel.classList.remove('hidden');

        var colBy = this.catSelect.value;
        var col = this.colorSelect.value;
        var hide = this.hideChk.checked;
        var lWidth = this.lWidth.value;
        var keyInfo = this.animator.colorCurFrame(colBy, col, hide, lWidth);
        this.legend.addColorKey(colBy, keyInfo, 'node', false);
    }

    AnimatePanel.prototype.__clearAnimation = function() {
        // clear animation class
        console.log('clear')
    }

    AnimatePanel.prototype.__prevTimeframe = function() {
        this.legend.clearAllLegends();
        this.animator.prevFrame();
        this.__showAnimation();
    }

    AnimatePanel.prototype.__nextTimeframe = function() {
        this.legend.clearAllLegends();
        this.animator.nextFrame();
        this.__showAnimation();
    }

     return AnimatePanel;
});