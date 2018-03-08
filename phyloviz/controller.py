import model
from model import Model
from tornado.web import RequestHandler

# import sys
# sys.path.append("../..")
# import numpy as np
# import pandas as pd
# from skbio import DistanceMatrix, TreeNode
# from scipy.cluster.hierarchy import ward,complete

# tree = TreeNode.read(['(((a:1,e:2)f:1,b:2)g:1,(c:1,d:3)h:2)i:1;'])

# tree = model.read('./TreeOfLife.nwk','newick')

tree = model.read('./astral.MR.rooted.nid.nosup.nwk', 'newick')

# np.random.seed(0)
# x = np.random.rand(10)
# dm = DistanceMatrix.from_iterable(x, lambda x, y: np.abs(x-y))
# lm = complete(dm.condensed_form())
# ids = np.arange(len(x)).astype(np.str)
# tree = TreeNode.from_linkage_matrix(lm, ids)

# # initialize tree with branch length and named internal nodes
# for i, n in enumerate(tree.postorder(include_self=True)):
#     n.length = 1
#     if not n.is_tip():
#         n.name = "y%d" % i

m = Model(tree)
nodeM, edgeM = m.retrive_view_coords()


class IndexHandler(RequestHandler):
    def get(self):
        self.write({'hello': 'world'})
        self.finish()


class ModelHandler(RequestHandler):
    def get(self):
        self.render('tree.html')


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
    def post(self):
        level = self.get_argument('level')
        tx = self.get_argument('tx')
        ty = self.get_argument('ty')
        m.zoom(level, tx, ty)
        edges = edgeMp.to_json(orient='records')
        self.write(edges)
        self.finish()


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
