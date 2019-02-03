import math
import sys
import heapq
import time
import re
import pandas as pd
import numpy as np
from collections import namedtuple
from empress.compare import Default_Cmp
from empress.compare import Balace_Cmp
from empress.tree import Tree
from empress.tree import DEFAULT_COLOR
from empress.tree import SELECT_COLOR
import empress.tools as tools

DEFAULT_WIDTH = 4096
DEFAULT_HEIGHT = 4096
class Model(object):

    def __init__(self, tree, metadata, highlight_ids=None,
                 coords_file=None, port=8080):
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
        self.TIP_LIMIT = 100
        self.zoom_level = 1
        self.scale = 1
        # convert to empress tree
        print('converting tree TreeNode to Tree')
        self.tree = Tree.from_tree(tree)
        tools.name_internal_nodes(self.tree)

        if coords_file is None:
            print('calculating tree coords')
            self.tree.tip_count_per_subclade()
            self.edge_metadata = self.tree.coords(DEFAULT_WIDTH, DEFAULT_HEIGHT)
        else:
            print('extracting tree coords from file')
            self.tree.from_file(coords_file)
            self.edge_metadata = self.tree.to_df()

        # read in main metadata
        self.headers = metadata.columns.values.tolist()
        self.edge_metadata = pd.merge(self.edge_metadata, metadata,
                                      how='outer', on="Node_id")

        # todo need to warn user that some entries in metadata do not have a mapping to tree
        self.edge_metadata = self.edge_metadata[self.edge_metadata.x.notnull()]
        self.edge_metadata['index'] = self.edge_metadata['Node_id']
        self.edge_metadata = self.edge_metadata.set_index('index')

        self.triangles = pd.DataFrame()
        self.selected_tree = pd.DataFrame()
        self.selected_root = self.tree
        self.triData = {}
        self.colored_clades = {}

        # cached subtrees
        self.cached_subtrees = list()
        self.cached_clades = list()

        # start = time.time()
        # print('starting auto collapse')
        # self.default_auto_collapse(100)
        # end = time.time()
        # print('finished auto collapse in %d' % (end - start))

        print('highlight_ids')
        self.highlight_nodes(highlight_ids)
        self.__clade_level()

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

    def highlight_nodes(self, highlight_ids=None):

        """ Reads in Node_ids for 'file' and colors their branches red
        Parameters
        ----------
        file : csv file containing Node_ids
        """

        # with open(highlight_ids, 'r') as file:
        #     lines = file.readlines()
        # ids = [re.split(';', item) for item in lines]
        # em = self.edge_metadata
        # for i in range(len(ids)):
        #     em.loc[em['Node_id'] == ids[i][0], 'branch_color'] = ids[i][1]


        if highlight_ids is not None:
            # idx = self.edge_metadata['Node_id'].isin(highlight_ids)
            # self.edge_metadata.loc[idx, 'branch_color'] = highlight_color
            self.edge_metadata.update(highlight_ids)

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


    def color_clade(self, clade_field, clade, color):
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
        if clade_field != 'None':
            c = clade
            clade_root = self.edge_metadata.loc[self.edge_metadata[clade_field] == clade]
            clade_roots_id = clade_root['Node_id'].values

            if len(clade_roots_id) == 0:
                for c in range(0, len(self.cached_clades)):
                    if clade in self.cached_clades[c]:
                        self.cached_clades[c][clade]['color'] = color
                return {"empty": []}

            i = 0
            for clade_root_id in clade_roots_id:
                clade = self.tree.find(clade_root_id)
                color_clade = self.tree.get_clade_info(clade)
                color_clade['color'] = color
                color_clade_s = tools.create_arc_sector(color_clade)
                depth = len([node.name for node in clade.ancestors()])
                self.colored_clades[c+str(i)] = {'data': color_clade_s,
                                          'depth': depth,
                                          'color': color,
                                          'id': clade_root_id}
                i += 1
        else:
            i = 0
            clade_name = clade
            for (k,v) in self.colored_clades.items():
                if clade_name in k:
                    clade_id = v['id']
                    clade = self.tree.find(clade_id)
                    color_clade = self.tree.get_clade_info(clade)
                    color_clade['color'] = color
                    color_clade_s = tools.create_arc_sector(color_clade)
                    depth = len([node.name for node in clade.ancestors()])
                    self.colored_clades[k] = {'data': color_clade_s,
                                              'depth': depth,
                                              'color': color,
                                              'id': clade_id}
                    i += 1
        return self.get_colored_clade()

    def clear_clade(self, clade):
        """ Removes the colored clade
        Note this doesn't remove any branches from the tree. It only removes the artifacts
        created by javascript
        """
        clades = self.colored_clades.keys()
        clades = [c for c in clades]
        for c in clades:
            if clade in c:
                self.colored_clades.pop(c)

        for colored_clades in self.cached_clades:
            clades = colored_clades.keys()
            clades = [c for c in clades]
            for c in clades:
                if clade in c:
                    colored_clades.pop(c)

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
            clade_id = self.colored_clades[k]['id']
            clade = self.tree.find(clade_id)
            color_clade = self.tree.get_clade_info(clade)
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
        self.edge_metadata = self.tree.coords(900, 1500)
        self.edge_metadata = self.edge_metadata[['Node_id', 'x', 'y', 'px', 'py']]
        self.edge_metadata = pd.merge(self.edge_metadata, metadata,
                                      how='outer', on="Node_id")

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
        self.__collapse_clade(clade)
        self.update_collapse_clades()
        return self.edge_metadata.loc[self.edge_metadata['branch_is_visible']]

    def update_collapse_clades(self):
        """
        Call this method after a series of clade collapse to hide the collapse clade within
        collapsed clades
        """
        collapse_ids = self.triData.keys()
        for node_id in collapse_ids:
            ancestors = [a.name for a in self.tree.find(node_id).ancestors()]
            for other_id in collapse_ids:
                if other_id in ancestors:
                    self.triData[node_id]['visible'] = False

    def get_triangles(self):
        triangles = {k: v for (k, v) in self.triData.items() if v['visible']}
        self.triangles = pd.DataFrame(triangles).T
        return self.triangles

    def __get_tie_breaker_num(self):
        self.tie_breaker += 1
        return self.tie_breaker

    def __collapse_clade(self, clade):
        if not clade.is_tip():
            s = self.tree.get_clade_info(clade)

            (rx, ry) = (clade.x2, clade.y2)
            theta = s['starting_angle']
            (c_b1, s_b1) = (math.cos(theta), math.sin(theta))
            (x1, y1) = (s['largest_branch'] * c_b1, s['largest_branch'] * s_b1)

            # find right most branch
            theta += s['theta']
            (c_b2, s_b2) = (math.cos(theta), math.sin(theta))
            (x2, y2) = (s['smallest_branch'] * c_b2, s['smallest_branch'] * s_b2)

            (x1, y1) = (x1 + rx, y1 + ry)
            (x2, y2) = (x2 + rx, y2 + ry)
            level = clade.level
        else:
            (rx, ry) = (clade.parent.x2, clade.parent.y2)
            (x1, y1) = (x2, y2) = (clade.x2, clade.y2)
            collapsed_nodes = [clade]
            nodes = [clade.name]
            level = clade.parent.level


        collapsed_nodes = [node for node in clade.postorder(include_self=False)]
        nodes = [node.name for node in collapsed_nodes]
        nId = {"Node_id": clade.name}
        root = {'cx': rx, 'cy': ry}
        shortest = {'lx': x1, 'ly': y1}
        longest = {'rx': x2, 'ry': y2}
        color = {'color': "0000FF"}
        visible = {'visible': True}
        depth = {'depth': level}
        self.triData[clade.name] = {**nId, **root, **shortest,
                                                 **longest, **color, **visible, **depth}

        self.edge_metadata.loc[self.edge_metadata['Node_id'].isin(nodes), 'branch_is_visible'] = False
        return collapsed_nodes


    def default_auto_collapse(self, tips):
        """
        collapses clades with fewest num of tips until number of tips is TIP_LIMIT
        WARNING: this method will automatically uncollapse all clades.
        """
        self.tie_breaker = 0

        # uncollapse everything
        self.edge_metadata['branch_is_visible'] = True
        self.triData = {}
        num_tips = int(self.tree.tip_count * (float(tips)/ 100.0))
        collapse_amount = self.tree.tip_count - num_tips
        Element = namedtuple('Element', ' level tips breaker clade')
        pq = [Element(clade.level, clade.tip_count, self.__get_tie_breaker_num(), clade)
                for clade in self.tree.levelorder(include_self=False) if clade.tip_count < collapse_amount]
        pq = sorted(pq, key=Default_Cmp)
        collapsed_nodes = set()
        for clade in pq:
            if collapse_amount == 0:
                    break
            if collapse_amount - clade.tips >= 0 and clade.clade not in collapsed_nodes:
                if clade.tips > 1:
                    collapsed = set(self.__collapse_clade(clade.clade))
                    collapsed_nodes |= collapsed
                else:
                    self.edge_metadata.loc[self.edge_metadata['Node_id'] == clade.clade.name, 'branch_color'] = '0000FF'
                collapse_amount -= clade.tips

        return self.edge_metadata.loc[self.edge_metadata['branch_is_visible']]

    # TODO: Needs to implement set
    def balance_auto_collapse(self, tips, threshold):
        """
        collapses clades with fewest num of tips until number of tips is TIP_LIMIT
        WARNING: this method will automatically uncollapse all clades.
        """
        L_CHLD = 0
        R_CHLD = 1
        # uncollapse everything
        self.edge_metadata['branch_is_visible'] = True
        self.triData = {}
        num_tips = int(self.tree.tip_count * (float(tips)/ 100.0))
        collapse_amount = self.tree.tip_count - num_tips
        threshold = -1 #float(float(threshold) / 100.0)
        cur_node = self.tree
        Element = namedtuple('Element', 'node left right')
        start_node = Element(self.tree, False, False)
        holdings = [start_node]
        balances = dict(self.edge_metadata[['Node_id', 'C(diet)[T.Not]']].values)
        count = 0
        while collapse_amount > 0 and len(holdings) > 0:
            count += 1
            item = holdings.pop()
            node = item.node
            if node.is_tip():
                self.__collapse_clade(node)
                collapse_amount -= node.tip_count
                continue

            # collapse node if both children have been explored
            if item.left and item.right:
                self.__collapse_clade(node)
                continue

            # collapse the subtree that contributes the least to the balance
            if abs(balances[node.name]) > threshold:
                if balances[node.name] < 0:
                    if collapse_amount - node.children[L_CHLD].tip_count > 0:
                        self.__collapse_clade(node.children[L_CHLD])
                        collapse_amount -= node.children[L_CHLD].tip_count
                        holdings.append(Element(node, True, True))
                        holdings.append(Element(node.children[R_CHLD], False, False))
                    else:
                        holdings.append(Element(node.children[L_CHLD], False, False))

                else:
                    if collapse_amount - node.children[R_CHLD].tip_count > 0:
                        self.__collapse_clade(node.children[R_CHLD])
                        collapse_amount -= node.children[R_CHLD].tip_count
                        holdings.append(Element(node, True, True))
                        holdings.append(Element(node.children[L_CHLD], False, False))
                    else:
                        holdings.append(Element(node.children[R_CHLD], False, False))

            # handle threshold

        return self.edge_metadata.loc[self.edge_metadata['branch_is_visible']]

    def uncollapse_selected_tree(self, x, y):
        """
            Parameters
            ----------
            x: The x coordinate of the double click
            y: The y coordinate of the double click
        """
        selected_ids = []
        # Find triangles that contains the point
        for k in self.triData.keys():
            if self.is_in_triangle(k, x, y):
                selected_ids.append(k)

        # Find the highest level of triangle
        outer = sys.maxsize
        outer_node = None
        for id in selected_ids:
            if self.triData[id]['depth'] < outer:
                outer = self.triData[id]['depth']
                outer_node = id
        nodes = [node.name for node in self.tree.find(outer_node).postorder(include_self=False)]
        for id in self.triData.keys():
            if id in nodes:
                selected_ids.append(id)

        # Find the next highest level of triangle if there is any
        inner = sys.maxsize
        inner_node = None
        for id in selected_ids:
            depth = self.triData[id]['depth']
            if depth > outer and depth < inner:
                inner = self.triData[id]['depth']
                inner_node = id

        del self.triData[outer_node]
        if inner_node:
            nodes_inner = [node.name for node in self.tree.find(inner_node).postorder(include_self=False)]
            nodes = list(set(nodes)-set(nodes_inner))
        for id in self.triData.keys():
            self.triData[id]['visible'] = True
        self.edge_metadata.loc[self.edge_metadata['Node_id'].isin(nodes), 'branch_is_visible'] = True
        return self.edge_metadata.loc[self.edge_metadata['branch_is_visible']]


    def is_in_triangle(self, root, x, y):
        """
        Check if a point is in triangle of root
        """
        x = np.float64(x)
        y = np.float64(y)
        triangle = self.triData[root]
        area = self.triangle_area(
            triangle['cx'],
            triangle['cy'],
            triangle['lx'],
            triangle['ly'],
            triangle['rx'],
            triangle['ry'],
        )
        sub_1 = self.triangle_area(
            x,
            y,
            triangle['lx'],
            triangle['ly'],
            triangle['rx'],
            triangle['ry'],
        )
        sub_2 = self.triangle_area(
            x,
            y,
            triangle['cx'],
            triangle['cy'],
            triangle['rx'],
            triangle['ry'],
        )
        sub_3 = self.triangle_area(
            x,
            y,
            triangle['lx'],
            triangle['ly'],
            triangle['cx'],
            triangle['cy'],
        )
        return abs(sub_1 + sub_2 + sub_3-area) < 0.001

    def triangle_area(self, x1, y1, x2, y2, x3, y3):
        """
        Calculate triangle area
        """
        return abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2.0)

    def get_triangles(self):
        triangles = {k: v for (k, v) in self.triData.items() if v['visible']}
        self.triangles = pd.DataFrame(triangles).T
        return self.triangles

    def __clade_level(self):
        """
        Calculates the depth of each node in self.tree
        """
        for node in self.tree.levelorder():
            node.level = len(node.ancestors())
            node.tip_count = 0
