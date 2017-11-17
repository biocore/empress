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
        the tree.  These are not the coordinates that
        will be rendered.

        The layout will only be utilized during
        initialization.

        Parameters
        ----------
        layout_type : str
            This specifies the layout algorithm to be used.
        """
        pass

    def pan(self, dx, dy):
        """
        """

        pass

    def zoom(self):

        pass

    def selectByCategory(metadata):
        pass


    # Metadata manipulation
