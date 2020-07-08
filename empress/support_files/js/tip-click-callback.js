empress.setOnNodeMenuVisibleCallback(function(samples) {
    // retrieve the plotting objects
    samples = ec.decModels.models.scatter.getPlottableByIDs(samples);
    ec.decViews.scatter.setEmissive(0x8c8c8f, samples);
    ec.sceneViews[0].needsUpdate = true;
});

empress.setOnNodeMenuHiddenCallback(function(samples) {
    samples = ec.decModels.models.scatter.getPlottableByIDs(samples);

    ec.decViews.scatter.setEmissive(0x000000, samples);
    ec.sceneViews[0].needsUpdate = true;
});
