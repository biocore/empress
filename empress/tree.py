from skbio import TreeNode
import numpy as np


class Tree(TreeNode):
    """
    Attributes
    ----------
    length
    leafcount
    height
    depth

    Notes
    -----
    `length` refers to the branch length of a node to its parent.
    `leafcount` is the number of tips within a subtree. `height` refers
    to the longest path from root to the deepst leaf in that subtree.
    `depth` is the number of nodes found in the longest path.
    """

    def __init__(self, use_lengths=False, **kwargs):
        """ Constructs a Dendrogram object for visualization.

        Parameters
        ----------
        use_lengths: bool
            Specifies if the branch lengths should be included in the
            resulting visualization (default True).

        Returns
        -------

        """
        super().__init__(**kwargs)
        self.childRem = -1

    @classmethod
    def from_tree(cls, tree, use_lengths=True):
        """ Creates an Tree object from a skbio tree.

        Parameters
        ----------
        tree : skbio.TreeNode
            Input skbio tree
        use_lengths: Boolean
            Specify if the branch length should be incorporated into
            the geometry calculations for visualization.
        Returns
        -------
        Tree

        """
        for n in tree.postorder():
            n.__class__ = Tree
            n.tip_count = 0

        tree.update_geometry(use_lengths)
        return tree

    def update_geometry(self, use_lengths, depth=None):
        """Calculate tree node attributes such as height and depth.

        Parameters
        ----------
        use_lengths: bool
            Specify if the branch length should be incorporated into
            the geometry calculations for visualization.
        depth: int
            The number of nodes in the longest path from root to leaf.
            This is agnostic to scale and orientation.

        """
        # i = 0
        for node in self.postorder():
            # node.name = i
            # i += 1
            if node.length is None or not use_lengths:
                if not use_lengths:
                    if node.is_tip():
                        node.length = 5
                    else:
                        node.length = 1
                else:
                    node.length = 0

            node.depth = (depth or 0) + node.length

            children = node.children
            if children:
                node.height = max([c.height for c in children]) + node.length
                node.leafcount = sum([c.leafcount for c in children])

            else:
                node.height = node.length
                node.leafcount = 1

    def coords(self, height, width):
        """ Computes the coordinates of nodes to be rendered in plot.

        This runs multiple layout algorithms and saves all of the resulting
        coordinates for each node, so that layout algorithms can be rapidly
        toggled between in the JS interface.

        Parameters
        ----------
        height : int
            The height of the canvas.
        width : int
            The width of the canvas.
        """

        self.rescale_unrooted(width, height)
        self.rescale_rectangular(width, height)
        # self.rescale_circular(width, height)

    def alter_coordinates_relative_to_root(self, xname, yname):
        """ Subtracts the root node's x- and y- coords from all nodes' coords.

        This was previously done within coords(), but I moved it here so that
        this logic can be used after arbitrary layout computations.

        Parameters
        ----------
        xname : str
            The attribute of the x-coordinates to adjust. For example, this is
            "x2" for the unrooted layout, and "xr" for the rectangular layout.
        xname : str
            The attribute of the y-coordinates to adjust. For example, this is
            "y2" for the unrooted layout, and "yr" for the rectangular layout.
        """

        centerX = getattr(self, xname)
        centerY = getattr(self, yname)

        for node in self.postorder():
            # This code might look sort of intimidating, but it's really just
            # another way to write out:
            #     node.x2 = node.x2 - centerX
            #     node.y2 = node.y2 - centerY
            # ...when we don't know what "x2" or "y2" will be named beforehand.
            setattr(node, xname, getattr(node, xname) - centerX)
            setattr(node, yname, getattr(node, yname) - centerY)

    def rescale_circular(self, width, height):
        """ Circular layout version of the rectangular layout.

        Currently incomplete, but in theory this should work analogously to the
        rectangular layout: start at the root (with available angle ranges [0,
        2pi], and go down through the tree's nodes in a preorder(?) traversal,
        dividing the angles as needed based on the number of leaves of a child
        node.

        Parameters
        ----------
        width : float
            width of the canvas
        height : float
            height of the canvas

        References
        ----------
        https://github.com/qiime/Topiary-Explorer/blob/master/src/topiaryexplorer/TreeVis.java
            Description above + the implementation of this algorithm
            derived from the Polar/Radial layout algorithm code.
        """
        pass

    def rescale_rectangular(self, width, height):
        """ Rectangular layout.

        In this sort of layout, each tip has a distinct y-position, and parent
        y-positions are centered over their descendant tips' positions.
        x-positions are computed based on nodes' branch lengths.

        Following this algorithm, nodes' unrooted layout coordinates are
        accessible at [node].xr and [node].yr.

        For a simple tree, this layout should look something like:
                 __
             ___|
         ___|   |__
        |   |___
        |    ___
        |___|
            |___

        Parameters
        ----------
        width : float
            width of the canvas
        height : float
            height of the canvas

        References
        ----------
        https://rachel53461.wordpress.com/2014/04/20/algorithm-for-drawing-trees/
            Clear explanation of Reingold-Tilford that I used a lot
        https://github.com/qiime/Topiary-Explorer/blob/master/src/topiaryexplorer/TreeVis.java
            Derived from the "Rectangular" layout algorithm code.
        """
        # NOTE: This doesn't draw a horizontal line leading to the root "node"
        # of the graph. This decision *seems* to match up with iTOL's behavior?
        # If desired that could be achievable by just adding a simple webGL
        # operation in the JS side of things.
        max_width = 0
        max_height = 0
        prev_y = 0
        for n in self.postorder():
            if n.is_tip():
                n.yr = prev_y
                prev_y += 1
                if n.yr > max_height:
                    max_height = n.yr
            else:
                # Center internal nodes above their descendant tips
                n.yr = sum([t.yr for t in n.tips()]) / n.leafcount

        self.xr = 0
        for n in self.preorder(include_self=False):
            n.xr = n.parent.xr + n.length
            if n.xr > max_width:
                max_width = n.xr

        x_scaling_factor = width / max_width
        y_scaling_factor = height / max_height
        for n in self.preorder():
            n.xr *= x_scaling_factor
            n.yr *= y_scaling_factor

        self.alter_coordinates_relative_to_root("xr", "yr")

        # Now we have the layout! In the JS we'll need to draw each node as
        # a vertical line, and then draw horizontal lines at the end of each
        # node's line between the leftmost and rightmost child node. Will
        # need to finagle the WebGL code to get this working. (For each
        # non-leaf node, we'll need one horizontal (ok, vertical since we're
        # drawing from L to R) line.)

    def rescale_unrooted(self, width, height):
        """ Find best scaling factor for fitting the tree in the figure.
        This method will find the best orientation and scaling possible to
        fit the tree within the dimensions specified by width and height.

        Following this algorithm, nodes' unrooted layout coordinates are
        accessible at [node].x2 and [node].y2.

        Parameters
        ----------
        width : float
            width of the canvas
        height : float
            height of the canvas

        Returns
        -------
        best_scaling : float
            largest scaling factor in which the tree can fit in the canvas.

        Notes
        -----

        """
        # Recall that 360 degrees is equal to (2 * pi) radians.
        # You can think of this variable as "the maximum angle we can 'give' to
        # each leaf of the tree".
        angle = (2 * np.pi) / self.leafcount

        best_scale = 0
        for i in range(60):
            direction = i / 60.0 * np.pi

            (max_x, min_x, max_y, min_y) = self.update_coordinates(
                1.0, 0, 0, direction, angle)

            x_diff = max_x - min_x
            width_min = 0
            if x_diff != 0:
                width_min = float(width) / x_diff
            y_diff = max_y - min_y
            height_min = 0
            if y_diff != 0:
                height_min = float(height) / y_diff
            scale = min(width_min, height_min)
            scale *= 0.95  # extra margin for labels
            if scale >= best_scale:
                best_scale = scale
                mid_x = width / 2 - ((max_x + min_x) / 2) * scale
                mid_y = height / 2 - ((max_y + min_y) / 2) * scale
                best_args = (scale, mid_x, mid_y, direction, angle)

        self.update_coordinates(*best_args)
        self.alter_coordinates_relative_to_root("x2", "y2")
        return best_scale

    def update_coordinates(self, s, x1, y1, a, da):
        """ Update x, y coordinates of tree nodes in canvas.
        `update_coordinates` will updating the plotting parameters for
        all of the nodes within the tree.
        This can be applied when the tree becomes modified (i.e. pruning
        or collapsing) and the resulting coordinates need to be modified
        to reflect the changes to the tree structure.

        Parameters
        ----------
        s : float
            scaling
        x1 : float
            x midpoint
        y1 : float
            y midpoint
        a : float
            angle (degrees)
        da : float
            angle resolution (degrees)

        Returns
        -------
        points : list of tuple
            2D coordinates of all of the nodes.

        Notes
        -----

        """

        max_x = float('-inf')
        min_x = float('inf')
        max_y = float('-inf')
        min_y = float('inf')

        # calculates self coords/angle
        # Constant angle algorithm.  Should add maximum daylight step.
        x2 = x1 + self.length * s * np.sin(a)
        y2 = y1 + self.length * s * np.cos(a)
        (self.x1, self.y1, self.x2, self.y2, self.angle) = (x1, y1, x2, y2,
                                                            a)
        nodes = [node for node in self.postorder(include_self=False)]
        nodes.reverse()
        # for node in self.preorder(include_self=False):
        for node in nodes:
            x1 = node.parent.x2
            y1 = node.parent.y2

            # init a
            a = node.parent.angle

            # same modify across nodes
            a = a - node.parent.leafcount * da / 2

            # check for conditional higher order
            for sib in node.parent.children:
                if sib != node:
                    a += sib.leafcount * da
                else:
                    a += (node.leafcount * da) / 2
                    break

            # Constant angle algorithm.  Should add maximum daylight step.
            x2 = x1 + node.length * s * np.sin(a)
            y2 = y1 + node.length * s * np.cos(a)
            (node.x1, node.y1, node.x2, node.y2, node.angle) = (x1, y1, x2,
                                                                y2, a)

            max_x, min_x = max(max_x, x2), min(min_x, x2)
            max_y, min_y = max(max_y, y2), min(min_y, y2)

        return (max_x, min_x, max_y, min_y)
