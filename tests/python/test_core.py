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
import biom

from .util import load_mp_data
from emperor import Emperor
from empress import tools
from empress.core import Empress
from bp import parse_newick, from_skbio_treenode
from six import StringIO
from skbio.tree import TreeNode


class TestCore(unittest.TestCase):

    def setUp(self):
        self.tree = parse_newick('(((a:1,e:2):1,b:2)g:1,(:1,d:3)h:2):1;')
        self.pruned_tree = TreeNode.read(
            StringIO('(((a:1)EmpressNode0:1,b:2)g:1,(d:3)h:2)EmpressNode1:1;')
        )
        # Test table/metadata (mostly) adapted from Qurro:
        self.table = biom.Table(np.array([[1, 2, 0, 4],
                                          [8, 7, 0, 5],
                                          [1, 0, 0, 0],
                                          [0, 0, 1, 0]]).T,
                                list('abed'),
                                ['Sample1', 'Sample2', 'Sample3', 'Sample4'])

        self.unrelated_table = biom.Table(np.array([[5, 2, 0, 2],
                                                    [2, 3, 0, 1],
                                                    [5, 2, 0, 0],
                                                    [4, 5, 0, 4]]).T,
                                          list("hijk"),
                                          ['Sample1', 'Sample2', 'Sample3',
                                           'Sample4'])
        self.sample_metadata = pd.DataFrame(
            {
                "Metadata1": [0, 0, 0, 1],
                "Metadata2": [0, 0, 0, 0],
                "Metadata3": [1, 2, 3, 4],
                "Metadata4": ["abc", "def", "ghi", "jkl"]
            },
            index=list(self.table.ids())
        )
        self.feature_metadata = pd.DataFrame(
            {
                "fmdcol1": ["asdf", "ghjk"],
                "fmdcol2": ["qwer", "tyui"]
            },
            index=["a", "h"]
        )
        self.filtered_table = biom.Table(np.array([[1, 2, 4],
                                                   [8, 7, 5],
                                                   [1, 0, 0]]).T,
                                         ['a', 'b', 'd'],
                                         ['Sample1', 'Sample2', 'Sample3'])
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

        features = np.abs(samples_df.copy() / 2.0).iloc[:2, :]
        features.index = 'f.' + features.index
        self.biplot_no_matches = skbio.OrdinationResults(
            'PCoA',
            'Principal Coordinate Analysis',
            eigvals,
            samples_df,
            features=features,
            proportion_explained=proportion_explained)

        features = np.abs(samples_df / 2.0).iloc[:2, :]
        features.index = pd.Index(['a', 'h'])
        self.biplot = skbio.OrdinationResults(
            'PCoA',
            'Principal Coordinate Analysis',
            eigvals,
            samples_df,
            features=features,
            proportion_explained=proportion_explained)
        self.biplot_tree = parse_newick(
            '(((y:1,z:2):1,b:2)g:1,(:1,d:3)h:2):1;')
        self.biplot_table = biom.Table(np.array([[1, 2], [8, 7],
                                                 [1, 0], [0, 3]]).T,
                                       ['y', 'z'],
                                       ['Sample1', 'Sample2', 'Sample3',
                                        'Sample4'])

        self.files_to_remove = []
        self.maxDiff = None

    def tearDown(self):
        for path in self.files_to_remove:
            if exists(path):
                rmtree(path)

    def test_init(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      shear_to_table=False)

        self.assertEqual(viz.base_url, 'support_files')
        self.assertEqual(list(viz.tree.B), [1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1,
                                            1, 0, 1, 0, 0, 0])

        names = ['a', 'e', None, 'b', 'g', None, 'd', 'h', None]
        for i in range(1, len(viz.tree) + 1):
            node = viz.tree.postorderselect(i)
            self.assertEqual(viz.tree.name(node), names[i - 1])

        # table should be unchanged and be a different id instance
        self.assertEqual(self.table, viz.table)
        self.assertNotEqual(id(self.table), id(viz.table))

        # sample metadata should be unchanged and be a different id instance
        assert_frame_equal(self.sample_metadata, viz.samples)
        self.assertNotEqual(id(self.sample_metadata), id(viz.samples))

        self.assertIsNone(viz.features)
        self.assertIsNone(viz.ordination)
        self.assertTrue(viz.is_community_plot)

    def test_init_tree_plot(self):
        # Simplest case (no feature metadata)
        viz = Empress(self.tree)
        self.assertFalse(viz.is_community_plot)
        self.assertIsNone(viz.tip_md)
        self.assertIsNone(viz.int_md)

        # Slightly less simple case (with feature metadata)
        viz = Empress(self.tree, feature_metadata=self.feature_metadata)
        self.assertFalse(viz.is_community_plot)
        assert_frame_equal(viz.tip_md, self.feature_metadata.loc[["a"]])
        assert_frame_equal(viz.int_md, self.feature_metadata.loc[["h"]])

    def test_init_tree_plot_extra_fm(self):
        # Checks that extra stuff in the feature metadata (which doesn't match
        # any node in the tree) is filtered out of the visualization, even if
        # tree-plot is used.
        extra_fm = pd.DataFrame(
            {
                "fmdcol1": ["zxcv", "bnm,"],
                "fmdcol2": ["zaq1", "xsw2"]
            },
            index=["weshould", "befiltered"]
        )
        smooshed_fm = self.feature_metadata.append(extra_fm)
        viz = Empress(self.tree, feature_metadata=smooshed_fm)
        self.assertFalse(viz.is_community_plot)
        assert_frame_equal(viz.tip_md, self.feature_metadata.loc[["a"]])
        assert_frame_equal(viz.int_md, self.feature_metadata.loc[["h"]])

    def test_init_tree_plot_fm_not_matching(self):
        # Mainly, this test validates that the matching done between the tree
        # nodes and feature metadata is still performed even if tree-plot is
        # used.
        bad_fm = self.feature_metadata.copy()
        bad_fm.index = ["idont", "match :O"]
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            (
                "No features in the feature metadata are present in the tree, "
                "either as tips or as internal nodes."
            )
        ):
            Empress(self.tree, feature_metadata=bad_fm)

    def test_init_tree_plot_shear_without_metadata(self):
        with self.assertRaisesRegex(ValueError,
                                    "Feature metadata must be provided"):
            Empress(self.tree, shear_to_feature_metadata=True)

    def test_init_only_one_of_table_and_sm_passed(self):
        exp_errmsg = (
            "Both the table and sample metadata should be specified or None. "
            "However, only one of them is None."
        )
        with self.assertRaisesRegex(ValueError, exp_errmsg):
            Empress(self.tree, self.table)
        with self.assertRaisesRegex(ValueError, exp_errmsg):
            Empress(self.tree, sample_metadata=self.sample_metadata)

    def test_init_with_ordination(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      ordination=self.pcoa,
                      shear_to_table=False)

        self.assertEqual(viz.base_url, 'support_files')
        self.assertEqual(list(viz.tree.B), [1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1,
                                            1, 0, 1, 0, 0, 0])

        names = ['a', 'e', None, 'b', 'g', None, 'd', 'h', None]
        for i in range(1, len(viz.tree) + 1):
            node = viz.tree.postorderselect(i)
            self.assertEqual(viz.tree.name(node), names[i - 1])

        # table should be unchanged and be a different id instance
        self.assertEqual(self.table, viz.table)
        self.assertNotEqual(id(self.table), id(viz.table))

        # sample metadata should be unchanged and be a different id instance
        assert_frame_equal(self.sample_metadata, viz.samples)
        self.assertNotEqual(id(self.sample_metadata), id(viz.samples))

        self.assertIsNone(viz.features)

        assert_ordination_results_equal(viz.ordination, self.pcoa)

        # emperor is instantiated as needed but not yet setup
        self.assertTrue(isinstance(viz._emperor, Emperor))

    def test_init_with_ordination_features(self):
        '''Check that empress does not break when ordination has features
        but empress itself does not.'''
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      ordination=self.biplot, shear_to_table=False)
        self.assertIsNone(viz.features)

    def test_init_with_ordination_empty_samples_in_pcoa(self):
        def make_bad(v, i, m):
            if i in ['Sample2', 'Sample4']:
                return np.zeros(len(v))
            else:
                return v

        bad_table = self.table.copy()
        bad_table.transform(make_bad, inplace=True)
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
                    shear_to_table=False)

    def test_copy_support_files_use_base(self):
        local_path = './some-local-path/'

        viz = Empress(self.tree, self.table, self.sample_metadata,
                      resource_path=local_path,
                      shear_to_table=False)
        self.assertEqual(viz.base_url, local_path)

        viz.copy_support_files()

        self.assertTrue(exists(local_path))

        self.files_to_remove.append(local_path)

    def test_copy_support_files_use_target(self):
        local_path = './other-local-path/'

        viz = Empress(self.tree, self.table, self.sample_metadata,
                      resource_path=local_path,
                      shear_to_table=False)
        self.assertEqual(viz.base_url, local_path)

        viz.copy_support_files(target='./something-else')

        self.assertTrue(exists('./something-else'))

        self.files_to_remove.append(local_path)
        self.files_to_remove.append('./something-else')

    def test_to_dict(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      shear_to_table=False)

        obs = viz.to_dict()
        dict_a_cp = copy.deepcopy(DICT_A)

        # NOTE: Uncomment the following two lines of code to write the current
        # DICT_A to a file. Once it's written to a file, you can run
        # "black -l 79 dictcode.py" (while in the same directory as the file)
        # to format it so that it's consistent with how DICT_A is set up at the
        # bottom of this file.
        # with open("dictcode.py", "w") as f:
        #     f.write("DICT_A = {}".format(str(obs)))

        self.assertEqual(obs, dict_a_cp)

    def test_to_dict_with_feature_metadata(self):
        viz = Empress(
            self.tree, self.table, self.sample_metadata, self.feature_metadata,
            shear_to_table=False
        )
        obs = viz.to_dict()
        dict_a_with_fm = copy.deepcopy(DICT_A)
        dict_a_with_fm["compressed_tip_metadata"] = {1: ["asdf", "qwer"]}
        dict_a_with_fm["compressed_int_metadata"] = {8: ["ghjk", "tyui"]}
        dict_a_with_fm["feature_metadata_columns"] = ["fmdcol1", "fmdcol2"]

        self.assertEqual(obs, dict_a_with_fm)

    def test_to_dict_with_metadata_nans(self):
        nan_sample_metadata = self.sample_metadata.copy()
        nan_feature_metadata = self.feature_metadata.copy()
        nan_sample_metadata.at["Sample2", "Metadata4"] = np.nan
        nan_feature_metadata.at["h", "fmdcol1"] = np.nan
        nan_feature_metadata.at["a", "fmdcol2"] = np.nan

        viz = Empress(self.tree, self.table, nan_sample_metadata,
                      nan_feature_metadata,
                      shear_to_table=False)
        obs = viz.to_dict()
        dict_a_nan = copy.deepcopy(DICT_A)

        # [1][3] corresponds to Sample2, Metadata4
        dict_a_nan["compressed_sample_metadata"][1][3] = str(np.nan)

        dict_a_nan["compressed_tip_metadata"] = {1: ["asdf", str(np.nan)]}
        dict_a_nan["compressed_int_metadata"] = {8: [str(np.nan), "tyui"]}
        dict_a_nan["feature_metadata_columns"] = ["fmdcol1", "fmdcol2"]

        self.assertEqual(obs, dict_a_nan)

        res = viz.make_empress()
        self.assertTrue('empressRequire' in res)
        self.assertTrue('empress = new Empress' in res)
        self.assertTrue('emperor_require_logic' not in res)

    def test_to_dict_with_emperor(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      ordination=self.pcoa,
                      shear_to_table=False,
                      filter_extra_samples=True)
        obs = viz.to_dict()

        self.assertEqual(viz._emperor.width, '50vw')
        self.assertEqual(viz._emperor.height, '100vh; float: right')

        self.assertEqual(viz._emperor.settings['axes']['axesColor'], 'black')
        self.assertEqual(viz._emperor.settings['axes']['backgroundColor'],
                         'white')

        # we test key by key so we can do "general" checks on the emperor
        # values, this helps with tests not breaking if any character changes
        # in # Emperor
        dict_a_cp = copy.deepcopy(DICT_A)
        dict_a_cp["is_empire_plot"] = True
        for key, value in obs.items():
            if not key.startswith('emperor_'):
                self.assertEqual(obs[key], dict_a_cp[key])

        exp = "<div id='emperor-in-empire'"
        self.assertTrue(obs['emperor_div'].startswith(exp))

        exp = "// When running in the Jupyter"
        self.assertTrue(obs['emperor_require_logic'].startswith(exp))

        exp = "}); // END REQUIRE.JS block"
        self.assertTrue(obs['emperor_require_logic'].endswith(exp))

        self.assertTrue('"#emperor-css"' in obs['emperor_style'])

        exp = "vendor/js/jquery-"
        self.assertEqual(obs['emperor_base_dependencies'].count(exp), 1)

        self.assertTrue(obs['emperor_classes'], 'combined-plot-container')

    def _clear_copied_dict_a(self, dict_a_cp):
        """Clears a copy of DICT_A to look as we'd expect it to look if
           qiime empress tree-plot was used (i.e. no table / sample metadata
           were specified).
        """
        dict_a_cp["is_community_plot"] = False

        # When no table / s. metadata is passed, many values in the dict
        # representation should just be None
        for nfield in [
            "s_ids", "f_ids", "compressed_table", "sample_metadata_columns",
            "compressed_sample_metadata"
        ]:
            dict_a_cp[nfield] = None

        # These things are represented as empty dicts, though. (The main reason
        # for this is that making f_ids_to_indices be None in this case would
        # have required some gross special-casing to refactor things, so for
        # the sake of consistency and clean code both default to {}.)
        for efield in ["s_ids_to_indices", "f_ids_to_indices"]:
            dict_a_cp[efield] = {}

        # We don't need to reset the feature metadata stuff because that should
        # already be empty, since the main to_dict test doesn't use f.m.

    def test_to_dict_tree_plot(self):
        viz = Empress(self.tree)

        dict_a_cp = copy.deepcopy(DICT_A)
        self._clear_copied_dict_a(dict_a_cp)

        obs = viz.to_dict()
        self.assertEqual(obs, dict_a_cp)

    def test_to_dict_tree_plot_with_feature_metadata(self):
        viz = Empress(self.tree, feature_metadata=self.feature_metadata)

        # Set up expected dict
        dict_a_cp = copy.deepcopy(DICT_A)
        self._clear_copied_dict_a(dict_a_cp)
        # Copied from test_to_dict_with_feature_metadata() above
        dict_a_cp["compressed_tip_metadata"] = {1: ["asdf", "qwer"]}
        dict_a_cp["compressed_int_metadata"] = {8: ["ghjk", "tyui"]}
        dict_a_cp["feature_metadata_columns"] = ["fmdcol1", "fmdcol2"]

        obs = viz.to_dict()
        self.assertEqual(obs, dict_a_cp)

    def test_shear_tree_to_table(self):

        viz = Empress(self.tree, self.filtered_table,
                      self.filtered_sample_metadata,
                      shear_to_table=True)
        self.assertEqual(list(viz.tree.B), [1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1,
                                            0, 0, 0])

        names = ['a', None, 'b', 'g', 'd', 'h', None]
        for i in range(1, len(viz.tree) + 1):
            node = viz.tree.postorderselect(i)
            self.assertEqual(viz.tree.name(node), names[i - 1])

        # table should be unchanged and be a different id instance
        self.assertEqual(self.filtered_table, viz.table)
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
                      shear_to_table=True)
        # Same as with the shearing test above, check that the tree was handled
        # as expected
        self.assertEqual(list(viz.tree.B), [1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1,
                                            0, 0, 0])

        names = ['a', None, 'b', 'g', 'd', 'h', None]
        for i in range(1, len(viz.tree) + 1):
            node = viz.tree.postorderselect(i)
            self.assertEqual(viz.tree.name(node), names[i - 1])

        # Now, the point of this test: verify that the feature metadata was
        # filtered to just stuff in the sheared tree ("e" was removed from the
        # tip metadata)
        assert_frame_equal(extra_fm.loc[["a"]], viz.tip_md)
        assert_frame_equal(extra_fm.loc[["h"]], viz.int_md)

        # table should be unchanged and be a different id instance
        self.assertEqual(self.filtered_table, viz.table)
        self.assertNotEqual(id(self.filtered_table), id(viz.table))

        # sample metadata should be unchanged and be a different id instance
        assert_frame_equal(self.filtered_sample_metadata, viz.samples)
        self.assertNotEqual(id(self.filtered_sample_metadata), id(viz.samples))

        self.assertIsNone(viz.ordination)

    def test_shear_tree_to_fm_simple(self):
        # remove e same as in test_shear_tree
        mini_fm = self.feature_metadata.copy()
        mini_fm.loc["b"] = ["pikachu", "raichu"]
        mini_fm.loc["d"] = ["mew", "mewtwo"]
        viz = Empress(self.tree, feature_metadata=mini_fm,
                      shear_to_table=False, shear_to_feature_metadata=True)
        self.assertEqual(list(viz.tree.B), [1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1,
                                            0, 0, 0])

        names = ['a', None, 'b', 'g', 'd', 'h', None]
        for i in range(1, len(viz.tree) + 1):
            node = viz.tree.postorderselect(i)
            self.assertEqual(viz.tree.name(node), names[i - 1])

        assert_frame_equal(viz.tip_md, mini_fm.loc[["a", "b", "d"]])
        assert_frame_equal(viz.int_md, mini_fm.loc[["h"]])

        # feature metadata should be unchanged and be a different id instance
        assert_frame_equal(mini_fm, viz.features)
        self.assertNotEqual(id(mini_fm), id(viz.features))

        self.assertIsNone(viz.ordination)

    def test_shear_tree_to_fm_only_int(self):
        int_fm = pd.DataFrame(
            {
                "fmdcol1": ["vulpix", "ninetales"],
                "fmdcol2": ["growlithe", "arcanine"]
            },
            index=["g", "h"]
        )
        exp_errmsg = (
            "Cannot shear tree to feature metadata: no tips in "
            "the tree are present in the feature metadata."
        )
        with self.assertRaisesRegex(ValueError, exp_errmsg):
            Empress(self.tree, feature_metadata=int_fm, shear_to_table=False,
                    shear_to_feature_metadata=True)

    def test_shear_tree_to_fm_one_tip(self):
        lonely_fm = pd.DataFrame(
            {
                "fmdcol1": ["mimikyu"],
            },
            index=["a"]
        )
        viz = Empress(self.tree, feature_metadata=lonely_fm,
                      shear_to_table=False, shear_to_feature_metadata=True)

        names = ['a', None, 'g', None]
        for i in range(1, len(viz.tree) + 1):
            node = viz.tree.postorderselect(i)
            self.assertEqual(viz.tree.name(node), names[i - 1])

        assert_frame_equal(viz.tip_md, lonely_fm.loc[["a"]])
        self.assertTrue(viz.int_md.empty)

        # feature metadata should be unchanged and be a different id instance
        assert_frame_equal(lonely_fm, viz.features)
        self.assertNotEqual(id(lonely_fm), id(viz.features))

        self.assertIsNone(viz.ordination)

    def test_shear_tree_to_fm_rmv_int_md(self):
        """
        Shear tree to feature metadata but metadata has entry for an internal
        node that gets filtered out from the shearing.
        """
        # default feature metadata works - internal node h filtered out
        viz = Empress(self.tree, feature_metadata=self.feature_metadata,
                      shear_to_table=False, shear_to_feature_metadata=True)

        names = ['a', None, 'g', None]
        for i in range(1, len(viz.tree) + 1):
            node = viz.tree.postorderselect(i)
            self.assertEqual(viz.tree.name(node), names[i - 1])

        assert_frame_equal(viz.tip_md, self.feature_metadata.loc[["a"]])
        self.assertTrue(viz.int_md.empty)

        # feature metadata should be unchanged and be a different id instance
        assert_frame_equal(self.feature_metadata, viz.features)
        self.assertNotEqual(id(self.feature_metadata), id(viz.features))

        self.assertIsNone(viz.ordination)

    def test_biplot(self):
        exp = self.feature_metadata.copy()
        viz = Empress(self.tree, self.table,
                      self.sample_metadata,
                      feature_metadata=self.feature_metadata,
                      ordination=self.biplot,
                      shear_to_table=True)

        obs = str(viz)

        # check that emperor didn't pad the metadata
        self.assertTrue('All elements' not in obs)

        # metadata should have been trickled down as expected
        assert_frame_equal(viz._emperor.feature_mf, exp)

    def test_biplot_no_matching(self):
        self.feature_metadata.index = ['z', 'y']
        viz = Empress(self.biplot_tree, self.biplot_table,
                      self.sample_metadata,
                      feature_metadata=self.feature_metadata,
                      ordination=self.biplot_no_matches,
                      shear_to_table=True)

        obs = str(viz)
        self.assertTrue('All elements' in obs)

    def test_biplot_partial_match(self):
        fm = self.feature_metadata.copy()
        fm.index = ['a', 'x']

        with self.assertRaisesRegex(KeyError, 'There are features not '
                                    'included in the feature mapping file. '
                                    'Override this error by using the '
                                    '`ignore_missing_samples` argument. '
                                    'Offending features: h'):
            Empress(self.tree, self.table,
                    self.sample_metadata,
                    feature_metadata=fm,
                    ordination=self.biplot,
                    shear_to_table=True)

    def test_biplot_partial_match_override(self):
        fm = self.feature_metadata.copy()
        fm.index = ['a', 'x']

        viz = Empress(self.tree, self.table,
                      self.sample_metadata,
                      feature_metadata=fm,
                      ordination=self.biplot,
                      ignore_missing_samples=True,
                      shear_to_table=True)

        obs = str(viz)
        self.assertTrue('This element has no metadata' in obs)

    def test_fm_filtering_post_shearing_with_moving_pictures_dataset(self):
        # This particular tip can be problematic (it was the reason we found
        # out about https://github.com/biocore/empress/issues/248), so we
        # observe how it is handled in generating a visualization of the
        # moving pictures dataset to verify that #248 does not recur.
        funky_tip = "8406abe6d9a72018bf32d189d1340472"
        tree, tbl, smd_df, fmd_df, pcoa_skbio = load_mp_data(
            use_artifact_api=False
        )
        bp_tree = from_skbio_treenode(tree)
        # Sanity check -- verify that the funky tip we're looking for is
        # actually present in the data. (We haven't actually done anything
        # specific to Empress yet. This just verifies the environment is ok.)
        # https://stackoverflow.com/a/23549599/10730311
        self.assertTrue(funky_tip in fmd_df.index)
        # Generate an Empress visualization using this data
        viz = Empress(bp_tree, tbl, smd_df, feature_metadata=fmd_df,
                      ordination=pcoa_skbio, filter_extra_samples=True,
                      shear_to_table=True)
        # Check that tip 8406abe6d9a72018bf32d189d1340472 *isn't* in the tip
        # metadata. All of the samples this tip is present in are filtered out
        # when --p-filter-extra-samples is used with this particular PCoA, so
        # we verify that this tip is removed from the tip metadata.
        self.assertFalse(funky_tip in viz.tip_md.index)

    def test_no_intersection_between_tree_and_table(self):
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No features in the feature table are present as tips in the tree."
        ):
            Empress(self.tree, self.unrelated_table, self.sample_metadata,
                    shear_to_table=False)
        # Check that --p-shear-to-table doesn't override this: the data
        # mismatch should be identified before attempting shearing
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No features in the feature table are present as tips in the tree."
        ):
            Empress(self.tree, self.unrelated_table, self.sample_metadata,
                    shear_to_table=True)

    def test_ordination_integration_callbacks(self):
        viz = Empress(self.tree, self.table, self.sample_metadata,
                      ordination=self.pcoa)

        # table should be unchanged and be a different id instance
        self.assertEqual(self.table, viz.table)
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
    "names": [
        -1,
        "a",
        "e",
        None,
        "b",
        "g",
        None,
        "d",
        "h",
        None
    ],
    "lengths": [-1, 1.0, 2.0, 1.0, 2.0, 1.0, 1.0, 3.0, 2.0, 1.0],
    "is_community_plot": True,
    "is_empire_plot": False,
    "s_ids": ["Sample1", "Sample2", "Sample3", "Sample4"],
    "f_ids": [1, 4, 2, 7],
    "s_ids_to_indices": {
        "Sample1": 0,
        "Sample2": 1,
        "Sample3": 2,
        "Sample4": 3,
    },
    "f_ids_to_indices": {1: 0, 4: 1, 2: 2, 7: 3},
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
    "split_taxonomy_columns": [],
    "compressed_tip_metadata": {},
    "compressed_int_metadata": {},
    "emperor_div": "",
    "emperor_require_logic": "",
    "emperor_style": "",
    "emperor_base_dependencies": "",
    "emperor_classes": "",
}

if __name__ == "__main__":
    unittest.main()
