from skbio import TreeNode
import pandas as pd
import numpy as np
import skbio
import time


def read_leaf_node_metadata(file_name):
    """ Reads in metadata for leaf nodes

    Parameters
    ----------
    file_name :  str
        The name of the file to read the data from

    Returns
    -------
       pd.Dataframe

    """
    metadata = pd.read_table(file_name)
    metadata.rename(columns={metadata.columns[0]: "Node_id"}, inplace=True)
    return metadata


def read_internal_node_metadata(file_name):
    """ Reads in metadata for internal nodes

    Parameters
    ----------
    file_name :  str
        The name of the file to read the data from

    Returns
    -------
       pd.Dataframe

    """
    metadata = pd.read_table(file_name, skiprows=3, names=["Node_id", 'label'])
    return metadata


def read(file_name, file_format='newick'):
    """ Reads in contents from a file.

    This will create a skbio.TreeNode object

    Current Support formats: newick

    Future Suppoert formats: phyloxml,
    cytoscape network.

    cytoscape layout
    - networkx
    phyloxml
    - Python has a parser for it, but it parse it into a phylogeny object.
    - We need to parse the phylogeny object into the metadata table by
    traversing?
    - What is the confidence ifor each clade?

    Parameters
    ----------
    file_name : str
        The name of the file to read that contains the tree
    file_format : str
        The format of the file to read that contains the tree
    TODO: Need to create parsers for each of these.

    Returns
    -------
    tree - skbio.TreeNode
        A TreeNode object of the newick file
    None - null
        If a non-newick file_format was passed in
    """

    if file_format == 'newick':
        tree = skbio.read(file_name, file_format, into=TreeNode)
        return tree
    return None


