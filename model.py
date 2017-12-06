import pandas as pd
from skbio import read
from skbio import TreeNode
import numpy as np
import networkx as nx
from Bio import Phylo


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
    - What is the confidence for each clade?

    TODO: Need to create parsers for each of these.
    """

    if file_format == 'newick':
        # create tree from newick file
        tree = read( file_name, file_format, into=TreeNode)

        # create node_metadata data frame
        for node in tree.preorder():
	    # add each node as a new row of node_metadata
	    # where is the rest of the metadata coming from?

        # create edge_meta_data data frame
        for( node in tree.preorder():
	    # add edge ( node, parent ) to edge_metadata
        pass

    elif file_format == 'phyloxml':
        tree = Phylo.read('filename', file_format)
        for clade in tree.clade:
        pass

    elif file_format == 'cytoscape':

        # assuming we're using GML
        G = nx.read_gml(file_name)

        # convert networkx graph into pandas dataframe
        df = nx.to_pandas_dataframe(G)

        # get lists of attributes in graph
        # TODO: attributes object

        # create all attributes as pandas dataframe (self.node_metadata) columns
        # TODO:

        # iterate through all attributes
        for a in attributes:
            cur_attribute = nx.get_node_attributes(G, a);
            # iterate through networkx graph and create node_metadata
            for n in G:
                # TODO: set self.node_metadata's n's attribute to be cur_attribute[n]
                pass

    else:
        # return error message file format cannot be parsed
        pass
    
    pass


class Model(object):

    def __init__(self, tree,
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
        self.tree = tree
        self.node_metadata = node_metadata
        self.edge_metadata = edge_metadata

        # Pipeline
        #   tree -> (layout) -> coords
        #   coords -> (transform?) -> _canvascoords
        #  _canvascoords -> (mask) -> viewcoords

        # This stores information about the coordinates
        # of the nodes.
        self.coords = pd.DataFrame()

        # viewer coordinates
        # TODO: Will need to think about how to directly
        # translate from coords to viewcoords.
        # maybe represent as a linear transformation
        # with a corresponding mask
        self.viewcoords = np.array()

        # These are coordinates scaled to the canvas
        self._canvascoords = np.array()

        # Panning. This will subtract from the
        # viewcoords.
        self.pan = np.array()

        # Mask specific coordinates not to display.
        # TODO: should this involve the resolution
        # handling?
        self.mask = np.array()

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
           We should probably keep small intervals to make the zoom look smooth.

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
        pass

    def zoom(self, level):
        """ Zooms in/out by remapping the (x1,y1) upper left corner and (x2,y2) lower right corner
        of the bounding box, and changes view coordinates as well as visibility of nodes.
        Updates rendering in the View.

        User facing function - may even want to push this to controller

        Parameters
        ----------
        level : amount to zoom, where (-) level represents zooming out and (+) level
        represents zooming in

        Returns
        -------
        view_coords : np.array
           Rescaled view coordinates

        """
        pass


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
        """ Returns all unique metadata categories.
        This returns all unique metadata categories that belong to the attribute.
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
            A list that contains all of the unique categories within the given attribue.

        """
        pass
