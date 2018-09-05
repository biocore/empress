from tornado.web import RequestHandler


class ModelHandler(RequestHandler):
    def get(self):
        """ used by server to render html webpage
        """
        self.render('tree_with_webgl.html')


class EdgeHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Retrieves information from model to draw tree
        """
        edges = self.m.edge_metadata.loc[self.m.edge_metadata['branch_is_visible']]
        self.write(edges.to_json(orient='records'))
        self.finish()


class NodeHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Retrieves information from model to draw root node
        """
        nodes = self.m.node_coords.to_json(orient='records')
        self.write(nodes)
        self.finish()


class TriangleHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Retrieves information from model to draw the trangles where
        clades have been collapsed
        """
        triangles = self.m.retrive_triangles()
        self.write(triangles.to_json(orient='records'))
        self.finish()


class HighlightHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Tells model which tips to highlight and the retrieves
        updates edge information to draw newly highlighted tips
        """
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
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Tells the model how much user has zoomed in so that
        the model may automatically collapse clades.
        """
        sliderScale = self.get_argument('sliderScale')
        triangles = self.m.collapse_clades(sliderScale)
        tri_json = triangles.to_json(orient='records')
        self.write(tri_json)
        self.finish()


class TableHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Grabs all the metadata from model
        """
        table_values = self.m.retrive_default_table_values()
        self.write(table_values.to_json(orient='records'))
        self.finish()


class TableChangeHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Grabs only the metadata that corresponds to what has
        been highlighted
        """
        attribute = self.get_argument('attribute')
        lower = self.get_argument('lower')
        equal = self.get_argument('equal')
        upper = self.get_argument('upper')
        selected = self.m.retrive_highlighted_values(
            attribute, lower, equal, upper)
        edges = selected.to_json(orient='records')
        self.write(edges)
        self.finish()


class HeaderHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Retrieves all headers from metadata
        """
        headers = self.m.retrive_headers()
        self.write({'headers': headers})
        self.finish()


class CladeHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Retrieves all headers from metadata
        """
        colored_clades = self.m.retrive_colored_clade()
        self.write(colored_clades)
        self.finish()


class ColorCladeHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Retrieves information from model in order to color a clade
        """
        clade = self.get_argument('clade')
        color = self.get_argument('color')
        colored_clades = self.m.color_clade(clade, color)
        self.write(colored_clades)
        self.finish()


class ChangeCladeHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Retrieves information from model in order to color a clade
        """
        clade = self.get_argument('clade')
        color = self.get_argument('color')
        colored_clades = self.m.change_clade_color(clade, color)
        self.write(colored_clades)
        self.finish()


class ClearColorCladeHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Retrieves information from model in order to color a clade
        """
        clade = self.get_argument('clade')
        colored_clades = self.m.clear_clade(clade)
        self.write(colored_clades)
        self.finish()


class SubtreeHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        attribute = self.get_argument('attribute')
        lower = self.get_argument('lower')
        equal = self.get_argument('equal')
        upper = self.get_argument('upper')
        new_tree = self.m.create_subtree(attribute, lower, equal, upper)
        new_tree = new_tree.to_json(orient='records')
        self.write(new_tree)
        self.finish()


class OldTreeHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        old_tree = self.m.revive_old_tree()
        old_tree = old_tree.to_json(orient='records')
        self.write(old_tree)
        self.finish()


class SelectHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        x1 = self.get_argument("x1")
        y1 = self.get_argument("y1")
        x2 = self.get_argument("x2")
        y2 = self.get_argument("y2")
        nodes = self.m.select_sub_tree(x1, y1, x2, y2)
        nodes = nodes.to_json(orient='records')
        self.write(nodes)
        self.finish()


class CollapseSelectedHandler(RequestHandler):
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        edges = self.m.collapse_selected_tree()
        self.write(edges.to_json(orient='records'))
        self.finish()
