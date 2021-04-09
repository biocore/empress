# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

import warnings
import pandas as pd
from empress import taxonomy_utils
from empress.tree import bp_tree_tips, bp_tree_non_tips
from itertools import zip_longest


class DataMatchingError(Exception):
    pass


class DataMatchingWarning(Warning):
    pass


def match_tree_and_feature_metadata(bp_tree, feature_metadata=None):
    """Processes feature metadata and subsets it to nodes in the tree.

    NOTE: This function calls bp_tree_tips() on bp_tree. If this winds up
    being a bottleneck, we could add an extra optional parameter to this
    function where match_inputs() could pass the already-computed tip names
    here to avoid calling this function twice.

    Parameters
    ----------
    bp_tree: bp.BP
        The tree to be visualized.
    feature_metadata: pd.DataFrame or None
        Feature metadata. If this is passed, the index should describe node
        names in the tree and the columns should describe different feature
        metadata fields' names.

    Returns
    -------
    (tip_metadata, int_metadata, tax_columns):
            (pd.DataFrame or None, pd.DataFrame or None, list)
        If feature metadata was not passed, tip_metadata and int_metadata
        will both be None. Otherwise, tip_metadata will contain the
        entries of the feature metadata where the feature name was present
        as a tip in the tree, and int_metadata will contain the entries
        of the feature metadata where the feature name was present as
        internal node(s) in the tree.

        Also, if feature metadata is passed, this will call
        taxonomy_utils.split_taxonomy() on the feature metadata before
        splitting it up between tip and internal node feature metadata --
        tax_columns will be set to whatever the tax_columns value returned by
        split_taxonomy() is (see that function's documentation for details).
        (If feature metadata is not passed, tax_columns will be [].)

    Raises
    ------
    DataMatchingError
        If feature_metadata is not None, but none of the names in its index
        correspond to any nodes in the tree.
    """
    tip_metadata = None
    int_metadata = None
    tax_columns = []
    if feature_metadata is not None:
        # Split up taxonomy column, if present in the feature metadata
        ts_feature_metadata, tax_columns = taxonomy_utils.split_taxonomy(
            feature_metadata
        )
        fm_ids = ts_feature_metadata.index

        # Subset tip metadata
        fm_and_tip_features = fm_ids.intersection(bp_tree_tips(bp_tree))
        tip_metadata = ts_feature_metadata.loc[fm_and_tip_features]

        # Subset internal node metadata
        internal_node_names = set(bp_tree_non_tips(bp_tree))
        fm_and_int_features = fm_ids.intersection(internal_node_names)
        int_metadata = ts_feature_metadata.loc[fm_and_int_features]

        if len(tip_metadata.index) == 0 and len(int_metadata.index) == 0:
            # Error condition 5 in match_inputs()
            raise DataMatchingError(
                "No features in the feature metadata are present in the tree, "
                "either as tips or as internal nodes."
            )
    return tip_metadata, int_metadata, tax_columns


