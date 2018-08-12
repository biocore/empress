from tornado.web import RequestHandler


class ModelHandler(RequestHandler):
    def get(self):
        self.render('tree_with_webgl.html')


class EdgeHandler(RequestHandler):
    def initialize(self, m):
        self.m = m

    def get(self):
        edges = self.m.edge_metadata
        self.write(edges.to_json(orient='records'))
        self.finish()


class NodeHandler(RequestHandler):
    def initialize(self, m):
        self.m = m

    def get(self):
        nodes = self.m.node_coords.to_json(orient='records')
        self.write(nodes)
        self.finish()


class TriangleHandler(RequestHandler):
    def initialize(self, m):
        self.m = m

    def get(self):
        triangles = self.m.triangles.to_json(orient='records')
        self.write(triangles)
        self.finish()


class ZoomHandler(RequestHandler):
    def initialize(self, m):
        self.m = m

    def get(self):
        level = self.get_argument('level')
        zoomedM = self.m.zoom(level)
        edges = zoomedM.to_json(orient='records')
        self.write(edges)
        self.finish()


class HighlightHandler(RequestHandler):
    def initialize(self, m):
        self.m = m

    def get(self):
        attribute = self.get_argument('attribute')
        category = self.get_argument('category')
        value = self.get_argument('value')
        lower = self.get_argument('lower')
        equal = self.get_argument('equal')
        upper = self.get_argument('upper')
        selected = self.m.update_edge_category(
            attribute, category, value, lower, equal, upper)
        edges = selected.to_json(orient='records')
        self.write(edges)
        self.finish()


class BenchmarkHandler(RequestHandler):
    def get(self):
        self.render("benchmark.html")


class CollapseHandler(RequestHandler):
    def initialize(self, m):
        self.m = m

    def get(self):
        sliderScale = self.get_argument('sliderScale')
        triangles = self.m.collapse_clades(sliderScale)
        tri_json = triangles.to_json(orient='records')
        self.write(tri_json)
        self.finish()


class TableHandler(RequestHandler):
    def initialize(self, m):
        self.m = m

    def get(self):
        color = self.get_argument('color')
        table_values = self.m.retrive_highlighted_values(color)
        self.write(table_values.to_json(orient='records'))
        self.finish()


class LabelHandler(RequestHandler):
    def initialize(self, m):
        self.m = m

    def get(self):
        label = self.get_argument('label')
        value = self.get_argument('value')
        label_coords = self.m.retrive_label_coords(label, value)
        self.write(label_coords.to_json(orient='records'))
        self.finish()


class LeafHeaderHandler(RequestHandler):
    def initialize(self, m):
        self.m = m

    def get(self):
        leaf_headers = self.m.retrive_leaf_headers()
        self.write({'headers': leaf_headers})
        self.finish()


class InternalHeaderHandler(RequestHandler):
    def initialize(self, m):
        self.m = m

    def get(self):
        internal_headers = self.m.retrive_internal_headers()
        self.write({'headers': internal_headers})
        self.finish()


class ColorCladeHandler(RequestHandler):
    def initialize(self, m):
        self.m = m

    def get(self):
        clade_cat = self.get_argument('attribute')
        clade = self.get_argument('clade')
        color = self.get_argument('color')
        colored_clades = self.m.color_clade(clade_cat, clade, color)
        self.write(colored_clades)
        self.finish()