class Tree(TreeNode):
    """
    Parameters
    ----------
    use_lengths: bool
        Specifies if the branch lengths should be included in the
        resulting visualization (default True).
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
        """
        super().__init__(**kwargs)
        self.childRem = -1

    def _cache_ntips(self):
        """ Counts the number of leaves under each subtree."""
        for n in self.postorder():
            if n.is_tip():
                n.leafcount = 1
            else:
                n.leafcount = sum(c.leafcount for c in n.children)

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
        pd.DataFrame (Node metadata)
            index : str
                Name of node.
            Node id: str
                Name of node
            x : float
                x-coordinate of node.
            y : float
                y-coordinate of node.

        pd.DataFrame (Edge metadata)
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
        """

        # calculates coordinates of all nodes
        print("start")
        start = time.time()
        scale = self.rescale(width, height)
        print(time.time() - start)
        print("done")

        # edge metadata
        edgeData = {}
        for node in self.postorder():
            if node.is_tip():
                edgeData["is_tip"] = True
            else:
                edgeData["is_tip"] = False
            node.alpha = 0.0
            pId = {"Parent_id": node.name}
            pCoords = {'px': node.x2, 'py': node.y2}
            for child in node.children:
                nId = {"Node_id": child.name}
                coords = {'x': child.x2, 'y': child.y2}
                alpha = {'alpha': child.alpha}
                edgeData[child.name] = {**nId, **coords, **pId,
                                        **pCoords, **alpha}

        # convert to pd.DataFrame
        edgeMeta = pd.DataFrame(edgeData).T

        centerX = self.x2
        centerY = self.y2
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
        # this loop is a horrible brute force hack
        # there are better (but complex) ways to find
        # the best rotation of the tree to fit the display.
        best_scale = 0
        for i in range(60):
            direction = i / 60.0 * np.pi

            (max_x, min_x, max_y, min_y) = self.update_coordinates(
                1.0, 0, 0, direction, angle)

            scale = min(float(width) / (max_x - min_x),
                        float(height) / (max_y - min_y))
            # TODO: This margin seems a bit arbituary.
            # will need to investigate.
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
        `update_coordinates` will updating the
        plotting parameters for all of the nodes within the tree.
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
        # TODO: Add functionality that allows for collapsing of nodes

        for node in self.preorder(include_self=False):
            x1 = node.parent.x2
            y1 = node.parent.y2
            a = node.parent.angle

            a = a - node.parent.leafcount * da / 2
            for sib in node.parent.children:
                if len(node.parent.children) < 2:
                    print(len(node.parent.children))
                if sib != node:
                    a = a + sib.leafcount * da
                else:
                    a = a + (node.leafcount * da) / 2
                    break
            # Constant angle algorithm.  Should add maximum daylight step.
            x2 = x1 + node.length * s * np.sin(a)
            y2 = y1 + node.length * s * np.cos(a)
            (node.x1, node.y1, node.x2, node.y2, node.angle) = (x1, y1, x2,
                                                                y2, a)

            if x2 > max_x:
                max_x = x2
            if x2 < min_x:
                min_x = x2

            if y2 > max_y:
                max_y = y2
            if y2 < min_y:
                min_y = y2

        return (max_x, min_x, max_y, min_y)


class Model(object):

    def __init__(self, tree,
                 internal_metadata_file=None,
                 leaf_metadata_file=None,
                 node_metadata=None,
                 edge_metadata=None):
        """ Model constructor.

        This initializes the model, including
        the tree object and the metadata.

        Parameters
        ----------
        tree : skbio.TreeNode
           The tree to be rendered.
        node_metadata : pd.DataFrame
           Contains all of the species attributes.
           Every row corresponds to a unique species
           and every column corresponds to an attribute.
           Metadata may also contain ancestors.
        edge_metadata : pd.DataFrame
           Contains all of the edge attributes.
           Every row corresponds to a unique edge
           and every column corresponds to an attribute.
        """
        self.zoom_level = 1
        self.scale = 1
        self.tree = Tree.from_tree(tree)
        if edge_metadata is None:
            (self.edge_metadata, self.centerX, self.centerY,
             self.scale) = self.tree.coords(900, 1500)
        else:
            self.edge_metadata = edge_metadata
            # Todo: append coords to node/edge

        # Append metadata to table
        internal_metadata = read_internal_node_metadata(internal_metadata_file)
        leaf_metadata = read_leaf_node_metadata(leaf_metadata_file)

        self.edge_metadata = pd.merge(self.edge_metadata, internal_metadata,
                                      how='outer', on="Node_id")
        self.edge_metadata = pd.merge(self.edge_metadata, leaf_metadata,
                                      how='outer', on="Node_id")

    def layout(self, layout_type):
        """ Calculates the coordinates for the tree.

        Pipeline function

        This calculates the actual coordinates for
        the tree. These are not the coordinates that
        will be rendered.  The calculated coordinates
        will be updated as a class property.
        The layout will only be utilized during
        initialization.

        Parameters
        ----------
        layout_type : str
            This specifies the layout algorithm to be used.

        Returns
        -------
        coords : pd.DataFrame
            The calculated tree coordinates.

        Note
        ----
        This will wipe the coords and viewcoords in order to
        recalculate the coordinates with the new layout.
        """
        self.coords = pd.DataFrame()

        # These are coordinates scaled to the canvas
        self._canvascoords = np.array()

        # These are coordinates scaled for viewing
        self.viewcoords = np.array()

        # TODO: These will need to be recomputed.

        pass

    def uniqueCategories(metadata, attribute):
        """ Returns all unique metadata categories that belong to the attribute.
        Parameters
        ----------
        metadata : pd.DataFrame
           Contains all of the species attributes.
           Every row corresponds to a unique species
           and every column corresponds to an attribute.
           TODO: metadata will also want to contain
           ancestors.
        attribute : string
            A string that specifies the metadata attribute header
        Returns
        -------
        unique_cat : list
            A list that contains all of the unique categories within the given
            attribute.

        """
        pass

    def retrive_view_coords(self):
        """ Translate the tree coords in order to makes root (0,0) and Returns edge metadata.

        Parameters
        ----------
        Returns
        -------
        edge_metadata : pd.DataFrame
           Contains all of the species attributes.
           Every row corresponds to a unique species
           and every column corresponds to an attribute.
           TODO: metadata will also want to contain

        """
        self.edge_metadata['px'] = self.edge_metadata[
            ['px']].apply(lambda l: l - self.centerX)
        self.edge_metadata['py'] = self.edge_metadata[
            ['py']].apply(lambda l: l - self.centerY)
        self.edge_metadata['x'] = self.edge_metadata[
            ['x']].apply(lambda l: l - self.centerX)
        self.edge_metadata['y'] = self.edge_metadata[
            ['y']].apply(lambda l: l - self.centerY)

        return self.edge_metadata

    def selectCategory(self, attribute, lower=None, equal=None, upper=None):
        """ Returns edge_metadata with updated alpha value which tells View
        what to hightlight

        Parameters
        ----------
        attribute : str
            The name of the attribute(column of the table).

        category:
            The category of a certain attribute.

        """
        edgeData = self.edge_metadata.copy(deep=True)

        if lower is not "":
            edgeData['alpha'] = edgeData['alpha'].mask(edgeData[attribute] >
                                                       float(lower), 1)

        if equal is not "":
            edgeData['alpha'] = edgeData['alpha'].mask(edgeData[attribute] ==
                                                       equal, 1)

        if upper is not "":
            edgeData['alpha'] = edgeData['alpha'].mask(edgeData[attribute] <
                                                       float(upper), 1)

        return edgeData
