import model
from model import Model
from tornado.web import RequestHandler

tree = model.read('./TreeOfLife.nwk','newick')
m = Model(tree)
nodeM, edgeM = m.retrive_view_coords()

class IndexHandler(RequestHandler):
    def get(self):
        self.write({'hello':'world'})
        self.finish()

class ModelHandler(RequestHandler):
    def get(self):
        nodes = nodeM.to_json(orient='records')
        edges = edgeM.to_json(orient='records')
        self.render('tree.html', node_coords=nodes,
                     edge_coords=edges)
class NodeHandler(RequestHandler):
    def get(self):
        nodes = nodeM.to_json(orient='records')
        self.write(nodes)

class EdgeHandler(RequestHandler):
    def get(self):
        edges = edgeM.to_json(orient='records')
        self.write(edges)

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
