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
            self.assertEqual(n1.name, n2.name)
            self.assertEqual(n1.length, n2.length)

    def test_from_tree_singlenode(self):
        st = TreeNode.read(['i:1;'])
        with self.assertRaisesRegex(
            ValueError, "must contain at least 2 nodes"
        ):
            Tree.from_tree(st)

    def test_from_tree_duplicate_tip_names(self):
        t = TreeNode.read(['((i:1,a:3)b:2,i:5)r:2;'])
        with self.assertRaisesRegex(
            ValueError, "Tip names in the tree must be unique"
        ):
            Tree.from_tree(t)

    def test_nonroot_missing_branchlengths(self):
        # Note about the fourth test tree here: the reason this triggers a
        # missing-branch-length error before a negative-branch-length error is
        # because the tree is checked in postorder. This sort of "precedence"
        # can be changed in the future if desired.
        bad_newicks = [
            '((b)a:1)root:1;', '((b:1)a)root:0;', '(b,c)a;',
            '((b)a:-1)root:3;', '((b:0,c)a:0)root:0;'
        ]
        for nwk in bad_newicks:
            st = TreeNode.read([nwk])
            with self.assertRaisesRegex(ValueError, "must have lengths"):
                Tree.from_tree(st)

        # Check that roots *with* missing branch lengths don't trigger an error
        # on tree creation
        ok_newicks = ['((b:0,c:1)a:0)root;']
        for nwk in ok_newicks:
            st = TreeNode.read([nwk])
            Tree.from_tree(st)

    def test_nonroot_negative_branchlengths(self):
        newicks = [
            '((b:-1)a:1)root:1;', '((b:100)a:-100)root:0;',
            '(b:1,c:-1)a:2;', '((b:-1)a:0)root;'
        ]
        for nwk in newicks:
            st = TreeNode.read([nwk])
            with self.assertRaisesRegex(
                ValueError,
                "must have nonnegative lengths"
            ):
                Tree.from_tree(st)

    def test_all_nonroot_branchlengths_0(self):
        newicks = ['((b:0)a:0)root:0;', '((b:0)a:0)root:1;']
        for nwk in newicks:
            st = TreeNode.read([nwk])
            with self.assertRaisesRegex(
                ValueError,
                "must have a positive length"
            ):
                Tree.from_tree(st)

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

        # Check that lowest_child_yr and highest_child_yr attributes were set
        # properly. We do this by iterating over tree.non_tips(), which (like
        # check_coords()) also uses a post-order traversal.
        # (Note that the "coordinates" in this list of 2-tuples are ordered as
        # (lowest child y-coordinate, highest child y-coordinate). Computing
        # these from the list above should be pretty simple.)
        expected_lowesthighest_child_yr = [(-296.875, -171.875),  # f
                                           (-234.375,  -46.875),  # g
                                           (78.125,    203.125),  # h
                                           (-140.625,  140.625)]  # i
        for i, node in enumerate(t.non_tips()):
            l, h = expected_lowesthighest_child_yr[i]
            self.assertTrue(hasattr(node, "lowest_child_yr"))
            self.assertTrue(hasattr(node, "highest_child_yr"))
            self.assertAlmostEqual(node.lowest_child_yr, l, places=5)
            self.assertAlmostEqual(node.highest_child_yr, h, places=5)

        # ... And also check that tip nodes *don't* have these attributes,
        # since tips don't have children.
        for node in t.tips():
            self.assertFalse(hasattr(node, "lowest_child_yr"))
            self.assertFalse(hasattr(node, "highest_child_yr"))

    def check_basic_tree_rect_layout(self, t):
        """Checks that the Empress tree for "((b:2)a:1)root:100;" has a correct
           rectangular layout.
        """
        t.coords(100, 100)
        expected_coords = [(100, 0.0), (100 / 3.0, 0.0), (0.0, 0.0)]
        self.check_coords(t, "xr", "yr", expected_coords)
        for node in t.non_tips():
            self.assertEqual(node.lowest_child_yr, 0)
            self.assertEqual(node.highest_child_yr, 0)

    def test_straightline_tree_rect_layout(self):
        """Checks that all nodes are drawn as expected even when there aren't
           any "branches" in the tree.
        """
        # Setting root length to 100 to demonstrate/verify that root length is
        # not taken into account (if this behavior changes we'll need to modify
        # this test, rightfully so)
        st = TreeNode.read(['((b:2)a:1)root:100;'])
        t = Tree.from_tree(st)
        t.coords(100, 100)
        expected_coords = [(100, 0.0), (100 / 3.0, 0.0), (0.0, 0.0)]
        self.check_coords(t, "xr", "yr", expected_coords)
        for node in t.non_tips():
            self.assertEqual(node.lowest_child_yr, 0)
            self.assertEqual(node.highest_child_yr, 0)
        self.check_basic_tree_rect_layout(t)

    def test_missing_root_length_tree_rect_layout(self):
        """Like the above test, but checks that things still work ok when the
           root node has no assigned branch length.
        """
        st = TreeNode.read(['((b:2)a:1)root;'])
        t = Tree.from_tree(st)
        t.coords(100, 100)
        expected_coords = [(100, 0.0), (100 / 3.0, 0.0), (0.0, 0.0)]
        self.check_coords(t, "xr", "yr", expected_coords)
        for node in t.non_tips():
            self.assertEqual(node.lowest_child_yr, 0)
            self.assertEqual(node.highest_child_yr, 0)
        self.check_basic_tree_rect_layout(t)


if __name__ == "__main__":
    unittest.main()
