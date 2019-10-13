define(['Colorer'], function(Colorer) {
    /**
     *
     * @class AnimationPanel
     *
     * Creates table for the animation panel and handles their events events.
     */
    // function AnimatePanel(animator, timeframe) {
    function AnimatePanel(timeframePanel, animator, legend) {
        // used to event triggers
        this.timeframePanel = timeframePanel;
        this.animator = animator;
        this.legend = legend;

        // animation GUI components
        this.uploadBtn = document.getElementById('animate-upload-btn');
        this.animateAdd = document.getElementById('animate-add');
        this.colorSelect = document.getElementById('animate-color-select');
        this.catSelect = document.getElementById('animate-options');
        this.hideChk = document.getElementById('animate-hide-non-feature');
        this.lWidth = document.getElementById('animate-line-width');
        this.showAnimationBtn = document.getElementById('animate-show-btn');
        this.tableBtn = document.getElementById('animate-table-btn');
        this.clearBtn = document.getElementById('animate-clear-btn');
        this.timeFramePanel = document.getElementById('timeframe-panel');
        this.currentTimeframe = document.getElementById('current-timeframe');
        this.prevBtn = document.getElementById('animate-backward-btn');
        this.nextBtn = document.getElementById('animate-forward-btn');
    };

    /**
     * Initializes sample components
     */
    AnimatePanel.prototype.addAnimationTab = function() {
        this.currentTimeframe.innerHTML = "Day 1"
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

        // sample categories
        var selOpts = this.animator.getSampleCats();
         for (var i = 0; i < selOpts.length; i++) {
            var opt = document.createElement('option');
            opt.value = selOpts[i];
            opt.innerHTML = selOpts[i];
            this.catSelect.appendChild(opt);
        }

        this.uploadBtn.onchange = function(e) {
            ap.animateAdd.classList.remove('hidden');

            var reader = new FileReader();

            reader.onload = function(e) {
                ap.__readAnimationFile(e.target.result);
            }
            reader.readAsText(e.target.files[0]);
        }
        this.showAnimationBtn.onclick = function() {
            ap.__showAnimation();
        }

        this.tableBtn.onclick = function() {
            ap.__showTable();
        }

        this.clearBtn.onclick = function() {
            ap.__clearAnimation();
        }

        this.prevBtn.onclick = function() {
            ap.__prevTimeframe();
        }

        this.nextBtn.onclick = function() {
            ap.__nextTimeframe();
        }
    };

    AnimatePanel.prototype.__readAnimationFile = function(data) {
        var timeframes = data.split('\n');
        for(var i = 0; i < timeframes.length; i++) {
            timeframes[i] = timeframes[i].split(',');
        }
        this.animator.loadTimeframes(timeframes);
        console.log(this.animator);
    }

    AnimatePanel.prototype.__showAnimation = function() {
        this.timeFramePanel.classList.remove('hidden');
        this.currentTimeframe.innerHTML = this.animator.curFrameName();

        var colBy = this.catSelect.value;
        var col = this.colorSelect.value;
        var hide = this.hideChk.checked;
        var lWidth = this.lWidth.value;
        var keyInfo = this.animator.colorCurFrame(colBy, col, hide, lWidth);
        this.legend.addColorKey(colBy, keyInfo, 'node', false);
    }

    AnimatePanel.prototype.__showTable = function() {
        console.log("animation table");
    }

    AnimatePanel.prototype.__clearAnimation = function() {
        // clear animation class

        this.uploadBtn.value = null;
        this.animateAdd.classList.add('hidden');
        this.timeFramePanel.classList.add('hidden');
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