from tornado.web import RequestHandler


class ModelHandler(RequestHandler):
    """ Loads the webpage
    """
    def get(self):
        """ used by server to render html webpage
        """
        self.render('tree_with_webgl.html')


class EdgeHandler(RequestHandler):
    """ Grabs the edge metadata from the model
    """
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        edges = self.m.edge_metadata.loc[self.m.edge_metadata['branch_is_visible']]
        self.write(edges.to_json(orient='records'))
        self.finish()


class NodeHandler(RequestHandler):
    """ Retrieves coordinates of the root node from model
    """
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        nodes = self.m.node_coords.to_json(orient='records')
        self.write(nodes)
        self.finish()


class TriangleHandler(RequestHandler):
    """ Retrives the triangles that are drawn when clades are collapsed
    """
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
        triangles = self.m.get_triangles()
        self.write(triangles.to_json(orient='records'))
        self.finish()


class HighlightHandler(RequestHandler):
    """ Updates the model and retrives edge metadata
    """
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

        Parameter
        ---------
        attribute : string
            The feature that will highlighted
        category : string
            The feature that stores the color (usually branch_color)
        value : string
            A hex string which represents the color to highlight with
         lower : number
            The smallest number a feature must match in order for its color to change
        equal : string/number
            The number/string a feature must match in order for its color to change
        upper : number
            The largest number a feature can match in order for its color to change
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
    """ This is used to set up the inital SlickGrid table.
    """
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
        table_values = self.m.get_default_table_values()
        self.write(table_values.to_json(orient='records'))
        self.finish()


class TableChangeHandler(RequestHandler):
    """ This is used to update the SlickGrid when, for example, a user hightlights
    edges
    """
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

        Parameter
        ---------
        attribute : string
            The feature that will be used to determine which rows of the metadata to
            grab
        lower : number
            The smallest number a feature must match in order for its color to change
        equal : string/number
            The number/string a feature must match in order for its color to change
        upper : number
            The largest number a feature can match in order for its color to change
        """
        attribute = self.get_argument('attribute')
        lower = self.get_argument('lower')
        equal = self.get_argument('equal')
        upper = self.get_argument('upper')
        selected = self.m.get_highlighted_values(
            attribute, lower, equal, upper)
        edges = selected.to_json(orient='records')
        self.write(edges)
        self.finish()


class HeaderHandler(RequestHandler):
    """ This is used to create the drop down menus inside the webpage
    """
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
        headers = self.m.get_headers()
        self.write({'headers': headers})
        self.finish()


class CladeHandler(RequestHandler):
    """ Only retrives the colored clades, does not update model
    """
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Retrives the currently colored clades
        """
        colored_clades = self.m.get_colored_clade()
        self.write(colored_clades)
        self.finish()


class ColorCladeHandler(RequestHandler):
    """ Retrives colored clades and adds a new colored clade to model
    """
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Adds a new colored clade and retrives the currently colored clades

        Parameters
        ----------
        clade : string
            The name of the clade to color
        color : string
            A hex string representing the color
        """
        clade = self.get_argument('clade')
        color = self.get_argument('color')
        colored_clades = self.m.color_clade(clade, color)
        self.write(colored_clades)
        self.finish()


class ClearColorCladeHandler(RequestHandler):
    """ Removes a colored clade from model
    """
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ Removes colored clade from model

        Parameters
        ----------
        clade : string
            The name of the clade
        """
        clade = self.get_argument('clade')
        colored_clades = self.m.clear_clade(clade)
        self.write(colored_clades)
        self.finish()


class SubtreeHandler(RequestHandler):
    """ Creates a new sub-tree based on user specified parameters
    """
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """
        Parameter
        ---------
        attribute : string
            The feature that will be used to determine which nodes belong in the new sub-tree
        lower : number
            The smallest number a feature must match in order for its color to change
        equal : string/number
            The number/string a feature must match in order for its color to change
        upper : number
            The largest number a feature can match in order for its color to change
        """
        attribute = self.get_argument('attribute')
        lower = self.get_argument('lower')
        equal = self.get_argument('equal')
        upper = self.get_argument('upper')
        new_tree = self.m.create_subtree(attribute, lower, equal, upper)
        new_tree = new_tree.to_json(orient='records')
        self.write(new_tree)
        self.finish()


class OldTreeHandler(RequestHandler):
    """ Replaces the currently displayed tree with the most recently created sub-tree
    if one exists
    """
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        old_tree = self.m.get_old_tree()
        old_tree = old_tree.to_json(orient='records')
        self.write(old_tree)
        self.finish()


class SelectHandler(RequestHandler):
    """ Selectes a sub tree based on nodes highlighted by user mouse
    """
    def initialize(self, m):
        """ Stores the model in handler

        Parameter
        ---------
        m : Model
            The model that stores the tree
        """
        self.m = m

    def get(self):
        """ This is called when the user selects nodes of the tree by drawing a box around
        the nodes they want
        Parameters
        ----------
        x1 : number
            The top left corner of the box
        y1 : number
            the top left corner of the box
        x2 : number
            the bottom right corner of the box
        y2 : number
            the bottom right corner of the box
        """
        x1 = self.get_argument("x1")
        y1 = self.get_argument("y1")
        x2 = self.get_argument("x2")
        y2 = self.get_argument("y2")
        nodes = self.m.select_sub_tree(x1, y1, x2, y2)
        nodes = nodes.to_json(orient='records')
        self.write(nodes)
        self.finish()


class CollapseSelectedHandler(RequestHandler):
    """ Collapses the sub-tree selected by SelectHandler
    """
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
