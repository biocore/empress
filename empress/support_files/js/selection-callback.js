/*
 *
 * This File is intended to be used only with Emperor
 *
 */

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
