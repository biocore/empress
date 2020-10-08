/*
 * This file is intended to be used only with Emperor. For more information
 * about these and other events see this document:
 * https://github.com/biocore/emperor/blob/master/doc/source/js_integration.rst
 */

empress.setOnNodeMenuVisibleCallback(function (samples) {
    // reset scale settings for all samples
    ec.decViews.scatter.setScale(1);

    // retrieve the plotting objects
    samples = ec.decModels.models.scatter.getPlottableByIDs(samples);
    if (ec.UIState["view.usesPointCloud"]) {
        ec.decViews.scatter.setScale(10, samples);
    } else {
        ec.decViews.scatter.setScale(2, samples);
    }
    ec.sceneViews[0].needsUpdate = true;
});

empress.setOnNodeMenuHiddenCallback(function (samples) {
    samples = ec.decModels.models.scatter.getPlottableByIDs(samples);
    ec.decViews.scatter.setScale(1, samples);
    ec.sceneViews[0].needsUpdate = true;
});

// These animationPanel callbacks disable Emperor's UI controls when an Empress
// animation is started, and re-enables them once the animation is stopped.
animationPanel.setOnAnimationStarted(function () {
    ec.controllers.animations.setEnabled(false);

    ec.controllers.animations.$gradientSelect
        .prop("disabled", true)
        .trigger("chosen:updated");
    ec.controllers.animations.$trajectorySelect
        .prop("disabled", true)
        .trigger("chosen:updated");
});

animationPanel.setOnAnimationStopped(function () {
    // we can only re-enable all controls if these values are selected
    if (
        ec.controllers.animations.getGradientCategory() !== "" &&
        ec.controllers.animations.getTrajectoryCategory() !== ""
    ) {
        ec.controllers.animations.setEnabled(true);
    }

    ec.controllers.animations.$gradientSelect
        .prop("disabled", false)
        .trigger("chosen:updated");
    ec.controllers.animations.$trajectorySelect
        .prop("disabled", false)
        .trigger("chosen:updated");
});

plotView.on("click", function (name, object) {
    // this click callback should only handle arrow objects being clicked
    if (object.parent.type !== "ArrowHelper") {
        return;
    }

    empress.showNodeMenuForName(name);
});

plotView.on("select", function (samples, view) {
    // cancel any ongoing timers
    clearTimeout(empress.timer);

    // if there's any coloring setup remove it, and re-enable the update button
    sPanel.sUpdateBtn.classList.remove("hidden");
    sPanel.fUpdateBtn.classList.remove("hidden");
    empress.clearLegend();
    empress.resetTree();

    // fetch a mapping of colors to plottable objects
    var groups = view.groupByColor(samples);
    var namesOnly = {};

    // convert the array of plottable objects to just names
    for (var key in groups) {
        namesOnly[key] = groups[key].map(function (item) {
            return item.name;
        });
    }
    empress.colorSampleGroups(namesOnly);

    // 4 seconds before resetting
    empress.timer = setTimeout(function () {
        empress.resetTree();
        empress.drawTree();

        for (var key in groups) {
            view.setEmissive(0x000000, groups[key]);
        }

        plotView.needsUpdate = true;
    }, 4000);
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
    // reset and disable the animation controls once an Emperor-driven
    // animation starts
    animationPanel.startOptions();
    animationPanel.setEnabled(false);

    animator.setAnimationParameters(
        payload.message.trajectory,
        payload.message.gradient,
        payload.target.getColors(),
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
    // if the animation is cancelled enable the animation controls
    animationPanel.setEnabled(true);
    animator.stopAnimation();
});

ec.controllers.animations.addEventListener("animation-ended", function (
    payload
) {
    // if the animation ends enable the controls
    animationPanel.setEnabled(true);
    util.toastMsg("Animation Complete.");
});

ec.controllers.color.addEventListener("value-double-clicked", function (
    payload
) {
    // when dealing with a biplot ignore arrow-emitted events
    if (payload.target.decompositionName() !== "scatter") {
        return;
    }

    // cancel any ongoing timers
    clearTimeout(empress.timer);

    // reset emissive settings for all markers since an ongoing timer may have
    // been cancelled
    ec.decViews.scatter.setEmissive(0x000000);
    plotView.needsUpdate = true;

    // if there's any coloring setup remove it, and re-enable the update button
    sPanel.sUpdateBtn.classList.remove("hidden");
    sPanel.fUpdateBtn.classList.remove("hidden");
    empress.clearLegend();
    empress.resetTree();

    var names = _.map(payload.message.group, function (item) {
        return item.name;
    });
    var container = {};
    container[payload.message.attribute] = names;
    empress.colorSampleGroups(container);

    // 4 seconds before resetting
    empress.timer = setTimeout(function () {
        empress.resetTree();
        empress.drawTree();

        plotView.needsUpdate = true;
    }, 4000);
});
