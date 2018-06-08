# ----------------------------------------------------------------------------
# Copyright (c) 2018--, phyloviz development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file COPYING.txt, distributed with this software.
# ----------------------------------------------------------------------------
import unittest
import numpy as np
# import pandas as pd
# import pandas.util.testing as pdt
from scipy.cluster.hierarchy import complete
from skbio import DistanceMatrix, TreeNode
from phyloviz.model import Tree


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

    def test_cache_ntips_random_tree(self):

        t = Tree.from_tree(self.tree1)
        t._cache_ntips()

        self.assertEqual(t.leafcount, 10)
        self.assertEqual(t.children[0].leafcount, 2)
        self.assertEqual(t.children[1].leafcount, 8)
        self.assertEqual(t.children[0].children[0].leafcount, 1)
        self.assertEqual(t.children[0].children[1].leafcount, 1)
        self.assertEqual(t.children[1].children[0].leafcount, 3)
        self.assertEqual(t.children[1].children[1].leafcount, 5)

    def test_from_tree_random_tree(self):
        t = Tree.from_tree(self.tree1)
        self.assertEqual(t.__class__, Tree)

    # def test_coords_random_tree(self):
    #     t = Tree.from_tree(self.tree1)

    #     edge_exp = pd.DataFrame(
    #         {
    #             '0': [
    #                 '0', 'y11', 408.3850804246091, 240.10442497874831,
    #                 474.82749197370902, 283.25263154908782
    #             ],
    #             '1': [
    #                 '1', 'y16', 257.89956082792412, 247.99103687506513,
    #                 286.29072143348549, 321.95253890257857
    #             ],
    #             '2': [
    #                 '2', 'y14', 375.00926942577706, 153.15746472040379,
    #                 436.57748676687396, 103.30050536530359
    #             ],
    #             '3': [
    #                 '3', 'y11', 408.3850804246091, 240.10442497874831, 487.5,
    #                 235.95818773564568
    #             ],
    #             '4': [
    #                 '4', 'y6', 74.068217341096869, 368.43664502236788,
    #                 12.499999999999979, 418.29360437746811
    #             ],
    #             '5': [
    #                 '5', 'y14', 375.00926942577706, 153.15746472040379,
    #                 395.51381813502167, 76.633447151232261
    #             ],
    #             '6': [
    #                 '6', 'y6', 74.068217341096869, 368.43664502236788,
    #                 53.563668631852295, 444.9606625915394
    #             ],
    #             '7': [
    #                 '7', 'y2', 79.070722542332845, 129.00083943597397,
    #                 50.679561936771449, 55.039337408460526
    #             ],
    #             '8': [
    #                 '8', 'y2', 79.070722542332845, 129.00083943597397,
    #                 12.628310993232901, 85.85263286563449
    #             ],
    #             '9': [
    #                 '9', 'y7', 117.21642391143635, 301.99423347326797,
    #                 38.10150433604548, 306.1404707163706
    #             ],
    #             'y11': [
    #                 'y11', 'y15', 331.86106285543758, 219.59987626950374,
    #                 408.3850804246091, 240.10442497874831
    #             ],
    #             'y14': [
    #                 'y14', 'y15', 331.86106285543758, 219.59987626950374,
    #                 375.00926942577706, 153.15746472040379
    #             ],
    #             'y15': [
    #                 'y15', 'y16', 257.89956082792412, 247.99103687506513,
    #                 331.86106285543758, 219.59987626950374
    #             ],
    #             'y16': [
    #                 'y16', 'y17', 178.78464125253325, 252.13727411816777,
    #                 257.89956082792412, 247.99103687506513
    #             ],
    #             'y17': [
    #                 'y17', 'y18', 128.92768189743305, 190.56905677707087,
    #                 178.78464125253325, 252.13727411816777
    #             ],
    #             'y2': [
    #                 'y2', 'y18', 128.92768189743305, 190.56905677707087,
    #                 79.070722542332845, 129.00083943597397
    #             ],
    #             'y6': [
    #                 'y6', 'y7', 117.21642391143635, 301.99423347326797,
    #                 74.068217341096869, 368.43664502236788
    #             ],
    #             'y7': [
    #                 'y7', 'y17', 178.78464125253325, 252.13727411816777,
    #                 117.21642391143635, 301.99423347326797
    #             ]
    #         },
    #         index=['Node id', 'Parent id', 'px', 'py', 'x', 'y']).T
    #     node_exp = pd.DataFrame(
    #         {
    #             '0': ['0', 474.82749197370902, 283.25263154908782],
    #             '1': ['1', 286.29072143348549, 321.95253890257857],
    #             '2': ['2', 436.57748676687396, 103.30050536530359],
    #             '3': ['3', 487.5, 235.95818773564568],
    #             '4': ['4', 12.499999999999979, 418.29360437746811],
    #             '5': ['5', 395.51381813502167, 76.633447151232261],
    #             '6': ['6', 53.563668631852295, 444.9606625915394],
    #             '7': ['7', 50.679561936771449, 55.039337408460526],
    #             '8': ['8', 12.628310993232901, 85.85263286563449],
    #             '9': ['9', 38.10150433604548, 306.1404707163706],
    #             'y11': ['y11', 408.3850804246091, 240.10442497874831],
    #             'y14': ['y14', 375.00926942577706, 153.15746472040379],
    #             'y15': ['y15', 331.86106285543758, 219.59987626950374],
    #             'y16': ['y16', 257.89956082792412, 247.99103687506513],
    #             'y17': ['y17', 178.78464125253325, 252.13727411816777],
    #             'y18': ['y18', 128.92768189743305, 190.56905677707087],
    #             'y2': ['y2', 79.070722542332845, 129.00083943597397],
    #             'y6': ['y6', 74.068217341096869, 368.43664502236788],
    #             'y7': ['y7', 117.21642391143635, 301.99423347326797]
    #         },
    #         index=['Node id', 'x', 'y']).T
    #     node_res, edge_res, centerX, centerY, scale = t.coords(500, 500)
    #     pdt.assert_frame_equal(node_exp, node_res)
    #     pdt.assert_frame_equal(edge_exp, edge_res)

    def test_rescale_random_tree(self):
        t = Tree.from_tree(self.tree1)
        self.assertAlmostEqual(
            t.rescale(500, 500), 79.223492618646006, places=5)

    def test_update_coordinates_random_tree(self):
        t = Tree.from_tree(self.tree1)
        # exp = pd.DataFrame(
        #     [(-0.59847214410395655,
        #       -1.6334372886412185), (-0.99749498660405445,
        #                              -0.76155647142658189),
        #      (1.0504174348855488, 0.34902579063315775),
        #      (2.8507394969018511, 0.88932809650129752),
        #      (3.3688089449017027, 0.082482736278627664),
        #      (0.67135946132440838, -2.4180787481253012),
        #      (-1.9936226804402346, -2.9233732552695497),
        #      (-2.6203695704157117, -2.1977123674095331),
        #      (-1.8709927812120046, 0.33556711382648474),
        #      (-0.95033246755379708, 0.60348496526324824)])
        max_x, min_x, max_y, min_y = t.update_coordinates(1, 0, 0, 2, 1)
        self.assertAlmostEqual(max_x, 3.3688089449017027)
        self.assertAlmostEqual(min_x, -2.6203695704157117)
        self.assertAlmostEqual(max_y, 0.88932809650129752)
        self.assertAlmostEqual(min_y, -2.9233732552695497)

    def test_cache_ntips_nwk_tree(self):

        t = Tree.from_tree(self.tree2)
        t._cache_ntips()

        self.assertEqual(t.leafcount, 5)
        self.assertEqual(t.children[0].leafcount, 3)
        self.assertEqual(t.children[1].leafcount, 2)
        self.assertEqual(t.children[0].children[0].leafcount, 2)
        self.assertEqual(t.children[0].children[1].leafcount, 1)
        self.assertEqual(t.children[1].children[0].leafcount, 1)
        self.assertEqual(t.children[1].children[1].leafcount, 1)

    def test_from_tree(self):
        t = Tree.from_tree(self.tree2)
        self.assertEqual(t.__class__, Tree)

    # def test_coords(self):
    #     t = Tree.from_tree(self.tree2)

    #     edge_exp = pd.DataFrame(
    #         {
    #             'a': ['a', 'f', 141.35398602846797, 339.46141862722482,
    #                   83.371774496551481, 292.50834951934343],
    #             'b': ['b', 'g', 215.86090210071345, 343.36616063979909,
    #                   254.48144795927647, 487.5],
    #             'c': ['c', 'h', 403.57843531045097, 221.46096919708964,
    #                   478.08535138269644, 225.36571120966394],
    #             'd': ['d', 'h', 403.57843531045097, 221.46096919708964,
    #                   483.79103611135702, 12.500000000000028],
    #             'e': ['e', 'f', 141.35398602846797, 339.46141862722482,
    #                   16.20896388864297, 420.73154625569776],
    #             'f': ['f', 'g', 215.86090210071345, 343.36616063979909,
    #                   141.35398602846797, 339.46141862722482],
    #             'g': ['g', 'i', 278.43341317062595, 302.73109682556259,
    #                   215.86090210071345, 343.36616063979909],
    #             'h': ['h', 'i', 278.43341317062595, 302.73109682556259,
    #                   403.57843531045097, 221.46096919708964]},
    #             index=['Node id', 'Parent id', 'px', 'py', 'x', 'y']).T

    #     node_exp = pd.DataFrame(
    #         {
    #             'a': ['a', 83.371774496551481, 292.50834951934343],
    #             'b': ['b', 254.48144795927647, 487.5],
    #             'c': ['c', 478.08535138269644, 225.36571120966394],
    #             'd': ['d', 483.79103611135702, 12.500000000000028],
    #             'e': ['e', 16.20896388864297, 420.73154625569776],
    #             'f': ['f', 141.35398602846797, 339.46141862722482],
    #             'g': ['g', 215.86090210071345, 343.36616063979909],
    #             'h': ['h', 403.57843531045097, 221.46096919708964],
    #             'i': ['i', 278.43341317062595, 302.73109682556259]},
    #         index=['Node id', 'x', 'y']).T
    #     node_res, edge_res, centerX, centerY, scale = t.coords(500, 500)
    #     pdt.assert_frame_equal(node_exp, node_res)
    #     pdt.assert_frame_equal(edge_exp, edge_res)

    def test_rescale(self):
        t = Tree.from_tree(self.tree2)
        self.assertAlmostEqual(
            t.rescale(500, 500), 74.609165340334656, places=5)

    def test_update_coordinates(self):
        t = Tree.from_tree(self.tree2)
        # exp = pd.DataFrame(
        #     [(2.2301939502377812, 2.00173803121137),
        #      (3.9131359198535742, 2.0823426429476495),
        #         (3.5693632652849416, -0.70813820377328751),
        #         (0.34885097950630928, -3.2790527077291802),
        #         (-2.0626765144773422, -4.2499910737195705)])
        max_x, min_x, max_y, min_y = t.update_coordinates(1, 0, 0, 2, 1)
        self.assertAlmostEqual(max_x, 3.9131359198535742)
        self.assertAlmostEqual(min_x, -2.0626765144773422)
        self.assertAlmostEqual(max_y, 2.0823426429476495)
        self.assertAlmostEqual(min_y, -4.2499910737195705)

    def test_shortest_longest_branches(self):
        t = Tree.from_tree(self.tree2)
        t.coords(900, 1500)
        print(t.ascii_art())

        for node in t.postorder():
            print(node.name)
            print(node.depth)
            print(node.shortest.depth)
            print(node.longest.depth)

        self.assertEqual(t.find('a').shortest.depth, 4)
        self.assertEqual(t.find('a').longest.depth, 4)
        self.assertEqual(t.find('b').shortest.depth, 4)
        self.assertEqual(t.find('b').longest.depth, 4)
        self.assertEqual(t.find('c').shortest.depth, 4)
        self.assertEqual(t.find('c').longest.depth, 4)
        self.assertEqual(t.find('d').shortest.depth, 6)
        self.assertEqual(t.find('d').longest.depth, 6)
        self.assertEqual(t.find('e').shortest.depth, 5)
        self.assertEqual(t.find('e').longest.depth, 5)
        self.assertEqual(t.find('f').shortest.depth, 4)
        self.assertEqual(t.find('f').longest.depth, 5)
        self.assertEqual(t.find('g').shortest.depth, 4)
        self.assertEqual(t.find('g').longest.depth, 5)
        self.assertEqual(t.find('h').shortest.depth, 4)
        self.assertEqual(t.find('h').longest.depth, 6)
        self.assertEqual(t.find('i').shortest.depth, 4)
        self.assertEqual(t.find('i').longest.depth, 6)


if __name__ == "__main__":
    unittest.main()