def match_inputs(
    bp_tree,
    table,
    sample_metadata,
    feature_metadata=None,
    ordination=None,
    ignore_missing_samples=False,
    filter_extra_samples=False,
    filter_missing_features=False
):
    """Matches various input sources.

    Also "splits up" the feature metadata by calling
    match_tree_and_feature_metadata().

    Parameters
    ----------
    bp_tree: bp.BP
        The tree to be visualized.
    table: biom.Table
        Representation of the feature table. It's expected that feature IDs in
        the table only describe tips in the tree, not internal nodes.
    sample_metadata: pd.DataFrame
        Sample metadata. The index should describe sample IDs; the columns
        should describe different sample metadata fields' names.
    feature_metadata: pd.DataFrame or None
        Feature metadata. If this is passed, the index should describe feature
        IDs and the columns should describe different feature metadata fields'
        names. (Feature IDs here can describe tips or internal nodes in the
        tree.)
    ordination: skbio.OrdinationResults, optional
        The ordination to display in an empire plot.
    ignore_missing_samples: bool
        If True, pads missing samples (i.e. samples in the table but not the
        metadata) with placeholder metadata. If False, raises a
        DataMatchingError if any such samples exist. (Note that in either case,
        samples in the metadata but not in the table are filtered out; and if
        no samples are shared between the table and metadata, a
        DataMatchingError is raised regardless.) This is analogous to the
        ignore_missing_samples flag in Emperor.
    filter_extra_samples: bool, optional
        If True, ignores samples in the feature table that are not present in
        the ordination. If False, raises a DataMatchingError if such samples
        exist.
    filter_missing_features: bool
        If True, filters features from the table that aren't present as tips in
        the tree. If False, raises a DataMatchingError if any such features
        exist. (Note that in either case, features in the tree but not in the
        table are preserved.)

    Returns
    -------
    (table, sample_metadata, tip_metadata, int_metadata, tax_columns):
        (biom.Table, pd.DataFrame, pd.DataFrame|None, pd.DataFrame|None, list)
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
             will both be None (and tax_columns will be []). Otherwise,
             tip_metadata will contain the entries of the feature metadata
             where the feature name was present as a tip in the tree,
             int_metadata will contain the entries of the feature metadata
             where the feature name was present as internal node(s) in the
             tree, and tax_columns will contain the names of any newly-created
             columns representing levels in a taxonomy, sorted in descending
             order.
                -For sanity's sake, this will call
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
            6. The ordination and feature table don't share any samples.
            7. The feature table contains more samples than the ordination, AND
               filter_extra_samples is False.
            8. The ordination contains more samples than the feature table.

    References
    ----------
    This function was based on match_table_and_data() in Qurro's code:
    https://github.com/biocore/qurro/blob/b9613534b2125c2e7ee22e79fdff311812f4fefe/qurro/_df_utils.py#L255
    """
    # Match table and tree.
    # (Ignore None-named tips in the tree, which will be replaced later on
    # with "default" names like "EmpressNode0".)
    tip_names = set(bp_tree_tips(bp_tree))
    ff_table = table.copy()

    if ordination is not None:
        table_ids = set(ff_table.ids())
        ord_ids = set(ordination.samples.index)

        # don't allow for disjoint datasets
        if not (table_ids & ord_ids):
            # Error condition 6
            raise DataMatchingError(
                "No samples in the feature table are present in the "
                "ordination"
            )

        if ord_ids.issubset(table_ids):
            extra = table_ids - ord_ids
            if extra:
                if not filter_extra_samples:
                    # Error condition 7
                    raise DataMatchingError(
                        "The feature table has more samples than the "
                        "ordination. These are the problematic sample "
                        "identifiers: %s. You can override this error by using"
                        " the --p-filter-extra-samples flag." %
                        (', '.join(sorted(extra)))
                    )
                ff_table = ff_table.filter(ord_ids, inplace=False)
                # We'll remove now-empty features from the table later in
                # the code
        else:
            # Error condition 8
            raise DataMatchingError(
                "The ordination has more samples than the feature table."
            )
    ff_table_features = set(ff_table.ids(axis='observation'))
    tree_and_table_features = ff_table_features.intersection(tip_names)
    if len(tree_and_table_features) == 0:
        # Error condition 1
        raise DataMatchingError(
            "No features in the feature table are present as tips in the tree."
        )

    if len(tree_and_table_features) < len(ff_table_features):
        if filter_missing_features:
            # Filter table to just features that are also present in the tree.
            #
            # Note that we *don't* filter the tree analogously, because it's ok
            # for the tree's nodes to be a superset of the table's features
            # (and this is going to be the case in most datasets where the
            # features correspond to tips, since internal nodes aren't
            # explicitly described in the feature table).
            ff_table = ff_table.filter(tree_and_table_features,
                                       axis='observation', inplace=False)

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
    table_samples = set(ff_table.ids())
    sm_samples = set(sample_metadata.index)
    sm_and_table_samples = sm_samples & table_samples

    if len(sm_and_table_samples) == 0:
        # Error condition 3
        raise DataMatchingError(
            "No samples in the feature table are present in the sample "
            "metadata."
        )

    padded_metadata = sample_metadata.copy()
    if len(sm_and_table_samples) < len(table_samples):
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
    sf_sample_metadata = sample_metadata.loc[ff_table.ids()]

    # If desired, we could report here to the user about any dropped samples
    # from the metadata by looking at the difference between
    # sample_metadata.shape[0] and sf_sample_metadata.shape[0]. However, the
    # presence of such "dropped samples" is a common occurrence in 16S studies,
    # so we currently don't do that for the sake of avoiding alarm fatigue.

    tip_metadata, int_metadata, tax_columns = match_tree_and_feature_metadata(
        bp_tree,
        feature_metadata
    )

    return (
        ff_table, sf_sample_metadata, tip_metadata, int_metadata, tax_columns
    )


