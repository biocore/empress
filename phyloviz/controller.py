import model
from model import Model
from tornado.web import RequestHandler
import sys
sys.path.append("../..")
import numpy as np
import pandas as pd
from skbio import DistanceMatrix, TreeNode
from scipy.cluster.hierarchy import ward, complete

#trees
tree = model.read('./astral.MR.rooted.nid.nosup.nwk', 'newick')
# tree = model.read('./gg_13_5_otus_99_annotated.tree', 'newick')
# tree = model.read('./0B5tlRtQ-tBfkZSuneOKbg.nwk', 'newick')

# metadata files
internal_metadata_file = 'ncbi.t2t.txt'
leaf_metadata_file = 'metadata.txt'

# initialize tree with branch length Todo: need to incorperate this into model
for i, n in enumerate(tree.postorder(include_self=True)):
    n.length = 1
    if not n.is_tip() and n.name is None:
        n.name = "y%d" % i

m = Model(tree, internal_metadata_file, leaf_metadata_file)
edgeM = m.retrive_view_coords()


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


class SelectHandler(RequestHandler):
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
