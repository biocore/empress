define(["underscore", "chroma"], function (_, chroma) {
    /**
     * Given a SVG string and min/max x/y positions, creates an exportable SVG.
     *
     * Mostly this just creates a viewBox attribute and wraps everything in an
     * <svg></svg>.
     *
     * @param {String} svg An SVG string to wrap within a <svg></svg>.
     * @param {Number} minX
     * @param {Number} minY
     * @param {Number} maxX
     * @param {Number} maxY
     *
     * @return {String} A "finished" SVG string that can be saved to a file.
     */
    function _finalizeSVG(svg, minX, minY, maxX, maxY) {
        var width = maxX - minX;
        var height = maxY - minY;
        var viewBox =
            'viewBox="' + minX + " " + minY + " " + width + " " + height + '"';
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" ' +
            viewBox +
            ">\n" +
            svg +
            "</svg>\n"
        );
    }

    /**
     * Creates an SVG string to export the current stuff on the canvas.
     *
     * NOTE that this currently does not include collapsed clades or barplots.
     * Support for this is planned!
     *
     * @param {Empress} empress
     * @param {Drawer} drawer
     *
     * @return {String}
     */
    function exportTreeSVG(empress, drawer) {
        /**
         * Given coords and a start position in it (the start of a series of 5
         * elements), return an RGB triplet representation of the color at
         * this position.
         *
         * @param {Array} coords
         * @param {Number} i
         * @return {String}
         */
        var getRGB = function (coords, i) {
            return chroma.gl(coords[i + 2], coords[i + 3], coords[i + 4]).css();
        };

        var minX = Number.POSITIVE_INFINITY;
        var maxX = Number.NEGATIVE_INFINITY;
        var minY = Number.POSITIVE_INFINITY;
        var maxY = Number.NEGATIVE_INFINITY;
        var svg = "<!-- tree branches -->\n";

        // create a line from x1,y1 to x2,y2 for every two consecutive
        // coordinates. 5 array elements encode one coordinate:
        // i=x, i+1=y, i+2=red, i+3=green, i+4=blue
        var coords = empress.getCoords();
        for (
            var i = 0;
            i + 2 * drawer.VERTEX_SIZE <= coords.length;
            i += 2 * drawer.VERTEX_SIZE
        ) {
            // "normal" lines have a default color,
            // all other lines have a user defined thickness
            // All lines are defined using the information from the child node.
            // So, if coords[i+2] == DEFAULT_COLOR then coords[i+2+5] will
            // also be equal to DEFAULT_COLOR. Thus, we can save checking three
            // array elements here.
            // TODO: instead, adjust line width based on a node's isColored
            // tree data attribute, in corner-case where dflt node color is
            // included in a color map.
            // (Also: I'm not confident that SVG stroke width and line width in
            // the Empress visualization are comparable, at least now?)
            var linewidth = 1 + empress._currentLineWidth;
            if (
                coords[i + 2] == empress.DEFAULT_COLOR[0] &&
                coords[i + 3] == empress.DEFAULT_COLOR[1] &&
                coords[i + 4] == empress.DEFAULT_COLOR[2]
            ) {
                linewidth = 1;
            }
            // NOTE: we negate the y coordinates in order to match the way the
            // tree is drawn. See #334 on GitHub for discussion.
            var x1 = coords[i];
            var y1 = -coords[i + 1];
            var x2 = coords[i + drawer.VERTEX_SIZE];
            var y2 = -coords[i + 1 + drawer.VERTEX_SIZE];
            var color = getRGB(coords, i);

            // Add the branch to the SVG
            svg +=
                '<line x1="' +
                x1 +
                '" y1="' +
                y1 +
                '" x2="' +
                x2 +
                '" y2="' +
                y2 +
                '" stroke="' +
                color +
                '" style="stroke-width:' +
                linewidth +
                '" />\n';

            // Update bounding box based on tree coordinates
            minX = Math.min(minX, x1, x2);
            maxX = Math.max(maxX, x1, x2);
            minY = Math.min(minY, y1, y2);
            maxY = Math.max(maxY, y1, y2);
        }

        // create a circle for each node
        if (drawer.showTreeNodes) {
            radius = drawer.NODE_CIRCLE_DIAMETER / 2;
            svg += "<!-- tree nodes -->\n";
            coords = empress.getNodeCoords();
            for (
                i = 0;
                i + drawer.VERTEX_SIZE <= coords.length;
                i += drawer.VERTEX_SIZE
            ) {
                svg +=
                    '<circle cx="' +
                    coords[i] +
                    '" cy="' +
                    -coords[i + 1] +
                    '" r="' +
                    radius +
                    '" style="fill:' +
                    getRGB(coords, i) +
                    '"/>\n';
            }
            // The edge of the bounding box should coincide with the "end" of a
            // node. So we expand each side of the bounding box by the node
            // radius to avoid cutting off nodes.
            // (That a node has to be present at each edge of the bounding box
            // isn't guaranteed, esp. when we will draw collapsed clades /
            // barplots. However, even if this isn't the case, it'll just make
            // the exported image very slightly larger -- not a huge deal. Best
            // to be safe.)
            minX -= radius;
            minY -= radius;
            maxX += radius;
            maxY += radius;
        }
        return _finalizeSVG(svg, minX, minY, maxX, maxY);
    }

    /**
     * Creates an SVG string to export legends.
     *
     * @param {Array} Array of Legend objects, which will be included in the
     *                exported SVG. These will be ordered in the same way that
     *                they are ordered in the Array (so the first legend will
     *                be at the top, the next legend will be placed below that,
     *                and so on).
     *
     * @return {String} svg SVG code representing all the specified legends.
     */
    function exportLegendSVG(legends) {
        // the SVG string to be generated
        var svg = "";

        // All distances are based on this variable. The scale of the resulting
        // SVG can therefore be altered by changing this value.
        var unit = 30;

        // distance between two text lines as a multiplication factor of UNIT
        var lineHeightScaleFactor = 1.8;

        var lineHeight = unit * lineHeightScaleFactor;

        // Count the number of used rows
        var row = 1;

        // Also keep track of the maximum-width legend SVG, so that (when
        // merging this SVG with the tree SVG) we can resize the viewbox
        // accordingly
        var maxX = 0;
        var maxY = 0;

        _.each(legends, function (legend, legendIndex) {
            if (legendIndex > 0) {
                // Add space between adjacent legends
                row++;
                maxY += lineHeight;
            }
            var legendSVGData = legend.exportSVG(row, unit, lineHeight);
            svg += legendSVGData.svg;
            row = legendSVGData.rowsUsed;
            // Based on the width of this legend's bounding box, try to update
            // maxX. (Different legends may have different widths, so this
            // isn't always going to be updated; however, we just place legends
            // below each other, so maxY will always get updated.)
            maxX = Math.max(maxX, legendSVGData.width);
            maxY += legendSVGData.height;
        });

        // Slice off extra vertical space below the bottom legend. The height
        // of this space seems to always be equal to exactly
        // (# legends - 1) * unit. I think this may come from topY (in
        // Legend.exportSVG()) starting at row - 1, but I haven't been able to
        // get things exactly right yet. It would be good to adjust things so
        // that this ugly step isn't required.
        maxY -= (legends.length - 1) * unit;

        // minX and minY are always going to be 0. (In the tree export, the
        // root node is (0, 0) so there are usually negative coordinates; here,
        // we have the luxury of being able to keep everything positive.)
        return _finalizeSVG(svg, 0, 0, maxX, maxY);
    }

    /**
     * Exports a PNG image of the canvas.
     *
     * This uses the canvas toBlob() method, which requires that the caller
     * provide a callback function (to which the output blob will be passed).
     * We could use async/await stuff to halt within this function until
     * toBlob() produces the PNG, and then return that to the caller of this
     * function, but for the sake of simplicity we just have the caller specify
     * a callback to this function. Phew!
     *
     * NOTE: Currently, this will be limited to how the tree is currently drawn
     * -- so if the user is zoomed in really far, then the exported PNG will
     * just show things at the current zoom level. Ideally, we'll want to add
     * an option to get around this. (Calling this.centerLayoutAvgPoint()) in
     * lieu of this.drawTree() works, but the user will see the canvas shift;
     * not sure if there's a way to do this without disrupting the UI.)
     *
     * @param {Empress} empress
     * @param {Canvas} canvas
     * @param {Function} callback
     */
    function exportTreePNG(empress, canvas, callback) {
        // Draw the tree immediately before calling toBlob(), to ensure that
        // the buffer hasn't been cleared. This is analogous to "solution 1"
        // for taking screenshots of a canvas in this tutorial:
        // https://webglfundamentals.org/webgl/lessons/webgl-tips.html.
        empress.drawTree();
        canvas.toBlob(callback);
    }

    return {
        exportTreeSVG: exportTreeSVG,
        exportTreePNG: exportTreePNG,
        exportLegendSVG: exportLegendSVG,
    };
});
