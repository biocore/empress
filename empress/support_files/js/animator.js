define([], function() {

    /**
     * @class Animator
     */
    function Animator(empress, biom) {
        this.empress = empress;
        this.biom = biom;
        this.timeframes = null;
        this.curFrame = -1;
    };

    Animator.prototype.loadTimeframes = function(timeframes) {
        this.timeframes = timeframes;
        this.curFrame = 0;
    }

    Animator.prototype.clearTimeframes = function() {
        this.timeframes = null;
        this.curFrame = -1;
    }

    Animator.prototype.colorCurFrame = function(cat, color, hide, lWidth) {
        console.log(hide)
        this.empress.resetTree();
        var sIds = this.timeframes[this.curFrame];
        sIds = sIds.slice(1, sIds.length);
        var obs = this.biom.getObsBy(cat, sIds);
        var keyInfo = this.empress.colorSampleIDs(obs, color);
        this.empress.hideUnColoredTips(hide);
        if (lWidth > 1) {
            this.empress.thickenSameSampleLines(lWidth - 1);
        }
        this.empress.drawTree();
        return keyInfo;
    }

    Animator.prototype.getSampleCategories = function() {
        return this.empress.getSampleCategories();
    }

    Animator.prototype.nextFrame = function() {
        if (this.curFrame < this.timeframes.length - 1) {
            this.curFrame++;
        }
    }

    Animator.prototype.prevFrame = function() {
        if (this.curFrame > 0) {
            this.curFrame--;
        }
    }

    Animator.prototype.curFrameName = function() {
        return this.timeframes[this.curFrame][0];
    }

    // /**
    //  * timeSeries is an array of array where each entry is a list of samples
    //  */
    // Animator.prototype.animate = function(timeSeries) {
    //     var curTime = [];
    //     var nextTime = timeSeries[0];
    //     for (var i = 0; i < timeSeries.length; i++) {
    //     }
    // };
    return Animator;
});