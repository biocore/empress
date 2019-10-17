# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import sys
sys.path.append('../../empress')
import unittest
import numpy as np
from skbio import TreeNode
from tree import Tree

class TestTree(unittest.TestCase):

    def mock_tree_from_nwk(self):
        return TreeNode.read(['(((a:1,e:2)f:1,b:2)g:1,(c:1,d:3)h:2)i:1;'])

    def setUp(self):
        self.tree = self.mock_tree_from_nwk()

    def test_from_tree(self):
        t = Tree.from_tree(self.tree)
        self.assertEqual(t.__class__, Tree)

    def test_coords(self):
        t = Tree.from_tree(self.tree)
        t.coords(500, 500)

        with open('test_coords.txt') as file:
            coords = file.readline().split(',')
            coords = [float(coord) for coord in coords]
            coords = np.array(coords)
            coords = list(np.reshape(coords, (9,2)))

        for i, node in enumerate(t.postorder()):
          x_test,y_test = (node.x2, node.y2)
          x, y = coords[i]
          self.assertAlmostEqual(x_test, x, places=5)
          self.assertAlmostEqual(y_test, y, places=5)

    def test_rescale(self):
        t = Tree.from_tree(self.tree)
        self.assertAlmostEqual(
            t.rescale(500, 500), 74.609165340334656, places=5)


if __name__ == "__main__":
    unittest.main()
