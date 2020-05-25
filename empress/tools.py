import warnings
import pandas as pd
import skbio
from skbio import TreeNode


class DataMatchingError(Exception):
    pass


class DataMatchingWarning(Warning):
    pass


class FeatureMetadataError(Exception):
    pass


def name_internal_nodes(tree):
    """ Name internal nodes that don't have a name

     Parameters
     ----------
     tree : skbio.TreeNode or empress.Tree
        Input tree with labeled tips and partially unlabeled internal nodes
        or branch lengths.

    Returns
    -------
    skbio.TreeNode or empress.Tree
        Tree with fully labeled internal nodes and branches.
    """
    # initialize tree with branch lengths and node names if they are missing
    current_unlabled_node = 0
    for n in tree.postorder(include_self=True):
        if n.length is None:
            n.length = 0
        if n.name is None:
            new_name = 'EmpressNode%d' % current_unlabled_node
            n.name = new_name
            current_unlabled_node += 1


def read(file_name, file_format='newick'):
    """ Reads in contents from a file.
    """

    if file_format == 'newick':
        tree = skbio.read(file_name, file_format, into=TreeNode)
        return tree
    return None


def match_inputs(
    tree,
    table,
    sample_metadata,
    feature_metadata=None,
    ignore_missing_samples=False,
    filter_missing_features=False
):
    """Matches various input sources.

    Parameters
    ----------

    tree: empress.tree.Tree
        The tree to be visualized.
    table: pd.DataFrame
        Representation of the feature table. The index should describe feature
        IDs; the columns should describe sample IDs. (It's expected that
        feature IDs in the table only describe tips in the tree, not internal
        nodes.)
    sample_metadata: pd.DataFrame
        Sample metadata. The index should describe sample IDs; the columns
        should describe different sample metadata fields' names.
    feature_metadata: pd.DataFrame or None
        Feature metadata. If this is passed, the index should describe feature
        IDs and the columns should describe different feature metadata fields'
        names. (Feature IDs here can describe tips or internal nodes in the
        tree.)
    ignore_missing_samples: bool
        If True, pads missing samples (i.e. samples in the table but not the
        metadata) with placeholder metadata. If False, raises a
        DataMatchingError if any such samples exist. (Note that in either case,
        samples in the metadata but not in the table are filtered out; and if
        no samples are shared between the table and metadata, a
        DataMatchingError is raised regardless.) This is analogous to the
        ignore_missing_samples flag in Emperor.
    filter_missing_features: bool
        If True, filters features from the table that aren't present as tips in
        the tree. If False, raises a DataMatchingError if any such features
        exist. (Note that in either case, features in the tree but not in the
        table are preserved.)

    Returns
    -------
    (table, sample_metadata, feature_metadata): (pd.DataFrame, pd.DataFrame,
                                                 pd.DataFrame or None)
        Versions of the input table, sample metadata, and feature metadata
        filtered such that:
            -The table only contains features also present as tips in the tree.
            -The sample metadata only contains samples also present in the
             table.
            -Samples present in the table but not in the sample metadata will
             have all of their sample metadata values set to "This sample has
             no metadata". (This will only be done if ignore_missing_samples is
             True; otherwise, this situation will trigger an error. See below.)
            -The feature metadata, if it was passed, only contains features
             also present as tips or internal nodes in the tree. (If the
             feature metadata wasn't passed, this will just return None.)

    Raises
    ------
    DataMatchingError
        If any of the following conditions are met:
            1. No features are shared between the tree's tips and table.
            2. There are features present in the table but not as tips in the
               tree, AND filter_missing_features is False.
            3. No samples are shared between the sample metadata and table.
            4. There are samples present in the table but not in the sample
               metadata, AND ignore_missing_samples is False.
            5. The feature metadata was passed, but no features present in it
               are also present as tips or internal nodes in the tree.

    References
    ----------
    This function was based on match_table_and_data() in Qurro's code:
    https://github.com/biocore/qurro/blob/b9613534b2125c2e7ee22e79fdff311812f4fefe/qurro/_df_utils.py#L255
    """
    # Match table and tree.
    tip_names = [n.name for n in tree.tips()]
    tree_and_table_features = set(tip_names) & set(table.index)

    if len(tree_and_table_features) == 0:
        # Error condition 1
        raise DataMatchingError(
            "No features in the feature table are present as tips in the tree."
        )

    ff_table = table.copy()
    if len(tree_and_table_features) < len(table.index):
        if filter_missing_features:
            # Filter table to just features that are also present in the tree.
            #
            # Note that we *don't* filter the tree analogously, because it's ok
            # for the tree's nodes to be a superset of the table's features
            # (and this is going to be the case in most datasets where the
            # features correspond to tips, since internal nodes aren't
            # explicitly described in the feature table).
            ff_table = table.loc[tree_and_table_features]

            # Report to user about any dropped features from table.
            dropped_feature_ct = table.shape[0] - ff_table.shape[0]
            warnings.warn(
                (
                    "{} feature(s) in the table were not present as tips in "
                    "the tree. These feature(s) have been removed from the "
                    "visualization."
                ).format(
                    dropped_feature_ct
                ),
                DataMatchingWarning
            )
        else:
            # Error condition 2
            raise DataMatchingError(
                "The feature table contains features that aren't present as "
                "tips in the tree. You can override this error by using the "
                "--p-filter-missing-features flag."
            )

    # Match table (post-feature-filtering, if done) and sample metadata.
    table_samples = set(ff_table.columns)
    sm_samples = set(sample_metadata.index)
    sm_and_table_samples = sm_samples & table_samples

    if len(sm_and_table_samples) == 0:
        # Error condition 3
        raise DataMatchingError(
            "No samples in the feature table are present in the sample "
            "metadata."
        )

    padded_metadata = sample_metadata.copy()
    if len(sm_and_table_samples) < len(ff_table.columns):
        if ignore_missing_samples:
            # Works similarly to how Emperor does this: see
            # https://github.com/biocore/emperor/blob/659b62a9f02a6423b6258c814d0e83dbfd05220e/emperor/core.py#L350
            samples_without_metadata = table_samples - sm_samples
            padded_metadata = pd.DataFrame(
                index=samples_without_metadata,
                columns=sample_metadata.columns,
                dtype=str
            )
            padded_metadata.fillna("This sample has no metadata", inplace=True)
            sample_metadata = pd.concat([sample_metadata, padded_metadata])
            # Report to user about samples we needed to "pad."
            warnings.warn(
                (
                    "{} sample(s) in the table were not present in the "
                    "sample metadata. These sample(s) have been assigned "
                    "placeholder metadata."
                ).format(
                    len(samples_without_metadata)
                ),
                DataMatchingWarning
            )
        else:
            # Error condition 4
            raise DataMatchingError(
                "The feature table contains samples that aren't present in "
                "the sample metadata. You can override this error by using "
                "the --p-ignore-missing-samples flag."
            )

    # If we've made it this far, then there must be at least *one* sample
    # present in both the sample metadata and the table: and by this point the
    # metadata's samples should be a superset of the table's samples (since we
    # padded the metadata above if there were any samples that *weren't* in the
    # table).
    #
    # All that's left to do is to filter the sample metadata to just the
    # samples that are also present in the table.
    sf_sample_metadata = sample_metadata.loc[ff_table.columns]

    # If desired, we could report here to the user about any dropped samples
    # from the metadata by looking at the difference between
    # sample_metadata.shape[0] and sf_sample_metadata.shape[0]. However, the
    # presence of such "dropped samples" is a common occurrence in 16S studies,
    # so we currently don't do that for the sake of avoiding alarm fatigue.

    # If the feature metadata was passed, filter it so that it only contains
    # features present as tips / internal nodes in the tree
    if feature_metadata is not None:
        all_tree_node_names = set([n.name for n in tree.postorder()])
        fm_ids = set(feature_metadata.index)
        fm_and_tree_features = fm_ids & all_tree_node_names
        feature_metadata = feature_metadata.loc[fm_and_tree_features]
        if len(feature_metadata.index) == 0:
            # Error condition 5
            raise DataMatchingError(
                "No features in the feature metadata are present in the tree, "
                "either as tips or as internal nodes."
            )

    return ff_table, sf_sample_metadata, feature_metadata


