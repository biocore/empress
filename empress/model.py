import math
import pandas as pd
import numpy as np
from empress.tree import Tree
from empress.tree import DEFAULT_COLOR
from empress.tree import SELECT_COLOR
import empress.tools as tools

DEFAULT_WIDTH = 1920
DEFAULT_HEIGHT = 1920


class Model(object):

    def __init__(self, tree, metadata, clade_field, highlight_ids=None,
                 port=8080):
        """ Model constructor.

        This initializes the model, including
        the tree object and the metadata.

        Parameters
        ----------
        tree : skbio.TreeNode
            Tree data structure.
        metadata : str
            Metadata object for the features being plotted on the tree.
        clade_field : str
            Name of field within metadata that contains clade names
        highlight_file : list of str
            List of nodes to highlight
        port : int
            port number

        Notes
        -----
        The first column name should be renamed to Node_id
        """
        self.zoom_level = 1
        self.scale = 1
        # convert to empress tree
        self.tree = Tree.from_tree(tree)
        tools.name_internal_nodes(self.tree)
        (self.edge_metadata, self.centerX,
            self.centerY, self.scale) = self.tree.coords(DEFAULT_WIDTH, DEFAULT_HEIGHT)

        # read in main metadata
        self.headers = metadata.columns.values.tolist()
        self.edge_metadata = pd.merge(self.edge_metadata, metadata,
                                      how='outer', on="Node_id")

        # todo need to warn user that some entries in metadata do not have a mapping to tree
        self.edge_metadata = self.edge_metadata[self.edge_metadata.x.notnull()]

        self.triangles = pd.DataFrame()
        self.clade_field = clade_field
        self.selected_tree = pd.DataFrame()
        self.selected_root = self.tree
        self.triData = {}
        self.colored_clades = {}

        # cached subtrees
        self.cached_subtrees = list()
        self.cached_clades = list()

        self.highlight_nodes(highlight_ids)

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
        edgeData : pd.Dataframe
            dataframe containing information necessary to draw tree in
            webgl
        """
        attributes = ['x', 'y', 'node_color', 'size']
        return self.select_category(attributes, 'node_is_visible')

    def select_category(self, attributes, is_visible_col):
        """ Returns edge_metadata whose 'is_visible_col is True'
        Parameters
        ----------
        edgeData : pd.Dataframe
            dataframe containing information necessary to draw tree in
            webgl
        """
        is_visible = self.edge_metadata[is_visible_col]
        edgeData = self.edge_metadata[is_visible]

        return edgeData[attributes]

    def update_edge_category(self, attribute, category,
                             new_value=DEFAULT_COLOR, lower="",
                             equal="", upper=""):
        """ Returns edge_metadata with updated width value which tells View
        what to hightlight

        Parameters
        ----------
        attribute : str
            The name of the attribute(column of the table).
        category:
            The column of table that will be updated such as branch_color
        new_value : str
            A hex string representing color to change branch
        lower : float
            The smallest number a feature must match in order for its color to change
        equal : str/float
            The number/string a feature must match in order for its color to change
        upper : float
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

    def highlight_nodes(self, highlight_ids=None, highlight_color='FF0000'):
        """ Reads in Node_ids for 'file' and colors their branches red
        Parameters
        ----------
        file : csv file containing Node_ids
        """

        if highlight_ids is not None:
            idx = self.edge_metadata['Node_id'].isin(highlight_ids)
            self.edge_metadata.loc[idx, 'branch_color'] = highlight_color

    def get_highlighted_values(self, attribute, lower="",
                               equal="", upper=""):
        """ Returns edge_metadata with that match the arguments

        Parameters
        ----------
        attribute : str
            The name of the attribute(column of the table).
        lower : int
            The smallest number a feature must match in order for its color to change
        equal : str/int
            The number/string a feature must match in order for its color to change
        upper : int
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
            value = equal
            return self.edge_metadata.loc[self.edge_metadata[attribute] == value, columns]

        if upper is not "":
            return self.edge_metadata.loc[self.edge_metadata[attribute] < float(upper), columns]

    def get_default_table_values(self):
        """ Returns all edge_metadata values need to initialize slickgrid
        Parameters
        ----------
        Returns
        -------
        pd.DataFrame
            dataframe containing information necessary to draw tree in
            webgl
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

    def get_headers(self):
        """ Returns a list of the headers for the metadata

        Parameters
        ----------

        Returns
        -------
        return : list
            a list of the internal metadata headers
        """
        return self.headers

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
        c = clade
        clade_root = self.edge_metadata.loc[self.edge_metadata[self.clade_field] == clade]
        clade_root_id = clade_root['Node_id'].values[0] if len(clade_root) > 0 else -1

        if clade_root_id == -1:
            for c in range(0, len(self.cached_clades)):
                if clade in self.cached_clades[c]:
                    self.cached_clades[c][clade]['color'] = color
            return {"empty": []}

        clade = self.tree.find(clade_root_id)

        tips = clade.tips()
        clade_ancestor = clade.parent
        center_coords = (clade.x2, clade.y2)
        ancestor_coords = (clade_ancestor.x2 - clade.x2, clade_ancestor.y2 - clade.y2)
        points = [[tip.x2 - clade.x2, tip.y2 - clade.y2] for tip in tips]
        color_clade = tools.sector_info(points, center_coords, ancestor_coords)
        color_clade['color'] = color
        color_clade_s = tools.create_arc_sector(color_clade)
        depth = len([node.name for node in clade.ancestors()])
        self.colored_clades[c] = {'data': color_clade_s,
                                  'depth': depth,
                                  'color': color}
        return self.get_colored_clade()

    def clear_clade(self, clade):
        """ Removes the colored clade
        Note this doesn't remove any branches from the tree. It only removes the artifacts
        created by javascript
        """
        self.colored_clades.pop(clade)
        for colored_clades in self.cached_clades:
            try:
                colored_clades.pop(clade)
            except KeyError:
                continue

        return self.get_colored_clade()

    def get_colored_clade(self):
        CLADE_INDEX = 0
        DEPTH_INDEX = 1
        clades = [(k, v['depth']) for k, v in self.colored_clades.items()]
        clades.sort(key=lambda clade: clade[DEPTH_INDEX])
        sorted_clades = [self.colored_clades[clade[CLADE_INDEX]]['data'] for clade in clades]
        sorted_clades = [flat for two_d in sorted_clades for flat in two_d]
        return {"clades": sorted_clades}

    def refresh_clades(self):
        colored_clades = {}
        for k, v in self.colored_clades.items():
            clade_root = self.edge_metadata.loc[self.edge_metadata[self.clade_field] == k]
            clade_root_id = clade_root['Node_id'].values[0] if len(clade_root) > 0 else -1

            if clade_root_id != -1:
                clade = self.tree.find(clade_root_id)
                tips = clade.tips()
                clade_ancestor = clade.parent
                center_coords = (clade.x2, clade.y2)
                ancestor_coords = (clade_ancestor.x2 - clade.x2, clade_ancestor.y2 - clade.y2)
                points = [[tip.x2 - clade.x2, tip.y2 - clade.y2] for tip in tips]
                color_clade = tools.sector_info(points, center_coords, ancestor_coords)
                color_clade['color'] = v['color']
                color_clade_s = tools.create_arc_sector(color_clade)
                depth = len([node.name for node in clade.ancestors()])
                colored_clades[k] = {'data': color_clade_s,
                                     'depth': depth,
                                     'color': color_clade['color']}
        return colored_clades

    def create_subtree(self, attribute, lower="", equal="", upper=""):
        """ Creates a subtree from from the tips whose metadata matches the users query. Also, if
        the attribute referes to an inner node, then this method will first locate the tips whose
        ansestor is the inner node. This will create a subtree by passing in the tips to skbio.shear()
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
        nodes = self.get_highlighted_values(attribute, lower, equal, upper)
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

        self.cached_clades.append(self.colored_clades)
        self.colored_clades = self.refresh_clades()

        return self.edge_metadata

    def get_old_tree(self):
        """ retrives the nost recently cached tree if one exists.
        """
        if len(self.cached_subtrees) > 0:
            self.edge_metadata, self.tree = self.cached_subtrees.pop()

            old_clades = self.colored_clades
            self.colored_clades = self.cached_clades.pop()
            for k, v in old_clades.items():
                if k not in self.colored_clades:
                    self.colored_clades[k] = v
                self.colored_clades[k]['color'] = old_clades[k]['color']

            self.colored_clades = self.refresh_clades()

            return self.edge_metadata
        return pd.DataFrame()

    def select_sub_tree(self, x1, y1, x2, y2):
        """ Marks all tips whose coordinates in the box created by (x1, y1) and (x2, y2). The marked
        tips can then be used in collapse_selected_tree

        Parameters
        ----------
        x1 : Number
            The x coordinate of the top left corner of the select box
        y1 : Number
            The y coordinate of the top left corner of the select box
        x2 : Number
            The x coordinate of the bottom right corner of the select box
        y2 : Number
            The y coordinate of the bottom right corner of the select box
        """
        df = self.edge_metadata
        (x1, y1, x2, y2) = (float(x1), float(y1), float(x2), float(y2))
        (smallX, smallY) = (min(x1, x2), min(y1, y2))
        (largeX, largeY) = (max(x1, x2), max(y1, y2))
        entries = df.loc[
            (df['x'] >= smallX) & (df['x'] <= largeX) &
            (df['y'] >= smallY) & (df['y'] <= largeY)]
        entries = entries["Node_id"].values
        if len(entries) == 0:
            return pd.DataFrame()
        if len(entries) == 1:
            nodes = entries
            root = entries
        else:
            root = self.tree.lowest_common_ancestor(entries)
            nodes = [node.name for node in root.postorder(include_self=False)]
        selected_tree = self.edge_metadata.loc[self.edge_metadata["Node_id"].isin(nodes)]
        self.selected_tree = selected_tree.copy()
        self.selected_tree['branch_color'] = SELECT_COLOR
        self.selected_root = root
        return self.selected_tree

    def collapse_selected_tree(self):
        clade = self.selected_root
        tips = clade.tips()
        clade_ancestor = clade.parent
        center_coords = (clade.x2, clade.y2)
        ancestor_coords = (clade_ancestor.x2 - clade.x2, clade_ancestor.y2 - clade.y2)
        points = [[tip.x2 - clade.x2, tip.y2 - clade.y2] for tip in tips]
        s = tools.sector_info(points, center_coords, ancestor_coords)
        nodes = self.selected_tree['Node_id'].values

        (rx, ry) = (self.selected_root.x2, self.selected_root.y2)

        theta = s['starting_angle']
        (c_b1, s_b1) = (math.cos(theta), math.sin(theta))
        (x1, y1) = (s['largest_branch'] * c_b1, s['largest_branch'] * s_b1)

        # find right most branch
        theta += s['theta']
        (c_b2, s_b2) = (math.cos(theta), math.sin(theta))
        (x2, y2) = (s['smallest_branch'] * c_b2, s['smallest_branch'] * s_b2)

        (x1, y1) = (x1 + rx, y1 + ry)
        (x2, y2) = (x2 + rx, y2 + ry)

        nId = {"Node_id": self.selected_root.name}
        root = {'cx': rx, 'cy': ry}
        shortest = {'lx': x1, 'ly': y1}
        longest = {'rx': x2, 'ry': y2}
        color = {'color': "0000FF"}
        visible = {'visible': True}
        self.triData[self.selected_root.name] = {**nId, **root, **shortest,
                                                 **longest, **color, **visible}

        self.edge_metadata.loc[self.edge_metadata['Node_id'].isin(nodes), 'branch_is_visible'] = False

        collapse_ids = self.triData.keys()
        for node_id in collapse_ids:
            ancestors = [a.name for a in self.tree.find(node_id).ancestors()]
            if self.selected_root.name in ancestors:
                self.triData[node_id]['visible'] = False

        return self.edge_metadata.loc[self.edge_metadata['branch_is_visible']]

    def get_triangles(self):
        triangles = {k: v for (k, v) in self.triData.items() if v['visible']}
        self.triangles = pd.DataFrame(triangles).T
        return self.triangles
