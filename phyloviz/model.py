from skbio import TreeNode
import pandas as pd
import numpy as np
import skbio

def read_leaf_node_metadata(file_name):
    """ Reads in metadata for leaf node

    Parameters
    ----------
    file_name :  str
        The name of the file to read the data from

    Returns
    -------
       pd.Dataframe

    """
    metadata = pd.read_table(file_name)
    metadata.rename(columns={metadata.columns[0]:'Node id'},inplace=True)
    return metadata
def read_internal_node_metadata(file_name):
    """ Reads in metadata for internal node

    Parameters
    ----------
    file_name :  str
        The name of the file to read the data from

    Returns
    -------
       pd.Dataframe

    """

    metadata = pd.read_table(file_name,skiprows=3,names = ['Node id', 'label'])
    return metadata
def read(file_name, file_format='newick'):
    """ Reads in contents from a file.

    This will create a model object with
    tree, node metadata and edge metadata.

    Supported formats, newick, phyloxml,
    cytoscape network.

    newick format
    - already implemented in scikit-bio
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
    """

    if file_format == 'newick':
        # create tree from newick file
        tree = skbio.read(file_name, file_format, into=TreeNode)

        return tree

        # create node_metadata data frame
        # for node in tree.preorder():
        # add each node as a new row of node_metadata
        # where is the rest of the metadata coming from?
        #    pass

        # create edge_meta_data data frame
        # for node in tree.preorder():
        # add edge ( node, parent ) to edge_metadata
        #    pass

    # elif file_format == 'phyloxml':
        # There is a a package in ete3 for phyloxml as well
        # This is using biopython
        # function read if there is one tree in the file
        # function parse if there are multiple trees in the file
        # It can also read newick format and also convert bewteen supported
        # format
        # trees = Phylo.parse(file_name,file_format)
    ''' tree = Phylo.read(file_name, file_format)
        for clade in tree.find_clades():
            # Get the information about the clade into the dataframe
            pass

    elif file_format == 'cytoscape':

        # assuming we're using GML
        G = nx.read_gml(file_name)

        # convert networkx graph into pandas dataframe
        df = nx.to_pandas_dataframe(G)

        # get lists of attributes in graph
        # TODO: attributes object

        # create all attributes as pd dataframe (self.node_metadata) columns
        # TODO:

        # iterate through all attributes
        for a in attributes:
            cur_attribute = nx.get_node_attributes(G, a);
            # iterate through networkx graph and create node_metadata
            for n in G:
                # TODO: set self.node_metadata's n's attribute to be
                #       cur_attribute[n]
                pass

    else:
        # return error message file format cannot be parsed
        pass

    #pass
    '''
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
        self.rescale(width, height)

        # Node metadata
        nodeData = {}
        for node in self.postorder():
            nId = {'Node id': node.name}
            coords = {'x': node.x2, 'y': node.y2}
            nodeData[node.name] = {**nId, **coords}

        # edge metadata
        edgeData = {}
        for node in self.postorder():
            if node.is_tip():
                edgeData["is_tip"] = True
            else :
                edgeData["is_tip"] = False

            pId = {'Parent id': node.name}
            pCoords = {'px': node.x2, 'py': node.y2}
            for child in node.children:
                nId = {'Node id': child.name}
                coords = {'x': child.x2, 'y': child.y2}
                edgeData[child.name] = {**nId, **coords, **pId, **pCoords}

        # convert to pd.DataFrame
        nodeMeta = pd.DataFrame(nodeData).T
        edgeMeta = pd.DataFrame(edgeData).T

        return (nodeMeta, edgeMeta)

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
            # TODO:
            # This function has a little bit of recursion.  This will
            # need to be refactored to remove the recursion.

            points = self.update_coordinates(1.0, 0, 0, direction, angle)

            xs, ys = zip(*points)
            # double check that the tree fits within the margins
            scale = min(float(width) / (max(xs) - min(xs)),
                        float(height) / (max(ys) - min(ys)))
            # TODO: This margin seems a bit arbituary.
            # will need to investigate.
            scale *= 0.95  # extra margin for labels
            if scale > best_scale:
                best_scale = scale
                mid_x = width / 2 - ((max(xs) + min(xs)) / 2) * scale
                mid_y = height / 2 - ((max(ys) + min(ys)) / 2) * scale
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

        points = []

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

            # calculates 'a'
            a = a - node.parent.leafcount * da / 2
            for sib in node.parent.children:
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

            # TODO: Add functionality that allows for collapsing of nodes
            if node.is_tip():
                points += [(x2, y2)]

        return points


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
        self.tree = Tree.from_tree(tree)
        if node_metadata is None and edge_metadata is None:
            self.node_metadata, self.edge_metadata = self.tree.coords(700,
                                                                      1000)
        else:
            self.node_metadata = node_metadata
            self.edge_metadata = edge_metadata
            # Todo: append coords to node/edge

        # Append metadata to table
        internal_metadata = read_internal_node_metadata(internal_metadata_file)
        leaf_metadata = read_leaf_node_metadata(leaf_metadata_file)

        self.edge_metadata = pd.merge(self.edge_metadata, internal_metadata,
                                      how='outer', on='Node id')
        self.edge_metadata = pd.merge(self.edge_metadata, leaf_metadata,
                                      how='outer', on='Node id')

        # Pipeline
        #   tree -> (layout) -> coords
        #   coords -> (transform?) -> _canvascoords
        #  _canvascoords -> (mask) -> viewcoords

        # Todo: Should we store cords like this?
        # This stores information about the coordinates
        # of the nodes.
        # self.coords = pd.DataFrame()

        # viewer coordinates
        # TODO: Will need to think about how to directly
        # translate from coords to viewcoords.
        # maybe represent as a linear transformation
        # with a corresponding mask
        # self.viewcoords = np.array()

        # These are coordinates scaled to the canvas
        # self._canvascoords = np.array()

        # Panning. This will subtract from the
        # viewcoords.
        # self.pan = np.array()

        # Mask specific coordinates not to display.
        # TODO: should this involve the resolution
        # handling?
        # self.mask = np.array()

    # Coordinate manipulation
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

    def transform(zoom_level):
        """ It transforms the coords to _canvascoords
        Based on the zoom level, coords will be recalculated with resolution
        resolving.
        This function should also call mask on _canvascoords to recalculate the
        coords that get displayed.

        This function will be called by zoom.

        Pipeline function

        Parameters
        ----------
        zoom_level : int
           The current zoom level (absolute not relative)
           We should probably keep small intervals to make the zooming smooth.

        Returns
        -------
        _canvasoords : np.array
           The transformed _canvascoords that is at the correct zoom level.
           This still need to be masked in order to fit on the screen.


        # TODO:
        # what should this transform function do??
        # 1) Should it update the mask?
        It needs to call mask by passing in the zoom point
        # 2) Should it only handle handling?
        # 3) Perspective transform (i.e. create fish bowl effect)
        # are we missing anything?

        Do we need to have translate? No, pan should call mask and zoom Should
        call transform.
        """
        pass

    def mask(height, width, x, y):
        """ Pipeline function

        Uses the canvascoords generated by the transform function,
        and applies a bounding box that represents viewcoords,coordinates
        of the visible tree nodes being displayed.


        Parameters
        ----------
        height : int
            Height dimension of the View, to determine the height of
            the mask

        width : int
            Width dimension of the View, to determmine the width of
            the mask

        x : x-coordinate of the point zooming will occur relative to

        y : y-coordinate of the point zooming will occur relative to

        Returns
        -------
        viewcoords : np.array
            Dictates how each visible tree node should be laid
            out in the view
        """
        pass

    def recompute(self, view_axes):
        """ It recompute the coordinates.

        In the end, this will amount to a single
        linear transformation (i.e. matrix multiplication).
        This also updates the viewcoords within the class.

        Parameters
        ----------
        view_axes : np.array
           The coordinate system to convert the tree coordsinates too.
           TODO: will need to think of a better name.

        Returns
        -------
        view_coords : np.array
           The actual translated tree coordinates.

        Note
        ----
        Caching could be convenient (will need to think about this).
        """
        pass

    def pan(self, dx, dy):
        """ Pans (i.e. move) around the bounding box that is being
            rendered on screen.

        User facing function - may even want to push this to controller

        TODO: The bounding box is defined as (x1, y1) of upper left corner
        and (x2,y2) of lower right corner. The bounding box is moved around
        by 'dx' in the x-axis and 'dy' in the y-axis in the view canvas.
        Each visible node's viewcoords are then
        recalculated, and the view is called to update.

        Parameters
        ----------
        dx : change in x
            How much to pan in the x-axis, (-) being left and (+) being right

        dy : change in y
            How much to pan in the y-axis, (-) being up and (+) being down

        Returns
        -------
        view_coords : np.array
           The translated view coordinates
        """

        """
        Need to change this!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        Todo: make this translate the view coords
        """
        """for node in self.tree.postorder():
            node.x2 = node.x2 + dx
            node.y2 = node.y2 + dy
        """
        #x_col = self.node_metadata.columns.get_loc('x')
        #y_col = self.node_metadata.columns.get_loc('y')
        #self.node_metadata.add(dx,axis=x_col)
        #self.edge_metadata.add(dy, axis=y_col)
        self.node_metadata[['x']].apply(lambda l: l + dx)
        self.edge_metadata[['y']].apply(lambda l: l + dy)
        return self.retrive_view_coords()

    def zoom(self, level, tx, ty):
        """ Zooms in/out by remapping the (x1,y1) upper left corner and (x2,y2)
        lower right corner
        of the bounding box, and changes view coordinates as well as visibility
        of nodes.
        Updates rendering in the View.

        User facing function - may even want to push this to controller

        Parameters
        ----------
        level : amount to zoom, where (-) level represents zooming out and
                (+) level
        represents zooming in

        Returns
        -------
        view_coords : np.array
           Rescaled view coordinates

        """
        """
        Need to change!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        Todo: Make this scale view coords
        xr = self.tree.x2
        yr = self.tree.y2
        for node in self.tree.postorder():
            node.x2 = 2*level*node.x2 - xr
            node.y2 = 2*level*node.y2 - yr
            print(str(xr))

        return self.retrive_view_coords()

        """

        # # copy edge_metadata dataframe
        # zoomed_edges = self.edge_metadata.copy(deep=True)

        # # multiply all coordinates by level/scale
        # zoomed_edges.x = zoomed_edges.x * np.float64(level)
        # zoomed_edges.y = zoomed_edges.y * np.float64(level)
        # zoomed_edges.px = zoomed_edges.px * np.float64(level)
        # zoomed_edges.py = zoomed_edges.py * np.float64(level)

        # # add all x coordinates by tx
        # zoomed_edges.x = zoomed_edges.x + np.float64(tx)
        # zoomed_edges.px = zoomed_edges.px + np.float64(tx)

        # # add all y coordinates by ty
        # zoomed_edges.y = zoomed_edges.y + np.float64(ty)
        # zoomed_edges.py = zoomed_edges.py + np.float64(ty)
         # copy edge_metadata dataframe
        
        zoomed_edges = self.edge_metadata.copy(deep=True)
        # print("This is tx from inside model:" + tx)

        
        zoomed_edges['x'] = zoomed_edges[['x']].apply(lambda l: l * np.float64(level))
        zoomed_edges['y'] = zoomed_edges[['y']].apply(lambda l: l * np.float64(level))
        zoomed_edges['px'] = zoomed_edges[['px']].apply(lambda l: l * np.float64(level))
        zoomed_edges['py'] = zoomed_edges[['py']].apply(lambda l: l * np.float64(level))

        zoomed_edges['x'] = zoomed_edges[['x']].apply(lambda l: l + np.float64(tx))
        zoomed_edges['y'] = zoomed_edges[['y']].apply(lambda l: l + np.float64(ty))
        zoomed_edges['px'] = zoomed_edges[['px']].apply(lambda l: l + np.float64(tx))
        zoomed_edges['py'] = zoomed_edges[['py']].apply(lambda l: l + np.float64(ty))


        # edgeData = {}
        # counter = 0
        # for node in self.tree.levelorder():
        #     if counter < 500:
        #         if node.is_tip():
        #             edgeData["is_tip"] = True
        #         else :
        #             edgeData["is_tip"] = False

        #         pId = {'Parent id': node.name}
        #         pCoords = {'px': node.x2, 'py': node.y2}
        #         for child in node.children:
        #             nId = {'Node id': child.name}
        #             coords = {'x': child.x2, 'y': child.y2}
        #             edgeData[child.name] = {**nId, **coords, **pId, **pCoords}
        #             counter = counter + 1

        # edgeMeta = pd.DataFrame(edgeData).T

        return zoomed_edges

    # Metadata manipulation
    def groupByCategory(metadata, attribute, category):
        """ Get certain rows in the metadata given the categories.

        Parameters
        ----------
        metadata : pd.DataFrame
           Contains all of the species attributes.
           Every row corresponds to a unique species
           and every column corresponds to an attribute.

        attribute : str
            The name of the attribute(column of the table).

        category: str
            The category of a cerntain attribute.

        Returns
        -------
        metadata_sub: pd.DataFrame
            The selected rows of the metadata
        """
        pass

    def updateByCategory(metadata, attribute, category, new_value):
        """ Updates metadata category values.

        Parameters
        ----------
        metadata : pd.DataFrame
           Contains all of the species attributes.
           Every row corresponds to a unique species
           and every column corresponds to an attribute.

        attribute : str
            The name of the attribute(column of the table).

        category:
            The category of a cerntain attribute.

        new_value:
            The new value to update the category to.
        """
        pass

    def updateViewByCategory(metadata, attribute, category):
        """ Tell the View what category has been updated and update the View

        Parameters
        ----------
        metadata : pd.DataFrame
            Contains all of the species attributes.
            Every row corresponds to a unique species
            and every column corresponds to an attribute.

        attribute : str
            The name of the attribute(column of the table).

        category:
            The category of a cerntain attribute.

        """

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
        # return (self.node_metadata, self.edge_metadata)
        # Node metadata
        """ nodeData = {}
        for node in self.tree.postorder():
            nId = {'Node id': node.name}
            coords = {'x': node.x2, 'y': node.y2}
            nodeData[node.name] = {**nId, **coords}

        # edge metadata
        edgeData = {}
        for node in self.tree.postorder():
            pId = {'Parent id': node.name}
            pCoords = {'px': node.x2, 'py': node.y2}
            for child in node.children:
                nId = {'Node id': child.name}
                coords = {'x': child.x2, 'y': child.y2}
                edgeData[child.name] = {**nId, **coords, **pId, **pCoords}

        # convert to pd.DataFrame
        nodeMeta = pd.DataFrame(nodeData).T
        edgeMeta = pd.DataFrame(edgeData).T

        return (nodeMeta, edgeMeta)
        """
        """
        Selective render currently based on level traversal
        """

        return (self.node_metadata, self.edge_metadata)

