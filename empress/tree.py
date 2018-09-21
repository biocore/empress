from skbio import TreeNode
import pandas as pd
import numpy as np
from operator import attrgetter

DEFAULT_COLOR = '000000'
SELECT_COLOR = '00FF00'


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
        """ Creates an UnrootedDendrogram object from a skbio tree.

        Parameters
        ----------
        tree : skbio.TreeNode
            Input skbio tree

        Returns
        -------
        UnrootedDendrogram

        """
        for n in tree.postorder():
            n.__class__ = Tree

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
        if self.length is None or not use_lengths:
            if depth is None:
                self.length = 0
            else:
                self.length = 1

        self.depth = (depth or 0) + self.length

        children = self.children
        if children:
            for c in children:
                c.update_geometry(use_lengths, self.depth)
            self.height = max([c.height for c in children]) + self.length
            self.leafcount = sum([c.leafcount for c in children])

        else:
            self.height = self.length
            self.leafcount = self.edgecount = 1

    def coords(self, height, width):
        """ Returns coordinates of nodes to be rendered in plot.

        Parameters
        ----------
        height : int
            The height of the canvas.
        width : int
            The width of the canvas.

        Returns
        -------
        edgeMeta : pd.DataFrame (Edge metadata)
            index : str
                Name of node.
            Node id: str
                Name of node
            x : float
                x-coordinate of node.
            y : float
                y-coordinate of node.
            Parent id:
                Name of parent
            px : float
                x-coorinate of parent
            py: float
                y-coordinate of parent
        centerX : float
            x coordinate of root node
        centerY : float
            y coordinate of root
        scale : float
            largest scaling factor in which the tree can fit in the canvas.
        """

        # calculates coordinates of all nodes and the shortest/longest branches
        scale = self.rescale(width, height)
        centerX = self.x2
        centerY = self.y2

        # edge metadata
        edgeData = {}
        for node in self.postorder():
            node.alpha = 0.0
            pId = {"Parent_id": node.name}
            pCoords = {'px': node.x2, 'py': node.y2}
            for child in node.children:
                nId = {"Node_id": child.name}
                isTip = {"is_tip": child.is_tip()}
                coords = {'x': child.x2, 'y': child.y2}

                attr = {'node_color': DEFAULT_COLOR, 'branch_color': DEFAULT_COLOR,
                        'node_is_visible': True, 'branch_is_visible': True,
                        'width': 1, 'size': 1}
                edgeData[child.name] = {**nId, **isTip, **coords, **pId,
                                        **pCoords, **attr}

        for node in self.postorder():
            node.x2 = node.x2 - centerX
            node.y2 = node.y2 - centerY

        index_list = pd.Index([
                'Node_id',
                'is_tip',
                'x',
                'y',
                'Parent_id',
                'px',
                'py',
                'node_color',
                'branch_color',
                'node_is_visible',
                'branch_is_visible',
                'width',
                'size'])
        # convert to pd.DataFrame
        edgeMeta = pd.DataFrame(
            edgeData,
            index=index_list).T
        return (edgeMeta, centerX, centerY, scale)

    def rescale(self, width, height):
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
            if scale > best_scale:
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

        for node in self.preorder(include_self=False):
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

    def find_shortest_longest_branches(self):
        """ Finds the shortest and longest branches() in each node's subtree.

        Parameters
        ----------

        Returns
        -------

        """
        # TODO: make this a different data structure
        for node in self.postorder():
            if node.is_tip():
                node.shortest = [node.x2, node.y2]
                node.longest = [node.x2, node.y2]
            else:
                # calculate shortest branch node
                node.shortest = min([child.shortest for child in
                                     node.children],
                                    key=attrgetter('depth'))

                # calculate longest branch node
                node.longest = max(
                    [child.longest for child in node.children],
                    key=attrgetter('depth'))

    def node_coords(self):
        """ Returns the coordinates of all nodes in the tree
        """
        node_data = {}
        for node in self.postorder():
            coords = {'x': node.x2, 'y': node.y2}
            attr = {'color': DEFAULT_COLOR}
            node_data[node.name] = {**coords, **attr}

        # convert to pd.DataFrame
        index_list = pd.Index(['x', 'y', 'color'])
        node_data = pd.DataFrame(node_data, index=index_list).T

        return node_data
