import pandas as pd
from skbio import TreeNode
import numpy as np


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

    TODO: Need to create parsers for each of these.
    """
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

    def transform():
        """ Pipeline function
        # TODO:
        # what should this transform function do??
        # 1) Should it update the mask?
        # 2) Should it only handle handling?
        # 3) Perspective transform (i.e. create fish bowl effect)
        # are we missing anything?

        Do we need to have translate?
        """
        pass

    def mask():
        """ Pipeline function
        TODO: stub this out.
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
        dx : how much to pan in the x-axis, (-) being left and (+) being right
        dy : how much to pan in the y-axis, (-) being up and (+) being down

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