def split_taxonomy_if_present(feature_metadata):
    """ Attempts to find a taxonomy column and split it into taxonomic levels.

    If one of the columns in the feature metadata DataFrame (ignoring case)
    is named "Taxon" or "Taxonomy", this will return a new DataFrame where
    the column in question is removed and replaced with S + 1 new columns,
    where S is the number of semicolons present in each feature's taxonomy.

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

    Raises
    ------
    FeatureMetadataError
        If any of the following conditions are met:
            1. Multiple possible "taxonomy columns" are present in the input
               DataFrame: for example, both a "Taxon" and "Taxonomy" column are
               present, or both a "taxon" and "Taxon" column are present.
            2. A taxonomy column is present in the input DataFrame, and there
               is already at least one column in the DataFrame that starts with
               "Level".
            3. A taxonomy column is present in the input DataFrame, but not all
               features' taxonomies have the same number of semicolons. For
               example, if one feature has the annotation
                    "k__;p__;c__;o__;f__;g__;s__"
               ... and another feature has the annotation
                    "k__;p__;c__;o__;f__"
               then this will raise an error, since the taxonomic ranks shared
               by the two features are not (easily) comparable.
    """
    # The entries in this tuple should only be lowercase
    VALID_TAXONOMY_COLUMN_NAMES = ("taxon", "taxonomy")
    lowercase_col_names = [str(c).lower() for c in feature_metadata.columns]

    # See if there is a "taxonomy column", and do some related validation on
    # column names
    invalid_level_columns_present = False
    tax_col_index = None
    for col, i in zip(lowercase_col_names, range(len(lowercase_col_names))):
        if col in VALID_TAXONOMY_COLUMN_NAMES:
            if tax_col_index is None:
                tax_col_index = i
            else:
                # Error condition 1 -- multiple possible "taxonomy columns" :(
                raise FeatureMetadataError(
                    (
                        "Multiple columns in the feature metadata have one of "
                        "the following names (case insensitive): {}. At most "
                        "one feature metadata column can have a name from "
                        "that list."
                    ).format(VALID_TAXONOMY_COLUMN_NAMES)
                )
        if col.startswith("Level"):
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
            raise FeatureMetadataError(
                "The feature metadata contains a taxonomy column, but also "
                "already contains column(s) starting with the text 'Level'."
            )
        # TODO: Check that the number of semicolons in each feature's tax col
        # is identical. If not, raise Error condition 3.
        # TODO for after that: Actually do splitting. Use apply() to do this --
        # shouldn't be too bad.
    else:
        # No taxonomy column found, so no need to modify the DataFrame
        return feature_metadata
