# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------
from copy import deepcopy
import io
import unittest
import unittest.mock
import pandas as pd
import numpy as np
import skbio
import biom
from pandas.testing import assert_frame_equal
from empress.compression_utils import (
    remove_empty_samples_and_features, compress_table,
    compress_sample_metadata, compress_feature_metadata
)


class TestCompressionUtils(unittest.TestCase):

    def setUp(self):
        self.table = biom.Table(np.array([[1, 2, 0, 4],
                                          [8, 7, 0, 5],
                                          [1, 0, 0, 0],
                                          [0, 0, 0, 0]]).T, list('abed'),
                                ['Sample1', 'Sample2', 'Sample3', 'Sample4'])
        # After filtering out empty samples/features:
        self.table_ef = biom.Table(np.array([[1, 2, 4],
                                             [8, 7, 5],
                                             [1, 0, 0]]).T,
                                   ['a', 'b', 'd'],
                                   ['Sample1', 'Sample2', 'Sample3'])

        self.sm = pd.DataFrame(
            {
                "Metadata1": [0, 0, 0, 1],
                "Metadata2": [0, 0, 0, 0],
                "Metadata3": [1, 2, 3, 4],
                "Metadata4": ["abc", "def", "ghi", "jkl"]
            },
            index=list(self.table.ids())
        )
        # After filtering out empty samples/features:
        # (Note that we only care about "emptiness" from the table's
        # perspective. We don't consider a sample with 0 for all of its
        # metadata, or a metadata field with 0 for all samples, to be empty.)
        self.sm_ef = pd.DataFrame(
            {
                "Metadata1": [0, 0, 0],
                "Metadata2": [0, 0, 0],
                "Metadata3": [1, 2, 3],
                "Metadata4": ["abc", "def", "ghi"]
            },
            index=self.table_ef.ids().copy()
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
            # The ".0" in "a"'s Confidence value is due to the 0 being treated
            # as numeric by Pandas, since this was a numeric column in the DF.
            # We can *try* to prevent this sort of thing from happening, but I
            # doubt this will make a difference to anyone -- and also it's kind
            # of dependent on whatever tool is reading the metadata in the
            # first place (if it was all read with dtype=str, then this
            # shouldn't be a problem). So, more of a QIIME 2 problem.
            "a": [
                "k__Bacteria",
                "p__Bacteroidetes",
                "c__Bacteroidia",
                "o__Bacteroidales",
                "f__Bacteroidaceae",
                "g__Bacteroides",
                "s__uniformis",
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
        # Ordination info (for testing inputs to remove_empty...())
        self.eigvals = pd.Series(
            np.array([0.50, 0.25, 0.25]),
            index=["PC1", "PC2", "PC3"]
        )
        samples = np.array([
            [0.1, 0.2, 0.3],
            [0.2, 0.3, 0.4],
            [0.3, 0.4, 0.5],
            [0.4, 0.5, 0.6]
        ])
        self.proportion_explained = pd.Series(
            [15.5, 12.2, 8.8],
            index=["PC1", "PC2", "PC3"]
        )
        self.samples_df = pd.DataFrame(
            samples,
            index=["Sample1", "Sample2", "Sample3", "Sample4"],
            columns=["PC1", "PC2", "PC3"]
        )
        features = np.array([
            [0.9, 0.8, 0.7],
            [0.6, 0.5, 0.4],
            [0.3, 0.2, 0.1],
            [0.0, 0.2, 0.4]
        ])
        self.features_df = pd.DataFrame(
            features,
            index=["a", "b", "e", "d"],
            columns=["PC1", "PC2", "PC3"]
        )
        # self.pcoa is problematic by default, because it contains Sample4
        self.pcoa = skbio.OrdinationResults(
            "PCoA",
            "Principal Coordinate Analysis",
            self.eigvals,
            self.samples_df,
            proportion_explained=self.proportion_explained
        )

    # stdout mocking based on https://stackoverflow.com/a/46307456/10730311
    # and https://docs.python.org/3/library/unittest.mock.html
    @unittest.mock.patch("sys.stdout", new_callable=io.StringIO)
    def test_remove_empty_1_empty_sample_and_feature(self, mock_stdout):
        ft, fsm = remove_empty_samples_and_features(self.table, self.sm)
        self.assertEqual(ft, self.table_ef)

        assert_frame_equal(fsm, self.sm_ef)
        self.assertEqual(
            mock_stdout.getvalue(),
            "Removed 1 empty sample(s).\nRemoved 1 empty feature(s).\n"
        )

    def test_remove_empty_with_empty_sample_in_ordination(self):
        with self.assertRaisesRegex(
            ValueError,
            (
                r"The ordination contains samples that are empty \(i.e. all "
                r"0s\) in the table. Problematic sample IDs: Sample4"
            )
        ):
            remove_empty_samples_and_features(self.table, self.sm, self.pcoa)

    def test_remove_empty_with_multiple_empty_samples_in_ordination(self):
        def make_bad(v, i, m):
            if i == 'Sample1':
                return np.zeros(len(v))
            else:
                return v

        bad_table = self.table.copy()
        bad_table.transform(make_bad, inplace=True)
        with self.assertRaisesRegex(
            ValueError,
            (
                r"The ordination contains samples that are empty \(i.e. all "
                r"0s\) in the table. Problematic sample IDs: Sample1, Sample4"
            )
        ):
            remove_empty_samples_and_features(bad_table, self.sm, self.pcoa)

    def test_remove_empty_with_empty_feature_in_ordination(self):
        bad_feature_pcoa = skbio.OrdinationResults(
            'PCoA',
            'Principal Coordinate Analysis',
            self.eigvals,
            self.samples_df.drop(labels="Sample4", axis="index"),
            features=self.features_df,
            proportion_explained=self.proportion_explained
        )
        with self.assertRaisesRegex(
            ValueError,
            (
                r"The ordination contains features that are empty \(i.e. all "
                r"0s\) in the table. Problematic feature IDs: e"
            )
        ):
            remove_empty_samples_and_features(
                self.table, self.sm, bad_feature_pcoa
            )

    def test_remove_empty_with_empty_sample_and_feature_in_ordination(self):
        # Checks behavior when both an empty sample and an empty feature are in
        # the ordination. Currently the code is structured so that empty sample
        # errors take precedence over empty feature errors -- I imagine this
        # will be the more common of the two scenarios, which is partially why
        # I went with this. But this is probably a rare edge case anyway.
        extremely_funky_pcoa = skbio.OrdinationResults(
            'PCoA',
            'Principal Coordinate Analysis',
            self.eigvals,
            self.samples_df,
            features=self.features_df,
            proportion_explained=self.proportion_explained
        )
        with self.assertRaisesRegex(
            ValueError,
            (
                r"The ordination contains samples that are empty \(i.e. all "
                r"0s\) in the table. Problematic sample IDs: Sample4"
            )
        ):
            remove_empty_samples_and_features(
                self.table, self.sm, extremely_funky_pcoa
            )

    @unittest.mock.patch("sys.stdout", new_callable=io.StringIO)
    def test_remove_empty_nothing_to_remove(self, mock_stdout):
        ft, fsm = remove_empty_samples_and_features(self.table_ef, self.sm_ef)
        self.assertEqual(ft, self.table_ef)
        assert_frame_equal(fsm, self.sm_ef)
        self.assertEqual(mock_stdout.getvalue(), "")

    @unittest.mock.patch("sys.stdout", new_callable=io.StringIO)
    def test_remove_empty_nothing_to_remove_with_ordination(self, mock_stdout):
        good_pcoa = skbio.OrdinationResults(
            'PCoA',
            'Principal Coordinate Analysis',
            self.eigvals,
            self.samples_df.drop(labels="Sample4", axis="index"),
            features=self.features_df.drop(labels="e", axis="index"),
            proportion_explained=self.proportion_explained
        )
        ft, fsm = remove_empty_samples_and_features(
            self.table_ef, self.sm_ef, good_pcoa
        )
        self.assertEqual(ft, self.table_ef)
        assert_frame_equal(fsm, self.sm_ef)
        self.assertEqual(mock_stdout.getvalue(), "")

    def test_remove_empty_table_empty(self):
        def make_bad(v, i, m):
            return np.zeros(len(v))

        diff_table = self.table.copy()
        diff_table.transform(make_bad, inplace=True)
        with self.assertRaisesRegex(
            ValueError,
            "All samples / features in matched table are empty."
        ):
            remove_empty_samples_and_features(diff_table, self.sm)

    def test_remove_empty_table_empty_and_ordination_funky(self):
        # Even if the ordination contains empty samples (as is the case for
        # self.pcoa), the table being completely empty should still take
        # precedence as an error. (If *both* errors are present for a dataset,
        # then I recommend consulting a priest.)
        def make_bad(v, i, m):
            return np.zeros(len(v))

        diff_table = self.table.copy()
        diff_table.transform(make_bad, inplace=True)
        with self.assertRaisesRegex(
            ValueError,
            "All samples / features in matched table are empty."
        ):
            remove_empty_samples_and_features(diff_table, self.sm, self.pcoa)

    def test_compress_table_basic(self):
        # Test the "basic" case, just looking at our default data.
        table_copy = self.table_ef.copy()
        s_ids, f_ids, sid2idx, fid2idx, tbl = compress_table(table_copy)

        # First off, verify that compress_table() leaves the original table
        # untouched.
        self.assertEqual(table_copy, self.table_ef)

        # Check s_ids, which just be a list of the sample IDs in the same order
        # as they were in the table's columns.
        self.assertEqual(s_ids, ["Sample1", "Sample2", "Sample3"])

        # Check f_ids, which as with s_ids is a list of feature IDs in the same
        # order as they were in the table's index.
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

    def test_compress_table_with_empty_things(self):
        # This should never happen in practice (empty sample/feature removal
        # should be done before compression to save more space), but this
        # checks that if this is not the case that the output of compress_table
        # isn't blatantly incorrect.
        s_ids, f_ids, sid2idx, fid2idx, tbl = compress_table(self.table)
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
                []          # Sample4 contains no features :O
            ]
        )

    def test_compress_table_fully_dense(self):
        diff_table = biom.Table(np.ones(self.table.shape),
                                self.table.ids(axis='observation'),
                                self.table.ids())
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

    def test_compress_sample_metadata_nonstr_vals(self):
        # Test the "basic" case, just looking at our default data.
        sm_copy = self.sm_ef.copy()
        sid2idx_copy = deepcopy(self.sid2idx)
        sm_cols, sm_vals = compress_sample_metadata(sid2idx_copy, sm_copy)

        # As with compress_table(), verify that the inputs were left untouched.
        assert_frame_equal(sm_copy, self.sm_ef)
        self.assertEqual(sid2idx_copy, self.sid2idx)

        self.assertEqual(
            sm_cols, ["Metadata1", "Metadata2", "Metadata3", "Metadata4"]
        )
        # For ease-of-reading, here's the metadata from above:
        # "Metadata1": [0, 0, 0],
        # "Metadata2": [0, 0, 0],
        # "Metadata3": [1, 2, 3],
        # "Metadata4": ["abc", "def", "ghi"]
        # Check that the metadata values were all converted to strings and are
        # structured properly.
        self.assertEqual(
            sm_vals,
            [
                ["0", "0", "1", "abc"],  # Sample1's metadata
                ["0", "0", "2", "def"],  # Sample2's metadata
                ["0", "0", "3", "ghi"]   # Sample3's metadata
            ]
        )

    def test_compress_sample_metadata_nonstr_columns(self):
        diff_sm = self.sm_ef.copy()
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

    def test_compress_sample_metadata_missing_sample_from_metadata(self):
        # If the metadata is missing samples described in sid2idx, that's bad!
        # ...And also probably impossible, unless someone messes up the code :P

        # Subset the sample metadata to remove Sample1
        diff_sm = self.sm_ef.copy()
        diff_sm = diff_sm.drop(labels="Sample1", axis="index")
        with self.assertRaisesRegex(
            ValueError,
            "The sample IDs in the metadata's index and s_ids_to_indices are "
            "not identical."
        ):
            compress_sample_metadata(self.sid2idx, diff_sm)

    def test_compress_sample_metadata_missing_sample_from_sid2idx(self):
        # And if sid2idx is missing samples that are in the metadata, that's
        # also not allowed!

        # Subset the sample metadata to remove Sample3
        diff_sid2idx = {"Sample1": 0, "Sample2": 1}
        with self.assertRaisesRegex(
            ValueError,
            "The sample IDs in the metadata's index and s_ids_to_indices are "
            "not identical."
        ):
            compress_sample_metadata(diff_sid2idx, self.sm_ef)

    def test_compress_sample_metadata_sid2idx_indices_invalid(self):
        # We try a couple different "configurations" of sid2idx, so to simplify
        # things we use this utility function to test that the compression
        # errors out as expected.
        def verify_fails_due_to_sid2idx(sid2idx):
            with self.assertRaisesRegex(
                ValueError,
                r"Indices \(values\) of s_ids_to_indices are invalid."
            ):
                compress_sample_metadata(sid2idx, self.sm_ef)

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
