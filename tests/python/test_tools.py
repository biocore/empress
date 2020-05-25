# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import unittest
import pandas as pd
from pandas.testing import assert_frame_equal
from skbio import TreeNode
from empress import Tree
import empress.tools as tools


class TestTools(unittest.TestCase):

    def mock_tree_from_nwk(self):
        return TreeNode.read(['(((a:1,e:2):1,b:2)g:1,(:1,d:3)h:2):1;'])

    def setUp(self):
        self.tree = self.mock_tree_from_nwk()
        # Test table/metadata (mostly) adapted from Qurro:
        # https://github.com/biocore/qurro/blob/b9613534b2125c2e7ee22e79fdff311812f4fefe/qurro/tests/test_df_utils.py#L178
        self.table = pd.DataFrame(
            {
                "Sample1": [1, 2, 0, 4],
                "Sample2": [8, 7, 0, 5],
                "Sample3": [1, 0, 0, 0],
                "Sample4": [0, 0, 0, 0]
            },
            index=["a", "b", "e", "d"]
        )
        self.sample_metadata = pd.DataFrame(
            {
                "Metadata1": [0, 0, 0, 1],
                "Metadata2": [0, 0, 0, 0],
                "Metadata3": [1, 2, 3, 4],
                "Metadata4": ["abc", "def", "ghi", "jkl"]
            },
            index=list(self.table.columns)[:]
        )
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

    def test_name_internal_nodes(self):
        t = Tree.from_tree(self.tree)
        tools.name_internal_nodes(t)
        names = ['a', 'e', 'EmpressNode0', 'b', 'g', 'EmpressNode1', 'd', 'h',
                 'EmpressNode2']
        for i, node in enumerate(t.postorder()):
            self.assertEqual(node.name, names[i])

    def test_match_inputs_nothing_dropped(self):
        t = Tree.from_tree(self.tree)
        filtered_table, filtered_sample_metadata, feat_md = tools.match_inputs(
            t, self.table, self.sample_metadata
        )
        assert_frame_equal(filtered_table, self.table)
        assert_frame_equal(filtered_sample_metadata, self.sample_metadata)
        # We didn't pass in any feature metadata, so we shouldn't get any out
        self.assertIsNone(feat_md)

    def test_match_inputs_only_1_feature_in_table(self):
        # This is technically allowed (so long as this 1 feature is a tree tip)
        t = Tree.from_tree(self.tree)
        tiny_table = self.table.loc[["a"]]
        filtered_tiny_table, filtered_sample_metadata, fm = tools.match_inputs(
            t, tiny_table, self.sample_metadata
        )
        assert_frame_equal(filtered_tiny_table, tiny_table)
        assert_frame_equal(filtered_sample_metadata, self.sample_metadata)
        self.assertIsNone(fm)

    def test_match_inputs_no_tips_in_table(self):
        t = Tree.from_tree(self.tree)
        bad_table = self.table.copy()
        bad_table.index = range(len(self.table.index))
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No features in the feature table are present as tips in the tree."
        ):
            tools.match_inputs(t, bad_table, self.sample_metadata)
        # Check that --p-filter-missing-features still doesn't work to override
        # this, since there are NO matching features at all
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No features in the feature table are present as tips in the tree."
        ):
            tools.match_inputs(
                t, bad_table, self.sample_metadata,
                filter_missing_features=True
            )

    def test_match_inputs_no_shared_samples(self):
        t = Tree.from_tree(self.tree)
        bad_sample_metadata = self.sample_metadata.copy()
        bad_sample_metadata.index = ["lol", "nothing", "here", "matches"]
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No samples in the feature table are present in the sample "
            "metadata."
        ):
            tools.match_inputs(t, self.table, bad_sample_metadata)
        # Check that --p-ignore-missing-samples still doesn't work to override
        # this, since there are NO matching samples at all
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No samples in the feature table are present in the sample "
            "metadata."
        ):
            tools.match_inputs(
                t, self.table, bad_sample_metadata, ignore_missing_samples=True
            )

    def test_match_inputs_filter_missing_features_error(self):
        t = Tree.from_tree(self.tree)
        bad_table = self.table.copy()
        # Replace one of the tip IDs in the table with an internal node ID,
        # instead. This isn't ok.
        bad_table.index = ["a", "b", "e", "g"]
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "The feature table contains features that aren't present as tips "
            "in the tree."
        ):
            tools.match_inputs(t, bad_table, self.sample_metadata)

    def test_match_inputs_filter_missing_features_override(self):
        """Checks that --p-filter-missing-features works as expected."""
        # The inputs are the same as with the above test
        t = Tree.from_tree(self.tree)
        bad_table = self.table.copy()
        bad_table.index = ["a", "b", "e", "g"]
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
            out_table, out_sm, fm = tools.match_inputs(
                t, bad_table, self.sample_metadata,
                filter_missing_features=True
            )
        self.assertCountEqual(out_table.index, ["a", "b", "e"])
        # Just to check, make sure the rest of the table is ok
        assert_frame_equal(
            out_table, self.table.loc[["a", "b", "e"]], check_like=True
        )
        # ... and that the sample metadata is ok
        assert_frame_equal(
            out_sm, self.sample_metadata
        )

    def test_match_inputs_ignore_missing_samples_error(self):
        t = Tree.from_tree(self.tree)
        bad_table = self.table.copy()
        # Replace one of the sample IDs in the table with some junk
        bad_table.columns = ["Sample1", "Sample2", "Whatever", "Sample4"]
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "The feature table contains samples that aren't present in the "
            "sample metadata."
        ):
            tools.match_inputs(t, bad_table, self.sample_metadata)

    def test_match_inputs_ignore_missing_samples_override(self):
        """Checks that --p-ignore-missing-samples works as expected."""
        # These inputs are the same as with the above test
        t = Tree.from_tree(self.tree)
        bad_table = self.table.copy()
        # Replace one of the sample IDs in the table with some junk
        bad_table.columns = ["Sample1", "Sample2", "Whatever", "Sample4"]
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
            tools.match_inputs(
                t, bad_table, self.sample_metadata, ignore_missing_samples=True
            )
            out_table, out_sm, fm = tools.match_inputs(
                t, bad_table, self.sample_metadata, ignore_missing_samples=True
            )

        self.assertCountEqual(
            out_table.columns,
            ["Sample1", "Sample2", "Whatever", "Sample4"]
        )
        self.assertCountEqual(
            out_sm.index,
            ["Sample1", "Sample2", "Whatever", "Sample4"]
        )
        # Make sure the table stays consistent
        assert_frame_equal(out_table, bad_table)
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
        t = Tree.from_tree(self.tree)
        f_table, f_sample_metadata, f_feature_metadata = tools.match_inputs(
            t, self.table, self.sample_metadata, self.feature_metadata
        )
        assert_frame_equal(f_table, self.table)
        assert_frame_equal(f_sample_metadata, self.sample_metadata)
        # Check that no filtering had to be done (the feature metadata might be
        # out of order compared to the original since we called .loc[] on it,
        # hence our use of check_like=True, but the actual data should be the
        # same)
        assert_frame_equal(
            f_feature_metadata, self.feature_metadata, check_like=True
        )


if __name__ == "__main__":
    unittest.main()
