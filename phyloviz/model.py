import skbio
from skbio import TreeNode
import pandas as pd
import numpy as np
from phyloviz.tree import Tree


def name_internal_nodes(tree):
    """ Name internal nodes that does not have name

    Parameters
    ----------
    Returns
    -------
    """
    # initialize tree with branch length
    for i, n in enumerate(tree.postorder(include_self=True)):
        if n.length is None:
            n.length = 1
        if not n.is_tip() and n.name is None:
            new_name = "y%d" % i
            n.name = new_name


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


def read_internal_node_metadata(file_name, skip_row):
    """ Reads in metadata for internal nodes

    Parameters
    ----------
    file_name :  str
        The name of the file to read the data from

    Returns
    -------
       pd.Dataframe

    """

    metadata = pd.read_table(file_name, skiprows=skip_row)
    metadata.rename(columns={metadata.columns[0]: "Node_id"}, inplace=True)
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
    traversing?g
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


class Model(object):

    def __init__(self, tree_file=None,
                 tree_format='newick',
                 internal_metadata_file=None,
                 leaf_metadata_file=None,
                 edge_metadata=None,
                 skip_row=3):
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
        tree = read(tree_file, tree_format)
        self.tree = Tree.from_tree(tree)

        if edge_metadata is None:
            (self.edge_metadata, self.centerX,
             self.centerY, self.scale) = self.tree.coords(900, 1500)
            self.node_coords = self.tree.node_coords()
        else:
            self.edge_metadata = edge_metadata

        internal_metadata = read_internal_node_metadata(internal_metadata_file, skip_row)
        leaf_metadata = read_leaf_node_metadata(leaf_metadata_file)
        internal_headers = internal_metadata.columns.values.tolist()
        leaf_headers = leaf_metadata.columns.values.tolist()

        self.metadata_headers = []
        for header in internal_headers:
            if header not in leaf_headers:
                leaf_headers.append(header)
        self.metadata_headers = leaf_headers

        self.edge_metadata = pd.merge(self.edge_metadata, internal_metadata,
                                      how='outer', on="Node_id")
        self.edge_metadata = pd.merge(self.edge_metadata, leaf_metadata,
                                      how='outer', on="Node_id")
        name_internal_nodes(self.tree)
        self.triangles = pd.DataFrame()

        self.model_added_columns = [
            "px", "py", "x", "y", "branch_color",
            "branch_is_visible", "longest", "node_color", "node_is_visible",
            "shortest", "size", "width", "Parent_id"]

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

    def unique_categories(self, metadata, attribute):
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
        unique_cat : list of str
            A list that contains all of the unique categories within the given
            attribute.

        """
        return self.metadata_headers

    def center_tree(self):
        """ Translate the tree coords in order to makes root (0,0) and
        Returns edge metadata.

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
        self.node_coords['x'] = self.node_coords[
            ['x']].apply(lambda l: l - self.centerX)
        self.node_coords['y'] = self.node_coords[
            ['y']].apply(lambda l: l - self.centerY)

    def select_edge_category(self):
        """
        Select categories required by webgl to plot edges
        Parameters
        ----------
        Returns
        -------
        """
        # TODO: may want to add in width in the future
        attributes = ['x', 'y', 'px', 'py', 'branch_color']
        return self.select_category(attributes, 'branch_is_visible')

    def select_node_category(self):
        """
        Select categories required by webgl to plot nodes
        Parameters
        ----------
        Returns
        -------
        """
        attributes = ['x', 'y', 'node_color', 'size']
        return self.select_category(attributes, 'node_is_visible')

    def select_category(self, attributes, is_visible_col):
        """ Returns edge_metadata whose 'is_visible_col is True'
        Parameters
        ----------
        attributes : list
            List of columns names to select
        """

        is_visible = self.edge_metadata[is_visible_col]
        edgeData = self.edge_metadata[is_visible]

        return edgeData[attributes]

    # TODO: should we modify edge_metadata?
    def update_edge_category(self, attribute, category,
                             new_value="000000", lower="",
                             equal="", upper=""):
        """ Returns edge_metadata with updated width value which tells View
        what to hightlight

        Parameters
        ----------
        attribute : str
            The name of the attribute(column of the table).
        category:
            The category of a certain attribute.
        Returns
        -------
        edgeData : pd.Dataframe
        updated version of edge metadata
        """
        if lower is not "":
            self.edge_metadata.loc[self.edge_metadata[attribute] > float(lower), category] = new_value

        if equal is not "":
            self.edge_metadata.loc[self.edge_metadata[attribute] == equal, category] = new_value

        if upper is not "":
            self.edge_metadata.loc[self.edge_metadata[attribute] < float(upper), category] = new_value

        return self.edge_metadata

    def retrive_highlighted_values(self, color, exclude=[]):
        """ Returns all row entries with branch_color == to color

        Parameters
        ----------
        color : str
            The color to match row to
        exclude : list
            A list of columns to exlude in the return dataframe
        Returns
        -------
        result : pd.Dataframe
            A dataframe containing the rows which contain color
        """
        columns = list(self.metadata_headers)
        columns.append('x')
        columns.append('y')
        result = self.edge_metadata.loc[self.edge_metadata['branch_color'] == color, columns]

        return result

    def retrive_label_coords(self, label, value):
        """ Returns the coordinates of the nodes that are the the column 'label'
        and have 'value'

        Parameters
        ----------
        label : str
            The column to search in
        value : str or int
            The value to match
        Returns
        -------
        result : pd.Dataframe
            A dataframe containing the coordinates of the matched labels
        """
        return self.edge_metadata.loc[self.edge_metadata[label] == value, ['Node_id', 'x', 'y']]

    def collapse_clades(self, sliderScale):
        """ Collapses clades in tree by doing a level order of the tree.

        sliderScale of 1 (min) means no clades are hidden, and sliderScale
        of 2 (max) means the whole tree is one large triangle.
        Changes the visibility of hidden nodes to be false.

        Parameters
        ----------
        sliderScale : int
            The scale of the slider of how much to collapse

        Returns
        -------
        triangles : pd.DataFrame
        rx | ry | fx | fy | cx | cy | #RGB (color string)
        """
        triData = {}

        count = 0
        total_nodes = self.tree.count()
        nodes_limit = total_nodes - int(sliderScale) * total_nodes

        for node in self.tree.levelorder():
            if count >= nodes_limit:
                # done selecting nodes to render
                # set visibility of the rest to false
                self.edge_metadata.loc[self.edge_metadata['Node_id'] ==
                                       node.name, 'visibility'] = False
                self.node_metadata.loc[self.node_metadata['Node_id'] ==
                                       node.name, 'is_visible'] = False

                # if parent was visible
                # add triangle coordinates to dataframe
                if self.edge_metadata.query('Node_id == "%s"' % node.parent.name)['visibility']:
                    nId = {"Node_id": node.parent.name}
                    root = {'rx': node.parent.x2, 'ry': node.parent.y2}
                    shortest = {'sx': node.parent.shortest.x2,
                                'sy': node.parent.shortest.y2}
                    longest = {'lx': node.parent.longest.x2,
                               'ly': node.parent.longest.y2}
                    triData[node.parent.name] = {**nId, **root, **shortest,
                                                 **longest}

            else:
                # reset visibility of higher level nodes
                self.edge_metadata.loc[self.edge_metadata['Node_id'] ==
                                       node.name, 'visibility'] = True
                self.node_metadata.loc[self.node_metadata['Node_id'] ==
                                       node.name, 'is_visible'] = True
            # increment node count
            count = count + 1

        self.triangles = pd.DataFrame(triData).T
        return self.triangles
