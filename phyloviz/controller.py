import sys
from model import Model
from tornado.web import RequestHandler


# TODO: This needs to be fixed
sys.path.append("../..")
# metadata files
# TODO: Internal metadata (will need docs in the future)
internal_metadata_file = 'ncbi.t2t.txt'
# TODO: Leaf metadata (will need docs in the future)
leaf_metadata_file = 'metadata.tsv'
tree_file = 'astral.cons.nid.e5p50.nwk'
tree_format = 'newick'

m = Model(tree_file, tree_format,
          internal_metadata_file, leaf_metadata_file)
edgeM = m.retrive_view_coords()


class ModelHandler(RequestHandler):
    def get(self):
        self.render('tree_with_webgl.html')


class EdgeHandler(RequestHandler):
    def get(self):
        edges = edgeM.to_json(orient='records')
        self.write(edges)
        self.finish()


class NodeHandler(RequestHandler):
    def get(self):
        nodes = m.node_metadata.to_json(orient='records')
        self.write(nodes)
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
        selected = m.update_edge_category(
            attribute, category, value, lower, equal, upper)
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
