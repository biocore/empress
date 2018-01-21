from flask import Flask
import ToyModel

app = Flask(__name__)

@app.route('/')
def index():
    return "Hello, World!"

@app.route('/api/nodes', methods=['GET'])
def get_nodes():
    return "to return node metadata"
    # return node_metadata.to_json(orient='index')

@app.route('/api/edges', methods=['GET'])
def get_edges():
    return "to return edge metadata"
    # return edge_metadata.to_json(orient='index')

if __name__ == '__main__':
    app.run(debug=True)
