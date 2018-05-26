from tornado.web import RequestHandler


class ModelHandler(RequestHandler):
    def get(self):
        self.render('tree_with_webgl.html')


class EdgeHandler(RequestHandler):
    def initialize(self, m):
        self.m = m

    def get(self):
        edgeM = self.m.edge_metadata
        edges = edgeM.to_json(orient='records')
        self.write(edges)
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
        selected = self.m.update_single_edge_category(attribute, category,
                                                      value, lower, equal,
                                                      upper)
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


class CollapseEdgeHandler(RequestHandler):
    def initialize(self, m):
        self.m = m

    def get(self):
        edgeM = self.m.select_edge_category()
        edges = edgeM.to_json(orient='records')
        self.write(edges)
        self.finish()
