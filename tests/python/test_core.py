# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

import copy
import unittest
import pandas as pd
import numpy as np
import skbio

from skbio.util import assert_ordination_results_equal
from pandas.util.testing import assert_frame_equal
from os.path import exists
from shutil import rmtree

from emperor import Emperor
from empress import tools
from empress.core import Empress
from bp import parse_newick
from six import StringIO
from skbio.tree import TreeNode


class TestCore(unittest.TestCase):

    def assert_almost_equal_tree_data(self, tree_data, exp):
        for node in tree_data:
            for attr in tree_data[node]:
                self.assertAlmostEqual(tree_data[node][attr], exp[node][attr])
        # check that keys are identical otherwise
        self.assertEqual(tree_data.keys(), exp.keys())

    def setUp(self):
        self.tree = parse_newick('(((a:1,e:2):1,b:2)g:1,(:1,d:3)h:2):1;')
        self.pruned_tree = TreeNode.read(
            StringIO('(((a:1)EmpressNode0:1,b:2)g:1,(d:3)h:2)EmpressNode1:1;')
        )
        # Test table/metadata (mostly) adapted from Qurro:
        # the table is transposed to match QIIME2's expectation
        self.table = pd.DataFrame(
            {
                "Sample1": [1, 2, 0, 4],
                "Sample2": [8, 7, 0, 5],
                "Sample3": [1, 0, 0, 0],
                "Sample4": [0, 0, 0, 0]
            },
            index=["a", "b", "e", "d"]
        ).T
        self.unrelated_table = pd.DataFrame(
            {
                "Sample1": [5, 2, 0, 2],
                "Sample2": [2, 3, 0, 1],
                "Sample3": [5, 2, 0, 0],
                "Sample4": [4, 5, 0, 4]
            },
            index=["h", "i", "j", "k"]
        ).T
        self.sample_metadata = pd.DataFrame(
            {
                "Metadata1": [0, 0, 0, 1],
                "Metadata2": [0, 0, 0, 0],
                "Metadata3": [1, 2, 3, 4],
                "Metadata4": ["abc", "def", "ghi", "jkl"]
            },
            index=list(self.table.index)
        )

        self.feature_metadata = pd.DataFrame(
            {
                "fmdcol1": ["asdf", "ghjk"],
                "fmdcol2": ["qwer", "tyui"]
            },
            index=["a", "h"]
        )
        self.filtered_table = pd.DataFrame(
            {
                "Sample1": [1, 2, 4],
                "Sample2": [8, 7, 5],
                "Sample3": [1, 0, 0],
                "Sample4": [0, 0, 0]
            },
            index=["a", "b", "d"]
        ).T

        eigvals = pd.Series(np.array([0.50, 0.25, 0.25]),
                            index=['PC1', 'PC2', 'PC3'])
        samples = np.array([[0.1, 0.2, 0.3],
                            [0.2, 0.3, 0.4],
                            [0.3, 0.4, 0.5],
                            [0.4, 0.5, 0.6]])
        proportion_explained = pd.Series([15.5, 12.2, 8.8],
                                         index=['PC1', 'PC2', 'PC3'])
        samples_df = pd.DataFrame(samples,
                                  index=['Sample1', 'Sample2', 'Sample3',
                                         'Sample4'],
                                  columns=['PC1', 'PC2', 'PC3'])
        self.pcoa = skbio.OrdinationResults(
                'PCoA',
                'Principal Coordinate Analysis',
                eigvals,
                samples_df,
                proportion_explained=proportion_explained)

        self.files_to_remove = []
        self.maxDiff = None

    def tearDown(self):
        for path in self.files_to_remove:
            if exists(path):
                rmtree(path)

    def test_init(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      filter_unobserved_features_from_phylogeny=False)

        self.assertEqual(viz.base_url, './')
        self.assertEqual(viz._bp_tree, [1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1,
                                        0, 1, 0, 0, 0])

        names = ['a', 'e', 'EmpressNode0', 'b', 'g', 'EmpressNode1', 'd', 'h',
                 'EmpressNode2']
        for i, node in enumerate(viz.tree.postorder()):
            self.assertEqual(node.name, names[i])

        # table should be unchanged and be a different id instance
        assert_frame_equal(self.table, viz.table.T)
        self.assertNotEqual(id(self.table), id(viz.table))

        # sample metadata should be unchanged and be a different id instance
        assert_frame_equal(self.sample_metadata, viz.samples)
        self.assertNotEqual(id(self.sample_metadata), id(viz.samples))

        self.assertIsNone(viz.features)
        self.assertIsNone(viz.ordination)

    def test_init_with_ordination(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      ordination=self.pcoa,
                      filter_unobserved_features_from_phylogeny=False)

        self.assertEqual(viz.base_url, './')
        self.assertEqual(viz._bp_tree, [1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1,
                                        0, 1, 0, 0, 0])

        names = ['a', 'e', 'EmpressNode0', 'b', 'g', 'EmpressNode1', 'd', 'h',
                 'EmpressNode2']
        for i, node in enumerate(viz.tree.postorder()):
            self.assertEqual(node.name, names[i])

        # table should be unchanged and be a different id instance
        assert_frame_equal(self.table, viz.table.T)
        self.assertNotEqual(id(self.table), id(viz.table))

        # sample metadata should be unchanged and be a different id instance
        assert_frame_equal(self.sample_metadata, viz.samples)
        self.assertNotEqual(id(self.sample_metadata), id(viz.samples))

        self.assertIsNone(viz.features)

        assert_ordination_results_equal(viz.ordination, self.pcoa)

        # emperor is instantiated as needed but not yet setup
        self.assertTrue(isinstance(viz._emperor, Emperor))

    def test_copy_support_files_use_base(self):
        local_path = './some-local-path/'

        viz = Empress(self.tree, self.table, self.sample_metadata,
                      resource_path=local_path,
                      filter_unobserved_features_from_phylogeny=False)
        self.assertEqual(viz.base_url, local_path)

        viz.copy_support_files()

        self.assertTrue(exists(local_path))

        self.files_to_remove.append(local_path)

    def test_copy_support_files_use_target(self):
        local_path = './other-local-path/'

        viz = Empress(self.tree, self.table, self.sample_metadata,
                      resource_path=local_path,
                      filter_unobserved_features_from_phylogeny=False)
        self.assertEqual(viz.base_url, local_path)

        viz.copy_support_files(target='./something-else')

        self.assertTrue(exists('./something-else'))

        self.files_to_remove.append(local_path)
        self.files_to_remove.append('./something-else')

    def test_to_dict(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      filter_unobserved_features_from_phylogeny=False)
        obs = viz._to_dict()
        dict_a_cp = copy.deepcopy(DICT_A)

        tree_data = obs['tree_data']
        exp = dict_a_cp['tree_data']

        self.assert_almost_equal_tree_data(tree_data, exp)

        dict_a_cp.pop('tree_data')
        obs.pop('tree_data')
        self.assertEqual(obs, dict_a_cp)

    def test_to_dict_with_feature_metadata(self):
        viz = Empress(
            self.tree, self.table, self.sample_metadata, self.feature_metadata,
            filter_unobserved_features_from_phylogeny=False
        )
        obs = viz._to_dict()
        dict_a_with_fm = copy.deepcopy(DICT_A)
        dict_a_with_fm["tip_metadata"] = {
            "a": {"fmdcol1": "asdf", "fmdcol2": "qwer"}
        }
        dict_a_with_fm["int_metadata"] = {
            "h": {"fmdcol1": "ghjk", "fmdcol2": "tyui"}
        }
        dict_a_with_fm["feature_metadata_columns"] = ["fmdcol1", "fmdcol2"]

        tree_data = obs['tree_data']
        exp = dict_a_with_fm['tree_data']
        self.assert_almost_equal_tree_data(tree_data, exp)

        obs.pop('tree_data')
        dict_a_with_fm.pop('tree_data')
        self.assertEqual(obs, dict_a_with_fm)

    def test_to_dict_with_emperor(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      ordination=self.pcoa,
                      filter_unobserved_features_from_phylogeny=False)
        obs = viz._to_dict()

        self.assertEqual(viz._emperor.width, '48vw')
        self.assertEqual(viz._emperor.height, '100vh; float: right')

        self.assertEqual(viz._emperor.settings['axes']['axesColor'], 'black')
        self.assertEqual(viz._emperor.settings['axes']['backgroundColor'],
                         'white')

        # we test key by key so we can do "general" checks on the emperor
        # values, this helps with tests not breaking if any character changes
        # in # Emperor
        for key, value in obs.items():
            if key == 'tree_data':
                tree_data = obs['tree_data']
                exp = DICT_A['tree_data']
                self.assert_almost_equal_tree_data(tree_data, exp)
            elif not key.startswith('emperor_'):
                self.assertEqual(obs[key], DICT_A[key])

        exp = "    <div id='emperor-notebook"
        self.assertTrue(obs['emperor_div'].startswith(exp))

        exp = "// When running in the Jupyter"
        self.assertTrue(obs['emperor_require_logic'].startswith(exp))

        exp = "}); // END REQUIRE.JS block"
        self.assertTrue(obs['emperor_require_logic'].endswith(exp))

        exp = '<link id="emperor-css" rel="stylesheet"'
        self.assertTrue(obs['emperor_style'].startswith(exp))

        exp = "vendor/js/jquery-"
        self.assertEqual(obs['emperor_base_dependencies'].count(exp), 1)

        self.assertTrue(obs['emperor_classes'], 'combined-plot-container')

    def test_filter_unobserved_features_from_phylogeny(self):

        viz = Empress(self.tree, self.filtered_table, self.sample_metadata,
                      filter_unobserved_features_from_phylogeny=True)
        self.assertEqual(viz._bp_tree, [1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1,
                                        0, 0, 0])

        names = ['a', 'EmpressNode0', 'b', 'g', 'd', 'h', 'EmpressNode1']
        for i, node in enumerate(viz.tree.postorder()):
            self.assertEqual(node.name, names[i])

        # table should be unchanged and be a different id instance
        assert_frame_equal(self.filtered_table, viz.table.T)
        self.assertNotEqual(id(self.filtered_table), id(viz.table))

        # sample metadata should be unchanged and be a different id instance
        assert_frame_equal(self.sample_metadata, viz.samples)
        self.assertNotEqual(id(self.sample_metadata), id(viz.samples))

        self.assertIsNone(viz.features)
        self.assertIsNone(viz.ordination)

    def test_no_intersection_between_tree_and_table(self):
        bad_table = self.unrelated_table.copy()
        bad_table.index = range(len(self.unrelated_table.index))
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No features in the feature table are present as tips in the tree."
        ):
            Empress(self.tree, self.unrelated_table, self.sample_metadata,
                    filter_unobserved_features_from_phylogeny=False)
        # Check that --p-filter-unobserved-features-from-phylogeny doesn't
        # override this: the data mismatch should be identified before
        # attempting shearing
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No features in the feature table are present as tips in the tree."
        ):
            Empress(self.tree, self.unrelated_table, self.sample_metadata,
                    filter_unobserved_features_from_phylogeny=True)


