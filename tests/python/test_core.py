# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------
import unittest
import pandas as pd
import numpy as np
import skbio

from skbio.util import assert_ordination_results_equal
from pandas.util.testing import assert_frame_equal
from os.path import exists
from shutil import rmtree

from emperor import Emperor
from empress.core import Empress
from bp import parse_newick, to_skbio_treenode


class TestCore(unittest.TestCase):
    def setUp(self):
        self.tree = parse_newick('(((a:1,e:2):1,b:2)g:1,(:1,d:3)h:2):1;')
        self.pruned_tree = parse_newick('((a:2,b:2)g:1,d:5):1;')
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
        self.sample_metadata = pd.DataFrame(
            {
                "Metadata1": [0, 0, 0, 1],
                "Metadata2": [0, 0, 0, 0],
                "Metadata3": [1, 2, 3, 4],
                "Metadata4": ["abc", "def", "ghi", "jkl"]
            },
            index=list(self.table.index)
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

    def tearDown(self):
        for path in self.files_to_remove:
            if exists(path):
                rmtree(path)

    def test_init(self):
        viz = Empress(self.tree, self.table, self.sample_metadata)

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
                      ordination=self.pcoa)

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

    def test_init_feature_metadata_warning(self):

        with self.assertWarnsRegex(UserWarning, 'Feature metadata is currently'
                                   ' not supported'):
            Empress(self.tree, self.table, self.sample_metadata,
                    feature_metadata=self.sample_metadata.copy())

    def test_copy_support_files_use_base(self):
        local_path = './some-local-path/'

        viz = Empress(self.tree, self.table, self.sample_metadata,
                      resource_path=local_path)
        self.assertEqual(viz.base_url, local_path)

        viz.copy_support_files()

        self.assertTrue(exists(local_path))

        self.files_to_remove.append(local_path)

    def test_copy_support_files_use_target(self):
        local_path = './other-local-path/'

        viz = Empress(self.tree, self.table, self.sample_metadata,
                      resource_path=local_path)
        self.assertEqual(viz.base_url, local_path)

        viz.copy_support_files(target='./something-else')

        self.assertTrue(exists('./something-else'))

        self.files_to_remove.append(local_path)
        self.files_to_remove.append('./something-else')

    def test_to_dict(self):
        viz = Empress(self.tree, self.table, self.sample_metadata)
        obs = viz._to_dict()
        self.assertEqual(obs, DICT_A)

    def test_to_dict_with_emperor(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      ordination=self.pcoa)
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
            if not key.startswith('emperor_'):
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
        self.assertEqual(viz._bp_tree, [1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0])
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


# How data should look like when converted to a dict
DICT_A = {'base_url': './support_files',
          'default_layout': 'Unrooted',
          'emperor_base_dependencies': '',
          'emperor_classes': '',
          'emperor_div': '',
          'emperor_require_logic': '',
          'emperor_style': '',
          'layout_to_coordsuffix': {'Rectangular': 'r', 'Unrooted': '2'},
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
          'tree': [1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0],
          'tree_data': {1: {'color': [0.75, 0.75, 0.75],
                            'name': 'a',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': -82.19088834200284,
                            'xr': 2412.0,
                            'y2': 1568.2955749395592,
                            'yr': -2386.875},
                        2: {'color': [0.75, 0.75, 0.75],
                            'name': 'e',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': 948.7236134182863,
                            'xr': 3216.0,
                            'y2': 2108.2845722271436,
                            'yr': -1381.875},
                        3: {'color': [0.75, 0.75, 0.75],
                            'highestchildyr': -1381.875,
                            'lowestchildyr': -2386.875,
                            'name': 'EmpressNode0',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': 295.3117872853636,
                            'xr': 1608.0,
                            'y2': 1102.1185942229504,
                            'yr': -1884.375},
                        4: {'color': [0.75, 0.75, 0.75],
                            'name': 'b',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': 1485.5419815224768,
                            'xr': 2412.0,
                            'y2': 192.57380029925002,
                            'yr': -376.875},
                        5: {'color': [0.75, 0.75, 0.75],
                            'highestchildyr': -376.875,
                            'lowestchildyr': -1884.375,
                            'name': 'g',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': 326.7059130664611,
                            'xr': 804.0,
                            'y2': 503.08298900209684,
                            'yr': -1130.625},
                        6: {'color': [0.75, 0.75, 0.75],
                            'name': 'EmpressNode1',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': -622.0177003518252,
                            'xr': 2412.0,
                            'y2': -1605.201583225047,
                            'yr': 628.125},
                        7: {'color': [0.75, 0.75, 0.75],
                            'name': 'd',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': -2333.458018477523,
                            'xr': 4020.0,
                            'y2': -1651.0752884434787,
                            'yr': 1633.125},
                        8: {'color': [0.75, 0.75, 0.75],
                            'highestchildyr': 1633.125,
                            'lowestchildyr': 628.125,
                            'name': 'h',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': -653.4118261329227,
                            'xr': 1608.0,
                            'y2': -1006.1659780041933,
                            'yr': 1130.625},
                        9: {'color': [0.75, 0.75, 0.75],
                            'highestchildyr': 1130.625,
                            'lowestchildyr': -1130.625,
                            'name': 'EmpressNode2',
                            'sampVal': 1,
                            'single_samp': False,
                            'visible': True,
                            'x2': 0.0,
                            'xr': 0.0,
                            'y2': 0.0,
                            'yr': 0.0}}}


if __name__ == "__main__":
    unittest.main()