def shifting(bitlist, size=51):
    """Takes a list of 0-1s, splits in size and converts it to a list of int

    Parameters
    ----------
    bitlist: list of int
        The input list of 0-1
    size: int
        The size of the buffer

    Returns
    -------
    list of int
        Representation of the 0-1s as a list of int

    Raises
    ------
    ValueError
        If any of the list values is different than 0 or 1

    References
    ----------
    Borrowed from https://stackoverflow.com/a/12461400

    Example
    -------
    shifting([1, 0, 0, 0, 0, 1], size=3) => [4, 1]
    """
    if not all(x in [0, 1] for x in bitlist):
        raise ValueError('Your list has values other than 0-1s')

    values = [iter(bitlist)] * size
    ints = []
    for num in zip_longest(*values):
        out = 0
        init_zeros = []
        seen_one = False
        for bit in num:
            if bit is None:
                continue

            if not seen_one:
                if bit == 0:
                    init_zeros.append(0)
                else:
                    seen_one = True

            out = (out << 1) | bit

        # if out == 0, everything was zeros so we can simply add init_zeros
        if out == 0:
            ints.extend(init_zeros)
        else:
            ints.append(out)

    # we need to check init_zeros for the last loop in case the last value
    # had padded zeros
    if init_zeros and out != 0:
        # rm last value
        ints = ints[:-1]
        # add zeros
        ints.extend(init_zeros)
        # readd last value
        ints.append(out)

    return ints


def filter_feature_metadata_to_tree(tip_md, int_md, bp_tree):
    """Filters feature metadata DataFrames to describe the nodes in a tree.

    This is sort of similar to match_tree_and_feature_metadata(), but it
    doesn't call split_taxonomy(), assumes that feature metadata has already
    been split into tip and internal node metadata, assumes that the
    feature metadata's nodes are already a subset of the tree's nodes, and has
    a different error message if no nodes are shared between the feature
    metadata and tree. Basically, we could combine these two functions with
    some effort, but it's probably not worth the headaches.

    Parameters
    ----------
    tip_md: pd.DataFrame
        Tip node metadata. Index should describe node names, columns can be
        arbitrary metadata columns.
    int_md: pd.DataFrame
        Internal node metadata, structured analogously to tip_md.
    bp_tree: bp.BP
        Tree to filter the metadata objects to.

    Returns
    -------
    f_tip_md, f_int_md
        f_tip_md: pd.DataFrame
            Version of tip_md filtered to just the node names that describe
            tips in bp_tree. May be empty, if none of the names in tip_md were
            present in bp_tree.
        f_int_md: pd.DataFrame
            Version of int_md filtered to just the node names that describe
            internal nodes in bp_tree. May be empty, if none of the names in
            int_md were present in bp_tree.

    Raises
    ------
    DataMatchingError
        If f_tip_and_md and f_int_md would both be empty.
    """
    tree_tip_names = set(bp_tree_tips(bp_tree))
    tree_int_names = set(bp_tree_non_tips(bp_tree))
    shared_tip_names = tip_md.index.intersection(tree_tip_names)
    shared_int_names = int_md.index.intersection(tree_int_names)
    if len(shared_tip_names) == 0 and len(shared_int_names) == 0:
        raise DataMatchingError(
            "After performing empty feature removal from the table and then "
            "shearing the tree to tips that are also present in the table, "
            "none of the nodes in the feature metadata are present in the "
            "tree."
        )
    f_tip_md = tip_md.loc[shared_tip_names]
    f_int_md = int_md.loc[shared_int_names]
    return f_tip_md, f_int_md
