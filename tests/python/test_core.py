# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, QIIME 2 development team.
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
from pandas.util.testing import assert_index_equal, assert_frame_equal
from os.path import exists
from shutil import rmtree

from emperor import Emperor
from empress.core import Empress
from bp import parse_newick


class TestCore(unittest.TestCase):
    def setUp(self):
        self.tree = parse_newick('(((a:1,e:2):1,b:2)g:1,(:1,d:3)h:2):1;')
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

        assert_ordination_results_equal(viz.ordination.samples, self.pcoa)

        # emperor is instantiated as needed
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

        self.fail('Write real tests for other attributes')
        self.assertTrue(obs['emperor_div'].startswith('<div>..'))
        self.assertTrue(obs['emperor_require_logic'].startswith('<div>..'))
        self.assertTrue(obs['emperor_style'].startswith('<div>..'))
        self.assertTrue(obs['emperor_base_dependencies'].startswith('<div>..'))
        self.assertTrue(obs['emperor_classes'], 'combined-plot-container')

    def test_to_dict_with_emperor(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      ordination=self.pcoa)
        obs = viz._to_dict()

        self.fail('Write real tests for other attributes')
        self.assertTrue(obs['emperor_div'].startswith('<div>..'))
        self.assertTrue(obs['emperor_require_logic'].startswith('<div>..'))
        self.assertTrue(obs['emperor_style'].startswith('<div>..'))
        self.assertTrue(obs['emperor_base_dependencies'].startswith('<div>..'))
        self.assertTrue(obs['emperor_classes'], 'combined-plot-container')

        self.assertEquals(obs._emperor.width, '48vw')
        self.assertEquals(obs._emperor.width, '100vh; float: right;')


if __name__ == "__main__":
    unittest.main()
