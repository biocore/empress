# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import unittest
import pandas as pd
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

    def test_match_inputs_basic(self):
        """Tests the basic case where no samples are dropped, but some features
           are present in the table but not the tree.
        """
        t = Tree.from_tree(self.tree)
        tools.name_internal_nodes(t)
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


if __name__ == "__main__":
    unittest.main()
