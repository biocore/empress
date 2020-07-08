# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------


def compress_table(table):
    """Converts a feature table to a space-saving format.

    Also removes empty samples and features, while we're at it.

    Parameters
    ----------
    table: pd.DataFrame
        Representation of a feature table. The index should describe feature
        IDs; the columns should describe sample IDs.

    Returns
    -------
    (s_ids, f_ids, s_ids_to_indices, f_ids_to_indices, compressed_table)
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
        compressed_table: list
            Two-dimensional list. The "outer list" is of length len(s_ids).
            Each position i within this outer list holds an "inner list" of
            arbitrary (but within the range [1, len(f_ids)]) length.
            The i-th inner list contains the feature indices of the
            features present (i.e. at any abundance > 0) within the
            sample with index i. Each inner list is sorted in ascending order.

    Raises
    ------
    ValueError
        - If the input table is completely empty (i.e. all zeroes).

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

    # We set up the ID/index variables based on whatever the current order of
    # samples / features in the table's columns / indices is.
    feature_ids = list(binarized_table.index)
    f_ids_to_indices = {fid: idx for idx, fid in enumerate(feature_ids)}

    sample_ids = list(binarized_table.columns)
    s_ids_to_indices = {sid: idx for idx, sid in enumerate(sample_ids)}

    indexed_b_table = binarized_table.rename(
        index=f_ids_to_indices, columns=s_ids_to_indices
    )

    compressed_table = []

    def populate_compressed_table(sample_column):
        # Get a list of all feature indices present in this sample
        # (This works because we've binarized the table, i.e. its entries are
        # booleans; and because we replaced feature IDs with feature indices.)
        present_feature_indices = list(sample_column[sample_column].index)

        # Add this feature presence information to compressed_table.
        compressed_table.append(present_feature_indices)

        # We don't return anything -- this function's only purpose is to cause
        # side effects within the scope of compress_table(). This is... kind
        # of a cursed way of using df.apply() but it works, and it should be
        # decently efficient since .apply() is faster than most iteration \._./

    indexed_b_table.apply(populate_compressed_table, axis="index")

    return (
        sample_ids, feature_ids, s_ids_to_indices, f_ids_to_indices,
        compressed_table
    )


def compress_sample_metadata(s_ids_to_indices, metadata):
    """Converts a sample metadata DataFrame to a space-saving format.

    We could ostensibly save more space by identifying repeated metadata
    values and mapping *those* to integer IDs. (For example, a lot of Qiita
    studies' sample metadata files have lots of frequently repeated values like
    "host_subject_id", the various empo_* fields, etc.) However, that may be
    1) overkill and 2) not worth it until we get to really big datasets
    (and/or datasets with lots of repeated values).

    Parameters
    ----------
    s_ids_to_indices: dict
        Maps sample IDs (strings) to 0-based indices in an existing list of
        sample IDs. In practice, this should just be the "s_ids_to_indices"
        output from compress_table().
    metadata: pd.DataFrame
        Sample metadata. The index should describe sample IDs, and the columns
        should describe sample metadata fields (e.g. "body site").
        It's ok if there are sample IDs in this DataFrame that are not present
        as keys in s_ids_to_indices (this will be the case for samples that
        were removed from the feature table for being empty); however, if there
        are sample IDs in s_ids_to_indices that are not present in the
        metadata, an error will be raised.

    Returns
    -------
    (metadata_columns, metadata_vals)
        metadata_columns: list
            List of the sample metadata column names, all converted to strings.
        metadata_vals: list
            Two-dimensional list. The "outer list" is of length
            len(s_ids_to_indices.keys()). Each position i within this outer
            list holds an "inner list" of length len(metadata_columns).
            The c-th value of the i-th inner list contains the c-th
            sample metadata column (in metadata_columns)'s value for the
            sample with index i, converted to a string.

    Raises
    ------
    ValueError
        - If the metadata is missing sample IDs that are present as keys in
          s_ids_to_indices.
        - If the values of s_ids_to_indices are invalid: that is, if sorting
          the values in ascending order does not produce a list of
          [0, 1, 2, 3, ..., len(s_ids_to_indices.keys())].

    References
    ----------
        - Inspired by redbiom and Qurro's JSON data models.
    """
    sample_ids = s_ids_to_indices.keys()
    num_shared_samples = len(metadata.index.intersection(sample_ids))
    if num_shared_samples < len(sample_ids):
        # Sanity check: metadata's samples should be a superset of the samples
        # in s_ids_to_indices (empty samples were removed from the
        # latter during table compression). If the metadata's samples are
        # instead *missing* samples that are in s_ids_to_indices,
        # something is seriously wrong.
        raise ValueError(
            "Metadata is missing sample IDs in s_ids_to_indices."
        )

    if sorted(s_ids_to_indices.values()) != list(range(len(sample_ids))):
        raise ValueError("Indices (values) of s_ids_to_indices are invalid.")

    # Filter sample IDs in metadata but not in sample_ids out
    filtered_metadata = metadata.loc[sample_ids]

    # Rename sample IDs to indices in the metadata
    indexed_f_metadata = filtered_metadata.rename(index=s_ids_to_indices)

    # Sort the metadata's rows by the sample indices
    sorted_i_f_metadata = indexed_f_metadata.sort_index(
        axis="index", ascending=True
    )

    # Convert all of the metadata values to strings
    str_s_i_f_metadata = sorted_i_f_metadata.astype(str)

    # Generate a 2-D list of metadata values
    # Based on https://datatofish.com/convert-pandas-dataframe-to-list
    sm_vals = str_s_i_f_metadata.values.tolist()

    sm_cols = [str(c) for c in str_s_i_f_metadata.columns]

    return sm_cols, sm_vals


def compress_feature_metadata(tip_metadata, int_metadata):
    """Converts tip/internal node metadata DataFrames to dicts to save space.

    This is a pretty early optimization -- ideally we would use 2-D lists as
    our final metadata structure, similar to the table / sample metadata
    compression. This should be revisited when the tree data node-name
    revamping has been merged in.

    Parameters
    ----------
    tip_metadata: pd.DataFrame or None
        Metadata for tip nodes. If not None, the index should describe node
        names, and the columns should describe feature metadata fields.
    int_metadata: pd.DataFrame or None
        Metadata for internal nodes. If not None, the index should describe
        node names, and the columns should describe feature metadata fields.

    Note that the columns of tip_metadata and int_metadata should be identical,
    even if the feature metadata only describes tip or internal nodes. (In that
    case, then the other feature metadata parameter should still be a DataFrame
    -- albeit an empty one, with no feature names in its index.) The only case
    in which the parameters should be None is if there was no feature metadata
    at all.

    Returns
    -------
    (metadata_columns, compressed_tip_metadata, compressed_int_metadata)
        metadata_columns: list
            List of the feature metadata column names, all converted to
            strings. If both input DFs are None, this will be {}.
        compressed_tip_metadata: dict
            Maps node names in tip_metadata to a list of feature metadata
            values, in the same order as in metadata_columns and converted to
            strings. If tip_metadata was empty, or if both input DFs were None,
            this will be {}.
        compressed_int_metadata: dict
            Maps node names in int_metadata to a list of feature metadata
            values, in the same order as in metadata_columns and converted to
            strings. If int_metadata was empty, or if both input DFs were None,
            this will be {}.

    Raises
    ------
    ValueError
        - If only one of tip_metadata and int_metadata is None.
        - If the columns of tip_metadata are not identical to the columns of
          int_metadata.
        - If both the tip and internal node metadata DataFrames are empty.

    References
    ----------
        - Inspired by redbiom and Qurro's JSON data models.
    """
    # If the user didn't pass in any feature metadata, we'll get to this block
    if tip_metadata is None and int_metadata is None:
        return [], {}, {}

    # *This* should never happen. If it did, it's a sign that this function is
    # being misused. (The ^ is a logical XOR; see
    # https://stackoverflow.com/a/432844/10730311.)
    if (tip_metadata is None) ^ (int_metadata is None):
        raise ValueError(
            "Only one of tip & int. node feature metadata is None."
        )

    # Verify that columns match up btwn. tip and internal node metadata
    if not tip_metadata.columns.equals(int_metadata.columns):
        raise ValueError("Tip & int. node feature metadata columns differ.")

    # Verify that at least one feature metadata entry exists (since at this
    # point we know that there should be at least *some* feature metadata)
    if tip_metadata.empty and int_metadata.empty:
        raise ValueError("Both tip & int. node feature metadata are empty.")

    fm_cols = [str(c) for c in tip_metadata.columns]
    # We want dicts mapping each feature ID to a list of the f.m. values for
    # this feature ID. Since we're not mapping feature IDs to indices first,
    # this is pretty simple to do with DataFrame.to_dict() using the
    # orient="list" option -- however, orient="list" uses column-major order,
    # so we transpose the metadata DFs before calling to_dict() in order to
    # make sure our dicts are in row-major order (i.e. feature IDs are keys).
    #
    # (Also, while we're at it, we make sure that both DFs' values are all
    # converted to strings.)
    compressed_tm = tip_metadata.astype(str).T.to_dict(orient="list")
    compressed_im = int_metadata.astype(str).T.to_dict(orient="list")

    return fm_cols, compressed_tm, compressed_im
