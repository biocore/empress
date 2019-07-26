from tornado.web import RequestHandler
import json
import numpy as np
import itertools

class ModelHandler(RequestHandler):
    """ Loads the webpage
    """
    def get(self):
        """ used by server to render html webpage
        """
        self.render('support_files/html/tree_with_webgl.html')


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
        print('EdgeHandler start')
        df = self.m.edge_metadata
        df = df[['px', 'py', 'red', 'green', 'blue', 'x', 'y', 'red', 'green', 'blue',]].loc[df['branch_is_visible'] == True]
        edges = np.concatenate(df.to_numpy()).tolist()
        print('concated')
        maxX = df['x'].abs().max()
        maxY = df['y'].abs().max()
        max_val = max(maxX, maxY)
        self.write(json.dumps({'edges':edges, 'max': max_val}))
        print('EdgeHandler end')
        self.finish()

class ColorBranchHandler(RequestHandler):
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
        """
        highlight = {}
        attribute = self.get_argument('attribute')
        color = self.get_argument('cm')
        total_unique = int(self.get_argument("total_unique"))
        tip = True if self.get_argument("tip") == "true" else False
        result = self.m.color_branches(attribute, color, total_unique=total_unique, tip=tip)
        self.write(result)
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
        tax_level = self.get_argument('tax_level')
        result = self.m.collapse_tree_taxon(tax_level)
        # tri_json = triangles.to_json(orient='records')
        self.write(result)
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
        self.write(headers)
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
    def initialize(self, m):
        self.m = m
    def get(self):
        # attribute = self.get_argument('attribute')
        tax_level = self.get_argument('tax_level')
        total_unique =  int(self.get_argument('total_unique'))
        color = self.get_argument('color')
        # colored_clades = self.m.new_color_clades(attribute, tax_level, color)
        colored_clades = self.m.color_clades(tax_level, total_unique=total_unique, color=color)
        self.write(colored_clades)
        self.finish()

class UpdateCollapseCladeHandler(RequestHandler):
    """ Updates the color of the collapse clade to match root of clade
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
        self.m.update_collapse_clades()
        colored_clades = self.m.get_triangles()
        self.write({"triData":colored_clades})
        self.finish()

class RetriveTopLabelHandler(RequestHandler):
    """ Retrives the top n labels within the viewing window
    """
    def initialize(self, m):
        self.m = m

    def get(self):
        min_x = float(self.get_argument("min_x"))
        max_x = float(self.get_argument("max_x"))
        min_y = float(self.get_argument("min_y"))
        max_y = float(self.get_argument("max_y"))
        attribute = self.get_argument("attribute")
        n = int(self.get_argument("n"))
        tip = True if self.get_argument("tip") == "true" else False
        result = self.m.retrive_top_labels(min_x, max_x, min_y, max_y, attribute, n, tip)
        self.write(result)
        self.finish()

class NodeHoverHandler(RequestHandler):
    """
    """
    def initialize(self, m):
        self.m = m

    def get(self):
        x = self.get_argument("x")
        y = self.get_argument("y")
        # columns = self.get_argument("columns")
        info = self.m.find_closes_node(x, y)#, columns)
        self.write(info)
        self.finish()

class TriangleHoverHandler(RequestHandler):
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
        x = self.get_argument("x")
        y = self.get_argument("y")
        info = self.m.find_closes_triangle(x, y)
        self.write(info)
        self.finish()