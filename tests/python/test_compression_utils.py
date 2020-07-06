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
from empress.compression_utils import compress_table


class TestCompressionUtils(unittest.TestCase):

    def setUp(self):
        self.table = pd.DataFrame(
            {
                "Sample1": [1, 2, 0, 4],
                "Sample2": [8, 7, 0, 5],
                "Sample3": [1, 0, 0, 0],
                "Sample4": [0, 0, 0, 0]
            },
            index=["a", "b", "e", "d"]
        )
        self.smd = pd.DataFrame(
            {
                "Metadata1": [0, 0, 0, 1],
                "Metadata2": [0, 0, 0, 0],
                "Metadata3": [1, 2, 3, 4],
                "Metadata4": ["abc", "def", "ghi", "jkl"]
            },
            index=list(self.table.columns)[:]
        )
        self.tmd = pd.DataFrame(
            {
                "Level 1": ["k__Bacteria", "k__Bacteria"],
                "Level 2": ["p__Bacteroidetes", "p__Bacteroidetes"],
                "Level 3": ["c__Bacteroidia", "c__Bacteroidia"],
                "Level 4": ["o__Bacteroidales", "o__Bacteroidales"],
                "Level 5": ["f__Bacteroidaceae", "f__Bacteroidaceae"],
                "Level 6": ["g__Bacteroides", "g__Bacteroides"],
                "Level 7": ["s__", "s__uniformis"],
                "Confidence": [0.95, 0]
            },
            index=["e", "a"]
        )
        self.imd = pd.DataFrame(
            {
                "Level 1": ["k__Bacteria", "k__Archaea"],
                "Level 2": ["p__Proteobacteria", "Unspecified"],
                "Level 3": ["c__Gammaproteobacteria", "Unspecified"],
                "Level 4": ["o__Pasteurellales", "Unspecified"],
                "Level 5": ["f__Pasteurellaceae", "Unspecified"],
                "Level 6": ["g__", "Unspecified"],
                "Level 7": ["s__", "Unspecified"],
                "Confidence": [0.8, 1]
            },
            index=["h", "m"]
        )

    def test_compress_table_basic(self):
        tbl_copy = self.table.copy()
        s_ids, f_ids, sid2idx, fid2idx, tbl = compress_table(tbl_copy)

        # First off, verify that compress_table() leaves the original table DF
        # untouched.
        assert_frame_equal(tbl_copy, self.table)

        # Check s_ids, which just be a list of the sample IDs in the same order
        # as they were in the table's columns.
        # Sample "Sample4" should have been removed due to being empty
        self.assertEqual(s_ids, ["Sample1", "Sample2", "Sample3"])

        # Check f_ids, which as with s_ids is a list of feature IDs in the same
        # order as they were in the table's index.
        # Feature "e" should have been removed due to being empty
        self.assertEqual(f_ids, ["a", "b", "d"])

        # Check sid2idx, which maps sample IDs in s_ids to their 0-based index
        # in s_ids.
        self.assertEqual(
            sid2idx, {"Sample1": 0, "Sample2": 1, "Sample3": 2}
        )

        # Check fid2idx, structured same as above but for features in f_ids.
        self.assertEqual(fid2idx, {"a": 0, "b": 1, "d": 2})

        # Finally, check that the table looks good. Table should have one list
        # per sample in s_ids. Each list should be a list of the feature
        # indices of the features present within this sample.
        self.assertEqual(
            tbl,
            [
                [0, 1, 2],  # Sample1 contains features a, b, d
                [0, 1, 2],  # Sample2 contains features a, b, d
                [0]         # Sample3 contains feature  a only
            ]
        )

    def test_compress_table_empty_sample(self):
        pass

    def test_compress_table_empty_feature(self):
        pass

    def test_compress_table_all_empty(self):
        pass

    def test_compress_sample_metadata_basic(self):
        pass

    def test_compress_sample_metadata_outputs_are_strings(self):
        pass

    def test_compress_sample_metadata_mapping_missing_samples(self):
        # shouldn't be a problem
        pass

    def test_compress_sample_metadata_metadata_missing_samples(self):
        # is definitely a problem
        pass

    def test_compress_feature_metadata_basic(self):
        pass

    def test_compress_feature_metadata_outputs_are_strings(self):
        pass

    def test_compress_feature_metadata_metadata_cols_differ(self):
        pass

    def test_compress_feature_metadata_both_metadata_dfs_empty(self):
        pass
