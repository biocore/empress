define(['Colorer'], function(Colorer) {

    /**
     * @class Animator
     */
    function Animator(empress, biom) {
        this.empress = empress;
        this.biom = biom;
        this.trajectory = null;
        this.gradient = null;
        this.cm = null
        this.legendCM = {};
        this.timeframes = null;
        this.curFrame = null;
        this.colorer = null;
        this.hide = null;
        this.lWidth = null;
    };

    Animator.prototype.setAnimationParameters = function(trajectory, gradient,
                                                         cm, hide, lWidth) {
        var animator = this;
        this.trajectory = trajectory;
        this.gradient = gradient;
        this.timeframes = this.biom.getUniqueSampleValues(trajectory);
        this.curFrame = 0;
        this.hide = hide;
        this.lWidth = lWidth;
        this.cm = {};
        this.legendCM = {};
        var gradients = this.biom.getUniqueSampleValues(gradient)
        this.colorer = new Colorer(cm, 0, gradients.length);
        gradients.forEach(function(x, i) {
            animator.cm[x] = { color: animator.colorer.getColorRGB(i) };
            animator.legendCM[x] = { color: animator.colorer.getColorHex(i) };
        });
    };

    Animator.prototype.showCurFrame = function(color, hide, lWidth) {
        var name = this.trajectory + ": " + this.timeframes[this.curFrame];
        var obs = this.biom.getTrajectoryObs(this.trajectory,
                                             this.timeframes[this.curFrame],
                                             this.gradient);
        this.empress.resetTree();

        // convert observation IDs to _treeData keys
        var categories = Object.keys(obs);
        for (var i = 0; i < categories.length; i++) {
            category = categories[i];
            obs[category] = this.empress._namesToKeys(obs[category]);
        }
        obs = this.empress._projectObservations(obs);

        this.empress._colorTree(obs, this.cm);
        if (this.lWidth !== 1) {
            this.empress.thickenSameSampleLines(this.lWidth - 1);
        }
        this.empress.setNonSampleBranchVisibility(this.hide);
        this.empress.drawTree();
        this._nextFrame();
        return {"name": name, "keyInfo":this.legendCM};
    };


    Animator.prototype._nextFrame = function() {
        if (this.curFrame < this.timeframes.length - 1) {
            this.curFrame++;
        }
    };

    Animator.prototype._colorCurFrame = function(cat, color, hide, lWidth) {
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
    };



    Animator.prototype.clearTimeframes = function() {
        this.timeframes = null;
        this.curFrame = -1;
    };


    Animator.prototype.getSampleCategories = function() {
        return this.empress.getSampleCategories();
    };


    Animator.prototype.prevFrame = function() {
        if (this.curFrame > 0) {
            this.curFrame--;
        }
    };

    Animator.prototype.curFrameName = function() {
        return this.timeframes[this.curFrame];
    };

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