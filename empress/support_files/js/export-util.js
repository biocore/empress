define(["underscore", "chroma", "Colorer"], function (_, chroma, Colorer) {
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
     * Given an array of arbitrary values, returns an RGB triplet
     * representation of the i-th value which should be a valid RGB float color
     * (see Colorer.rgbToFloat() for details on the RGB float storage method).
     *
     * @param {Array} values
     * @param {Number} i
     * @return {String}
     */
    function _getRGB(values, i) {
        var c = _.map(Colorer.unpackColor(values[i]), function (channel) {
            return channel / 255;
        });
        return chroma.gl(...c).css();
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
     * Expands a bounding box in all four directions by a given distance.
     *
     * Intended to be used when exporting images of trees where node circles
     * are drawn -- since a node circle will likely be the outermost point of
     * the exported image (assuming barplots and clade collapsing are not
     * done), we want to expand the bounding box slightly to ensure that this
     * entire circle is included in the image.
     *
     * @param {Object} bb Contains minX, maxX, minY, maxY entries.
     * @param {Number} dist Value to add to maxX and maxY and to subtract from
     *                      minX and minY.
     *
     * @return {Object} Modified bounding box.
     */
    function _expandBoundingBox(bb, dist) {
        return {
            minX: bb.minX - dist,
            maxX: bb.maxX + dist,
            minY: bb.minY - dist,
            maxY: bb.maxY + dist,
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
     *                       [x, y, RGB, x, y, RGB, ...].
     * @param {Number} vertexSize The number of elements in coords for each
     *                            point. This defaults to 3, i.e. x, y, RGB.
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
        vertexSize = 3
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
            var xCoords = [];
            var yCoords = [];
            for (var j = 0; j < pointsPerPolygon; j++) {
                if (j > 0) {
                    // Add spaces between adjacent points: so the points string
                    // is formatted as "x1,y1 x2,y2 x3,y3", etc.
                    pointsString += " ";
                }
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

                xCoords.push(x);
                yCoords.push(y);
                pointsString += x + "," + y;
            }
            newBoundingBox = _updateBoundingBox(
                newBoundingBox,
                xCoords,
                yCoords
            );
            // We assume that each polygon has a single color, defined by the
            // first point in a group of points.
            var color = _getRGB(coords, i + 2);

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
        // coordinates. Two buffers are used to encode one coordinate

        // position buffer:i=x, i+1=y
        // format: [x1, y1, x2, y2, ...]
        var coords = empress.getTreeCoords();
        // color buffer: i=rgb
        // format: [rgb1, rgb2, ...]
        var colors = empress.getTreeColor();
        var totalNodes = colors.length;
        var coordIndx;
        for (var node = 0; node + 2 <= totalNodes; node += 2) {
            coordIndx = node * 2;
            // NOTE: we negate the y coordinates in order to match the way the
            // tree is drawn. See #334 on GitHub for discussion.
            var x1 = coords[coordIndx];
            var y1 = -coords[coordIndx + 1];
            var x2 = coords[coordIndx + drawer.COORD_SIZE];
            var y2 = -coords[coordIndx + 1 + drawer.COORD_SIZE];
            var color = _getRGB(colors, node);

            // "normal" lines have a default color,
            // all other lines have a user defined thickness
            // All lines are defined using the information from the child node.
            // TODO: instead, adjust line width based on a node's isColored
            // tree data attribute, in corner-case where dflt node color is
            // included in a color map.
            // (Also: I'm not confident that SVG stroke width and line width in
            // the Empress visualization are comparable, at least now?)
            var linewidth = 1 + empress._currentLineWidth;
            if (colors[node] == empress.DEFAULT_COLOR) {
                linewidth = 1;
            }

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
            var bpCoords = empress.getBarplotData(empress.getBarplotLayers())
                .coords;
            var bpResults = _addPolygonsToSVG(svg, 6, bb, bpCoords);
            svg = bpResults.svg;
            bb = bpResults.boundingBox;
        }

        // create a circle for each node
        if (drawer.showTreeNodes) {
            var radius = drawer.NODE_CIRCLE_DIAMETER / 2;
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
                    _getRGB(coords, i + 2) +
                    '"/>\n';
            }
            // The edge of the bounding box might coincide with the "end" of a
            // node. So we expand each side of the bounding box by the node
            // radius to avoid cutting off nodes.
            // (That a node has to be present at each edge of the bounding box
            // isn't guaranteed, esp. when we draw collapsed clades /
            // barplots. However, even if this isn't the case, it'll just make
            // the exported image very slightly larger -- not a huge deal. Best
            // to be safe.)
            bb = _expandBoundingBox(bb, radius);
        }
        return _finalizeSVG(svg, bb);
    }

    /**
     * Creates an SVG string to export legends.
     *
     * This delegates most of the work to the individual Legend objects -- see
     * Legend.exportSVG() (and the other more specific exporting functions for
     * the different legend types) for details.
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
        // The SVG string to be generated
        var svg = "";

        // Keep track of the bounding box needed to hold all of the legends
        // exported. Legends are stacked vertically, so we only pass the maxY
        // to Legend.exportSVG(). However, we do need to keep track of the maxX
        // so that we know the width taken up by this SVG.
        var maxX = 0;
        var maxY = 0;

        _.each(legends, function (legend, legendIndex) {
            var legendSVGData = legend.exportSVG(maxY);
            svg += legendSVGData.svg;
            // Based on the width of this legend's bounding box, try to update
            // maxX. (Different legends may have different widths, so this
            // isn't always going to be updated; however, we just place legends
            // below each other, so maxY will always get updated.)
            maxX = Math.max(maxX, legendSVGData.width);
            maxY += legendSVGData.height;
        });

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
