# ----------------------------------------------------------------------------
# Copyright (c) 2018--, phyloviz development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file COPYING.txt, distributed with this software.
# ----------------------------------------------------------------------------
import unittest
import numpy as np
import pandas as pd
from skbio import DistanceMatrix, TreeNode
from phyloviz.ToyModel import ToyModel
from scipy.cluster.hierarchy import ward
import pandas.util.testing as pdt


class mock(ToyModel):
    # mock dendrogram class to make sure that inheritance
    # is working as expected.
    def rescale(self, width, height):
        pass


class TestRootedRadial(unittest.TestCase):

    def test_cache_ntips(self):
        dm = DistanceMatrix.from_iterable([0, 1, 2, 3],
                                          lambda x, y: np.abs(x-y))
        lm = ward(dm.condensed_form())
        ids = np.arange(4).astype(np.str)
        t = mock.from_linkage_matrix(lm, ids)

        t._cache_ntips()

        self.assertEquals(t.leafcount, 4)
        self.assertEquals(t.children[0].leafcount, 2)
        self.assertEquals(t.children[1].leafcount, 2)
        self.assertEquals(t.children[0].children[0].leafcount, 1)
        self.assertEquals(t.children[0].children[1].leafcount, 1)
        self.assertEquals(t.children[1].children[0].leafcount, 1)
        self.assertEquals(t.children[1].children[1].leafcount, 1)



class TestUnrootedRadial(unittest.TestCase):

    def setUp(self):
        np.random.seed(0)
        x = np.random.rand(10)
        dm = DistanceMatrix.from_iterable(x, lambda x, y: np.abs(x-y))
        lm = ward(dm.condensed_form())
        ids = np.arange(len(x)).astype(np.str)
        self.tree = TreeNode.from_linkage_matrix(lm, ids)

        # initialize tree with branch length and named internal nodes
        for i, n in enumerate(self.tree.postorder(include_self=True)):
            n.length = 1
            if not n.is_tip():
                n.name = "y%d" % i

    def test_from_tree(self):
        t = ToyModel.from_tree(self.tree)
        self.assertEqual(t.__class__, ToyModel)

    def test_coords(self):
        t = ToyModel.from_tree(self.tree)

        exp = pd.DataFrame({'0': [0, 4.40, np.nan, np.nan, True],
                            '1': [464.724, 174.338, np.nan, np.nan, True],
                            '2': [487.5, 43.2804, np.nan, np.nan, True],
                            '3': [446.172, 359.095, np.nan, np.nan, True],
                            '4': [32.4704, 456.72, np.nan, np.nan, True],
                            '5': [438.468, 14.9717, np.nan, np.nan, True],
                            '6': [81.5024, 485.028, np.nan, np.nan, True],
                            '7': [54.5748, 34.9421, np.nan, np.nan, True],
                            '8': [12.5, 72.8265, np.nan, np.nan, True],
                            '9': [55.2464, 325.662, np.nan, np.nan, True],
                            'y10': [366.837, 313.291, '0', '3', False],
                            'y14': [419.421, 104.579, '2', '5', False],
                            'y15': [373.617, 183.914, '1', 'y14', False],
                            'y16': [305.539, 245.212, 'y10', 'y15', False],
                            'y17': [214.432, 254.788, 'y7', 'y16', False],
                            'y18': ['y18',153.134, 186.709, 'y2', 'y17', False],
                            'y2': ['y2',91.8354, 118.631, '7', '8', False],
                            'y6': ['y6',100.549, 395.421, '4', '6', False],
                            'y7': ['y7',146.353, 316.086, '9', 'y6', False]},
                           index=['x', 'y', 'child0', 'child1', 'is_tip']).T
	node_exp = pd.DataFrame({'0':['0', 404.09740526755405, 396.97935323960797], 
				'1': ['1', 464.72398147666206, 174.33825633015596], 
				'2': ['2', 487.5, 43.280354738633605], 
				'3': ['3', 446.172242519571, 359.09499961471846], 
				'4': ['4', 32.470414326462546, 456.71964526136634], :
				'5': ['5', 438.46799887298556, 14.97171568904578], 
				'6': ['6', 81.502415453476999, 485.02828431095418], 
                                '7': ['7', 54.574837252016948, 34.942130015508312], 
                                '8': ['8', 12.499999999999986, 72.826483640397825], 
                                '9': ['9', 55.246432849800414, 325.66174366984399], 
                                'y10': ['y10', 366.83679815963848, 313.29065945723283], 
                                'y14': ['y14', 419.4214832551163, 104.57852654552511], 
                                'y15': ['y15', 373.61714309763067, 183.91397090545763], 
                                'y16': ['y16', 305.53862635274697, 245.21214271234913], 
                                'y17': ['y17', 214.43178797371553, 254.78785728765081], 
                                'y18': ['y18', 153.13361616682403, 186.70934054276711],
                                'y2': ['y2', 91.835444359932509, 118.63082379788342], 
                                'y6': ['y6', 100.54893107134623, 395.42147345447484], 
                                'y7': ['y7', 146.35327122883183, 316.08602909454231]]},
                               index=['Node id', 'x', 'y']).T
        node, edges = t.coords(500, 500)
        pdt.assert_frame_equal(exp, res)

    def test_rescale(self):
        t = ToyModel.from_tree(self.tree)
        self.assertAlmostEqual(t.rescale(500, 500), 91.608680314971238,
                               places=5)

    def test_update_coordinates(self):
        t = ToyModel.from_tree(self.tree)
        exp = pd.DataFrame([(-0.59847214410395644, -1.6334372886412185),
                            (-0.99749498660405445, -0.76155647142658189),
                            (1.0504174348855488, 0.34902579063315775),
                            (2.8507394969018511, 0.88932809650129752),
                            (3.3688089449017027, 0.082482736278627664),
                            (0.81247946938427551, -3.4080712447257464),
                            (-0.13677590240930079, -3.5433843164696093),
                            (-1.6101831260150372, -1.1190611577178871),
                            (-1.6176088321192579, 0.76057470265451865),
                            (-0.69694851846105044, 1.0284925540912822)])

        res = pd.DataFrame(t.update_coordinates(1, 0, 0, 2, 1))
        pdt.assert_frame_equal(res, exp, check_less_precise=True)



if __name__ == "__main__":
    unittest.main()
