# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------
import unittest
import pandas as pd
from pandas.testing import assert_frame_equal
import biom
import numpy as np
from skbio import TreeNode, OrdinationResults
from empress import Tree, tools
from empress.taxonomy_utils import split_taxonomy
from bp import parse_newick, from_skbio_treenode


class TestTools(unittest.TestCase):

    def mock_tree_from_nwk(self):
        return TreeNode.read(['(((a:1,e:2):1,b:2)g:1,(:1,d:3)h:2):1;'])

    def setUp(self):
        self.tree = self.mock_tree_from_nwk()
        self.bp_tree = from_skbio_treenode(self.tree)
        self.table = biom.Table(np.array([[1, 2, 0, 4],
                                          [8, 7, 0, 5],
                                          [1, 0, 0, 0],
                                          [0, 0, 0, 0]]).T,
                                list('abed'),
                                ['Sample1', 'Sample2', 'Sample3', 'Sample4'])
        self.sample_metadata = pd.DataFrame(
            {
                "Metadata1": [0, 0, 0, 1],
                "Metadata2": [0, 0, 0, 0],
                "Metadata3": [1, 2, 3, 4],
                "Metadata4": ["abc", "def", "ghi", "jkl"]
            },
            index=list(self.table.ids()))

        # (These are some Greengenes taxonomy annotations I took from the
        # moving pictures taxonomy.qza file. I made up the confidences.)
        self.feature_metadata = pd.DataFrame(
            {
                "Taxonomy": [
                    (
                        "k__Bacteria; p__Bacteroidetes; c__Bacteroidia; "
                        "o__Bacteroidales; f__Bacteroidaceae; g__Bacteroides; "
                        "s__"
                    ),
                    (
                        "k__Bacteria; p__Proteobacteria; "
                        "c__Gammaproteobacteria; o__Pasteurellales; "
                        "f__Pasteurellaceae; g__; s__"
                    ),
                    (
                        "k__Bacteria; p__Bacteroidetes; c__Bacteroidia; "
                        "o__Bacteroidales; f__Bacteroidaceae; g__Bacteroides; "
                        "s__uniformis"
                    )
                ],
                "Confidence": [0.95, 0.8, 0]
            },
            index=["e", "h", "a"]
        )
        self.split_tax_fm = split_taxonomy(self.feature_metadata)
        self.tip_md = self.split_tax_fm.loc[["a", "e"]]
        self.int_md = self.split_tax_fm.loc[["h"]]
        # This is designed to match the shearing that's done in the core test
        # for --p-filter_unobserved_features_from_phylogeny.
        self.shorn_tree = parse_newick(
            "(((a:1)EmpressNode0:1,b:2)g:1,(d:3)h:2)EmpressNode1:1;"
        )
        self.exp_split_fm_cols = [
            "Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6",
            "Level 7", "Confidence"
        ]

        eigvals = pd.Series([0.50, 0.25, 0.25],
                            index=['PC1', 'PC2', 'PC3'])
        samples = [[0.1, 0.2, 0.3],
                   [0.2, 0.3, 0.4],
                   [0.3, 0.4, 0.5],
                   [0.4, 0.5, 0.6]]
        proportion_explained = pd.Series([15.5, 12.2, 8.8],
                                         index=['PC1', 'PC2', 'PC3'])
        samples_df = pd.DataFrame(samples,
                                  index=['Sample1', 'Sample2', 'Sample3',
                                         'Sample4'],
                                  columns=['PC1', 'PC2', 'PC3'])
        self.ordination = OrdinationResults(
                'PCoA',
                'Principal Coordinate Analysis',
                eigvals,
                samples_df,
                proportion_explained=proportion_explained)

    def test_fill_missing_node_names(self):
        t = Tree.from_tree(self.tree)
        tools.fill_missing_node_names(t)
        names = ['a', 'e', 'EmpressNode0', 'b', 'g', 'EmpressNode1', 'd', 'h',
                 'EmpressNode2']
        for i, node in enumerate(t.postorder()):
            self.assertEqual(node.name, names[i])

    def test_match_inputs_nothing_dropped(self):
        filtered_table, filtered_sample_md, t_md, i_md = tools.match_inputs(
            self.bp_tree, self.table, self.sample_metadata
        )
        self.assertEqual(filtered_table, self.table)
        assert_frame_equal(filtered_sample_md, self.sample_metadata)
        # We didn't pass in any feature metadata, so we shouldn't get any out
        self.assertIsNone(t_md)
        self.assertIsNone(i_md)

    def test_match_inputs_nothing_dropped_with_ordination(self):
        # everything is the same since the ordination has a 1:1 match to the
        # feature table
        filtered_table, filtered_sample_md, t_md, i_md = tools.match_inputs(
            self.bp_tree, self.table, self.sample_metadata,
            ordination=self.ordination
        )

        self.assertEqual(filtered_table, self.table)
        assert_frame_equal(filtered_sample_md, self.sample_metadata)
        # We didn't pass in any feature metadata, so we shouldn't get any out
        self.assertIsNone(t_md)
        self.assertIsNone(i_md)

    def test_match_inputs_only_1_feature_in_table(self):
        # This is technically allowed (so long as this 1 feature is a tree tip)
        tiny_table = self.table.filter({"a", }, axis='observation',
                                       inplace=False)
        filtered_tiny_table, filtered_sample_md, tm, im = tools.match_inputs(
            self.bp_tree, tiny_table, self.sample_metadata
        )
        self.assertEqual(filtered_tiny_table, tiny_table)
        assert_frame_equal(filtered_sample_md, self.sample_metadata)
        self.assertIsNone(tm)
        self.assertIsNone(im)

    def test_match_inputs_no_tips_in_table(self):
        bad_table = self.table.copy()
        bad_table.update_ids({i: idx for idx, i in
                              enumerate(bad_table.ids(axis='observation'))},
                             axis='observation', inplace=True)
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No features in the feature table are present as tips in the tree."
        ):
            tools.match_inputs(self.bp_tree, bad_table, self.sample_metadata)
        # Check that --p-filter-missing-features still doesn't work to override
        # this, since there are NO matching features at all
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No features in the feature table are present as tips in the tree."
        ):
            tools.match_inputs(
                self.bp_tree, bad_table, self.sample_metadata,
                filter_missing_features=True
            )

    def test_match_inputs_no_shared_samples(self):
        bad_sample_metadata = self.sample_metadata.copy()
        bad_sample_metadata.index = ["lol", "nothing", "here", "matches"]
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No samples in the feature table are present in the sample "
            "metadata."
        ):
            tools.match_inputs(self.bp_tree, self.table, bad_sample_metadata)
        # Check that --p-ignore-missing-samples still doesn't work to override
        # this, since there are NO matching samples at all
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No samples in the feature table are present in the sample "
            "metadata."
        ):
            tools.match_inputs(
                self.bp_tree, self.table,
                bad_sample_metadata, ignore_missing_samples=True
            )

    def test_match_inputs_filter_missing_features_error(self):
        # Replace one of the tip IDs in the table with an internal node ID,
        # instead. This isn't ok.
        bad_table = biom.Table(self.table.matrix_data, list('abeg'),
                               self.table.ids())
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "The feature table contains features that aren't present as tips "
            "in the tree."
        ):
            tools.match_inputs(self.bp_tree, bad_table, self.sample_metadata)

    def test_match_inputs_filter_missing_features_override(self):
        """Checks that --p-filter-missing-features works as expected."""
        # The inputs are the same as with the above test
        bad_table = biom.Table(self.table.matrix_data, list('abeg'),
                               self.table.ids())
        out_table = None
        out_sm = None
        with self.assertWarnsRegex(
            tools.DataMatchingWarning,
            # The parentheses mess up the regex, hence the necessity for using
            # raw strings ._.
            (
                r"1 feature\(s\) in the table were not present as tips in "
                r"the tree. These feature\(s\) have been removed from the "
                "visualization."
            )
        ):
            out_table, out_sm, tm, im = tools.match_inputs(
                self.bp_tree, bad_table, self.sample_metadata,
                filter_missing_features=True
            )
        self.assertCountEqual(out_table.ids(axis='observation'),
                              ["a", "b", "e"])
        # Just to check, make sure the rest of the table is ok
        self.assertEqual(out_table, self.table.filter({'a', 'b', 'e'},
                                                      axis='observation',
                                                      inplace=False))
        # ... and that the sample metadata is ok
        assert_frame_equal(
            out_sm, self.sample_metadata
        )

    def test_match_inputs_ignore_missing_samples_error(self):
        # Replace one of the sample IDs in the table with some junk
        bad_table = biom.Table(self.table.matrix_data,
                               self.table.ids(axis='observation'),
                               ['Sample1', 'Sample2', 'Whatever', 'Sample4'])
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "The feature table contains samples that aren't present in the "
            "sample metadata."
        ):
            tools.match_inputs(self.bp_tree, bad_table, self.sample_metadata)

    def test_match_inputs_ignore_missing_samples_override(self):
        """Checks that --p-ignore-missing-samples works as expected."""
        # These inputs are the same as with the above test
        bad_table = biom.Table(self.table.matrix_data,
                               self.table.ids(axis='observation'),
                               ['Sample1', 'Sample2', 'Whatever', 'Sample4'])
        out_table = None
        out_sm = None
        with self.assertWarnsRegex(
            tools.DataMatchingWarning,
            (
                r"1 sample\(s\) in the table were not present in the sample "
                r"metadata. These sample\(s\) have been assigned placeholder "
                "metadata."
            )
        ):
            out_table, out_sm, tm, im = tools.match_inputs(
                self.bp_tree, bad_table, self.sample_metadata,
                ignore_missing_samples=True
            )

        self.assertCountEqual(
            out_table.ids(),
            ["Sample1", "Sample2", "Whatever", "Sample4"]
        )
        self.assertCountEqual(
            out_sm.index,
            ["Sample1", "Sample2", "Whatever", "Sample4"]
        )
        # Make sure the table stays consistent
        self.assertEqual(out_table, bad_table)
        # ...And that the placeholder metadata was added in for the "Whatever"
        # sample correctly
        self.assertTrue(
            (out_sm.loc["Whatever"] == "This sample has no metadata").all()
        )
        # ... And that, with the exception of the newly added placeholder
        # metadata, the sample metadata is also consistent. (The dtypes of
        # individual columns can change if placeholder metadata was added,
        # since the "This sample has no metadata" thing is just a string.)
        # (...And *that* shouldn't impact Empress since Empress stores all
        # sample metadata as strings. At least as of writing this.)
        assert_frame_equal(
            out_sm.loc[["Sample1", "Sample2", "Sample4"]],
            self.sample_metadata.loc[["Sample1", "Sample2", "Sample4"]],
            check_dtype=False
        )

    def test_match_inputs_feature_metadata_nothing_dropped(self):
        """Tests that tip/internal node names allowed as entries in feat. md.

           (self.feature_metadata describes three features, "e", "h", and "a".
            h is an internal node in self.tree, and e and a are tips.)
        """
        f_table, f_sample_metadata, tip_md, int_md = tools.match_inputs(
            self.bp_tree, self.table,
            self.sample_metadata, self.feature_metadata
        )
        self.assertEqual(f_table, self.table)
        assert_frame_equal(f_sample_metadata, self.sample_metadata)
        # Check that no filtering had to be done -- only differences in output
        # and input feature metadata should be that 1) the output is split into
        # two DataFrames, one for tip and one for internal node metadata, and
        # 2) the taxonomy column was split up.
        assert_frame_equal(
            tip_md, self.split_tax_fm.loc[["e", "a"]], check_like=True
        )
        assert_frame_equal(int_md, self.split_tax_fm.loc[["h"]])
        # Check that the tip + internal node metadata have identical columns
        self.assertListEqual(list(tip_md.columns), self.exp_split_fm_cols)
        self.assertListEqual(list(int_md.columns), self.exp_split_fm_cols)

    def test_match_inputs_feature_metadata_no_features_in_tree(self):
        """Tests that feature names not corresponding to internal nodes / tips
           in the tree are filtered out of the feature metadata, and that if
           all features in the input feature metadata are filtered that an
           error is raised.
        """
        bad_fm = self.feature_metadata.copy()
        bad_fm.index = range(len(self.feature_metadata.index))
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            (
                "No features in the feature metadata are present in the tree, "
                "either as tips or as internal nodes."
            )
        ):
            tools.match_inputs(self.bp_tree, self.table,
                               self.sample_metadata, bad_fm)

    def test_match_inputs_feature_metadata_some_features_dropped(self):
        """Tests the filtering case described above, but with not all
           feature(s) in the feature metadata getting filtered out.
        """
        # Manipulate bad_fm so that only the "e" feature should get preserved
        # (since it's actually in the tree, while "asdf" and "hjkl" aren't)
        bad_fm = self.feature_metadata.copy()
        bad_fm.index = ["e", "asdf", "hjkl"]
        f_table, f_sample_metadata, t_fm, i_fm = tools.match_inputs(
            self.bp_tree, self.table, self.sample_metadata, bad_fm
        )
        self.assertEqual(f_table, self.table)
        assert_frame_equal(f_sample_metadata, self.sample_metadata)
        # Check that the feature metadata just describes "e" (which should be
        # in the tip metadata)
        assert_frame_equal(t_fm, self.split_tax_fm.loc[["e"]])
        # ... and check that the internal node metadata is empty.
        self.assertEqual(len(i_fm.index), 0)
        # Columns should be the same between tip and internal md, though.
        # (It shouldn't really make a difference, since the empty internal
        # metadata will be represented as an empty dict/JSON object ({}) in
        # the generated HTML... but may as well check.)
        self.assertListEqual(list(t_fm.columns), self.exp_split_fm_cols)
        self.assertListEqual(list(i_fm.columns), self.exp_split_fm_cols)

    def test_match_inputs_feature_metadata_root_metadata_allowed(self):
        """Tests that feature metadata for the root node is preserved."""
        # Slightly modified version of self.tree where root has a name (i)
        t = parse_newick('(((a:1,e:2):1,b:2)g:1,(:1,d:3)h:2)i:1;')
        fm = self.feature_metadata.copy()
        fm.index = ["a", "g", "i"]
        f_table, f_sample_metadata, t_fm, i_fm = tools.match_inputs(
            t, self.table, self.sample_metadata, fm
        )
        # (check that we didn't mess up the table / sample metadata matching by
        # accident)
        self.assertEqual(f_table, self.table)
        assert_frame_equal(f_sample_metadata, self.sample_metadata)

        split_fm = split_taxonomy(fm)
        # Main point of this test: all of the feature metadata should have been
        # kept, since a, g, and i are all included in the tree (i in particular
        # is important to verify, since it's the root)
        assert_frame_equal(t_fm, split_fm.loc[["a"]])
        assert_frame_equal(i_fm, split_fm.loc[["g", "i"]], check_like=True)

    def test_match_inputs_feature_metadata_duplicate_name_internal_node(self):
        """Tests that feature metadata for internal nodes with duplicate names
           is preserved.

           In the JS interface, there are two options for coloring nodes by
           feature metadata: 1) just coloring tips (and propagating
           clades with uniform feature metadata upwards), or 2) coloring all
           nodes with feature metadata, which can include internal nodes. In
           2), internal nodes with the same name will have the same feature
           metadata color.
        """
        # Slightly modified version of self.tree with duplicate internal node
        # names (i and g)
        t = parse_newick('(((a:1,e:2)i:1,b:2)g:1,(:1,d:3)g:2)i:1;')
        fm = self.feature_metadata.copy()
        fm.index = ["a", "g", "i"]
        f_table, f_sample_metadata, t_fm, i_fm = tools.match_inputs(
            t, self.table, self.sample_metadata, fm
        )
        self.assertEqual(f_table, self.table)
        assert_frame_equal(f_sample_metadata, self.sample_metadata)

        split_fm = split_taxonomy(fm)
        # Main point of this test: all of the feature metadata should have been
        # kept, even though g and i were both duplicate node names.
        assert_frame_equal(t_fm, split_fm.loc[["a"]])
        assert_frame_equal(i_fm, split_fm.loc[["g", "i"]], check_like=True)

    def test_match_inputs_feature_metadata_only_internal_node_metadata(self):
        """Tests that feature metadata only for internal nodes is allowed."""
        # Slightly modified version of self.tree where root has a name (i)
        t = parse_newick('(((a:1,e:2):1,b:2)g:1,(:1,d:3)h:2)i:1;')
        fm = self.feature_metadata.copy()
        fm.index = ["h", "g", "i"]
        f_table, f_sample_metadata, t_fm, i_fm = tools.match_inputs(
            t, self.table, self.sample_metadata, fm
        )
        self.assertEqual(f_table, self.table)
        assert_frame_equal(f_sample_metadata, self.sample_metadata)

        split_fm = split_taxonomy(fm)
        # 1) Check that tip metadata is empty
        self.assertEqual(len(t_fm.index), 0)
        # 2) Check that internal node metadata was preserved
        assert_frame_equal(i_fm, split_fm.loc[fm.index], check_like=True)
        # 3) Check that columns on both DFs are identical
        self.assertListEqual(list(t_fm.columns), self.exp_split_fm_cols)
        self.assertListEqual(list(i_fm.columns), self.exp_split_fm_cols)

    def test_disjoint_table_and_ordination(self):
        self.ordination.samples.index = pd.Index(['Zample1', 'Zample2',
                                                  'Zample3', 'Zample4'])

        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No samples in the feature table are present in the ordination"
        ):
            tools.match_inputs(self.bp_tree, self.table, self.sample_metadata,
                               ordination=self.ordination)

    def test_ordination_is_superset(self):
        table = biom.Table(np.array([[1, 2, 0, 4],
                                     [8, 7, 0, 5],
                                     [1, 0, 0, 0]]).T,
                           list('abed'),
                           ['Sample1', 'Sample2', 'Sample3'])

        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "The ordination has more samples than the feature table"
        ):
            tools.match_inputs(self.bp_tree, table, self.sample_metadata,
                               ordination=self.ordination)

    def test_table_is_superset_raises(self):
        table = biom.Table(np.array([[1, 2, 0, 4],
                                     [8, 7, 0, 5],
                                     [1, 0, 0, 0],
                                     [1, 0, 0, 0],
                                     [1, 0, 4, 0]]).T,
                           list('abed'),
                           ['Sample1', 'Sample2', 'Sample3', 'Sample4',
                            'Sample5'])

        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "The feature table has more samples than the ordination. These are"
            " the problematic sample identifiers: Sample5. You can override "
            "this error by using the --p-filter-extra-samples flag"
        ):
            tools.match_inputs(self.bp_tree, table, self.sample_metadata,
                               ordination=self.ordination)

    def test_table_is_superset_override_raises(self):
        table = biom.Table(np.array([[1, 2, 0, 4],
                                     [8, 7, 0, 5],
                                     [1, 0, 0, 0],
                                     [1, 0, 0, 0],
                                     [1, 0, 4, 0]]).T,
                           list('abed'),
                           ['Sample1', 'Sample2', 'Sample3', 'Sample4',
                            'Sample5'])

        filtered_table, filtered_sample_md, t_md, i_md = tools.match_inputs(
            self.bp_tree, table, self.sample_metadata,
            ordination=self.ordination, filter_extra_samples=True)

        # NOTE: even though 'e' is now empty, it isn't removed now; it'll be
        # removed later on, in remove_empty_samples_and_features().
        exp = table.filter(set(table.ids()) - {'Sample5', }, inplace=False)

        # guarantee the same sample-wise order
        self.assertEqual(filtered_table, exp)
        assert_frame_equal(filtered_sample_md.loc[exp.ids()],
                           self.sample_metadata)

        # We didn't pass in any feature metadata, so we shouldn't get any out
        self.assertIsNone(t_md)
        self.assertIsNone(i_md)

    def test_shifting(self):
        # helper test function to count number of bits in the number
        def _count_bits(n):
            count = 0
            while (n):
                count += 1
                n >>= 1
            return count

        # tests ones and zeros
        tests = [
            ([1, 1, 0, 0, 1, 1], [51]),
            ([1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1], [4035]),
            ([1, 1, 0, 0, 0, 0, 1, 1], [195]),
            ([1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0], [1560]),
            ([1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0], [24960]),
            ([1], [1]),
        ]
        for test, obs in tests:
            self.assertEqual(tools.shifting(test), obs)
            self.assertEqual(_count_bits(obs[0]), len(test))

        # test zeros
        tests = [
            ([0, 0, 0, 0], [0, 0, 0, 0]),
            ([0], [0]),
        ]
        for test, obs in tests:
            self.assertEqual(tools.shifting(test), obs)
            self.assertEqual(len(test), len(obs))

        # some odd cases
        tests = [
            ([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
              # up to here is a 5
              0, 0, 0, 0], [5, 0, 0, 0, 0]),
            ([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
              # up to here is a 5
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              # up to here is a 0
              0, 0, 0, 0], [
              5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),

            ([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
              0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
              # up to here is a 5
              0, 0, 0, 0, 1, 1, 1], [5, 0, 0, 0, 0, 7]),
        ]
        for test, obs in tests:
            self.assertEqual(tools.shifting(test), obs)

        with self.assertRaisesRegex(ValueError, "Your list has values other "
                                    "than 0-1s"):
            tools.shifting([10])

    def test_filter_feature_metadata_to_tree_1_tip_filtered(self):
        ft, fi = tools.filter_feature_metadata_to_tree(
            self.tip_md, self.int_md, self.shorn_tree
        )
        # Metadata about tip "e" should have been filtered
        assert_frame_equal(ft, self.tip_md.loc[["a"]])
        # Internal node metadata shouldn't have changed
        assert_frame_equal(fi, self.int_md)

    def test_filter_feature_metadata_to_tree_1_int_node_filtered(self):
        # turn "h" into "harold"
        diff_int_md = self.int_md.copy()
        diff_int_md.index = ["harold"]
        # Remove "e" from tip_md so that the tip metadata won't need filtering
        diff_tip_md = self.tip_md.loc[["a"]]

        ft, fi = tools.filter_feature_metadata_to_tree(
            diff_tip_md, diff_int_md, self.shorn_tree
        )

        # Tip metadata shouldn't have changed
        assert_frame_equal(ft, diff_tip_md)
        # "h" was the only internal node in self.int_md, so the internal node
        # metadata should now be empty. However, it should still be a DataFrame
        # with the same columns it had before.
        self.assertTrue(fi.empty)
        self.assertEqual(list(fi.columns), list(self.int_md.columns))

    def test_filter_feature_metadata_to_tree_nothing_left(self):
        # rename all of the tip / internal node metadata so that none of it
        # matches the tree
        diff_int_md = self.int_md.copy()
        diff_int_md.index = ["according to all known laws of aviation, there"]
        diff_tip_md = self.tip_md.copy()
        diff_tip_md.index = ["is no way that a bee", "should be able to fly"]

        with self.assertRaisesRegex(
            tools.DataMatchingError,
            (
                "After performing empty feature removal from the table and "
                "then shearing the tree to tips that are also present in the "
                "table, none of the nodes in the feature metadata are present "
                "in the tree."
            )
        ):
            tools.filter_feature_metadata_to_tree(
                diff_tip_md, diff_int_md, self.shorn_tree
            )


if __name__ == "__main__":
    unittest.main()