# How data should look like when converted to a dict
DICT_A = {'base_url': './support_files',
          'default_layout': 'Unrooted',
          'emperor_base_dependencies': '',
          'emperor_classes': '',
          'emperor_div': '',
          'emperor_require_logic': '',
          'emperor_style': '',
          'layout_to_coordsuffix': {'Circular': 'c1',
                                    'Rectangular': 'r',
                                    'Unrooted': '2'},
          'names': ['EmpressNode2',
                    'g',
                    'EmpressNode0',
                    'a',
                    'e',
                    'b',
                    'h',
                    'EmpressNode1',
                    'd'],
          'names_to_keys': {'EmpressNode0': [3],
                            'EmpressNode1': [6],
                            'EmpressNode2': [9],
                            'a': [1],
                            'b': [4],
                            'd': [7],
                            'e': [2],
                            'g': [5],
                            'h': [8]},
          'obs_data': {'Sample1': ['a', 'b', 'd'],
                       'Sample2': ['a', 'b', 'd'],
                       'Sample3': ['a'],
                       'Sample4': []},
          'sample_data': {'Sample1': {'Metadata1': 0,
                                      'Metadata2': 0,
                                      'Metadata3': 1,
                                      'Metadata4': 'abc'},
                          'Sample2': {'Metadata1': 0,
                                      'Metadata2': 0,
                                      'Metadata3': 2,
                                      'Metadata4': 'def'},
                          'Sample3': {'Metadata1': 0,
                                      'Metadata2': 0,
                                      'Metadata3': 3,
                                      'Metadata4': 'ghi'},
                          'Sample4': {'Metadata1': 1,
                                      'Metadata2': 0,
                                      'Metadata3': 4,
                                      'Metadata4': 'jkl'}},
          'sample_data_type': {'Metadata1': 'n',
                               'Metadata2': 'n',
                               'Metadata3': 'n',
                               'Metadata4': 'o'},
          'tip_metadata': {},
          'int_metadata': {},
          'feature_metadata_columns': [],
          'tree': [1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0],
          'tree_data': {1: {'color': [0.75, 0.75, 0.75],
                            'name': 'a',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': -82.19088834200284,
                            'xc0': 1481.4675640601124,
                            'xc1': 2222.2013460901685,
                            'xr': 2412.0,
                            'y2': 1568.2955749395592,
                            'yc0': 0.0,
                            'yc1': 0.0,
                            'yr': -2386.875},
                        2: {'color': [0.75, 0.75, 0.75],
                            'name': 'e',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': 948.7236134182863,
                            'xc0': 457.7986539098309,
                            'xc1': 915.5973078196618,
                            'xr': 3216.0,
                            'y2': 2108.2845722271436,
                            'yc0': 1408.9593804792778,
                            'yc1': 2817.9187609585556,
                            'yr': -1381.875},
                        3: {'arcendangle': 0,
                            'arcstartangle': 1.2566370614359172,
                            'arcx0': 457.7986539098309,
                            'arcy0': 1408.9593804792778,
                            'color': [0.75, 0.75, 0.75],
                            'highestchildyr': -1381.875,
                            'lowestchildyr': -2386.875,
                            'name': 'EmpressNode0',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': 295.3117872853636,
                            'xc0': 599.2662179699436,
                            'xc1': 1198.5324359398871,
                            'xr': 1608.0,
                            'y2': 1102.1185942229504,
                            'yc0': 435.3923929520944,
                            'yc1': 870.7847859041888,
                            'yr': -1884.375},
                        4: {'color': [0.75, 0.75, 0.75],
                            'name': 'b',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': 1485.5419815224768,
                            'xc0': -599.2662179699435,
                            'xc1': -1797.7986539098304,
                            'xr': 2412.0,
                            'y2': 192.57380029925002,
                            'yc0': 435.3923929520945,
                            'yc1': 1306.1771788562833,
                            'yr': -376.875},
                        5: {'arcendangle': 0.6283185307179586,
                            'arcstartangle': 2.5132741228718345,
                            'arcx0': -599.2662179699435,
                            'arcy0': 435.3923929520945,
                            'color': [0.75, 0.75, 0.75],
                            'highestchildyr': -376.875,
                            'lowestchildyr': -1884.375,
                            'name': 'g',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': 326.7059130664611,
                            'xc0': 0.0,
                            'xc1': 4.5356862759171076e-14,
                            'xr': 804.0,
                            'y2': 503.08298900209684,
                            'yc0': 0.0,
                            'yc1': 740.7337820300562,
                            'yr': -1130.625},
                        6: {'color': [0.75, 0.75, 0.75],
                            'name': 'EmpressNode1',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': -622.0177003518252,
                            'xc0': -1198.5324359398871,
                            'xc1': -1797.7986539098308,
                            'xr': 2412.0,
                            'y2': -1605.201583225047,
                            'yc0': -870.7847859041887,
                            'yc1': -1306.177178856283,
                            'yr': 628.125},
                        7: {'color': [0.75, 0.75, 0.75],
                            'name': 'd',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': -2333.458018477523,
                            'xc0': 457.79865390983053,
                            'xc1': 1144.4966347745763,
                            'xr': 4020.0,
                            'y2': -1651.0752884434787,
                            'yc0': -1408.9593804792778,
                            'yc1': -3522.398451198195,
                            'yr': 1633.125},
                        8: {'arcendangle': 3.7699111843077517,
                            'arcstartangle': 5.026548245743669,
                            'arcx0': 457.79865390983053,
                            'arcy0': -1408.9593804792778,
                            'color': [0.75, 0.75, 0.75],
                            'highestchildyr': 1633.125,
                            'lowestchildyr': 628.125,
                            'name': 'h',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': -653.4118261329227,
                            'xc0': -0.0,
                            'xc1': -457.79865390983105,
                            'xr': 1608.0,
                            'y2': -1006.1659780041933,
                            'yc0': -0.0,
                            'yc1': -1408.9593804792778,
                            'yr': 1130.625},
                        9: {'color': [0.75, 0.75, 0.75],
                            'highestchildyr': 1130.625,
                            'lowestchildyr': -1130.625,
                            'name': 'EmpressNode2',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': 0.0,
                            'xc0': 0.0,
                            'xc1': 0.0,
                            'xr': 0.0,
                            'y2': 0.0,
                            'yc0': 0.0,
                            'yc1': 0.0,
                            'yr': 0.0}}}


if __name__ == "__main__":
    unittest.main()
