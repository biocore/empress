empress.setOnNodeMenuVisibleCallback(function (samples) {
    // reset emissive settings for all markers
    ec.decViews.scatter.setEmissive(0x000000);

    // retrieve the plotting objects
    samples = ec.decModels.models.scatter.getPlottableByIDs(samples);
    ec.decViews.scatter.setEmissive(0x8c8c8f, samples);
    ec.sceneViews[0].needsUpdate = true;
});

empress.setOnNodeMenuHiddenCallback(function (samples) {
    samples = ec.decModels.models.scatter.getPlottableByIDs(samples);
    ec.decViews.scatter.setEmissive(0x000000, samples);
    ec.sceneViews[0].needsUpdate = true;
});

ec.sceneViews[0].on("click", function (name, object) {
    // this click callback should only handle arrow objects being clicked
    if (object.parent.type !== "ArrowHelper") {
        return;
    }

    empress.showNodeMenuForName(name);
});

// synchronize animations in Empress
ec.controllers.animations.addEventListener('animation-started',
function(payload) {
    animator.setAnimationParameters(payload.message.trajectory,
                                    payload.message.gradient,
                                    'discrete-coloring-qiime', animator.hide,
                                    animator.lWidth);
    animator.setupAnimation();
});

ec.controllers.animations.addEventListener('animation-new-frame-started',
function(payload) {
    animator.showAnimationFrameAtIndex(payload.message.frame);
});

ec.controllers.animations.addEventListener('animation-cancelled',
function(payload) {
    animator.stopAnimation();
});
