# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------
from copy import deepcopy
import unittest
import pandas as pd
from pandas.testing import assert_frame_equal
from empress.compression_utils import (
    compress_table, compress_sample_metadata, compress_feature_metadata
)


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
        self.sm = pd.DataFrame(
            {
                "Metadata1": [0, 0, 0, 1],
                "Metadata2": [0, 0, 0, 0],
                "Metadata3": [1, 2, 3, 4],
                "Metadata4": ["abc", "def", "ghi", "jkl"]
            },
            index=list(self.table.columns)[:]
        )
        self.sid2idx = {"Sample1": 0, "Sample2": 1, "Sample3": 2}
        self.tm = pd.DataFrame(
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
        self.im = pd.DataFrame(
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
        self.exp_fm_cols = [
            "Level 1",
            "Level 2",
            "Level 3",
            "Level 4",
            "Level 5",
            "Level 6",
            "Level 7",
            "Confidence"
        ]
        self.exp_ctm = {
            "e": [
                "k__Bacteria",
                "p__Bacteroidetes",
                "c__Bacteroidia",
                "o__Bacteroidales",
                "f__Bacteroidaceae",
                "g__Bacteroides",
                "s__",
                "0.95"
            ],
            "a": [
                "k__Bacteria",
                "p__Bacteroidetes",
                "c__Bacteroidia",
                "o__Bacteroidales",
                "f__Bacteroidaceae",
                "g__Bacteroides",
                "s__uniformis",
                 # The ".0" is due to the 0 being treated as numeric by Pandas,
                 # since this was a numeric column in the DF. We can *try* to
                 # prevent this sort of thing from happening, but I doubt this
                 # will make a difference to anyone -- and also it's kind of
                 # dependent on whatever tool is reading the metadata in the
                 # first place (if it was all read with dtype=str, then this
                 # shouldn't be a problem). So, more of a QIIME 2 problem.
                "0.0"
            ]
        }
        self.exp_cim = {
            "h": [
                "k__Bacteria",
                "p__Proteobacteria",
                "c__Gammaproteobacteria",
                "o__Pasteurellales",
                "f__Pasteurellaceae",
                "g__",
                "s__",
                "0.8"
            ],
            "m": [
                "k__Archaea",
                "Unspecified",
                "Unspecified",
                "Unspecified",
                "Unspecified",
                "Unspecified",
                "Unspecified",
                "1.0"
            ]
        }

    def test_compress_table_1_empty_sample_and_feature(self):
        # Test the "basic" case, just looking at our default data.
        table_copy = self.table.copy()
        s_ids, f_ids, sid2idx, fid2idx, tbl = compress_table(table_copy)

        # First off, verify that compress_table() leaves the original table DF
        # untouched.
        assert_frame_equal(table_copy, self.table)

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
        self.assertEqual(sid2idx, self.sid2idx)

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

    def test_compress_table_no_empty_samples(self):
        # Prevent Sample4 from being empty by making it, uh... not empty.
        diff_table = self.table.copy()
        diff_table.loc["d", "Sample4"] = 100
        s_ids, f_ids, sid2idx, fid2idx, tbl = compress_table(diff_table)
        self.assertEqual(s_ids, ["Sample1", "Sample2", "Sample3", "Sample4"])
        self.assertEqual(f_ids, ["a", "b", "d"])
        self.assertEqual(
            sid2idx, {"Sample1": 0, "Sample2": 1, "Sample3": 2, "Sample4": 3}
        )
        self.assertEqual(fid2idx, {"a": 0, "b": 1, "d": 2})
        self.assertEqual(
            tbl,
            [
                [0, 1, 2],  # Sample1 contains features a, b, d
                [0, 1, 2],  # Sample2 contains features a, b, d
                [0],        # Sample3 contains feature  a only
                [2]         # Sample4 contains feature  d only
            ]
        )

    def test_compress_table_no_empty_features(self):
        # Prevent feature "e" from being empty
        diff_table = self.table.copy()
        diff_table.loc["e", "Sample3"] = 100
        s_ids, f_ids, sid2idx, fid2idx, tbl = compress_table(diff_table)
        self.assertEqual(s_ids, ["Sample1", "Sample2", "Sample3"])
        self.assertEqual(f_ids, ["a", "b", "e", "d"])
        self.assertEqual(
            sid2idx, {"Sample1": 0, "Sample2": 1, "Sample3": 2}
        )
        self.assertEqual(fid2idx, {"a": 0, "b": 1, "e": 2, "d": 3})
        self.assertEqual(
            tbl,
            [
                [0, 1, 3],  # Sample1 contains features a, b, d
                [0, 1, 3],  # Sample2 contains features a, b, d
                [0, 2]      # Sample3 contains features a, e
            ]
        )

    def test_compress_table_no_empty_samples_or_features(self):
        # Prevent Sample4 and feature "e" from being empty
        diff_table = self.table.copy()
        diff_table.loc["e", "Sample4"] = 3
        s_ids, f_ids, sid2idx, fid2idx, tbl = compress_table(diff_table)
        self.assertEqual(s_ids, ["Sample1", "Sample2", "Sample3", "Sample4"])
        self.assertEqual(f_ids, ["a", "b", "e", "d"])
        self.assertEqual(
            sid2idx, {"Sample1": 0, "Sample2": 1, "Sample3": 2, "Sample4": 3}
        )
        self.assertEqual(fid2idx, {"a": 0, "b": 1, "e": 2, "d": 3})
        self.assertEqual(
            tbl,
            [
                [0, 1, 3],  # Sample1 contains features a, b, d
                [0, 1, 3],  # Sample2 contains features a, b, d
                [0],        # Sample3 contains feature  a only
                [2]         # Sample3 contains feature  e only
            ]
        )

    def test_compress_table_fully_dense(self):
        diff_table = self.table.copy()
        diff_table.loc[:, :] = 333
        s_ids, f_ids, sid2idx, fid2idx, tbl = compress_table(diff_table)
        self.assertEqual(s_ids, ["Sample1", "Sample2", "Sample3", "Sample4"])
        self.assertEqual(f_ids, ["a", "b", "e", "d"])
        self.assertEqual(
            sid2idx, {"Sample1": 0, "Sample2": 1, "Sample3": 2, "Sample4": 3}
        )
        self.assertEqual(fid2idx, {"a": 0, "b": 1, "e": 2, "d": 3})
        # Every sample contains every feature, so all sample lists should be
        # identical.
        self.assertEqual(
            tbl,
            [
                [0, 1, 2, 3],
                [0, 1, 2, 3],
                [0, 1, 2, 3],
                [0, 1, 2, 3]
            ]
        )

    def test_compress_table_fully_empty(self):
        diff_table = self.table.copy()
        diff_table.loc[:, :] = 0
        with self.assertRaisesRegex(
            ValueError,
            "All samples / features in matched table are empty."
        ):
            compress_table(diff_table)

    def test_compress_sample_metadata_1_missing_sm_sample_nonstr_vals(self):
        # Test the "basic" case, just looking at our default data.
        sm_copy = self.sm.copy()
        sid2idx_copy = deepcopy(self.sid2idx)
        sm_cols, sm_vals = compress_sample_metadata(sid2idx_copy, sm_copy)

        # As with compress_table(), verify that the inputs were left untouched.
        assert_frame_equal(sm_copy, self.sm)
        self.assertEqual(sid2idx_copy, self.sid2idx)

        self.assertEqual(
            sm_cols, ["Metadata1", "Metadata2", "Metadata3", "Metadata4"]
        )
        # For ease-of-reading, here's the metadata from above:
        # "Metadata1": [0, 0, 0, 1],
        # "Metadata2": [0, 0, 0, 0],
        # "Metadata3": [1, 2, 3, 4],
        # "Metadata4": ["abc", "def", "ghi", "jkl"]
        # Check that the metadata values were all converted to strings and are
        # structured properly. Also, Sample4's metadata should be missing from
        # sm_vals since it wasn't described in sid2idx (and *that* is because
        # with this test data, by default, Sample4 is empty and would've been
        # filtered out by compress_table()).
        self.assertEqual(
            sm_vals,
            [
                ["0", "0", "1", "abc"],  # Sample1's metadata
                ["0", "0", "2", "def"],  # Sample2's metadata
                ["0", "0", "3", "ghi"]   # Sample3's metadata
            ]
        )

    def test_compress_sample_metadata_nonstr_columns(self):
        diff_sm = self.sm.copy()
        diff_sm.columns = [100, 200, 'asdf', 2.5]
        sm_cols, sm_vals = compress_sample_metadata(self.sid2idx, diff_sm)
        # Main thing: check that the columns were converted to strings
        self.assertEqual(sm_cols, ["100", "200", "asdf", "2.5"])
        # (Also check that this didn't mess up the values for some reason)
        self.assertEqual(
            sm_vals,
            [
                ["0", "0", "1", "abc"],  # Sample1's metadata
                ["0", "0", "2", "def"],  # Sample2's metadata
                ["0", "0", "3", "ghi"]   # Sample3's metadata
            ]
        )

    def test_compress_sample_metadata_no_missing_samples(self):
        # Simulate an alternate timeline where Sample4 isn't all 0s
        sid2idx_copy = deepcopy(self.sid2idx)
        sid2idx_copy["Sample4"] = 3
        sm_cols, sm_vals = compress_sample_metadata(sid2idx_copy, self.sm)
        self.assertEqual(
            sm_cols, ["Metadata1", "Metadata2", "Metadata3", "Metadata4"]
        )
        self.assertEqual(
            sm_vals,
            [
                ["0", "0", "1", "abc"],  # Sample1's metadata
                ["0", "0", "2", "def"],  # Sample2's metadata
                ["0", "0", "3", "ghi"],  # Sample3's metadata
                ["1", "0", "4", "jkl"]   # Sample4's metadata :O
            ]
        )

    def test_compress_sample_metadata_missing_sid2idx_sample(self):
        # If the metadata is missing samples described in sid2idx, that's bad!
        # ...And also probably impossible, unless someone messes up the code :P

        # Subset the sample metadata to remove Sample1
        diff_sm = self.sm.copy()
        diff_sm = diff_sm.loc[["Sample2", "Sample3", "Sample4"]]
        with self.assertRaisesRegex(
            ValueError,
            "Metadata is missing sample IDs in s_ids_to_indices."
        ):
            compress_sample_metadata(self.sid2idx, diff_sm)

    def test_compress_sample_metadata_sid2idx_indices_invalid(self):
        # We try a couple different "configurations" of sid2idx, so to simplify
        # things we use this utility function to test that the compression
        # errors out as expected.
        def verify_fails_due_to_sid2idx(sid2idx):
            with self.assertRaisesRegex(
                ValueError,
                r"Indices \(values\) of s_ids_to_indices are invalid."
            ):
                compress_sample_metadata(sid2idx, self.sm)

        diff_sid2idx = deepcopy(self.sid2idx)

        diff_sid2idx["Sample1"] = 1
        verify_fails_due_to_sid2idx(diff_sid2idx)

        diff_sid2idx["Sample1"] = 4
        verify_fails_due_to_sid2idx(diff_sid2idx)

        diff_sid2idx["Sample1"] = -1
        verify_fails_due_to_sid2idx(diff_sid2idx)

        # Test that 1-indexing isn't allowed...
        diff_sid2idx["Sample1"] = 1
        diff_sid2idx["Sample2"] = 2
        diff_sid2idx["Sample3"] = 3
        verify_fails_due_to_sid2idx(diff_sid2idx)

    def test_compress_feature_metadata_tip_and_int_nonstr_vals(self):
        # Test the "basic" case, just looking at our default data.
        tm_copy = self.tm.copy()
        im_copy = self.im.copy()
        fm_cols, ctm, cim = compress_feature_metadata(tm_copy, im_copy)

        # As with compress_table(), verify that the inputs were left untouched.
        assert_frame_equal(tm_copy, self.tm)
        assert_frame_equal(im_copy, self.im)

        # Now, check outputs
        self.assertEqual(fm_cols, self.exp_fm_cols)
        self.assertEqual(ctm, self.exp_ctm)
        self.assertEqual(cim, self.exp_cim)

    def test_compress_feature_metadata_tip_md_empty(self):
        empty_tm = self.tm.filter(items=[], axis="index")
        fm_cols, ctm, cim = compress_feature_metadata(empty_tm, self.im)

        # Tip metadata should be an empty dict
        self.assertEqual(ctm, {})
        # Int metadata should be handled normally
        self.assertEqual(cim, self.exp_cim)

    def test_compress_feature_metadata_int_md_empty(self):
        empty_im = self.im.filter(items=[], axis="index")
        fm_cols, ctm, cim = compress_feature_metadata(self.tm, empty_im)

        # Tip metadata should be handled normally
        self.assertEqual(ctm, self.exp_ctm)
        # Int metadata should be an empty dict
        self.assertEqual(cim, {})

    def test_compress_feature_metadata_tip_and_int_nonstr_cols(self):
        tm_copy = self.tm.copy()
        im_copy = self.im.copy()
        tm_copy.columns = im_copy.columns = range(len(tm_copy.columns))
        fm_cols, ctm, cim = compress_feature_metadata(tm_copy, im_copy)

        # Columns should've been converted to strings
        self.assertEqual(fm_cols, ["0", "1", "2", "3", "4", "5", "6", "7"])

        # The actual values should be unchanged (fortunately, the nature of
        # storing values in lists means that no references to the column
        # names are stored here)
        self.assertEqual(ctm, self.exp_ctm)
        self.assertEqual(cim, self.exp_cim)

    def test_compress_feature_metadata_both_dfs_nones(self):
        fm_cols, ctm, cim = compress_feature_metadata(None, None)
        self.assertEqual(fm_cols, [])
        self.assertEqual(ctm, {})
        self.assertEqual(cim, {})

    def test_compress_feature_metadata_only_one_df_is_none(self):
        with self.assertRaisesRegex(
            ValueError,
            "Only one of tip & int. node feature metadata is None."
        ):
            compress_feature_metadata(self.tm, None)

        with self.assertRaisesRegex(
            ValueError,
            "Only one of tip & int. node feature metadata is None."
        ):
            compress_feature_metadata(None, self.im)

    def test_compress_feature_metadata_differing_columns(self):
        diff_tm = self.tm.copy()
        diff_tm.columns = range(len(self.tm.columns))
        with self.assertRaisesRegex(
            ValueError,
            "Tip & int. node feature metadata columns differ."
        ):
            compress_feature_metadata(diff_tm, self.im)

    def test_compress_feature_metadata_both_dfs_empty(self):
        empty_tm = self.tm.filter(items=[], axis="index")
        empty_im = self.im.filter(items=[], axis="index")
        with self.assertRaisesRegex(
            ValueError,
            "Both tip & int. node feature metadata are empty."
        ):
            compress_feature_metadata(empty_tm, empty_im)
