# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import unittest
import numpy as np
import pandas as pd
from skbio import DistanceMatrix, TreeNode
from scipy.cluster.hierarchy import complete
from pandas.util.testing import assert_frame_equal
from empress.tree import Tree
from empress.tree import DEFAULT_COLOR


class TestDendrogram(unittest.TestCase):

    def mock_random_tree(self):

        np.random.seed(0)
        x = np.random.rand(10)
        dm = DistanceMatrix.from_iterable(x, lambda x, y: np.abs(x - y))
        lm = complete(dm.condensed_form())
        ids = np.arange(len(x)).astype(np.str)
        tree = TreeNode.from_linkage_matrix(lm, ids)

        # initialize tree with branch length and named internal nodes
        for i, n in enumerate(tree.postorder(include_self=True)):
            n.length = 1
            if not n.is_tip():
                n.name = "y%d" % i

        return tree

    def mock_tree_from_nwk(self):
        return TreeNode.read(['(((a:1,e:2)f:1,b:2)g:1,(c:1,d:3)h:2)i:1;'])

    def setUp(self):
        self.tree2 = self.mock_tree_from_nwk()
        self.tree1 = self.mock_random_tree()

    def test_from_tree_random_tree(self):
        t = Tree.from_tree(self.tree1)
        self.assertEqual(t.__class__, Tree)

    def test_coords_random_tree(self):
        t = Tree.from_tree(self.tree1)
        data = [['7', 'y2', DEFAULT_COLOR, True, True, DEFAULT_COLOR, True,
                  79.070722542332845, 129.00083943597397,
                  1, 1, 50.679561936771449, 55.039337408460526
                ],
                ['8', 'y2', DEFAULT_COLOR, True, True, DEFAULT_COLOR, True,
                  79.070722542332845, 129.00083943597397,
                  1, 1, 12.628310993232901, 85.85263286563449
                ],
                ['4', 'y6', DEFAULT_COLOR, True, True, DEFAULT_COLOR, True,
                  74.068217341096869, 368.43664502236788,
                  1, 1, 12.499999999999979, 418.29360437746811
                ],
                ['6', 'y6', DEFAULT_COLOR, True, True, DEFAULT_COLOR, True,
                  74.068217341096869, 368.43664502236788,
                  1, 1, 53.563668631852295, 444.9606625915394
                ],
                ['9', 'y7', DEFAULT_COLOR, True, True, DEFAULT_COLOR, True,
                  117.21642391143635, 301.99423347326797,
                  1, 1, 38.10150433604548, 306.1404707163706
                ],
                ['y6', 'y7', DEFAULT_COLOR, True, False, DEFAULT_COLOR, True,
                   117.21642391143635, 301.99423347326797,
                   1, 1, 74.068217341096869, 368.43664502236788
                ],
                ['0', 'y11', DEFAULT_COLOR, True, True, DEFAULT_COLOR, True,
                  408.3850804246091, 240.10442497874831, 1, 1,
                  474.82749197370902, 283.25263154908782
                ],
                ['3', 'y11', DEFAULT_COLOR, True, True, DEFAULT_COLOR, True,
                  408.3850804246091, 240.10442497874831,
                  1, 1, 487.5, 235.95818773564568
                ],
                ['2', 'y14', DEFAULT_COLOR, True, True, DEFAULT_COLOR, True,
                  375.00926942577706, 153.15746472040379,
                  1, 1, 436.57748676687396, 103.30050536530359
                ],
                ['5', 'y14', DEFAULT_COLOR, True, True, DEFAULT_COLOR, True,
                  375.00926942577706, 153.15746472040379,
                  1, 1, 395.51381813502167, 76.633447151232261
                ],
                ['y11', 'y15', DEFAULT_COLOR, True, False, DEFAULT_COLOR, True,
                  331.86106285543758, 219.59987626950374,
                  1, 1, 408.3850804246091, 240.10442497874831
                ],
                ['y14', 'y15', DEFAULT_COLOR, True, False, DEFAULT_COLOR, True,
                  331.86106285543758, 219.59987626950374,
                  1, 1, 375.00926942577706, 153.15746472040379
                ],
                ['1', 'y16', DEFAULT_COLOR, True, True, DEFAULT_COLOR, True,
                  257.89956082792412, 247.99103687506513, 1, 1,
                  286.29072143348549, 321.95253890257857
                ],
                ['y15', 'y16', DEFAULT_COLOR, True, False, DEFAULT_COLOR, True,
                  257.89956082792412, 247.99103687506513,
                  1, 1, 331.86106285543758, 219.59987626950374
                ],
                ['y7', 'y17', DEFAULT_COLOR, True, False, DEFAULT_COLOR, True,
                  178.78464125253325, 252.13727411816777,
                  1, 1, 117.21642391143635, 301.99423347326797
                ],
                ['y16', 'y17', DEFAULT_COLOR, True, False, DEFAULT_COLOR, True,
                  178.78464125253325, 252.13727411816777,
                  1, 1, 257.89956082792412, 247.99103687506513
                ],
                ['y2', 'y18', DEFAULT_COLOR, True, False, DEFAULT_COLOR, True,
                  128.92768189743305, 190.56905677707087,
                  1, 1, 79.070722542332845, 129.00083943597397
                ],
                ['y17', 'y18', DEFAULT_COLOR, True, False, DEFAULT_COLOR, True,
                  128.92768189743305, 190.56905677707087,
                  1, 1, 178.78464125253325, 252.13727411816777
                ]]
        edge_exp = pd.DataFrame(data, columns=[your,list,of,columns])
        edge_exp.set_index('Node_id', inplace=True)

        edge_exp = edge_exp[['Node_id',
                             'unique_id',
                             'is_tip',
                             'x',
                             'y',
                             'Parent_id',
                             'px',
                             'py',
                             'node_color',
                             'branch_color',
                             'node_is_visible',
                             'branch_is_visible',
                             'width',
                             'size']]

        (edge_res, _, _, _) = t.coords(500, 500)
        assert_frame_equal(edge_exp, edge_res)

    def test_rescale_random_tree(self):
        t = Tree.from_tree(self.tree1)
        self.assertAlmostEqual(
            t.rescale(500, 500), 79.223492618646006, places=5)

    def test_from_tree(self):
        t = Tree.from_tree(self.tree2)
        self.assertEqual(t.__class__, Tree)

    def test_coords(self):
        t = Tree.from_tree(self.tree2)

        edge_exp = pd.DataFrame(
            {
                'a': [
                    'a',
                    'f',
                    DEFAULT_COLOR,
                    True,
                    True,
                    DEFAULT_COLOR,
                    True,
                    141.35398602846797,
                    339.46141862722482,
                    1,
                    1,
                    83.371774496551481,
                    292.50834951934343],
                'e': [
                    'e',
                    'f',
                    DEFAULT_COLOR,
                    True,
                    True,
                    DEFAULT_COLOR,
                    True,
                    141.35398602846797,
                    339.46141862722482,
                    1,
                    1,
                    16.20896388864297,
                    420.73154625569776],
                'f': [
                    'f',
                    'g',
                    DEFAULT_COLOR,
                    True,
                    False,
                    DEFAULT_COLOR,
                    True,
                    215.86090210071345,
                    343.36616063979909,
                    1,
                    1,
                    141.35398602846797,
                    339.46141862722482],
                'b': [
                    'b',
                    'g',
                    DEFAULT_COLOR,
                    True,
                    True,
                    DEFAULT_COLOR,
                    True,
                    215.86090210071345,
                    343.36616063979909,
                    1,
                    1,
                    254.48144795927647,
                    487.5],
                'c': [
                    'c',
                    'h',
                    DEFAULT_COLOR,
                    True,
                    True,
                    DEFAULT_COLOR,
                    True,
                    403.57843531045097,
                    221.46096919708964,
                    1,
                    1,
                    478.08535138269644,
                    225.36571120966394],
                'd': [
                    'd',
                    'h',
                    DEFAULT_COLOR,
                    True,
                    True,
                    DEFAULT_COLOR,
                    True,
                    403.57843531045097,
                    221.46096919708964,
                    1,
                    1,
                    483.79103611135702,
                    12.500000000000028],
                'g': [
                    'g',
                    'i',
                    DEFAULT_COLOR,
                    True,
                    False,
                    DEFAULT_COLOR,
                    True,
                    278.43341317062595,
                    302.73109682556259,
                    1,
                    1,
                    215.86090210071345,
                    343.36616063979909],
                'h': [
                    'h',
                    'i',
                    DEFAULT_COLOR,
                    True,
                    False,
                    DEFAULT_COLOR,
                    True,
                    278.43341317062595,
                    302.73109682556259,
                    1,
                    1,
                    403.57843531045097,
                    221.46096919708964]},
            index=[
                'Node_id',
                'Parent_id',
                'branch_color',
                'branch_is_visible',
                'is_tip',
                'node_color',
                'node_is_visible',
                'px',
                'py',
                'size',
                'width',
                'x',
                'y']).T
        edge_exp = edge_exp[['Node_id',
                             'is_tip',
                             'x',
                             'y',
                             'Parent_id',
                             'px',
                             'py',
                             'node_color',
                             'branch_color',
                             'node_is_visible',
                             'branch_is_visible',
                             'width',
                             'size']]

        (edge_res, _, _, _) = t.coords(500, 500)
        assert_frame_equal(edge_exp, edge_res)

    def test_rescale(self):
        t = Tree.from_tree(self.tree2)
        self.assertAlmostEqual(
            t.rescale(500, 500), 74.609165340334656, places=5)

    def test_to_df(self):
      t = TreeNode.read(['((a,b)c,d)r;'])
      t = Tree.from_tree(t)
      t.assign_ids()
      i = 0
      for node in t.postorder():
          node.x2, node.y2 = i, i
      data = [['d', 'r', DEFAULT_COLOR, True, True, DEFAULT_COLOR, True,
                  0, 0, 1, 1, 0, 0, t.find('d').id
                ],
                ['c', 'r', DEFAULT_COLOR, True, False, DEFAULT_COLOR, True,
                  0, 0, 1, 1, 0, 0, t.find('c').id
                ],
                ['b', 'c', DEFAULT_COLOR, True, True, DEFAULT_COLOR, True,
                  0, 0, 1, 1, 0, 0, t.find('b').id
                ],
                ['a', 'c', DEFAULT_COLOR, True, True, DEFAULT_COLOR, True,
                  0, 0, 1, 1, 0, 0, t.find('a').id
              ]]
      df_exp = pd.DataFrame(data, columns=['Node_id',
                'Parent_id',
                'branch_color',
                'branch_is_visible',
                'is_tip',
                'node_color',
                'node_is_visible',
                'px',
                'py',
                'size',
                'width',
                'x',
                'y',
                'unique_id'])
      df_exp = df_exp[[
                'Node_id',
                'unique_id',
                'is_tip',
                'x',
                'y',
                'Parent_id',
                'px',
                'py',
                'node_color',
                'branch_color',
                'node_is_visible',
                'branch_is_visible',
                'width',
                'size']]
      df_res = t.to_df().iloc[::-1,:]
      df_exp.set_index('Node_id', inplace=True)
      df_res.set_index('Node_id', inplace=True)
      assert_frame_equal(df_exp, df_res)


if __name__ == "__main__":
    unittest.main()
