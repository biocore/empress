/*
 *
 * This File is intended to be used only with Emperor
 *
 */

// if there's any coloring setup remove it, and re-enable the update button
sPanel.sUpdateBtn.classList.remove("hidden");
legend.clearAllLegends();
empress.resetTree();

var colorGroups = {},
    color;
for (var i = 0; i < samples.length; i++) {
    color = samples[i].material.color.getHexString();
    if (colorGroups[color] === undefined) {
        colorGroups[color] = [];
    }
    colorGroups[color].push(samples[i].name);
}
empress.colorSampleGroups(colorGroups);

// 3 seconds before resetting
setTimeout(function () {
    empress.resetTree();
    empress.drawTree();

    samples.forEach(function (sample) {
        sample.material.emissive.set(0x000000);
    });

    plotView.needsUpdate = true;
}, 4000);
