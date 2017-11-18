import pandas as pd
from skbio import TreeNode
import numpy as np
class Model(object):
    def __init__(self, tree, metadata):
        """ Model constructor.
        This initializes the model, including
        the tree object and the metadata.
        Parameters
        ----------
        tree : skbio.TreeNode
           The tree to be rendered.
        metadata : pd.DataFrame
           Contains all of the species attributes.
           Every row corresponds to a unique species
           and every column corresponds to an attribute.
           TODO: metadata will also want to contain
           ancestors.
        """
        self.tree = tree
        self.metadata = metadata

        # TODO: Will need to figure this out later
        # i.e. do we want to have 2 data structures
        # for the edges and nodes, or will 1 suffice?
        # Note that this is for the coordinate system
        # within the tree.
        self.coords = pd.DataFrame()

        # viewer coordinates
        # TODO: Will need to think about how to directly
        # translate from coords to viewcoords.
        # maybe represent as a linear transformation
        # with a corresponding mask
        self.viewcoords = np.array()

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
        """
        pass

    def translate(self, view_axes):
        """ Translates the tree coordinates to
        view coordinates.
        TODO: Does this go into the model, or the
        viewer.  Maybe the viewer should 'just' do
        rendering ???
        In the end, this will amount to a single
        linear transformation (i.e. matrix multiplication).
        This also updates the viewcoords within the class.
        Parameters
        ----------
        view_axes : np.array
           The coordinate system to convert the tree coordsinates too. TODO: will need to think of a better name.
        Returns
        -------
        view_coords : np.array
           The actual translated tree coordinates.
        """
        pass

    def pan(self, dx, dy):
        """ Pans (i.e. move) """
        pass

    def zoom(self):
        """ Zooms """
        pass

    # Metadata manipulation

    def updateByCategory(metadata, attribute, category):
        """ Updates metadata category values."""
        pass

    def uniqueCategories(metadata, attribute):
        """ Returns all unique metadata categories. """
        pass
