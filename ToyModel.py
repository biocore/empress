import abc
from collections import namedtuple
from skbio import TreeNode
import pandas as pd
import numpy as np
class ToyModel(TreeNode):
    """ 
    Parameters
    ----------
    use_lengths: bool
        Specifies if the branch lengths should be included in the
        resulting visualization (default True).
    Attributes
    ----------
    length
    leafcount
    height
    depth
    Notes
    -----
    `length` refers to the branch length of a node to its parent.
    `leafcount` is the number of tips within a subtree. `height` refers
    to the longest path from root to the deepst leaf in that subtree.
    `depth` is the number of nodes found in the longest path.
    """
       
    def __init__(self, use_lengths=True, **kwargs):
        """ Constructs a Dendrogram object for visualization.
        """
        super().__init__(**kwargs)
        self.childRem = -1

    def _cache_ntips(self):
        """ Counts the number of leaves under each subtree."""
        for n in self.postorder():
            if n.is_tip():
                n.leafcount = 1
            else:
                n.leafcount = sum(c.leafcount for c in n.children)
                
    @classmethod
    def from_tree(cls, tree, use_lengths=True):
        """ Creates an UnrootedDendrogram object from a skbio tree.
        Parameters
        ----------
        tree : skbio.TreeNode
            Input skbio tree
        Returns
        -------
        UnrootedDendrogram
        """
        for n in tree.postorder():
            n.__class__ = ToyModel

        tree.update_geometry(use_lengths)
        return tree
    
    def update_geometry(self, use_lengths, depth=None):
        """Calculate tree node attributes such as height and depth.
        Parameters
        ----------
        use_lengths: bool
           Specify if the branch length should be incorporated into
           the geometry calculations for visualization.
        depth: int
           The number of nodes in the longest path from root to leaf.
        This is agnostic to scale and orientation.
        """
        if self.length is None or not use_lengths:
            if depth is None:
                self.length = 0
            else:
                self.length = 1

        self.depth = (depth or 0) + self.length

        children = self.children
        if children:
            for c in children:
                c.update_geometry(use_lengths, self.depth)
            self.height = max([c.height for c in children]) + self.length
            self.leafcount = sum([c.leafcount for c in children])

        else:
            self.height = self.length
            self.leafcount = self.edgecount = 1


    def coords(self, height, width):
        """ Returns coordinates of nodes to be rendered in plot.
        Parameters
        ----------
        height : int
            The height of the canvas.
        width : int
            The width of the canvas.
        Returns
        -------
        pd.DataFrame (Node metadata)
            index : str
                Name of node.
            Node id: str
                Name of node
            x : float
                x-coordinate of node.
            y : float
                y-coordinate of node.
        
        pd.DataFrame (Edge metadata)
            index : str
                Name of node.
            Node id: str
                Name of node
            x : float
                x-coordinate of node.
            y : float
                y-coordinate of node.
            Parent id:
                Name of parent
            px : float
                x-coorinate of parent
            py: float 
                y-coordinate of parent
        """
        
        #calculates coordinates of all nodes
        self.rescale(width, height)
        
        #Node metadata
        nodeData = {}
        for node in self.postorder():
            nId = {'Node id' : node.name}
            coords = {'x': node.x2, 'y': node.y2}
            nodeData[node.name] = {**nId,**coords}
            
        #edge metadata
        edgeData = {}
        for node in self.postorder():
            pId = {'Parent id' : node.name}
            pCoords = {'px': node.x2, 'py': node.y2}
            for child in node.children:
                nID = {'Node id' : child.name}
                coords = {'x': child.x2, 'y': child.y2}
                edgeData[child.name] = {**nId, **coords, **pId, **pCoords}

        #convert to pd.DataFrame
        nodeMeta = pd.DataFrame(nodeData).T
        edgeMeta = pd.DataFrame(edgeData).T
      
        return (nodeMeta,edgeMeta)

    def rescale(self, width, height):
        """ Find best scaling factor for fitting the tree in the figure.
        This method will find the best orientation and scaling possible
        to fit the tree within the dimensions specified by width and height.
        Parameters
        ----------
        width : float
            width of the canvas
        height : float
            height of the canvas
        Returns
        -------
        best_scaling : float
            largest scaling factor in which the tree can fit in the canvas.
        Notes
        -----
        """
        angle = (2 * np.pi) / self.leafcount
        # this loop is a horrible brute force hack
        # there are better (but complex) ways to find
        # the best rotation of the tree to fit the display.
        best_scale = 0
        for i in range(60):
            direction = i / 60.0 * np.pi
            # TODO:
            # This function has a little bit of recursion.  This will
            # need to be refactored to remove the recursion.

            points = self.update_coordinates(1.0, 0, 0, direction, angle)
            
            xs, ys = zip(*points)
            # double check that the tree fits within the margins
            scale = min(float(width) / (max(xs) - min(xs)),
                        float(height) / (max(ys) - min(ys)))
            # TODO: This margin seems a bit arbituary.
            # will need to investigate.
            scale *= 0.95  # extra margin for labels
            if scale > best_scale:
                best_scale = scale
                mid_x = width / 2 - ((max(xs) + min(xs)) / 2) * scale
                mid_y = height / 2 - ((max(ys) + min(ys)) / 2) * scale
                best_args = (scale, mid_x, mid_y, direction, angle)

        self.update_coordinates(*best_args)
        return best_scale

    def update_coordinates(self, s, x1, y1, a, da):
        """ Update x, y coordinates of tree nodes in canvas.
        `update_coordinates` will recursively updating the
        plotting parameters for all of the nodes within the tree.
        This can be applied when the tree becomes modified (i.e. pruning
        or collapsing) and the resulting coordinates need to be modified
        to reflect the changes to the tree structure.
        Parameters
        ----------
        s : float
            scaling
        x1 : float
            x midpoint
        y1 : float
            y midpoint
        a : float
            angle (degrees)
        da : float
            angle resolution (degrees)
        Returns
        -------
        points : list of tuple
            2D coordinates of all of the nodes.
        Notes
        -----
        """
    
        points = []
        
        #calculates self coords/angle
        # Constant angle algorithm.  Should add maximum daylight step.
        x2 = x1 + self.length * s * np.sin(a)
        y2 = y1 + self.length * s * np.cos(a)
        (self.x1, self.y1, self.x2, self.y2, self.angle) = (x1,y1, x2,y2,a)
        # TODO: Add functionality that allows for collapsing of nodes
        
        for node in self.preorder(include_self=False):
            x1 = node.parent.x2
            y1 = node.parent.y2
            a = node.parent.angle
            #calculates 'a'
            a = a - node.parent.leafcount*da /2
            for sib in node.parent.children:
                if sib != node:
                    a = a + sib.leafcount*da
                else:
                    a = a + (node.leafcount*da)/2
                    break
            # Constant angle algorithm.  Should add maximum daylight step.
            x2 = x1 + node.length * s * np.sin(a)
            y2 = y1 + node.length * s * np.cos(a)
            (node.x1, node.y1, node.x2, node.y2, node.angle) = (x1,y1, x2,y2,a)
            
            # TODO: Add functionality that allows for collapsing of nodes
            if node.is_tip():
                points += [(x2,y2)]
    
        return points
