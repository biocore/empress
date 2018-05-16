import model
from model import Model
from tornado.web import RequestHandler
import sys
sys.path.append("../..")
import numpy as np
import pandas as pd
from skbio import DistanceMatrix, TreeNode
from scipy.cluster.hierarchy import ward, complete

# metadata files
internal_metadata_file = 'ncbi.t2t.txt'
leaf_metadata_file = 'metadata.txt'

# tree files
tree_format = 'newick'
# tree_file = './collapse_test.nwk'
tree_file = './astral.MR.rooted.nid.nosup.nwk'
# tree_file = './gg_13_5_otus_99_annotated.tree'
# tree_file = './0B5tlRtQ-tBfkZSuneOKbg.nwk'
attr = ['width', 'branch_color_R']

m = Model(tree_file, tree_format, internal_metadata_file, leaf_metadata_file)
m.center_tree()  # adjust coordinates to be centered in WebGL


class ModelHandler(RequestHandler):
    def get(self):
        self.render('tree_with_webgl.html')


class EdgeHandler(RequestHandler):
    def get(self):
        edgeM = m.edge_metadata
        edges = edgeM.to_json(orient='records')
        self.write(edges)
        self.finish()


class TriangleHandler(RequestHandler):
    def get(self):
        triangles = m.triangles.to_json(orient='records')
        self.write(triangles)
        self.finish()


class ZoomHandler(RequestHandler):
    def get(self):
        level = self.get_argument('level')
        zoomedM = m.zoom(level)
        edges = zoomedM.to_json(orient='records')
        self.write(edges)
        self.finish()


class HighlightHandler(RequestHandler):
    def get(self):
        attribute = self.get_argument('attribute')
        category = self.get_argument('category')
        value = self.get_argument('value')
        lower = self.get_argument('lower')
        equal = self.get_argument('equal')
        upper = self.get_argument('upper')
        selected = m.update_single_edge_category(attribute, category, value,
                                                 lower, equal, upper)
        edges = selected.to_json(orient='records')
        self.write(edges)
        self.finish()


class BenchmarkHandler(RequestHandler):
    def get(self):
        self.render("benchmark.html")


class CollapseHandler(RequestHandler):
    def get(self):
        sliderScale = self.get_argument('sliderScale')
        triangles = m.collapse_clades(sliderScale)
        tri_json = triangles.to_json(orient='records')
        self.write(tri_json)
        self.finish()


class CollapseEdgeHandler(RequestHandler):
    def get(self):
        edgeM = m.select_edge_category()
        edges = edgeM.to_json(orient='records')
        self.write(edges)
        self.finish()
