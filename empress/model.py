import io
import skbio
import math
import pandas as pd
import numpy as np
from skbio import TreeNode
from scipy.spatial import distance
from scipy.spatial import ConvexHull
from empress.tree import Tree


def name_internal_nodes(tree):
    """ Name internal nodes that does not have name

    Parameters
    ----------
    Returns
    -------
    """
    # initialize tree with branch lengths and node names if they are missing
    for i, n in enumerate(tree.postorder(include_self=True)):
        if n.length is None:
            n.length = 1
        if n.name is None:
            new_name = "y%d" % i
            n.name = new_name


def read_metadata(file_name, skip_row, seperator):
    """ Reads in metadata for internal nodes

    Parameters
    ----------
    file_name :  String
        The name of the file to read the data from
    skip_row : integer
        The number of rows to skip when reading in the data
    seperator : character
        The delimiter used in the data file

    Returns
    -------
       pd.Dataframe

    """
    if seperator == ' ':
        cols = pd.read_csv(
            file_name, skiprows=skip_row, nrows=1, delim_whitespace=True).columns.tolist()

        # StringIO is used in test cases, without this the tests will fail due to the buffer
        # being placed at the end everytime its read
        if type(file_name) is io.StringIO:
            file_name.seek(0)

        metadata = pd.read_table(
            file_name, skiprows=skip_row, delim_whitespace=True, dtype={cols[0]: object})
        metadata.rename(columns={metadata.columns[0]: "Node_id"}, inplace=True)
    else:
        cols = pd.read_csv(
            file_name, skiprows=skip_row, nrows=1, sep=seperator).columns.tolist()

        # StringIO is used in test cases, without this the tests will fail due to the buffer
        # being placed at the end everytime its read
        if type(file_name) is io.StringIO:
            file_name.seek(0)

        metadata = pd.read_table(
            file_name, skiprows=skip_row, sep=seperator, dtype={cols[0]: object})
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
    traversing?
    - What is the confidence for each clade?

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

    def __init__(
            self, tree_file, main_metadata, clade_field, add_metadata=None, port=8080,
            main_skiprow=0, add_skiprow=0, main_sep='\t', add_sep='\t'):
        """ Model constructor.

        This initializes the model, including
        the tree object and the metadata.

        Parameters
        ----------
        tree_file : String
            Name of newick tree file
        main_metadata : String
            Name of file containing metadata
        clade_field : String
            Name of field within metadata that contains clade names
        add_metadata : String
            Name of file containing additional metadata
        port : Integer
            port number
        main_skiprow : Integer
            Number of rows to skip in the main metadata file
        add_skiprow : Integer
            Number of rows to skip in the secondary metadata file
        main_sep : String
            The seperator used in the main metadata file
        add_sep : String
            The seperator used in the secondary metadata file
        """
        self.zoom_level = 1
        self.scale = 1
        tree = read(tree_file)
        self.tree = Tree.from_tree(tree)
        name_internal_nodes(self.tree)
        (self.edge_metadata, self.centerX,
            self.centerY, self.scale) = self.tree.coords(900, 1500)

        # read in main metadata
        metadata = read_metadata(main_metadata, main_skiprow, main_sep)
        self.headers = metadata.columns.values.tolist()
        self.edge_metadata = pd.merge(self.edge_metadata, metadata,
                                      how='outer', on="Node_id")

        # read in additional metadata
        if add_metadata is not None:
            add_metadata = read_metadata(add_metadata, add_skiprow, add_sep)
            add_headers = add_metadata.columns.values.tolist()
            self.headers = self.headers + add_headers[1:]
            self.edge_metadata = pd.merge(self.edge_metadata, add_metadata,
                                          how='outer', on="Node_id")

        # todo need to warn user that some entries in metadata do not have a mapping to tree
        self.edge_metadata = self.edge_metadata[self.edge_metadata.x.notnull()]

        self.triangles = pd.DataFrame()
        self.clade_field = clade_field

        # cached subtrees
        self.cached_subtrees = list()

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

        # TODO: These will need to be recomputed once the algorithms for
        # new layouts has been created.

        pass

    def center_tree(self):
        """ Translate the tree coords in order to makes root (0,0)
        Parameters
        ----------
        Returns
        -------
        """
        self.edge_metadata['px'] = self.edge_metadata[
            ['px']].apply(lambda l: l - self.centerX)
        self.edge_metadata['py'] = self.edge_metadata[
            ['py']].apply(lambda l: l - self.centerY)
        self.edge_metadata['x'] = self.edge_metadata[
            ['x']].apply(lambda l: l - self.centerX)
        self.edge_metadata['y'] = self.edge_metadata[
            ['y']].apply(lambda l: l - self.centerY)

    def select_edge_category(self):
        """
        Select categories required by webgl to plot edges
        Parameters
        ----------
        Returns
        -------
        edgeData : pd.Dataframe
            dataframe containing information necessary to draw tree in
            webgl
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

    def update_edge_category(self, attribute, category,
                             new_value="000000", lower="",
                             equal="", upper=""):
        """ Returns edge_metadata with updated width value which tells View
        what to hightlight

        Parameters
        ----------
        attribute : string
            The name of the attribute(column of the table).
        category:
            The column of table that will be updated such as branch_color
        new_value : string
            A hex string representing color to change branch
        lower : integer
            The smallest number a feature must match in order for its color to change
        equal : string/integer
            The number/string a feature must match in order for its color to change
        upper : integer
            The largest number a feature can match in order for its color to change
        Returns
        -------
        edgeData : pd.Dataframe
            All entries from self.edge_metadata that are visible and match criteria
            passed in.
        """
        # update the cached trees
        for edge_data, _ in self.cached_subtrees:
            if lower is not "":
                edge_data.loc[edge_data[attribute] > float(lower), category] = new_value

            if equal is not "":
                try:
                    value = float(equal)
                except ValueError:
                    value = equal
                edge_data.loc[edge_data[attribute] == value, category] = new_value

            if upper is not "":
                edge_data.loc[edge_data[attribute] < float(upper), category] = new_value

        # update the current tree
        if lower is not "":
            self.edge_metadata.loc[self.edge_metadata[attribute] > float(lower), category] = new_value

        if equal is not "":
            try:
                value = float(equal)
            except ValueError:
                value = equal
            self.edge_metadata.loc[self.edge_metadata[attribute] == value, category] = new_value

        if upper is not "":
            self.edge_metadata.loc[self.edge_metadata[attribute] < float(upper), category] = new_value
        return self.edge_metadata

    def retrive_highlighted_values(self, attribute, lower="",
                                   equal="", upper=""):
        """ Returns edge_metadata with that match the arguments

        Parameters
        ----------
        attribute : string
            The name of the attribute(column of the table).
        lower : integer
            The smallest number a feature must match in order for its color to change
        equal : string/integer
            The number/string a feature must match in order for its color to change
        upper : integer
            The largest number a feature can match in order for its color to change
        Returns
        -------
        edgeData : pd.Dataframe
            updated version of edge metadata
        """
        columns = list(self.headers)
        columns.append('x')
        columns.append('y')
        if lower is not "":
            return self.edge_metadata.loc[self.edge_metadata[attribute] > float(lower), columns]

        if equal is not "":
            try:
                value = float(equal)
            except ValueError:
                value = equal
            return self.edge_metadata.loc[self.edge_metadata[attribute] == value, columns]

        if upper is not "":
            return self.edge_metadata.loc[self.edge_metadata[attribute] < float(upper), columns]

    def retrive_default_table_values(self):
        """ Returns all edge_metadata values need to initialize slickgrid
        """
        columns = list(self.headers)
        columns.append('x')
        columns.append('y')
        return self.edge_metadata[columns]

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
        # TODO: need to collapse the cached trees as well
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

    def retrive_headers(self):
        """ Returns a list of the headers for the metadata

        Parameters
        ----------

        Returns
        -------
        return : list
            a list of the internal metadata headers
        """
        return self.headers

    def in_quad_1(self, angle):
        """ Determines if the angle is between 0 and pi / 2 radians

        Parameters
        ----------
        angle : float
            the angle of a vector in radians

        Returns
        -------
        return : bool
            true if angle is between 0 and pi / 2 radians
        """
        return True if angle > 0 and angle < math.pi / 2 else False

    def in_quad_4(self, angle):
        """ Determines if the angle is between (3 * pi) / 2 radians and 2 * pi

        angle : float
            the angle of a vector in radians

        Returns
        -------
        return : bool
            true is angle is between 0 and pi / 2 radians
        """
        return True if angle > 3 * math.pi / 2 and angle < 2 * math.pi else False

    def calculate_angle(self, v):
        """ Finds the angle of the two 2-d vectors in radians

        Parameters
        ----------
        v : tuple
            vector

        Returns
        -------
            angle of vector in radians
        """
        if v[0] == 0:
            return math.pi / 2 if v[1] > 0 else 3 * math.pi / 2

        angle = math.atan(v[1] / v[0])

        if v[0] > 0:
            return angle if angle >= 0 else 2 * math.pi + angle
        else:
            return angle + math.pi if angle >= 0 else (2 * math.pi + angle) - math.pi

    def hull_sector_info(self, a_1, a_2):
        """ determines the starting angle of the sector and total theta of the sector.
        Note this is only to be used if the sector is less than pi radians

        Parameters
        ----------
        a1 : float
            angle (in radians) of one of the edges of the sector
        a2 : float
            angle (in radians of one of the edges of the sector)

        Returns
        -------
        starting angle : float
            the angle at which to start drawing the sector
        theta : float
            the angle of the sector
        """
        # detemines the angle of the sector as well as the angle to start drawing the sector
        if (not (self.in_quad_1(a_1) and self.in_quad_4(a_2) or
                 self.in_quad_4(a_1) and self.in_quad_1(a_2))):
            a_min, a_max = (min(a_1, a_2), max(a_1, a_2))
            if a_max - a_min > math.pi:
                a_min += 2 * math.pi
                starting_angle = a_max
                theta = a_min - a_max
            else:
                starting_angle = a_2 if a_1 > a_2 else a_1
                theta = abs(a_1 - a_2)
        else:
            starting_angle = a_1 if a_1 > a_2 else a_2
            ending_angle = a_1 if starting_angle == a_2 else a_2
            theta = ending_angle + abs(starting_angle - 2 * math.pi)

        return (starting_angle, theta)

    def color_clade(self, clade, color):
        """ Will highlight a certain clade by drawing a sector around the clade.
        The sector will start at the root of the clade and create an arc from the
        most to the right most tip. The sector will aslo have a defualt arc length
        equal to the distance from the root of the clade to the deepest tip..

        Parameters
        ----------
        clade : string
            The clade to highlight
        color : string (hex string)
            The color to highlight the clade with

        Returns
        -------
        return : list
            A list of all highlighted clades
        """
        # is it be safe to assume clade ids will be unique?
        clade_root = self.edge_metadata.loc[self.edge_metadata[self.clade_field] == clade]
        clade_root_id = clade_root['Node_id'].values[0] if len(clade_root) > 0 else -1

        if clade_root_id == -1:
            return {}

        clade = self.tree.find(clade_root_id)

        color_clade = self.get_sector(clade)
        color_clade['color'] = color
        return color_clade

        # Note: all calculations are down by making the clade root (0,0)

    def get_sector(self, clade):

        # grab all of the tips of the clade
        tips = clade.tips()

        # stores points for the convex hull
        points = np.array([[0, 0]])

        # origin
        center = (0, 0)

        # parallel array to points. Used to locate the node for each point
        nodes = [clade]

        # will store the distance to the farthest tip
        arc_length = 0

        # Finds the max tip distance, largest and smallest angle
        for tip in tips:
            # add tip to set of points
            tip_coords = (tip.x2 - clade.x2, tip.y2 - clade.y2)
            point = np.array([[tip_coords[0], tip_coords[1]]])
            points = np.concatenate((points, point), axis=0)
            nodes.append(tip)

            # calculate distance from clade root to tip
            tip_dist = distance.euclidean(tip_coords, center)

            arc_length = tip_dist if tip_dist > arc_length else arc_length

        # Note: the angle of the sector used to be found by taking the difference between the tips
        # with the smallest and largest angle. However, that lead to an edge case that became
        # fairly messy to deal with.

        # find angle of sector by find the two points that are adjacent to (clade.x2, clade.y2)
        # in the convex hull
        hull = ConvexHull(points)
        hull_vertices = hull.vertices
        clade_index = -1

        for i in range(0, len(hull_vertices)):
            if hull_vertices[i] == 0:
                clade_index = i
                break

        # calculates the bounding angles of the sector based on whether the clade root
        # is part of the convex hull
        if clade_index != -1:
            # the left most and right most branch of the clade
            e_1 = hull_vertices[i + 1 if i < len(hull_vertices) - 1 else 0]
            e_2 = hull_vertices[i - 1]
            (edge_1, edge_2) = (points[e_1], points[e_2])

            # calculate the angle of the left and right most branch of the clade
            (a_1, a_2) = (self.calculate_angle(edge_1), self.calculate_angle(edge_2))

            # the starting/total angle of the sector
            (starting_angle, theta) = self.hull_sector_info(a_1, a_2)

        else:
            # find the tips whose edge contains the angle of the ancestor branch
            angles = [self.calculate_angle(points[x]) for x in range(0, len(points)) if set(points[x]) != set([0, 0])]
            angles = sorted(angles)

            # calculate the angle going from clade root to its direct ancestor
            clade_ancestor = clade.parent
            ancestor_coords = (clade_ancestor.x2 - clade.x2, clade_ancestor.y2 - clade.y2)
            ancestor_angle = self.calculate_angle((ancestor_coords))

            # find the two tips that contain the clade ancestor
            tips_found = False
            for i in range(0, len(angles)):
                if angles[i] < ancestor_angle < angles[i + 1]:
                    (a_1, a_2) = (angles[i], angles[i + 1])
                    tips_found = True
                    break

            if not tips_found:
                (a_1, a_2) = (angles[0], angles[i])

            # detemines the starting angle of the sectorr
            if ancestor_angle <= math.pi:
                starting_angle = a_1 if a_1 > a_2 else a_2
            else:
                starting_angle = a_2 if a_1 > a_2 else a_1

            # calculate the theta of the sector
            theta = 2 * math.pi - abs(a_1 - a_2)

        clade_ancestor = clade.parent

        # the sector webgl will draw
        colored_clades = {
            'center_x': clade.x2,
            'center_y': clade.y2,
            'starting_angle': starting_angle,
            'theta': theta,
            'arc_length': arc_length}

        return colored_clades

    def create_subtree(self, attribute, lower="", equal="", upper=""):
        """
        Parameters
        ----------
        attribute : string
            The name of the attribute(column of the table).
        lower : integer
            The smallest number a feature must match in order for its color to change
        equal : string/integer
            The number/string a feature must match in order for its color to change
        upper : integer
            The largest number a feature can match in order for its color to change
        Returns
        -------
        edgeData : pd.Dataframe
            updated version of edge metadata
        """
        # retrive the tips of the subtree
        nodes = self.retrive_highlighted_values(attribute, lower, equal, upper)
        nodes = nodes['Node_id'].values
        tips = list()
        for node in nodes:
            # node is a tip
            if self.tree.find(node).is_tip():
                tips.append(node)
                continue
            # retive the tips of node
            for tip in self.tree.find(node).tips():
                tips.append(tip.name)

        # store the previous tree/metadata
        self.cached_subtrees.append((self.edge_metadata, self.tree))

        # grab relivent metadata for old metadata
        columns = list(self.edge_metadata.columns.values)
        columns.remove('x')
        columns.remove('y')
        columns.remove('px')
        columns.remove('py')
        self.tree = self.tree.shear(tips)
        nodes = list()
        for node in self.tree.postorder():
            nodes.append(node.name)
        metadata = self.edge_metadata.loc[self.edge_metadata["Node_id"].isin(nodes), columns]

        # create new metadata
        (self.edge_metadata, self.centerX,
            self.centerY, self.scale) = self.tree.coords(900, 1500)
        self.edge_metadata = self.edge_metadata[['Node_id', 'x', 'y', 'px', 'py']]
        self.edge_metadata = pd.merge(self.edge_metadata, metadata,
                                      how='outer', on="Node_id")
        self.center_tree()
        return self.edge_metadata

    def revive_old_tree(self):
        if len(self.cached_subtrees) > 0:
            self.edge_metadata, self.tree = self.cached_subtrees.pop()
            return self.edge_metadata
        return pd.DataFrame()

    def select_sub_tree(self, x, y, width, length):
        df = self.edge_metadata
        print(x,y,width,length)
        entries = df.loc[
            df['x'] > x & df['x'] < (x + length) &
            df['y'] > y & df['y'] < (y + width)]
        print(entries)
        return entries
