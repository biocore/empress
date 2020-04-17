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
        # TODO Also test matching feature metadata, when that's supported
        self.feature_metadata = None

    def test_name_internal_nodes(self):
        t = Tree.from_tree(self.tree)
        tools.name_internal_nodes(t)
        names = ['a', 'e', 'EmpressNode0', 'b', 'g', 'EmpressNode1', 'd', 'h',
                 'EmpressNode2']
        for i, node in enumerate(t.postorder()):
            self.assertEqual(node.name, names[i])

    def test_match_inputs_nothing_dropped(self):
        t = Tree.from_tree(self.tree)
        tools.name_internal_nodes(t)
        filtered_table, filtered_sample_metadata = tools.match_inputs(
            t, self.table, self.sample_metadata
        )
        assert_frame_equal(filtered_table, self.table)
        assert_frame_equal(filtered_sample_metadata, self.sample_metadata)

    def test_match_inputs_no_tips_in_table(self):
        t = Tree.from_tree(self.tree)
        tools.name_internal_nodes(t)
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
        tools.name_internal_nodes(t)
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
        tools.name_internal_nodes(t)
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
        tools.name_internal_nodes(t)
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
            out_table, out_sm = tools.match_inputs(
                t, bad_table, self.sample_metadata,
                filter_missing_features=True
            )
        self.assertCountEqual(out_table.index, ["a", "b", "e"])
        # Just to check, make sure the rest of the table is ok
        assert_frame_equal(
            out_table, self.table.loc[["a", "b", "e"]], check_like=True
        )


if __name__ == "__main__":
    unittest.main()
