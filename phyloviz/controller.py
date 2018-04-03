from model import Model
from tornado.web import RequestHandler
import sys
sys.path.append("../..")
import numpy as np
import pandas as pd
from skbio import DistanceMatrix, TreeNode
from scipy.cluster.hierarchy import ward, complete

# small newick tree
# tree = model.read(['(((a:1,e:2)f:1,b:2)g:1,(c:1,d:3)h:2)i:1;'])

#Need to keep!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
tree = model.read('./astral.MR.rooted.nid.nosup.nwk', 'newick')
# tree = model.read('./0B5tlRtQ-tBfkZSuneOKbg.nwk', 'newick')

internal_metadata_file = 'ncbi.t2t.txt'
leaf_metadata_file = 'metadata.txt'
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

# np.random.seed(0)
# x = np.random.rand(1000)
# dm = DistanceMatrix.from_iterable(x, lambda x, y: np.abs(x-y))
# lm = complete(dm.condensed_form())
# ids = np.arange(len(x)).astype(np.str)
# tree = TreeNode.from_linkage_matrix(lm, ids)

# initialize tree with branch length and named internal nodes
for i, n in enumerate(tree.postorder(include_self=True)):
    n.length = 1
    if not n.is_tip():
        n.name = "y%d" % i

m = Model(tree, 'ncbi.t2t.txt', 'metadata.txt')
nodeM, edgeM = m.retrive_view_coords()
# edgeM = edgeM.head(100000)

m = Model(tree, internal_metadata_file, leaf_metadata_file)
nodeM, edgeM = m.retrive_view_coords()


class ModelHandler(RequestHandler):
    def get(self):
        #self.render('tree_with_webgl.html')
        self.render('tree_with_webgl.html')


class NodeHandler(RequestHandler):
    def get(self):
        nodes = nodeM.to_json(orient='records')
        self.write(nodes)
        self.finish()


class EdgeHandler(RequestHandler):
    def get(self):
        edges = edgeM.to_json(orient='records')
        self.write(edges)
        self.finish()


class ZoomHandler(RequestHandler):
    def get(self):
        level = self.get_argument('level')
        # tx = self.get_argument('tx')
        # ty = self.get_argument('ty')
        zoomedM = m.zoom(level)
        # print(zoomedM)
        edges = zoomedM.to_json(orient='records')
        # print(edges)
        self.write(edges)
        self.finish()

class SelectHandler(RequestHandler):
    def get(self):
        attribute = self.get_argument('attribute')
        category = self.get_argument('category')
        selected = m.selectCategory(attribute, category)
        edges = selected.to_json(orient='records')
        self.write(edges)
        self.finish()


class BenchmarkHandler(RequestHandler):
    def get(self):
        self.render("benchmark.html")
# # Set up REST API for model
# app = Flask(__name__)

# @app.route('/', methods=['GET'])
# def hello_world():
#     return "hello world!"

# @app.route('/nodes', methods=['GET'])
# def get_nodes():
#     """ Returns node metadata dataframe as a json object
#     with index orientation by default.
#     """
#     return m.node_metadata.to_json(orient='records')

# @app.route('/edges', methods=['GET'])
# def get_edges():
#     """ Returns edge metadata dataframe as a json object
#     with index orientation by default.
#     """
#     return m.edge_metadata.to_json(orient='records')

# Run Flask app
# if __name__ == '__main__':
#     app.run(host=LOCALHOST, port=MODEL_PORT, debug=True)
