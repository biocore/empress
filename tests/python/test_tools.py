# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import unittest
from unittest.mock import patch
import pandas as pd
from io import StringIO
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
                "Sample1": [1, 2, 3, 4, 5, 6, 7, 8],
                "Sample2": [8, 7, 6, 5, 4, 3, 2, 1],
                "Sample3": [1, 0, 0, 0, 0, 0, 0, 0],
                "Sample4": [0, 0, 0, 1, 0, 0, 0, 0]
            },
            index=["a", "c", "e", "d", "b", "x", "y", "z"]
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

    @patch("sys.stdout", new_callable=StringIO)
    def test_match_inputs_some_features_dropped(self, mock_stdout):
        """Tests case where some features are in the table but not the tree.

        References
        ----------

        Use of mocking stdout with a StringIO was inspired by
        https://stackoverflow.com/a/46307456/10730311 and adapted from the
        docs at https://docs.python.org/3/library/unittest.mock.html#patch.
        """
        t = Tree.from_tree(self.tree)
        tools.name_internal_nodes(t)
        # Run the command we're testing, tools.match_inputs().
        filtered_tbl, filtered_sample_metadata = tools.match_inputs(
            t, self.table, self.sample_metadata
        )

        # No samples should've been dropped with this example data.
        self.assertCountEqual(filtered_tbl.columns, self.table.columns)
        self.assertCountEqual(
            filtered_sample_metadata.index, self.sample_metadata.index
        )

        # Just for the sake of sanity, make sure we didn't accidentally drop
        # any sample metadata columns
        self.assertCountEqual(
            filtered_sample_metadata.columns, self.sample_metadata.columns
        )

        # Some features should've been dropped from the table:
        # "a", "b", "e", and "d" are the only features present in both the
        # table and tree.
        self.assertCountEqual(filtered_tbl.index, ["a", "b", "e", "d"])

        # Ensure that a warning message about dropped features was printed!
        self.assertIn(
            "4 feature(s) in the table were not present in the tree.\n"
            "These feature(s) have been removed from the visualization.",
            mock_stdout.getvalue()
        )

    def test_match_inputs_no_shared_features(self):
        t = Tree.from_tree(self.tree)
        tools.name_internal_nodes(t)
        bad_table = self.table.copy()
        bad_table.index = range(len(self.table.index))
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No features are shared between the tree's nodes and the "
            "feature table."
        ):
            tools.match_inputs(t, bad_table, self.sample_metadata)

    @patch("sys.stdout", new_callable=StringIO)
    def test_match_inputs_some_samples_dropped(self, mock_stdout):
        t = Tree.from_tree(self.tree)
        tools.name_internal_nodes(t)

        # for convenience, subset the table to just those of its features that
        # are also in the tree -- this'll prevent warnings about features being
        # dropped from the table
        diff_table = self.table.copy()
        diff_table = diff_table.loc[["a", "b", "e", "d"]]

        # test case where some samples from metadata dropped
        # (Sample2 and Sample4 are replaced with Sample20 and Sample40)
        diff_metadata = self.sample_metadata.copy()
        diff_metadata.index = ["Sample1", "Sample20", "Sample3", "Sample40"]

        filtered_tbl, filtered_sample_metadata = tools.match_inputs(
            t, diff_table, diff_metadata
        )

        # No features should've been dropped with this example data.
        self.assertCountEqual(filtered_tbl.index, diff_table.index)

        # Check that Sample2 and Sample4 aren't in the metadata or table now
        remaining_samples = ["Sample1", "Sample3"]
        self.assertCountEqual(
            filtered_sample_metadata.index, remaining_samples
        )
        self.assertCountEqual(filtered_tbl.columns, remaining_samples)

        # Ensure that warning messages about dropped samples were printed
        # This message is printed because Sample20 and Sample40 aren't in the
        # table.
        self.assertIn(
            "2 sample(s) in the sample metadata file were not present in "
            "the table.\n"
            "These sample(s) have been removed from the visualization.",
            mock_stdout.getvalue()
        )
        # This message is printed because Sample2 and Sample4 aren't in the
        # sample metadata.
        self.assertIn(
            "2 sample(s) in the table were not present in the sample "
            "metadata file.\n"
            "These sample(s) have been removed from the visualization.",
            mock_stdout.getvalue()
        )

    def test_match_inputs_no_shared_samples(self):
        t = Tree.from_tree(self.tree)
        tools.name_internal_nodes(t)
        bad_sample_metadata = self.sample_metadata.copy()
        bad_sample_metadata.index = ["lol", "nothing", "here", "matches"]
        with self.assertRaisesRegex(
            tools.DataMatchingError,
            "No samples are shared between the sample metadata file and the "
            "feature table."
        ):
            tools.match_inputs(t, self.table, bad_sample_metadata)


if __name__ == "__main__":
    unittest.main()
