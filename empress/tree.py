from skbio import TreeNode
import igraph
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

    def coords(self, height, width, layout):
        """ Returns coordinates of nodes to be rendered in plot.

        Parameters
        ----------
        height : int
            The height of the canvas.
        width : int
            The width of the canvas.
        layout : str
            One of "unrooted", "rectangular", "circular".
            This is a temporary parameter -- I expect that the best thing here
            will be precomputing all layouts so we can rapidly switch in the JS
        """

        # calculates coordinates of all nodes and the shortest/longest branches
        if layout == "unrooted":
            self.rescale_unrooted(width, height)
        elif layout == "rectangular":
            self.rescale_rectangular(width, height)
        else:
            self.rescale_circular(width, height)
        centerX = self.x2
        centerY = self.y2

        for node in self.postorder():
            node.x2 = node.x2 - centerX
            node.y2 = node.y2 - centerY

    def rescale_circular(self, width, height):
        """ Circular layout.

        Parameters
        ----------
        width : float
            width of the canvas
        height : float
            height of the canvas
        """
        self.x2 = width / 2
        self.y2 = height / 2
        # TODO fan out circularly by angles, and use sin/cos to set positions
        # accordingly. Right now this kinda just UHHH draws a diagonal line :|
        # TODO 2: just use js circ layout code as base
        # TODO 3: or use igraph R-T layout with the circular option; may be
        # easy. For drawing the 'lines' between sibling nodes, we can just draw
        # bezier curves using a single control point at the midpoint above the
        # straight-line, i think.
        for node in self.preorder(include_self=False):
            node.x2 = node.parent.x2 + (node.length * 100)
            node.y2 = node.parent.y2 + (node.length * 100)

    def rescale_rectangular(self, width, height):
        """ Diagonal layout.

        Parameters
        ----------
        width : float
            width of the canvas
        height : float
            height of the canvas
        """
        # 1. Convert TreeNode to igraph
        # nodename_to_igtree_name = {}
        igtree = igraph.Graph(directed=True)

        # 1.1. Add nodes to the igraph object, labelled by their names.
        # NOTE: this assumes that all of the node names in this Tree are
        # unique. That should always be the case, since name_internal_nodes()
        # should've been called on this Tree already.
        # (TODO: add in validation code that this is in fact the case?)
        igtree.add_vertices([n.name for n in self.preorder()])

        # 1.2. Add edges from each non-leaf node to its children nodes
        for n in self.preorder():
            if n.has_children():
                for c in n.children:
                    # Done using add_edges() to save on memory
                    # There is def a faster way to do this but this should at
                    # least work for now
                    igtree.add_edges([(n.name, c.name)])

        # 2. Now that we have an accurate representation of the tree as an
        #    igraph, use igtree.layout_reingold_tilford() with root=the
        #    root node's igraph ID to do the hard work of layout.
        rtlayout = igtree.layout_reingold_tilford(root=[self.name])

        # 3. By default, igraph's Reingold-Tilford layout draws trees starting
        #    at the "bottom" and going up (if you interepret the points as in a
        #    Cartesian grid). We need to rotate the tree to make it go from
        #    left to right. (I tried -90 and 90 and -90 does what I want, so I
        #    assume the angles are counterclockwise)
        rtlayout.rotate(-90)

        # 4. At this point we have a feasible layout that ignores edge lengths.
        #    How can we account for those while maintaining the pretty layout
        #    we just had?
        #    So, if we're gonna use this for a rect layout, we can "push down"
        #    all descendants of each node by just moving their coordinates away
        #    from the root by a distance proportional to the edge length. This
        #    is doable recursively from the root (probs able to do it in linear
        #    time but that's a task for later). So do that, adjusting nodes'
        #    x-coords accordingly (since we're drawing the tree from L -> R).
        # TODO: how to access layout coordinates by node names? might need to
        # just use the 0-indexing shit and then define mapping explicitly
        self.x2 = rtlayout[0][0]
        self.y2 = rtlayout[0][1]
        for n in self.preorder(include_self=False):
            # "Push" a node to the right based on its parent
            n.x2 = n.parent.x2 + n.length
            n.y2 = rtlayout[n.name][1]
        # 5. Now we have the layout! In the JS we'll need to draw each node as
        #    a vertical line, and then draw horizontal lines at the end of each
        #    node's line between the leftmost and rightmost child node. Will
        #    need to finagle the WebGL code to get this working. (For each
        #    non-leaf node, we'll need one horizontal (ok, vertical since we're
        #    drawing from L to R) line.)
        # TODO: do scaling stuff by width/height

    def rescale_unrooted(self, width, height):
        """ Find best scaling factor for fitting the tree in the figure.
        This method will find the best orientation and scaling possible to
        fit the tree within the dimensions specified by width and height.

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
