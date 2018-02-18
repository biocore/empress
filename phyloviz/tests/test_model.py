# ----------------------------------------------------------------------------
# Copyright (c) 2018--, phyloviz development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file COPYING.txt, distributed with this software.
# ----------------------------------------------------------------------------
import sys
sys.path.append("../..")
import unittest
import numpy as np
import pandas as pd
from skbio import DistanceMatrix, TreeNode
from phyloviz.model import Tree
from scipy.cluster.hierarchy import ward, complete
import pandas.util.testing as pdt


class TestDendrogram(unittest.TestCase):
    def setUp(self):
        np.random.seed(0)
        x = np.random.rand(10)
        dm = DistanceMatrix.from_iterable(x, lambda x, y: np.abs(x - y))
        lm = complete(dm.condensed_form())
        ids = np.arange(len(x)).astype(np.str)
        self.tree = TreeNode.from_linkage_matrix(lm, ids)

        # initialize tree with branch length and named internal nodes
        for i, n in enumerate(self.tree.postorder(include_self=True)):
            n.length = 1
            if not n.is_tip():
                n.name = "y%d" % i

    def test_cache_ntips(self):

        t = Tree.from_tree(self.tree)
        t._cache_ntips()

        self.assertEqual(t.leafcount, 10)
        self.assertEqual(t.children[0].leafcount, 2)
        self.assertEqual(t.children[1].leafcount, 8)
        self.assertEqual(t.children[0].children[0].leafcount, 1)
        self.assertEqual(t.children[0].children[1].leafcount, 1)
        self.assertEqual(t.children[1].children[0].leafcount, 3)
        self.assertEqual(t.children[1].children[1].leafcount, 5)

    def test_from_tree(self):
        t = Tree.from_tree(self.tree)
        self.assertEqual(t.__class__, Tree)

    def test_coords(self):
        t = Tree.from_tree(self.tree)

        edge_exp = pd.DataFrame(
            {
                '0': [
                    '0', 'y11', 408.3850804246091, 240.10442497874831,
                    474.82749197370902, 283.25263154908782
                ],
                '1': [
                    '1', 'y16', 257.89956082792412, 247.99103687506513,
                    286.29072143348549, 321.95253890257857
                ],
                '2': [
                    '2', 'y14', 375.00926942577706, 153.15746472040379,
                    436.57748676687396, 103.30050536530359
                ],
                '3': [
                    '3', 'y11', 408.3850804246091, 240.10442497874831, 487.5,
                    235.95818773564568
                ],
                '4': [
                    '4', 'y6', 74.068217341096869, 368.43664502236788,
                    12.499999999999979, 418.29360437746811
                ],
                '5': [
                    '5', 'y14', 375.00926942577706, 153.15746472040379,
                    395.51381813502167, 76.633447151232261
                ],
                '6': [
                    '6', 'y6', 74.068217341096869, 368.43664502236788,
                    53.563668631852295, 444.9606625915394
                ],
                '7': [
                    '7', 'y2', 79.070722542332845, 129.00083943597397,
                    50.679561936771449, 55.039337408460526
                ],
                '8': [
                    '8', 'y2', 79.070722542332845, 129.00083943597397,
                    12.628310993232901, 85.85263286563449
                ],
                '9': [
                    '9', 'y7', 117.21642391143635, 301.99423347326797,
                    38.10150433604548, 306.1404707163706
                ],
                'y11': [
                    'y11', 'y15', 331.86106285543758, 219.59987626950374,
                    408.3850804246091, 240.10442497874831
                ],
                'y14': [
                    'y14', 'y15', 331.86106285543758, 219.59987626950374,
                    375.00926942577706, 153.15746472040379
                ],
                'y15': [
                    'y15', 'y16', 257.89956082792412, 247.99103687506513,
                    331.86106285543758, 219.59987626950374
                ],
                'y16': [
                    'y16', 'y17', 178.78464125253325, 252.13727411816777,
                    257.89956082792412, 247.99103687506513
                ],
                'y17': [
                    'y17', 'y18', 128.92768189743305, 190.56905677707087,
                    178.78464125253325, 252.13727411816777
                ],
                'y2': [
                    'y2', 'y18', 128.92768189743305, 190.56905677707087,
                    79.070722542332845, 129.00083943597397
                ],
                'y6': [
                    'y6', 'y7', 117.21642391143635, 301.99423347326797,
                    74.068217341096869, 368.43664502236788
                ],
                'y7': [
                    'y7', 'y17', 178.78464125253325, 252.13727411816777,
                    117.21642391143635, 301.99423347326797
                ]
            },
            index=['Node id', 'Parent id', 'px', 'py', 'x', 'y']).T
        node_exp = pd.DataFrame(
            {
                '0': ['0', 474.82749197370902, 283.25263154908782],
                '1': ['1', 286.29072143348549, 321.95253890257857],
                '2': ['2', 436.57748676687396, 103.30050536530359],
                '3': ['3', 487.5, 235.95818773564568],
                '4': ['4', 12.499999999999979, 418.29360437746811],
                '5': ['5', 395.51381813502167, 76.633447151232261],
                '6': ['6', 53.563668631852295, 444.9606625915394],
                '7': ['7', 50.679561936771449, 55.039337408460526],
                '8': ['8', 12.628310993232901, 85.85263286563449],
                '9': ['9', 38.10150433604548, 306.1404707163706],
                'y11': ['y11', 408.3850804246091, 240.10442497874831],
                'y14': ['y14', 375.00926942577706, 153.15746472040379],
                'y15': ['y15', 331.86106285543758, 219.59987626950374],
                'y16': ['y16', 257.89956082792412, 247.99103687506513],
                'y17': ['y17', 178.78464125253325, 252.13727411816777],
                'y18': ['y18', 128.92768189743305, 190.56905677707087],
                'y2': ['y2', 79.070722542332845, 129.00083943597397],
                'y6': ['y6', 74.068217341096869, 368.43664502236788],
                'y7': ['y7', 117.21642391143635, 301.99423347326797]
            },
            index=['Node id', 'x', 'y']).T
        node_res, edge_res = t.coords(500, 500)
        pdt.assert_frame_equal(node_exp, node_res)
        pdt.assert_frame_equal(edge_exp, edge_res)

    def test_rescale(self):
        t = Tree.from_tree(self.tree)
        self.assertAlmostEqual(
            t.rescale(500, 500), 79.223492618646006, places=5)

    def test_update_coordinates(self):
        t = Tree.from_tree(self.tree)
        exp = pd.DataFrame(
            [(-0.59847214410395655,
              -1.6334372886412185), (-0.99749498660405445,
                                     -0.76155647142658189),
             (1.0504174348855488, 0.34902579063315775), (2.8507394969018511,
                                                         0.88932809650129752),
             (3.3688089449017027, 0.082482736278627664), (0.67135946132440838,
                                                          -2.4180787481253012),
             (-1.9936226804402346, -2.9233732552695497), (-2.6203695704157117,
                                                          -2.1977123674095331),
             (-1.8709927812120046,
              0.33556711382648474), (-0.95033246755379708,
                                     0.60348496526324824)])
        res = pd.DataFrame(t.update_coordinates(1, 0, 0, 2, 1))
        pdt.assert_frame_equal(res, exp, check_less_precise=True)


if __name__ == "__main__":
    unittest.main()
