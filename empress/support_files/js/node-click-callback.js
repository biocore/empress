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

/*
 * Callbacks to synchronize animations with Emperor.
 *
 * Animations are synchronized by subscribing to callbacks when an Emperor
 * animation starts ("animation-started"), when a new frame is being rendered
 * ("animation-new-frame-started"), and when the animation is
 * cancelled/rewinded. When these animations are playing the legend in Empress
 * won't render any color values, because these will be visible in Emperor
 * already. Only the current timepoint will be visible for each frame.
 *
 * For each of these callbacks we retrieve information from Emperor regarding
 * how to setup the animation, and what frame we are currently in.
 *
 * Each of these callbacks receive a payload object that contains a type and
 * message attribute. The type attribute describes the name of the event
 * itself. The message attribute can contain the name of the gradient category,
 * trajectory category, Emperor's animation controller, and the frame that is
 * currently being displayed.
 *
 * For more information about Emperor callbacks visit:
 * http://biocore.github.io/emperor/build/html/js_integration.html#subscribing-to-events-from-a-3rd-party-application
 */
ec.controllers.animations.addEventListener("animation-started", function (
    payload
) {
    animator.setAnimationParameters(
        payload.message.trajectory,
        payload.message.gradient,
        payload.target._colors,
        animator.collapse,
        animator.lWidth
    );
    animator.initAnimation();
});

ec.controllers.animations.addEventListener(
    "animation-new-frame-started",
    function (payload) {
        animator.showAnimationFrameAtIndex(payload.message.frame);
    }
);

ec.controllers.animations.addEventListener("animation-cancelled", function (
    payload
) {
    animator.stopAnimation();
});
