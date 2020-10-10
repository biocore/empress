define(["underscore", "chroma"], function (_, chroma) {
    /**
     * Given a SVG string and min/max x/y positions, creates an exportable SVG.
     *
     * Mostly this just creates a viewBox attribute and wraps everything in an
     * <svg></svg>.
     *
     * This also adds on a shape-rendering="crispEdges" attribute to the SVG,
     * which gets rid of "white lines" between adjacent rectangles or polygons:
     * this was mostly a problem for circular layout collapsed clade wedges
     * and barplots. See https://stackoverflow.com/a/53309814/10730311 and
     * developer.mozilla.org/en-US/docs/Web/SVG/Attribute/shape-rendering
     * for details on why this is useful. (From some very cursory testing, it
     * looks like shape-rendering="optimizeSpeed" also gets rid of the white
     * lines, so if this ends up not scaling well that might be useful.)
     *
     * @param {String} svg An SVG string to wrap within a <svg></svg>.
     * @param {Object} bb Bounding box with minX, maxX, minY, maxY entries.
     *
     * @return {String} A "finished" SVG string that can be saved to a file.
     */
    function _finalizeSVG(svg, bb) {
        var width = bb.maxX - bb.minX;
        var height = bb.maxY - bb.minY;
        var viewBox =
            'viewBox="' +
            bb.minX +
            " " +
            bb.minY +
            " " +
            width +
            " " +
            height +
            '"';
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" ' +
            viewBox +
            ' shape-rendering="crispEdges">\n' +
            svg +
            "</svg>\n"
        );
    }

    /**
     * Given coords and a start position in it (the start of a series of 5
     * elements), return an RGB triplet representation of the color at
     * this position.
     *
     * @param {Array} coords
     * @param {Number} i
     * @return {String}
     */
    function _getRGB(coords, i) {
        return chroma.gl(coords[i + 2], coords[i + 3], coords[i + 4]).css();
    }

    /**
     * Attempts to update a bounding box based on a new (x, y) point.
     *
     * @param {Object} bb Contains minX, maxX, minY, maxY entries.
     * @param {Array} xCoords Arbitrarily large array of x coordinates to test
     *                        expanding the bounding box with.
     * @param {Array} yCoords Arbitrarily large array of y coordinates to test
     *                        expanding the bounding box with.
     *
     * @return {Object} Potentially-modified version of the input bounding box.
     */
    function _updateBoundingBox(bb, xCoords, yCoords) {
        return {
            minX: Math.min(bb.minX, ...xCoords),
            maxX: Math.max(bb.maxX, ...xCoords),
            minY: Math.min(bb.minY, ...yCoords),
            maxY: Math.max(bb.maxY, ...yCoords),
        };
    }

    /**
     * Adds polygon definitions to a SVG string.
     *
     * @param {String} svg
     * @param {Number} pointsPerPolygon The number of points to use for each
     *                                  polygon. Since most of the buffers used
     *                                  for EMPress are rendered in WebGL as
     *                                  triangles (i.e. every three points
     *                                  defines a triangle), this will probably
     *                                  be a multiple of 3 (if it's 3, then
     *                                  this will just draw each triangle like
     *                                  normal; if it's 6, then this will merge
     *                                  every two triangles in coords into a
     *                                  single polygon).
     * @param {Object} boundingBox Contains four entries: minX, maxX, minY,
     *                             maxY. These define the current bounding box
     *                             of the SVG. If any of the points in the
     *                             polygons to be drawn extend outside of this
     *                             box, the box will be updated -- in any case,
     *                             the "new" (potentially unchanged) bounding
     *                             box will be returned by this function.
     * @param {Array} coords Array of coordinates to represent as polygons.
     *                       This will probably be formatted like
     *                       [x, y, r, g, b, x, y, r, g, b, ...].
     * @param {Number} vertexSize The number of elements in coords for each
     *                            point. This defaults to 5, i.e. x,y,r,g,b.
     *                            It's configurable here just in case this is
     *                            changed in the future.
     *
     * @return {Object} Contains two entries:
     *                  -boundingBox: Object with minX, maxX, minY, and maxY
     *                   entries. The space covered by this bounding box should
     *                   be a superset of the input bounding box (if all of the
     *                   polygons to be drawn are within the input bounding
     *                   box, this should be equal to the input bounding box).
     *                  -svg: the input SVG string, with <polygon> definitions
     *                   added.
     * @throws {Error} If the total number of points in coords (coords.length
     *                 divided by vertexSize) is not evenly divisible by
     *                 pointsPerPolygon.
     */
    function _addPolygonsToSVG(
        svg,
        pointsPerPolygon,
        boundingBox,
        coords,
        vertexSize = 5
    ) {
        var totalNumPoints = coords.length / vertexSize;
        if (totalNumPoints % pointsPerPolygon !== 0) {
            throw new Error(
                "Number of points in coords, " +
                    totalNumPoints +
                    ", is not divisible by the points per polygon parameter of " +
                    pointsPerPolygon
            );
        }

        var newBoundingBox = boundingBox;
        for (
            var i = 0;
            i + pointsPerPolygon * vertexSize <= coords.length;
            i += pointsPerPolygon * vertexSize
        ) {
            var pointsString = "";
            for (var j = 0; j < pointsPerPolygon; j++) {
                // As of writing, coords is stored as
                // [x, y, r, g, b, x, y, r, g, b, ...] (i.e. vertexSize = 5).
                // We want to extract the (x, y) values from this array, so
                // we first get the 0th and 1th items (x, y), then the
                // 5th and and 6th items (x1, y1), and so on.
                var xPos = i + j * vertexSize;
                var x = coords[xPos];
                // We negate the y-coordinate so the exported image
                // matches Empress' interface.
                var y = -coords[xPos + 1];

                // Now that we've got x and y, update the bounding box if
                // needed and update the points attribute of the SVG <polygon>
                // we're about to add to the SVG.
                newBoundingBox = _updateBoundingBox(newBoundingBox, [x], [y]);
                pointsString += x + "," + y;
            }
            // We assume that each polygon has a single color, defined by the
            // first point in a group of points.
            var color = _getRGB(coords, i);

            // Add polygon to the SVG
            svg +=
                '<polygon points="' +
                pointsString +
                '" fill="' +
                color +
                '" stroke="' +
                color +
                '" />\n';
        }
        return { boundingBox: newBoundingBox, svg: svg };
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
        // bounding box; will be updated
        var bb = {
            minX: Number.POSITIVE_INFINITY,
            maxX: Number.NEGATIVE_INFINITY,
            minY: Number.POSITIVE_INFINITY,
            maxY: Number.NEGATIVE_INFINITY,
        };
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
            var color = _getRGB(coords, i);

            // Add the branch to the SVG
            var lineSVG =
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
                '" ';
            // Specify a stroke width only if it's greater than 1. The default
            // stroke width is 1, so there's no need to specify it (thus saving
            // us some space in the SVG).
            if (linewidth > 1) {
                lineSVG += 'style="stroke-width:' + linewidth + '" ';
            }
            svg += lineSVG + " />\n";

            // Update bounding box based on tree coordinates
            bb = _updateBoundingBox(bb, [x1, x2], [y1, y2]);
        }

        var currLayout = empress._currentLayout;

        // Draw collapsed clades.
        // Similarly to how we just hijack Empress.getCoords() to get the node
        // line coordinates to draw, we just use the collapsed clade buffer
        // (which defines the triangles to draw that define the clade shapes).
        // TODO add a func to empress that returns this
        var cladeCoords = empress._collapsedCladeBuffer;
        if (cladeCoords.length > 0) {
            svg += "<!-- collapsed clade shapes -->\n";
            var cladeResults;
            if (currLayout === "Rectangular") {
                // Draw triangles.
                cladeResults = _addPolygonsToSVG(svg, 3, bb, cladeCoords);
            } else if (currLayout === "Circular") {
                // Draw triangles for now, but TODO should be more accurate.
                // Will likely need to figure out the dimensions of this circle
                // in Empress (likely by saving data when
                // createCollapsedCladeShape() is called) and then create an
                // SVG path that actually draws this using Bezier curves/etc.
                cladeResults = _addPolygonsToSVG(svg, 3, bb, cladeCoords);
            } else if (empress._currentLayout === "Unrooted") {
                // Draw polygons comprised of two triangles.
                // Assumes that both triangles for a clade's shape are
                // specified one after another; if the order is messed up,
                // this'll look weird.
                cladeResults = _addPolygonsToSVG(svg, 6, bb, cladeCoords);
            }
            svg = cladeResults.svg;
            bb = cladeResults.boundingBox;
        }

        // Draw barplots.
        if (empress._barplotsDrawn) {
            svg += "<!-- barplots -->\n";
            var bpCoords = empress._barplotBuffer;
            var bpResults = _addPolygonsToSVG(svg, 6, bb, bpCoords);
            svg = bpResults.svg;
            bb = bpResults.boundingBox;
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
                    _getRGB(coords, i) +
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
            bb.minX -= radius;
            bb.minY -= radius;
            bb.maxX += radius;
            bb.maxY += radius;
        }
        return _finalizeSVG(svg, bb);
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
        return _finalizeSVG(svg, { minX: 0, minY: 0, maxX: maxX, maxY: maxY });
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
