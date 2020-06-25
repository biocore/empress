# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

import warnings
import pandas as pd
import skbio
from skbio import TreeNode
from empress import taxonomy_utils


class DataMatchingError(Exception):
    pass


class DataMatchingWarning(Warning):
    pass


def fill_missing_node_names(tree):
    """ Names nodes in the tree without a name.

     Parameters
     ----------
     tree : skbio.TreeNode or empress.Tree
        Input tree with potentially unnamed nodes (i.e. nodes' .name attributes
        can be None).

    Returns
    -------
    skbio.TreeNode or empress.Tree
        Tree with all nodes assigned a name.
    """
    current_unlabeled_node = 0
    for n in tree.postorder(include_self=True):
        if n.name is None:
            new_name = 'EmpressNode{}'.format(current_unlabeled_node)
            n.name = new_name
            current_unlabeled_node += 1


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

    Also "splits up" the feature metadata, first by calling
    taxonomy_utils.split_taxonomy() on it and then by splitting the resulting
    DataFrame into two separate DataFrames (one for tips and one for internal
    nodes).

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
    (table, sample_metadata, tip_metadata, int_metadata):
        (pd.DataFrame, pd.DataFrame, pd.DataFrame / None, pd.DataFrame / None)
        Versions of the input table, sample metadata, and feature metadata
        filtered such that:
            -The table only contains features also present as tips in the tree.
            -The sample metadata only contains samples also present in the
             table.
            -Samples present in the table but not in the sample metadata will
             have all of their sample metadata values set to "This sample has
             no metadata". (This will only be done if ignore_missing_samples is
             True; otherwise, this situation will trigger an error. See below.)
            -If feature metadata was not passed, tip_metadata and int_metadata
             will both be None. Otherwise, tip_metadata will contain the
             entries of the feature metadata where the feature name was present
             as a tip in the tree, and int_metadata will contain the entries
             of the feature metadata where the feature name was present as
             internal node(s) in the tree.
                -Also, for sanity's sake, this will call
                 taxonomy_utils.split_taxonomy() on the feature metadata before
                 splitting it up into tip and internal node metadata.

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
    # (Ignore None-named tips in the tree, which will be replaced later on
    # with "default" names like "EmpressNode0".)
    tip_names = set([n.name for n in tree.tips() if n.name is not None])
    tree_and_table_features = table.index.intersection(tip_names)

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
    tip_metadata = None
    int_metadata = None
    if feature_metadata is not None:
        # Split up taxonomy column, if present in the feature metadata
        ts_feature_metadata = taxonomy_utils.split_taxonomy(feature_metadata)
        fm_ids = ts_feature_metadata.index

        # Subset tip metadata
        fm_and_tip_features = fm_ids.intersection(tip_names)
        tip_metadata = ts_feature_metadata.loc[fm_and_tip_features]

        # Subset internal node metadata
        internal_node_names = set([
            n.name for n in tree.non_tips(include_self=True)
        ])
        fm_and_int_features = fm_ids.intersection(internal_node_names)
        int_metadata = ts_feature_metadata.loc[fm_and_int_features]

        if len(tip_metadata.index) == 0 and len(int_metadata.index) == 0:
            # Error condition 5
            raise DataMatchingError(
                "No features in the feature metadata are present in the tree, "
                "either as tips or as internal nodes."
            )

    return ff_table, sf_sample_metadata, tip_metadata, int_metadata

