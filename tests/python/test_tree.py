# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import unittest
from skbio import TreeNode
from empress import Tree


class TestTree(unittest.TestCase):

    def mock_tree_from_nwk(self):
        return TreeNode.read(['(((a:1,e:2)f:1,b:2)g:1,(c:1,d:3)h:2)i:1;'])

    def setUp(self):
        self.tree = self.mock_tree_from_nwk()

    def test_from_tree(self):
        t = Tree.from_tree(self.tree)
        self.assertEqual(t.__class__, Tree)
        # Check that trees match by iterating over original and Empress trees
        # simultaneously: see https://stackoverflow.com/a/20910242/10730311
        for n1, n2 in zip(t.preorder(), self.tree.preorder()):
            assert n1.name == n2.name
            assert n1.length == n2.length

    def check_coords(self, tree, xattr, yattr, expected_coords):
        """Checks that the coordinates in a tree match a list of "expected" ones.

        Parameters
        ----------
        tree : empress.Tree
            A tree whose nodes contain xattr and yattr attributes.

        xattr : str
            An attribute of nodes indicating the x-coordinates to check.
            e.g. "x2" for the unrooted layout, "xr" for the rectangular layout

        yattr : str
            An attribute of nodes indicating the y-coordinates to check.
            e.g. "y2" for the unrooted layout, "yr" for the rectangular layout

        expected_coords : list of 2-tuple of float
            A list of expected coordinates for each node, sorted in post-order.
            We check equality using self.assertAlmostEqual() with places=5, so
            coordinates should be at least that precise.
        """
        for i, node in enumerate(tree.postorder()):
            x, y = expected_coords[i]
            self.assertAlmostEqual(getattr(node, xattr), x, places=5)
            self.assertAlmostEqual(getattr(node, yattr), y, places=5)

    def test_unrooted_layout(self):
        t = Tree.from_tree(self.tree)
        t.coords(500, 500)

        expected_coords = [(-10.222747306219219, 195.06163867407446),
                           (118.00044943013512, 262.22444928198297),
                           (36.73032180166217, 137.07942714215795),
                           (184.76890317443747, 23.95196521134946),
                           (40.6350638142365, 62.57251106991248),
                           (-77.36538561589865, -199.6519382120705),
                           (-290.23109682556253, -205.35762294073118),
                           (-81.27012762847295, -125.14502213982503),
                           (0.0, 0.0)]
        self.check_coords(t, "x2", "y2", expected_coords)

    def test_rectangular_layout(self):
        t = Tree.from_tree(self.tree)
        t.coords(500, 500)

        # Why do these coordinates look like this for such a simple tree?
        # There are a few steps.
        #
        # 1. Compute initial y-coordinates of layout: tips are assigned to
        #    y=0, y=1, y=2, ... up to y=|tips|, and internal nodes are
        #    positioned at the average of their childrens' y-positions.
        #
        # 2. Compute initial x-coordinates of layout: root starts at x=0, and
        #    each child C with parent P is assigned x = P.x + C.branch_length.
        #    (...those aren't real attribute names, this is just pseudocode)
        #
        # 3. Positions are scaled relative to the maximum width and height.
        #    With this example tree, there are 5 tips so the maximum height is
        #    4 (since heights are 0-indexed), and the "farthest right" node is
        #    d (at x=5). So we scale y-positions by 500 / 4 = 125, and we
        #    scale x-positions by 500 / 5 = 100. (The "500"s are used here just
        #    because these are the dimensions passed to coords().)
        #
        # 4. At this point we're done with Tree.layout_rectangular(), but
        #    coords() still needs to alter coordinates to be relative to the
        #    root node's coordinates. So every node's x-coordinate is
        #    subtracted by the root's x=0 (this does nothing), and every node's
        #    y-coordinate is subtracted by the root's y=(2.375*125)=296.875.
        #
        # So TLDR this is why a's coordinates go from (3, 0) on the first pass
        # to ((3 * 100) - 0, (0 * 125) - 296.875) = (300, -296.875) in the end.
        expected_coords = [(300, -296.875),  # a
                           (400, -171.875),  # e
                           (200, -234.375),  # f
                           (300, -46.875),   # b
                           (100, -140.625),  # g
                           (300, 78.125),    # c
                           (500, 203.125),   # d
                           (200, 140.625),   # h
                           (0.0, 0.0)]       # i (root)
        self.check_coords(t, "xr", "yr", expected_coords)


if __name__ == "__main__":
    unittest.main()
