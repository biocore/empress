// this code is executed when a tip is clicked
empress.setOnNodeClickCallback(function(samples) {
    // retrieve the plotting objects
    samples = ec.decModels.models.scatter.getPlottableByIDs(samples);
    ec.decViews.scatter.setEmissive(0x8c8c8f, samples);
    ec.sceneViews[0].needsUpdate = true;

    // 4 seconds before resetting
    setTimeout(function () {
        ec.decViews.scatter.setEmissive(0x000000, samples);

        ec.sceneViews[0].needsUpdate = true;
    }, 4000);
});