def jsonify_table(table):
    """Converts a feature table to a space-saving JSON format.

    Parameters
    ----------
    table: pd.DataFrame
        Representation of a feature table. The index should describe feature
        IDs; the columns should describe sample IDs.

    Returns
    -------
    (s_ids, f_ids, f_ids_to_indices, s_ids_to_indices, s_indices_to_f_indices)
        s_ids: list
            List of the sample IDs in the table. Empty samples (i.e. those that
            do not contain any features) are omitted.
        f_ids: list
            List of the feature IDs in the table, analogous to s_ids. Empty
            features (i.e. those that are not present in any samples) are
            omitted.
        s_ids_to_indices: dict
            Inverse of s_ids: this maps sample IDs to their indices in s_ids.
            "Indices" refers to a feature or sample's 0-based position in f_ids
            or s_ids, respectively.
        f_ids_to_indices: dict
            Inverse of f_ids: this maps feature IDs to their indices in f_ids,
            analogous to s_ids_to_indices.
        s_indices_to_f_indices: dict
            Maps sample indices (see above for definition of "indices" here)
            to a list of feature indices, where only the feature indices of
            features that have a nonzero abundance in this sample are listed.

    Raises
    ------
    ValueError
        If the input table is completely empty (i.e. all zeroes).

    References
    ----------
        - Inspired by redbiom and Qurro's JSON data models.
        - Removal of empty samples / features based on
          qurro._df_utils.remove_empty_samples_and_features().
    """
    # Remove empty samples / features
    # (In Qurro, I used (table != 0) for this, but (table > 0) should also
    # work. Should be able to assume a table won't have negative abundances.)
    gt_0 = (table > 0)
    filtered_table = table.loc[
        gt_0.any(axis="columns"), gt_0.any(axis="index")
    ]
    if filtered_table.empty:
        raise ValueError("All samples / features in matched table are empty.")

    # (We do this again because filtered_table might be smaller now than it was
    # above)
    binarized_table = (filtered_table > 0)

    sample_ids = list(binarized_table.columns)
    feature_ids = list(binarized_table.index)
    f_ids_to_indices = {fid: idx for idx, fid in enumerate(feature_ids)}
    s_ids_to_indices = {sid: idx for idx, sid in enumerate(sample_ids)}

    s_indices_to_f_indices = {}
    def save_present_features(sample_column):
        sample_idx = s_ids_to_indices[sample_column.name]
        # Get a list of all feature IDs present in this sample
        present_feature_ids = list(sample_column[sample_column].index)
        # Convert this to a list of feature indices, and update the out dict
        s_indices_to_f_indices[sample_idx] = [
            f_ids_to_indices[fid] for fid in present_feature_ids
        ]
        # We don't return anything. This is kind of a cursed way of using
        # df.apply() but it works, and it should be moderately efficient since
        # this is .apply() \._./
    binarized_table.apply(save_present_features, axis="index")

    return (
        sample_ids, feature_ids, f_ids_to_indices, s_ids_to_indices,
        s_indices_to_f_indices
    )


def jsonify_metadata(index_ids_to_indices, metadata):
    # We could ostensibly go further by
    # identifying repeated metadata values and mapping *those* to integer IDs,
    # but that may be 1) overkill and 2) not worth it until we get to really
    # big datasets (and/or datasets with lots of repeated values).

    indices = index_ids_to_indices.values()
    sorted_indices = sorted(indices)
    if sorted_indices != list(range(len(metadata.index))):
        raise ValueError("Indices of index_ids_to_indices aren't valid.")

    # Produce a dict mapping indices to a list of their corresponding metadata
    # values -- e.g. {1: ["gut", "413", "asdf"], 0: ["tongue", "612", "ghjk"]}
    # (Note that the indices are not necessarily sorted because we stick to
    # the order of the index of the metadata)
    indices_to_metadata_vals = {}
    def save_metadata(row):
        indices_to_metadata_vals[index_ids_to_indices[row.name]] = list(row)
    metadata.apply(save_metadata, axis="columns")

    # Although the dict we just produced is compressed, we can go further
    # without much extra effort. We can sort the indices, and then just smoosh
    # the dict into a list which can be accessed the exact same way (since [0]
    # will now refer to the first element, [1] to the second, etc.)
    metadata_vals = []
    for i in sorted_indices:
        metadata_vals.append(indices_to_metadata_vals[i])

    return list(metadata.columns), metadata_vals
