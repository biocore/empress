# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

import warnings
import pandas as pd


class TaxonomyError(Exception):
    pass


class TaxonomyWarning(Warning):
    pass


def split_taxonomy(feature_metadata):
    """ Attempts to find a taxonomy column and split it into taxonomic levels.

    If one of the columns in the feature metadata DataFrame (ignoring case)
    is named "Taxon" or "Taxonomy", this will return a new DataFrame where
    the column in question is removed and replaced with S + 1 new columns,
    where S is the maximum number of semicolons present in any feature's
    taxonomy.

    Basically, this lets us convert taxonomy annotations to an easier-to-work-
    with format; instead of having a single column for taxonomy, we'll have one
    column per taxonomy level. This will make life easier.

    Parameters
    ----------
    feature_metadata : pd.DataFrame
       DataFrame describing feature metadata.

    Returns
    -------
    taxsplit_feature_metadata : pd.DataFrame
        A version of the input feature metadata split as described above. (If
        none of the columns in the feature metadata were identified as being
        taxonomy columns, this DataFrame is identical to the input DataFrame.)
        The new "Level" columns will be placed at the start of the returned
        DataFrame's columns.

    Raises
    ------
    TaxonomyError
        If any of the following conditions are met:
            1. Multiple possible "taxonomy columns" are present in the input
               DataFrame: for example, both a "Taxon" and "Taxonomy" column are
               present, or both a "taxon" and "Taxon" column are present.
            2. A taxonomy column is present in the input DataFrame, and there
               is already at least one column in the DataFrame that starts with
               "Level".
    """
    # The entries in this tuple should only be lowercase
    VALID_TAXONOMY_COLUMN_NAMES = ("taxon", "taxonomy")
    lowercase_col_names = [str(c).lower() for c in feature_metadata.columns]

    # See if there is a "taxonomy column", and do some related validation on
    # column names
    invalid_level_columns_present = False
    tax_col_index = None
    tax_col_name = None
    for i, col in enumerate(lowercase_col_names):
        if col in VALID_TAXONOMY_COLUMN_NAMES:
            if tax_col_index is None:
                tax_col_index = i
                # ("col" has already been set to lowercase)
                tax_col_name = feature_metadata.columns[i]
            else:
                # Error condition 1 -- multiple possible "taxonomy columns" :(
                raise TaxonomyError(
                    (
                        "Multiple columns in the feature metadata have one of "
                        "the following names (case insensitive): {}. At most "
                        "one feature metadata column can have a name from "
                        "that list."
                    ).format(VALID_TAXONOMY_COLUMN_NAMES)
                )
        if col.startswith("level"):
            # This will be a problem *if* there's a taxonomy column, but if
            # there isn't it's not a problem. (So we wait until after we've
            # seen all of the feature metadata columns to raise an error about
            # this.)
            invalid_level_columns_present = True

    if tax_col_index is not None:
        if invalid_level_columns_present:
            # Error condition 2 -- there is at least one "Level" column already
            # in the feature metadata, which will make distinguishing these
            # column(s) from the columns we were going to add from feature
            # metadata difficult.
            raise TaxonomyError(
                "The feature metadata contains a taxonomy column, but also "
                "already contains column(s) starting with the text 'Level' "
                "(case insensitive)."
            )

        # Find the maximum number of ;s within any of the taxonomy annotations
        # Thanks Yoshiki for showing how to do this concisely :)
        max_sc_count = feature_metadata[tax_col_name].str.count(";").max()

        if max_sc_count == 0:
            # We allow this in the case of single-rank taxonomies (e.g. just
            # kingdoms, for some reason). Can change this to an error if
            # desired.
            warnings.warn(
                (
                    "None of the taxonomy values in the feature metadata "
                    "contain a semicolon (;). Please make sure your taxonomy "
                    'is formatted so that "levels" are separated by '
                    "semicolons."
                ),
                TaxonomyWarning
            )

        # OK, actually do splitting now (taking into account max_sc_count)
        def split_taxonomy_col(fm_row):
            levels = [r.strip() for r in fm_row.loc[tax_col_name].split(";")]
            # If this row's taxonomy has less levels than the max number of
            # levels, pad it out with empty strings.
            if len(levels) < max_sc_count + 1:
                num_missing_levels = (max_sc_count + 1) - len(levels)
                levels += ["Unspecified"] * num_missing_levels
            return levels

        # Our use of result_type="expand" means that tax_levels will be a
        # DataFrame with the same index as feature_metadata but with one column
        # for each taxonomic level (in order -- Kingdom, Phylum, etc.)
        tax_levels = feature_metadata.apply(
            split_taxonomy_col, axis="columns", result_type="expand"
        )
        # Assign human-friendly column names: Level 1, Level 2, ...
        tax_levels.columns = [
            "Level {}".format(i) for i in range(1, len(tax_levels.columns) + 1)
        ]
        fm_no_tax = feature_metadata.drop(columns=tax_col_name)
        # Finally, join the f.m. with the tax. levels DF by the index.
        return pd.concat([tax_levels, fm_no_tax], axis="columns")
    else:
        # No taxonomy column found, so no need to modify the DataFrame
        return feature_metadata
