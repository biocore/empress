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

from .test_integration import load_mp_data
from emperor import Emperor
from empress import tools
from empress.core import Empress
from bp import parse_newick, from_skbio_treenode
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
                "Sample4": [0, 0, 1, 0]
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
            },
            index=["a", "b", "d"]
        ).T
        self.filtered_sample_metadata = pd.DataFrame(
            {
                "Metadata1": [0, 0, 0],
                "Metadata2": [0, 0, 0],
                "Metadata3": [1, 2, 3],
                "Metadata4": ["abc", "def", "ghi"]
            },
            index=["Sample1", "Sample2", "Sample3"]
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
        self.maxDiff = None

    def tearDown(self):
        for path in self.files_to_remove:
            if exists(path):
                rmtree(path)

    def test_init(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      filter_unobserved_features_from_phylogeny=False)

        self.assertEqual(viz.base_url, 'support_files')
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

        self.assertEqual(viz.base_url, 'support_files')
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

    def test_init_with_ordination_empty_samples_in_pcoa(self):
        bad_table = self.table.copy()
        bad_table.loc["Sample4"] = 0
        bad_table.loc["Sample2"] = 0
        with self.assertRaisesRegex(
            ValueError,
            (
                r"The ordination contains samples that are empty \(i.e. "
                r"all 0s\) in the table. Problematic sample IDs: Sample2, "
                "Sample4"
            )
        ):
            Empress(self.tree, bad_table, self.sample_metadata,
                    ordination=self.pcoa,
                    filter_unobserved_features_from_phylogeny=False)

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

        # NOTE: Uncomment the following two lines of code to write the current
        # DICT_A to a file. Once it's written to a file, you can run
        # "black -l 79 dictcode.py" (while in the same directory as the file)
        # to format it so that it's consistent with how DICT_A is set up at the
        # bottom of this file.
        # with open("dictcode.py", "w") as f:
        #     f.write("DICT_A = {}".format(str(obs)))

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
        dict_a_with_fm["compressed_tip_metadata"] = {"a": ["asdf", "qwer"]}
        dict_a_with_fm["compressed_int_metadata"] = {"h": ["ghjk", "tyui"]}
        dict_a_with_fm["feature_metadata_columns"] = ["fmdcol1", "fmdcol2"]

        tree_data = obs['tree_data']
        exp = dict_a_with_fm['tree_data']
        self.assert_almost_equal_tree_data(tree_data, exp)

        obs.pop('tree_data')
        dict_a_with_fm.pop('tree_data')
        self.assertEqual(obs, dict_a_with_fm)

    def test_to_dict_with_metadata_nans(self):
        nan_sample_metadata = self.sample_metadata.copy()
        nan_feature_metadata = self.feature_metadata.copy()
        nan_sample_metadata.at["Sample2", "Metadata4"] = np.nan
        nan_feature_metadata.at["h", "fmdcol1"] = np.nan
        nan_feature_metadata.at["a", "fmdcol2"] = np.nan

        viz = Empress(self.tree, self.table, nan_sample_metadata,
                      nan_feature_metadata,
                      filter_unobserved_features_from_phylogeny=False)
        obs = viz._to_dict()
        dict_a_nan = copy.deepcopy(DICT_A)

        # [1][3] corresponds to Sample2, Metadata4
        dict_a_nan["compressed_sample_metadata"][1][3] = str(np.nan)

        dict_a_nan["compressed_tip_metadata"] = {"a": ["asdf", str(np.nan)]}
        dict_a_nan["compressed_int_metadata"] = {"h": [str(np.nan), "tyui"]}
        dict_a_nan["feature_metadata_columns"] = ["fmdcol1", "fmdcol2"]

        tree_data = obs['tree_data']
        exp = dict_a_nan['tree_data']
        self.assert_almost_equal_tree_data(tree_data, exp)

        dict_a_nan.pop('tree_data')
        obs.pop('tree_data')
        self.assertEqual(obs, dict_a_nan)

        res = viz.make_empress()
        self.assertTrue('empressRequire' in res)
        self.assertTrue('empress = new Empress' in res)
        self.assertTrue('emperor_require_logic' not in res)

    def test_to_dict_with_emperor(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      ordination=self.pcoa,
                      filter_unobserved_features_from_phylogeny=False,
                      filter_extra_samples=True)
        obs = viz._to_dict()

        self.assertEqual(viz._emperor.width, '50vw')
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

        viz = Empress(self.tree, self.filtered_table,
                      self.filtered_sample_metadata,
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
        assert_frame_equal(self.filtered_sample_metadata, viz.samples)
        self.assertNotEqual(id(self.filtered_sample_metadata), id(viz.samples))

        self.assertIsNone(viz.features)
        self.assertIsNone(viz.ordination)

    def test_fm_filtering_post_shearing(self):

        extra_fm = self.feature_metadata.copy()
        extra_fm.loc["e"] = "i'm going to be filtered :O"
        viz = Empress(self.tree, self.filtered_table,
                      self.filtered_sample_metadata, feature_metadata=extra_fm,
                      filter_unobserved_features_from_phylogeny=True)
        # Same as with the shearing test above, check that the tree was handled
        # as expected
        self.assertEqual(viz._bp_tree, [1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1,
                                        0, 0, 0])

        names = ['a', 'EmpressNode0', 'b', 'g', 'd', 'h', 'EmpressNode1']
        for i, node in enumerate(viz.tree.postorder()):
            self.assertEqual(node.name, names[i])

        # Now, the point of this test: verify that the feature metadata was
        # filtered to just stuff in the sheared tree ("e" was removed from the
        # tip metadata)
        assert_frame_equal(extra_fm.loc[["a"]], viz.tip_md)
        assert_frame_equal(extra_fm.loc[["h"]], viz.int_md)

        # table should be unchanged and be a different id instance
        assert_frame_equal(self.filtered_table, viz.table.T)
        self.assertNotEqual(id(self.filtered_table), id(viz.table))

        # sample metadata should be unchanged and be a different id instance
        assert_frame_equal(self.filtered_sample_metadata, viz.samples)
        self.assertNotEqual(id(self.filtered_sample_metadata), id(viz.samples))

        self.assertIsNone(viz.ordination)

    def test_fm_filtering_post_shearing_with_moving_pictures_dataset(self):
        # This particular tip can be problematic (it was the reason we found
        # out about https://github.com/biocore/empress/issues/248), so we
        # observe how it is handled in generating a visualization of the
        # moving pictures dataset to verify that #248 does not recur.
        funky_tip = "8406abe6d9a72018bf32d189d1340472"
        tree, tbl, smd, fmd, pcoa = load_mp_data()
        # Convert artifacts / metadata objects to "normal" types that we can
        # pass to Empress
        bp_tree = from_skbio_treenode(tree.view(TreeNode))
        tbl_df = tbl.view(pd.DataFrame)
        pcoa_skbio = pcoa.view(skbio.OrdinationResults)
        smd_df = smd.to_dataframe()
        fmd_df = fmd.to_dataframe()
        # Sanity check -- verify that the funky tip we're looking for is
        # actually present in the data. (We haven't actually done anything
        # specific to Empress yet. This just verifies the environment is ok.)
        # https://stackoverflow.com/a/23549599/10730311
        self.assertTrue(funky_tip in fmd_df.index)
        # Generate an Empress visualization using this data
        viz = Empress(bp_tree, tbl_df, smd_df, feature_metadata=fmd_df,
                      ordination=pcoa_skbio, filter_extra_samples=True,
                      filter_unobserved_features_from_phylogeny=True)
        # Check that tip 8406abe6d9a72018bf32d189d1340472 *isn't* in the tip
        # metadata. All of the samples this tip is present in are filtered out
        # when --p-filter-extra-samples is used with this particular PCoA, so
        # we verify that this tip is removed from the tip metadata.
        self.assertFalse(funky_tip in viz.tip_md.index)

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

    def test_ordination_integration_callbacks(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      ordination=self.pcoa)

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

        # ensure the callbacks were rendered
        obs = viz.make_empress()
        self.assertTrue('setOnNodeMenuVisibleCallback' in obs)
        self.assertTrue('setOnNodeMenuHiddenCallback' in obs)


# How data should look like when converted to a dict
#
# For ease of future work, if this needs to be replaced this can be done so
# by adding some code to test_to_dict() above; see that function's body
# for details. (Obviously, you should first manually look over the DICT to
# check that it looks sane, since it'll be used as a reference in these tests.)
DICT_A = {
    "base_url": "support_files",
    "tree": [250472],
    "tree_data": {
        1: {
            "name": "a",
            "x2": -82.19088834200284,
            "y2": 1568.2955749395592,
            "xr": 2412.0,
            "yr": -2386.875,
            "xc1": 2222.2013460901685,
            "yc1": 0.0,
            "xc0": 1481.4675640601124,
            "yc0": 0.0,
        },
        2: {
            "name": "e",
            "x2": 948.7236134182863,
            "y2": 2108.2845722271436,
            "xr": 3216.0,
            "yr": -1381.875,
            "xc1": 915.5973078196618,
            "yc1": 2817.9187609585556,
            "xc0": 457.7986539098309,
            "yc0": 1408.9593804792778,
        },
        3: {
            "name": "EmpressNode0",
            "x2": 295.3117872853636,
            "y2": 1102.1185942229504,
            "xr": 1608.0,
            "yr": -1884.375,
            "xc1": 1198.5324359398871,
            "yc1": 870.7847859041888,
            "xc0": 599.2662179699436,
            "yc0": 435.3923929520944,
            "highestchildyr": -1381.875,
            "lowestchildyr": -2386.875,
            "arcx0": 457.7986539098309,
            "arcy0": 1408.9593804792778,
            "arcstartangle": 1.2566370614359172,
            "arcendangle": 0,
        },
        4: {
            "name": "b",
            "x2": 1485.5419815224768,
            "y2": 192.57380029925002,
            "xr": 2412.0,
            "yr": -376.875,
            "xc1": -1797.7986539098304,
            "yc1": 1306.1771788562833,
            "xc0": -599.2662179699435,
            "yc0": 435.3923929520945,
        },
        5: {
            "name": "g",
            "x2": 326.7059130664611,
            "y2": 503.08298900209684,
            "xr": 804.0,
            "yr": -1130.625,
            "xc1": 4.5356862759171076e-14,
            "yc1": 740.7337820300562,
            "xc0": 0.0,
            "yc0": 0.0,
            "highestchildyr": -376.875,
            "lowestchildyr": -1884.375,
            "arcx0": -599.2662179699435,
            "arcy0": 435.3923929520945,
            "arcstartangle": 2.5132741228718345,
            "arcendangle": 0.6283185307179586,
        },
        6: {
            "name": "EmpressNode1",
            "x2": -622.0177003518252,
            "y2": -1605.201583225047,
            "xr": 2412.0,
            "yr": 628.125,
            "xc1": -1797.7986539098308,
            "yc1": -1306.177178856283,
            "xc0": -1198.5324359398871,
            "yc0": -870.7847859041887,
        },
        7: {
            "name": "d",
            "x2": -2333.458018477523,
            "y2": -1651.0752884434787,
            "xr": 4020.0,
            "yr": 1633.125,
            "xc1": 1144.4966347745763,
            "yc1": -3522.398451198195,
            "xc0": 457.79865390983053,
            "yc0": -1408.9593804792778,
        },
        8: {
            "name": "h",
            "x2": -653.4118261329227,
            "y2": -1006.1659780041933,
            "xr": 1608.0,
            "yr": 1130.625,
            "xc1": -457.79865390983105,
            "yc1": -1408.9593804792778,
            "xc0": -0.0,
            "yc0": -0.0,
            "highestchildyr": 1633.125,
            "lowestchildyr": 628.125,
            "arcx0": 457.79865390983053,
            "arcy0": -1408.9593804792778,
            "arcstartangle": 5.026548245743669,
            "arcendangle": 3.7699111843077517,
        },
        9: {
            "name": "EmpressNode2",
            "x2": 0.0,
            "y2": 0.0,
            "xr": 0.0,
            "yr": 0.0,
            "xc1": 0.0,
            "yc1": 0.0,
            "xc0": 0.0,
            "yc0": 0.0,
            "highestchildyr": 1130.625,
            "lowestchildyr": -1130.625,
        },
    },
    "names": [
        "EmpressNode2",
        "g",
        "EmpressNode0",
        "a",
        "e",
        "b",
        "h",
        "EmpressNode1",
        "d",
    ],
    "names_to_keys": {
        "a": [1],
        "e": [2],
        "EmpressNode0": [3],
        "b": [4],
        "g": [5],
        "EmpressNode1": [6],
        "d": [7],
        "h": [8],
        "EmpressNode2": [9],
    },
    "s_ids": ["Sample1", "Sample2", "Sample3", "Sample4"],
    "f_ids": ["a", "b", "e", "d"],
    "s_ids_to_indices": {
        "Sample1": 0,
        "Sample2": 1,
        "Sample3": 2,
        "Sample4": 3,
    },
    "f_ids_to_indices": {"a": 0, "b": 1, "e": 2, "d": 3},
    "compressed_table": [[0, 1, 3], [0, 1, 3], [0], [2]],
    "sample_metadata_columns": [
        "Metadata1",
        "Metadata2",
        "Metadata3",
        "Metadata4",
    ],
    "compressed_sample_metadata": [
        ["0", "0", "1", "abc"],
        ["0", "0", "2", "def"],
        ["0", "0", "3", "ghi"],
        ["1", "0", "4", "jkl"],
    ],
    "feature_metadata_columns": [],
    "compressed_tip_metadata": {},
    "compressed_int_metadata": {},
    "layout_to_coordsuffix": {
        "Unrooted": "2",
        "Rectangular": "r",
        "Circular": "c1",
    },
    "default_layout": "Unrooted",
    "emperor_div": "",
    "emperor_require_logic": "",
    "emperor_style": "",
    "emperor_base_dependencies": "",
    "emperor_classes": "",
}

if __name__ == "__main__":
    unittest.main()
