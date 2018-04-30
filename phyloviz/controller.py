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
#tree files
tree_format = 'newick'
tree_file = './astral.MR.rooted.nid.nosup.nwk'
#tree_file = './gg_13_5_otus_99_annotated.tree'
#tree_file = './0B5tlRtQ-tBfkZSuneOKbg.nwk'



m = Model(tree_file, tree_format, internal_metadata_file, leaf_metadata_file)
edgeM = m.retrive_view_coords()
print(edgeM)

class ModelHandler(RequestHandler):
    def get(self):
        self.render('tree_with_webgl.html')


class EdgeHandler(RequestHandler):
    def get(self):
        edges = edgeM.to_json(orient='records')
        self.write(edges)
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
        lower = self.get_argument('lower')
        equal = self.get_argument('equal')
        upper = self.get_argument('upper')
        selected = m.selectCategory(attribute, lower, equal, upper)
        edges = selected.to_json(orient='records')
        self.write(edges)
        self.finish()


class BenchmarkHandler(RequestHandler):
    def get(self):
        self.render("benchmark.html")


class CollapseHandler(RequestHandler):
    def get(self):
        sliderScale = self.get_argument('sliderScale')
        triangles = m.collapseClades(sliderScale)
        tri_json = triangles.to_json(orient='records')
        self.write(tri_json)
        self.finish()
