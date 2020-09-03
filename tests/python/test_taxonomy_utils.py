# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------
import unittest
import pandas as pd
from pandas.testing import assert_frame_equal, assert_series_equal
import empress.taxonomy_utils as tax_utils


class TestTaxonomyUtils(unittest.TestCase):

    def setUp(self):
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
                    # add a variable number of whitespace characters to check
                    # these are all successfully removed
                    (
                        "k__Bacteria;p__Bacteroidetes  ;     c__Bacteroidia; "
                        "o__Bacteroidales; f__Bacteroidaceae; g__Bacteroides; "
                        "s__uniformis"
                    ),
                    "k__Bacteria; p__Firmicutes; c__Bacilli"
                ],
                "Confidence": [0.95, 0.8, 0, 1]
            },
            index=["f1", "f2", "f3", "f4"]
        )

    def check_basic_case_worked(self, split_fm):
        """Checks that a given DataFrame matches the expected output from
           running split_taxonomy() on self.feature_metadata.
        """

        # Let's verify that split_fm looks how we expect it to look.
        # ...First, by checking the columns -- should indicate that the
        # correct number of taxonomic levels were identified
        self.assertCountEqual(split_fm.columns, [
            "Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6",
            "Level 7", "Confidence"
        ])
        # ...Next, check the index -- no features should've been dropped (that
        # isn't even a thing that split_taxonomy() does, but let's be safe :P)
        self.assertCountEqual(split_fm.index, ["f1", "f2", "f3", "f4"])

        # Finally, let's check each row individually. This is kinda inelegant.
        assert_series_equal(
            split_fm.loc["f1"],
            pd.Series({
                "Level 1": "k__Bacteria",
                "Level 2": "p__Bacteroidetes",
                "Level 3": "c__Bacteroidia",
                "Level 4": "o__Bacteroidales",
                "Level 5": "f__Bacteroidaceae",
                "Level 6": "g__Bacteroides",
                "Level 7": "s__",
                "Confidence": 0.95
            }, name="f1")
        )
        assert_series_equal(
            split_fm.loc["f2"],
            pd.Series({
                "Level 1": "k__Bacteria",
                "Level 2": "p__Proteobacteria",
                "Level 3": "c__Gammaproteobacteria",
                "Level 4": "o__Pasteurellales",
                "Level 5": "f__Pasteurellaceae",
                "Level 6": "g__",
                "Level 7": "s__",
                "Confidence": 0.8
            }, name="f2")
        )
        assert_series_equal(
            split_fm.loc["f3"],
            pd.Series({
                "Level 1": "k__Bacteria",
                "Level 2": "p__Bacteroidetes",
                "Level 3": "c__Bacteroidia",
                "Level 4": "o__Bacteroidales",
                "Level 5": "f__Bacteroidaceae",
                "Level 6": "g__Bacteroides",
                "Level 7": "s__uniformis",
                "Confidence": 0
            }, name="f3")
        )
        assert_series_equal(
            split_fm.loc["f4"],
            pd.Series({
                "Level 1": "k__Bacteria",
                "Level 2": "p__Firmicutes",
                "Level 3": "c__Bacilli",
                "Level 4": "Unspecified",
                "Level 5": "Unspecified",
                "Level 6": "Unspecified",
                "Level 7": "Unspecified",
                "Confidence": 1
            }, name="f4")
        )

    def test_split_taxonomy_no_tax_column(self):
        fm2 = self.feature_metadata.copy()
        fm2.columns = ["asdf", "ghjkl"]
        fm3 = tax_utils.split_taxonomy(fm2)
        assert_frame_equal(fm2, fm3)

    def test_split_taxonomy_multiple_tax_columns(self):
        bad_fm = self.feature_metadata.copy()
        bad_fm.columns = ["Taxonomy", "taxon"]
        # As with above, parentheses mess up regexes -- raw strings fix that
        with self.assertRaisesRegex(
            tax_utils.TaxonomyError,
            (
                "Multiple columns in the feature metadata have one of the "
                r"following names \(case insensitive\): "
                r"\('taxon', 'taxonomy'\). At most one feature metadata "
                "column can have a name from that list."
            )
        ):
            tax_utils.split_taxonomy(bad_fm)

    def test_split_taxonomy_invalid_level_column(self):
        bad_fm = self.feature_metadata.copy()
        bad_fm.columns = ["Taxonomy", "Level 20"]
        with self.assertRaisesRegex(
            tax_utils.TaxonomyError,
            (
                "The feature metadata contains a taxonomy column, but also "
                r"already contains column\(s\) starting with the text 'Level' "
                r"\(case insensitive\)."
            )
        ):
            tax_utils.split_taxonomy(bad_fm)

    def test_split_taxonomy_level_column_but_no_taxonomy_column(self):
        meh_fm = self.feature_metadata.copy()
        meh_fm.columns = ["I'm ambivalent!", "Level 20"]
        meh_fm2 = tax_utils.split_taxonomy(meh_fm)
        assert_frame_equal(meh_fm, meh_fm2)

    def test_split_taxonomy_basic_case(self):
        initial_fm = self.feature_metadata.copy()
        split_fm = tax_utils.split_taxonomy(initial_fm)

        # First off, check that initial_fm was NOT modified: the input DF
        # should remain untouched
        assert_frame_equal(self.feature_metadata, initial_fm)

        # Do all the in-depth testing of split_fm in a utility func (we'll
        # reuse this code a bit later)
        self.check_basic_case_worked(split_fm)

    def test_split_taxonomy_rows_with_no_semicolons(self):
        funky_fm = self.feature_metadata.copy()
        funky_fm.loc["f1", "Taxonomy"] = "birds aren't real"
        funky_fm.loc["f2", "Taxonomy"] = "theyve been drones"
        funky_fm.loc["f3", "Taxonomy"] = "all along :O"
        split_fm = tax_utils.split_taxonomy(funky_fm)

        # Notice that f4's taxonomy is still there -- so each feature will have
        # 3 levels
        self.assertCountEqual(split_fm.columns, [
            "Level 1", "Level 2", "Level 3", "Confidence"
        ])

        # Check each row individually
        assert_series_equal(
            split_fm.loc["f1"],
            pd.Series({
                "Level 1": "birds aren't real",
                "Level 2": "Unspecified",
                "Level 3": "Unspecified",
                "Confidence": 0.95
            }, name="f1")
        )
        assert_series_equal(
            split_fm.loc["f2"],
            pd.Series({
                "Level 1": "theyve been drones",
                "Level 2": "Unspecified",
                "Level 3": "Unspecified",
                "Confidence": 0.8
            }, name="f2")
        )
        assert_series_equal(
            split_fm.loc["f3"],
            pd.Series({
                "Level 1": "all along :O",
                "Level 2": "Unspecified",
                "Level 3": "Unspecified",
                "Confidence": 0
            }, name="f3")
        )
        assert_series_equal(
            split_fm.loc["f4"],
            pd.Series({
                "Level 1": "k__Bacteria",
                "Level 2": "p__Firmicutes",
                "Level 3": "c__Bacilli",
                "Confidence": 1
            }, name="f4")
        )

    def test_split_taxonomy_all_rows_no_semicolons(self):
        funky_fm = self.feature_metadata.copy()
        funky_fm.loc["f1", "Taxonomy"] = "Bacteria"
        funky_fm.loc["f2", "Taxonomy"] = "Archaea"
        funky_fm.loc["f3", "Taxonomy"] = "Bacteria"
        funky_fm.loc["f4", "Taxonomy"] = "Viruses"
        with self.assertWarnsRegex(
            tax_utils.TaxonomyWarning,
            (
                "None of the taxonomy values in the feature metadata "
                r"contain a semicolon \(;\). Please make sure your taxonomy "
                'is formatted so that "levels" are separated by semicolons.'
            )
        ):
            split_fm = tax_utils.split_taxonomy(funky_fm)

        self.assertCountEqual(split_fm.columns, ["Level 1", "Confidence"])
        assert_series_equal(
            split_fm.loc["f1"],
            pd.Series({"Level 1": "Bacteria", "Confidence": 0.95}, name="f1")
        )
        assert_series_equal(
            split_fm.loc["f2"],
            pd.Series({"Level 1": "Archaea", "Confidence": 0.8}, name="f2")
        )
        assert_series_equal(
            split_fm.loc["f3"],
            pd.Series({"Level 1": "Bacteria", "Confidence": 0}, name="f3")
        )
        assert_series_equal(
            split_fm.loc["f4"],
            pd.Series({"Level 1": "Viruses", "Confidence": 1}, name="f4")
        )

    def test_split_taxonomy_leading_trailing_whitespace(self):
        """Tests that taxonomy strings with leading/trailing whitespace are
           handled as expected (i.e. this whitespace is stripped).
        """
        # We insert a bunch of whitespace around the taxonomy info (and in the
        # case of f3, around each level), but the actual information remains
        # the same as with the basic test case: so the levels should be the
        # same.
        funky_fm = self.feature_metadata.copy()
        funky_fm.loc["f1", "Taxonomy"] = funky_fm.loc["f1", "Taxonomy"] + "  "
        funky_fm.loc["f2", "Taxonomy"] = " " + funky_fm.loc["f2", "Taxonomy"]
        funky_fm.loc["f3", "Taxonomy"] = (
            "     " + funky_fm.loc["f3", "Taxonomy"].replace(";", " ;") + " "
        )
        # This really should never happen in practice, since I believe that
        # QIIME 2's taxonomy format stores its data as a TSV file. Also having
        # a tab character in a taxonomy annotation sounds pretty sketchy to me.
        # However, we may as well test that -- if for example QIIME 2 switches
        # to CSV instead of TSV -- leading/trailing tabs are still treated as
        # leading/trailing whitespace and are therefore ignored.
        funky_fm.loc["f4", "Taxonomy"] = (
            " \t " + funky_fm.loc["f4", "Taxonomy"] + "\t"
        )
        split_fm = tax_utils.split_taxonomy(funky_fm)
        self.check_basic_case_worked(split_fm)

    def test_split_taxonomy_SILVA_annotation(self):
        """Tests that a particular taxonomy annotation that has caused
           errors with QIIME 2 in the past is split properly.
        """
        fm = pd.DataFrame({
            "Taxonomy": [
                (
                    "D_0__Bacteria;D_1__Gemmatimonadetes;"
                    "D_2__Gemmatimonadetes;D_3__Gemmatimonadales;"
                    "D_4__Gemmatimonadaceae;D_5__Gemmatimonas;"
                    "D_6__uncultured bacterium "
                )
            ]
        }, index=["f0"])
        split_fm = tax_utils.split_taxonomy(fm)
        assert_series_equal(
            split_fm.loc["f0"],
            pd.Series({
                "Level 1": "D_0__Bacteria",
                "Level 2": "D_1__Gemmatimonadetes",
                "Level 3": "D_2__Gemmatimonadetes",
                "Level 4": "D_3__Gemmatimonadales",
                "Level 5": "D_4__Gemmatimonadaceae",
                "Level 6": "D_5__Gemmatimonas",
                "Level 7": "D_6__uncultured bacterium",
            }, name="f0")
        )


if __name__ == "__main__":
    unittest.main()
