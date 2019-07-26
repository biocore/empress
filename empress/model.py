import math
import sys
import heapq
import time
import re
import pandas as pd
import numpy as np
import matplotlib.pyplot as plot
from matplotlib.colors import Normalize as norm
import matplotlib.cm as cm
from scipy.spatial.distance import cdist
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
        print("done calculating")

        # read in main metadata
        if metadata is not None:
            self.edge_metadata = pd.merge(self.edge_metadata, metadata,
                                          how='outer', on="Node_id")
            # get tip/internal node columns
            em = self.edge_metadata
            self.headers = metadata.columns.values.tolist()
            self.headers.remove("Node_id")
            self.tip_headers = em.loc[em["is_child"] == True].dropna(axis=1, how='all').columns.values.tolist()
            self.tip_headers = list(set(self.tip_headers) & set(self.headers))
            self.node_headers = em.loc[em["is_child"] == False].dropna(axis=1, how='all').columns.values.tolist()
            self.node_headers = list(set(self.node_headers) & set(self.headers))

        # todo need to warn user that some entries in metadata do not have a mapping to tree
        self.edge_metadata = self.edge_metadata[self.edge_metadata.x.notnull()]
        self.edge_metadata['index'] = self.edge_metadata['Node_id']
        self.edge_metadata = self.edge_metadata.set_index('index')
        self.triangles = pd.DataFrame()
        self.selected_tree = pd.DataFrame()
        self.selected_root = self.tree
        self.triData = {}
        self.colored_clades = {}

        # # cached subtrees
        self.cached_subtrees = list()
        self.cached_clades = list()

        print('highlight_ids')
        self.highlight_nodes(highlight_ids)
        self.__clade_level()


    def color_branches(self, attribute, color, total_unique=8, tip=True):
        """ Colors tree branches based on attribute. If attribute is numeric than branches will
        be colored using a gradient. If attribute is catergorical than the largest "total_unique" categories
        will be colored and the reset will be colored as "other".

        Parameters
        ----------
        attribute : str
            The name of the attribute (column of the table).
        color : str
            The color scheme to use
        total_unique : int
            The number of unique catergories to color. if attribute is numberic, this can be ignored
        tip : Boolean
            If tip is tree than only the tip will be colored. Otherwise only the internal
            branches will be colored.
        Returns
        -------
        edgeData : pd.Dataframe
            All entries from self.edge_metadata that are visible and match criteria
            passed in.
        """
        change_cat=['red', 'green', 'blue']
        df = self.edge_metadata
        result = {}

        if attribute == "reset":
            df.loc[df["is_tip"] == tip, change_cat] = DEFAULT_COLOR
        elif df[attribute].dtype == object: # attribute is a categorical variable
            # grab either the internal branches or tips
            cat = df.loc[df["is_tip"] == tip, attribute].copy()
            cat = cat.loc[~cat.isnull()]

            # find if there are more than 8 categories
            unique_cat = cat.value_counts()
            m_t_eight = True if len(unique_cat) > total_unique else False

            # convert category to number; if more than 8 categgoires than largest 8 categories get a unique number
            # and the rest are assign to other (number 9)
            if m_t_eight:
                unique_cat[0:total_unique] = list(range(0, total_unique))
            else:
                unique_cat[0:len(unique_cat)] = list(range(1, len(unique_cat) + 1))
            unique_cat[total_unique:] = total_unique + 1
            unique_cat = unique_cat.to_dict()
            max_val = total_unique if m_t_eight else len(unique_cat)
            min_val = 0

            # create color map
            n = norm(vmin=min_val, vmax=max_val)
            cmap = cm.ScalarMappable(norm=n, cmap=color)
            colors = dict({(k, tuple(cmap.to_rgba(v)[:3])) if v <= total_unique \
                            else (k, tuple(DEFAULT_COLOR)) for k, v in unique_cat.items()})

            # color branches
            new_colors = cat.values.tolist()
            new_colors = [colors[c] for c in new_colors]
            cat = pd.DataFrame(new_colors, columns=change_cat, index=cat.index)
            df.update(cat)

            # collect information that will be used to create the color key in js
            # result["keyInfo"] = dict({("other",tools.get_color_hex_code(v)) if unique_cat[k] > total_unique and m_t_eight \
            #                 else (k,tools.get_color_hex_code(v)) for k, v in colors.items()})
            result["keyInfo"] = dict({(k,tools.get_color_hex_code(v)) for k, v in colors.items() if unique_cat[k] <= total_unique })
            result["gradient"] = False
        else:
             # attribute is treated as a continuous variable
            cat = df.loc[df["is_tip"] == tip, attribute].copy()
            cat = cat.loc[~cat.isnull()]

            # create data bins in order to transform continusous data into categorical
            max_val = cat.max()
            min_val = cat.min()
            labels = list(range(1,1001))

            # bin attribute
            binned_data = pd.cut(cat, bins=1000, labels=labels)

            # create color object
            n = norm(vmin=1, vmax=1000)
            cmap = cm.ScalarMappable(norm=n, cmap='viridis')

            # create assign each bin a color
            bin_colors = {k:cmap.to_rgba(k)[:3] for k in labels}

            # color data
            new_colors = binned_data.values.tolist()
            new_colors = [bin_colors[c] for c in new_colors]
            cat = pd.DataFrame(new_colors, columns=change_cat, index=cat.index)
            df.update(cat)
            result["keyInfo"] = {
                "min": [min_val, tools.get_color_hex_code(bin_colors[1])],
                "max": [max_val, tools.get_color_hex_code(bin_colors[1000])]
            }
            result["gradient"] = True

        df = df[['px', 'py', 'red', 'green', 'blue', 'x', 'y', 'red', 'green', 'blue',]].loc[df['branch_is_visible'] == True]
        edges = np.concatenate(df.to_numpy()).tolist()
        result["edgeData"] = edges
        return result

    def retrive_top_labels(self, min_x, max_x, min_y, max_y, attribute, n=10, tip=True):
        df = self.edge_metadata

        if df[attribute].dtype == object: # attribute is a categorical variable
            # attribute is treated as a continuous variable
            cat = df.loc[(df["is_tip"] == tip) & (df["branch_is_visible"] == True), ["x", "y", attribute, "num_tips"]].copy()
            cat = cat.loc[~cat[attribute].isnull()]
            cat = cat.loc[(cat["x"] >= min_x) & (cat["x"] <= max_x) & \
                          (cat["y"] >= min_y) & (cat["y"] <= max_y)]

            # find top n categories
            unique_cat = cat[attribute].value_counts()
            unique_cat = unique_cat.index[0:n].tolist()
            cat = cat[cat[attribute].isin(unique_cat)]
            top_cat = cat.groupby([attribute])["num_tips"].idxmax()
            cat = cat.loc[top_cat]
            # cat = cat.sort_values(by="num_tips", ascending=False)
            cat = cat[0:n]
            print(cat)
            result = cat[["x", "y", attribute]].values.tolist()
        else:
            # attribute is treated as a continuous variable
            cat = df.loc[(df["is_tip"] == tip) & (df["branch_is_visible"] == True), ["x", "y", attribute]].copy()
            cat = cat.loc[~cat[attribute].isnull()]
            cat = cat.loc[(cat["x"] >= min_x) & (cat["x"] <= max_x) & \
                          (cat["y"] >= min_y) & (cat["y"] <= max_y), ["x", "y",attribute]]
            cat = cat.sort_values(by=attribute, ascending=False)
            cat = cat[0:n]
            result = cat.values.tolist()

        return {"labels": result}

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

    def get_headers(self):
        """ Returns a list of the headers for the metadata

        Parameters
        ----------

        Returns
        -------
        return : dictionary
            a dictionary contaning the tip and internal node headers
        """
        headers = {'tip': self.tip_headers, 'node': self.node_headers}
        return headers

    # def new_color_clades(self, attribute, tax_level, color):
    def color_clades(self,tax_level, total_unique=15, color='viridis'):
        """ Colors taxonomic clades based on rank. The largest 15 clades will be colored.

        Parameters
        ----------
        tax_level : str
            The taxonoimc level to be used i.e. kingdom, phylumn, ...
        Returns
        -------
        return : dictionary
            the information webgl needs to draw the colored clades
        """
        self.colored_clades = {}
        df = self.edge_metadata
        if tax_level == "reset":
            return {}
        if tax_level != "reset":
            tax_nodes = df[['Node_id', tax_level, 'num_tips']].copy()
            tax_nodes = tax_nodes.dropna()

            # find if there are more than 8 categories
            unique_tax = tax_nodes[tax_level].value_counts()
            m_t_eight = True if len(unique_tax) > total_unique else False

            # convert category to number if more than 8 categgoires than largest 7 categories get a unique number
            # and the rest are assign to other (number 8)
            if m_t_eight:
                unique_tax[0:total_unique] = list(range(0, total_unique))
                unique_tax = unique_tax[0:total_unique]
            else:
                unique_tax[0:len(unique_tax)] = list(range(0, len(unique_tax)))

            unique_tax = unique_tax.to_dict()
            max_val = total_unique if m_t_eight else len(unique_tax)
            min_val = 0

            # color
            n = norm(vmin=min_val, vmax=max_val)
            cmap = cm.ScalarMappable(norm=n, cmap=color)
            colors = {k:cmap.to_rgba(v)[:3] for k,v in unique_tax.items()}

            # find the root of the clades
            clade_root_ids = []
            for taxon in unique_tax:
                root_id = tax_nodes.loc[tax_nodes[tax_level] == taxon, "num_tips"].idxmax()
                clade_root_ids.append((root_id,taxon))

        for clade_id,tax in clade_root_ids:
            clade = self.tree.find(clade_id)
            color = colors[tax]
            color_clade = self.tree.get_clade_info(clade)
            color_clade['color'] = color
            color_clade_s = tools.create_arc_sector(color_clade)
            depth = len([node.name for node in clade.ancestors()])
            self.colored_clades[clade_id] = {'data': color_clade_s,
                                      'depth': depth,
                                      'color': color,
                                      'node': clade,
                                      'clade': tax}
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
        result = {}
        clades = [(k, v['depth']) for k, v in self.colored_clades.items()]
        clades.sort(key=lambda clade: clade[DEPTH_INDEX])
        sorted_clades = [self.colored_clades[clade[CLADE_INDEX]]['data'] for clade in clades]
        sorted_clades = [flat for two_d in sorted_clades for flat in two_d]
        result["clades"] = sorted_clades
        result["keyInfo"] = dict({(v["clade"],tools.get_color_hex_code(v["color"])) for k, v in self.colored_clades.items()})
        return result

    # Todo need to added the other items in colored-clades
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

    def __sum_clade_vals(self, attribute, filter_cat, filter_val, node_clade_dict):
        df = self.edge_metadata
        tax_to_float = {tax: 0 for tax in node_clade_dict.values()}
        for clade_id, tax in node_clade_dict.items():
            nodes = [node.name for node in self.tree.find(clade_id).levelorder(include_self=True)]
            temp = df[df["Node_id"].isin(nodes)]
            temp = temp.loc[(temp[filter_cat] == filter_val) & (temp['sex'] == 'female')]
            val = temp[attribute].sum()
            tax_to_float[tax] += val
        return tax_to_float

    def collapse_tree_taxon(self, tax_level):
        df = self.edge_metadata
        df["branch_is_visible"] = True
        self.triangles = {}
        self.triData = {}

        if tax_level == "reset":
            df = df[['px', 'py', 'red', 'green', 'blue', 'x', 'y', 'red', 'green', 'blue',]].loc[df['branch_is_visible'] == True]
            edges = np.concatenate(df.to_numpy()).tolist()
            return {"edges": edges, "triData": []}

        tax_nodes = df[['Node_id', tax_level, 'num_tips']].copy()
        tax_nodes = tax_nodes.dropna()

        clade_root_ids = tax_nodes.groupby([tax_level])["num_tips"].idxmax()
        clades = tax_nodes.loc[clade_root_ids, ["Node_id", tax_level]].values.tolist()
        for clade in clades:
            clade_id = self.tree.find(clade[0])
            self.__collapse_clade(clade_id, clade[1], tax_level)

        self.update_collapse_clades()
        df = df[['px', 'py', 'red', 'green', 'blue', 'x', 'y', 'red', 'green', 'blue',]].loc[df['branch_is_visible'] == True]
        edges = np.concatenate(df.to_numpy()).tolist()
        triData = self.get_triangles()
        result = {"edges": edges, "triData": triData}

        return result

    def update_collapse_clades(self):
        """
        Call this method after a series of clade collapse to hide the collapse clade within
        collapsed clades
        """
        collapse_ids = self.triData.keys()
        color = self.edge_metadata.loc[collapse_ids,["red", "green", "blue"]].values.tolist()
        for i, node_id in enumerate(collapse_ids):
            self.triData[node_id]["red"] = color[i][0]
            self.triData[node_id]["green"] = color[i][1]
            self.triData[node_id]['"blue'] = color[i][2]

            # use this if general nodes are allowed to be collapsed
            # Note: would need to speed up, this makes it so only the top level triangles are shown
            # ancestors = [a.name for a in self.tree.find(node_id).ancestors()]
            # for other_id in collapse_ids:
            #     if other_id in ancestors:
            #         self.triData[node_id]['visible'] = False


    def get_triangles(self):
        triData = []
        triangles = {k: v for (k, v) in self.triData.items() if v['visible']}
        if not triangles:
            return []
        self.triangles = pd.DataFrame(triangles).T
        triangles = self.triangles[["cx", "cy", "red", "green", "blue", "lx", "ly","red", "green", "blue",
                                    "rx", "ry", "red", "green", "blue"]].loc[self.triangles['visible'] == True]
        triData = np.concatenate(triangles.to_numpy()).tolist()
        return triData

    def __get_tie_breaker_num(self):
        self.tie_breaker += 1
        return self.tie_breaker

    def __collapse_clade(self, clade, taxon, tax_level):
        if not clade.is_tip():
            s = self.tree.get_clade_info(clade)

            (rx, ry) = (clade.x2, clade.y2)
            theta = s['starting_angle']
            (c_b1, s_b1) = (math.cos(theta), math.sin(theta))
            (x1, y1) = (s['largest_branch'] * c_b1, s['largest_branch'] * s_b1)

            # find right most branch
            theta += s['theta']
            (c_b2, s_b2) = (math.cos(theta), math.sin(theta))
            (x2, y2) = (s['smallest_branch'] * c_b2, s['smallest_branch'] * s_b2 )

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
        red = {'red': DEFAULT_COLOR[0]}
        green = {'green': DEFAULT_COLOR[1]}
        blue = {'blue': DEFAULT_COLOR[2]}
        visible = {'visible': True}
        depth = {'depth': level}
        taxon = {'taxon': taxon}
        rank = {'rank': tax_level}
        self.triData[clade.name] = {**nId, **root, **shortest,**longest, **red,
                                    **green, **blue, **visible, **depth, **taxon,
                                    **rank}

        self.edge_metadata.loc[nodes, 'branch_is_visible'] = False
        return collapsed_nodes

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

    def __clade_level(self):
        """
        Calculates the depth of each node in self.tree
        """
        for node in self.tree.levelorder():
            node.level = len(node.ancestors())
            node.tip_count = 0

    def find_closes_node(self, x=0, y=0, columns=["Node_id"], delta=20):
        """ Finds the closes node to (x,y)

        Parameters
        ----------
        x : float
            The x coordinate
        y : float
            The y coordinate
        columns : string list
            A list containing the metada columns to be returned
        delta : float
            The farthest a node can be from (x,y) to be considered close

        Returns
        -------
        info : dictionary
            a dictionary whose keys are columns and values are the corresponding values
            of the closest node
        """
        x = float(x)
        y = float(y)
        columns.append("x")
        columns.append("y")
        df = self.edge_metadata
        df = df.loc[df["branch_is_visible"] == True]
        points = [(x,y) for x, y in zip(df["x"], df["y"])]
        closes_index = cdist([(x,y)], points).argmin()
        cx, cy = points[closes_index]
        if math.sqrt((cx - x)**2 + (cy - y)**2) <= delta:
            info = df.loc[(df["x"] == cx) & (df["y"] == cy), columns].to_dict(orient="list")
        else:
            info = {}
        return info

    def find_closes_triangle(self, x=0, y=0, columns=["Node_id", "taxon"], delta=20):
        """ Finds the closes triangle to (x,y)

        Parameters
        ----------
        x : float
            The x coordinate
        y : float
            The y coordinate
        columns : string list
            A list containing the metada columns to be returned
        delta : float
            The farthest a node can be from (x,y) to be considered close

        Returns
        -------
        info : dictionary
            a dictionary whose keys are columns and values are the corresponding values
            of the closest triangle
        """
        x = float(x)
        y = float(y)
        info = {}
        for k in self.triData:
            if self.is_in_triangle(k, x, y):
                info["Root_id"] = k
                info["Rank"] = self.triData[k]["rank"]
                info["Taxonomy"] = self.triData[k]["taxon"]
                return info
        return {}
