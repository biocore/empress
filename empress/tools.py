import skbio
from skbio import TreeNode


class DataMatchingError(Exception):
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


def print_if_dropped(
    df_old, df_new, axis_num, item_name, df_name, filter_basis_name
):
    """Prints a message if a given DataFrame has been filtered.

       Essentially, this function just checks if
       df_old.shape[axis_num] - df_new.shape[axis_num] > 0.

       If so, this prints a message with a bunch of details (which the _name
       parameters all describe).

    Parameters
    ----------

    df_old: pd.DataFrame (or pd.SparseDataFrame)
         "Unfiltered" DataFrame -- used as the reference when trying to
         determine if df_new has been filtered.

    df_new: pd.DataFrame (or pd.SparseDataFrame)
         A potentially-filtered DataFrame.

    axis_num: int
         The axis in the DataFrames' .shapes to check. This should be either
         0 or 1, but we don't explicitly check for that.

    item_name: str
         The name of the "thing" described by the given axis in these
         DataFrames. In practice, this is either "sample" or "feature".

    df_name: str
         The name of the DataFrame represented by df_old and df_new.

    filter_basis_name: str
         The name of the other DataFrame which caused these items to be
         dropped. For example, if we're checking to see if samples were
         dropped from the sample metadata file due to to samples not being
         in the table, df_name could be "sample metadata file" and
         filter_basis_name could be "table".

    References
    ----------

    This function was adapted from Qurro's source code:
    https://github.com/biocore/qurro/blob/b9613534b2125c2e7ee22e79fdff311812f4fefe/qurro/_df_utils.py#L203
    """

    dropped_item_ct = df_old.shape[axis_num] - df_new.shape[axis_num]
    if dropped_item_ct > 0:
        print(
            "{} {}(s) in the {} were not present in the {}.".format(
                dropped_item_ct, item_name, df_name, filter_basis_name
            )
        )
        print(
            "These {}(s) have been removed from the "
            "visualization.".format(item_name)
        )


def match_inputs(tree, table, sample_metadata, feature_metadata=None):
    """Matches various input sources.

    Parameters
    ----------

    tree: empress.tree.Tree
        The tree to be visualized.

    table: pd.DataFrame
        Representation of the feature table (containing features' abundances in
        samples).

    sample_metadata: pd.DataFrame
        Sample metadata. The index should describe sample IDs; the columns
        should describe different sample metadata fields' names.

    feature_metadata: pd.DataFrame or None
        Feature metadata. If this is passed, the index should describe feature
        IDs and the columns should describe different feature metadata fields'
        names.

    Returns
    -------

    (table, sample_metadata): (pd.DataFrame, pd.DataFrame)
        Versions of the input table and sample metadata filtered such that:
            -The table only contains samples also present in the sample
             metadata.
            -The table only contains features also present in the tree.
            -The sample metadata only contains samples also present in the
             table.

    Raises
    ------

    DataMatchingError
        If any of the following conditions are met:
            -No features are shared between the tree and table.
            -No samples are shared between the sample metadata and table.

    References
    ----------

    This function was based on match_table_and_data() in Qurro's code:
    https://github.com/biocore/qurro/blob/b9613534b2125c2e7ee22e79fdff311812f4fefe/qurro/_df_utils.py#L255
    """
    # Match table and tree
    # NOTE: This may be slow for huge trees / tables, could likely be optimized
    tree_node_names = [n.name for n in tree.preorder()]
    tree_and_table_features = set(tree_node_names) & set(table.index)

    if len(tree_and_table_features) == 0:
        raise DataMatchingError(
            "No features are shared between the tree's nodes and the feature "
            "table."
        )

    # Filter table to just features that are also present in the tree
    # Note that we *don't* filter the tree analogously, because we want to draw
    # the whole tree (that being said the Empress UI supports just showing
    # features in the table, anyway)
    ff_table = table.loc[tree_and_table_features]

    # Report to user about any dropped samples from table
    print_if_dropped(
        table,
        ff_table,
        0,
        "feature",
        "table",
        "tree",
    )

    # Match table and sample metadata
    sample_metadata_t = sample_metadata.T
    sf_ff_table, sf_sample_metadata_t = ff_table.align(
        sample_metadata_t, axis="columns", join="inner"
    )
    # At this point, the columns of f_table and f_sample_metadata_t should be
    # filtered to just the shared samples.
    sf_sample_metadata = sf_sample_metadata_t.T

    # Check that at least 1 sample is shared between the s. metadata and table
    if sf_sample_metadata.shape[0] < 1:
        raise DataMatchingError(
            "No samples are shared between the sample metadata file and the "
            "feature table."
        )
    # Report to user about any dropped samples from s. metadata and/or table
    print_if_dropped(
        sample_metadata,
        sf_sample_metadata,
        0,
        "sample",
        "sample metadata file",
        "table",
    )
    print_if_dropped(
        table,
        sf_ff_table,
        1,
        "sample",
        "table",
        "sample metadata file",
    )
    return sf_ff_table, sf_sample_metadata
