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
    legend.clear();
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
