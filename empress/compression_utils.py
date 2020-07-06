def compress_table(table):
    """Converts a feature table to a space-saving format for use in HTML.

    Parameters
    ----------
    table: pd.DataFrame
        Representation of a feature table. The index should describe feature
        IDs; the columns should describe sample IDs.

    Returns
    -------
    (s_ids, f_ids, f_ids_to_indices, s_ids_to_indices, compressed_table)
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
            The inner list at position i contains the indices of the
            features present (i.e. at any abundance > 0) within the
            sample with index i.

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

    # We set up the feature ID/index variables in advance of going through the
    # samples in the table.
    feature_ids = list(binarized_table.index)
    f_ids_to_indices = {fid: idx for idx, fid in enumerate(feature_ids)}

    # We'll populate the sample ID/index variables as we go through the table's
    # samples. We *could* do this up front, analogously to how we set up the
    # feature variables, but we don't -- this is a safety net in case the order
    # of samples visited in binarized_table.apply() would not match up with
    # the order of binarized_table.columns (I don't *think* that should be the
    # case, but I don't see any explicit specification of this on pandas'
    # documentation -- so better to be safe IMO.)
    sample_ids = []
    s_ids_to_indices = {}

    compressed_table = []
    sidx = 0

    def save_present_features(sample_column):
        nonlocal sidx
        # Get a list of all feature IDs present in this sample
        # (This works because we've binarized the table, i.e. its entries are
        # booleans)
        present_feature_ids = list(sample_column[sample_column].index)

        # Convert this to a list of feature indices. This list should be sorted
        # so that feature indices are in ascending order by default, since
        # we assigned feature indices by iterating through the table. (TODO:
        # test this.)
        present_feature_indices = [
            f_ids_to_indices[fid] for fid in present_feature_ids
        ]

        # Add this feature presence information to compressed_table.
        compressed_table.append(present_feature_indices)
        # And update sample_ids and s_ids_to_indices accordingly.
        sample_ids.append(sample_column.name)
        s_ids_to_indices[sample_column.name] = sidx
        sidx += 1

        # We don't return anything -- this function's only purpose is to cause
        # side effects within the scope of compress_table(). This is... kind
        # of a cursed way of using df.apply() but it works, and it should be
        # decently efficient since .apply() is faster than most iteration \._./

    binarized_table.apply(save_present_features, axis="index")

    return (
        sample_ids, feature_ids, f_ids_to_indices, s_ids_to_indices,
        compressed_table
    )


def compress_sample_metadata(sample_ids_to_indices, metadata):
    # We could ostensibly go further by
    # identifying repeated metadata values and mapping *those* to integer IDs,
    # but that may be 1) overkill and 2) not worth it until we get to really
    # big datasets (and/or datasets with lots of repeated values).

    sample_ids = sample_ids_to_indices.keys()
    num_shared_samples = len(metadata.index.intersection(sample_ids))
    if num_shared_samples < len(sample_ids):
        # Sanity check: metadata's samples should be a superset of the samples
        # in sample_ids_to_indices (empty samples were removed from the
        # latter during table compression). If the metadata's samples are
        # instead *missing* samples that are in sample_ids_to_indices,
        # something is seriously wrong.
        raise ValueError("Metadata is missing sample IDs.")

    # Produce a dict mapping sample indices to a list of the corresponding
    # sample's metadata values -- e.g. {1: ["gut", "413", "asdf"],
    #                                   0: ["tongue", "612", "ghjk"], ...}.
    # (Note that the indices are not necessarily processed in any particular
    # order, since we're just following the sample metadata's order.)
    indices_to_metadata_vals = {}

    def save_metadata(row):
        sid = row.name
        # Skip samples that are in the metadata but not in
        # sample_ids_to_indices: these correspond to empty samples
        if sid in sample_ids_to_indices:
            # Convert the metadata values to strings
            str_vals = [str(v) for v in row]
            indices_to_metadata_vals[sample_ids_to_indices[sid]] = str_vals

    metadata.apply(save_metadata, axis="columns")

    # Although the dict we just produced is compressed, we can go further
    # without much extra effort. We implicitly sort the indices in ascending
    # and then smoosh the dict into a list which can be accessed the exact
    # same way (since [0] will now refer to the first element, [1] to the
    # second, etc.)
    metadata_vals = []
    for i in range(len(sample_ids)):
        metadata_vals.append(indices_to_metadata_vals[i])

    return list(metadata.columns), metadata_vals


def compress_feature_metadata(tip_metadata, int_metadata):
    # If the user didn't pass in any feature metadata, we'll get to this block
    if tip_metadata is None or int_metadata is None:
        return [], {}, {}

    # Verify that columns match up btwn. tip and internal node metadata
    if not tip_metadata.columns.equals(int_metadata.columns):
        raise ValueError("Tip & int. node feature metadata columns differ.")

    # Verify that at least one feature metadata entry exists (since at this
    # point we know that there should be at least *some* feature metadata)
    if tip_metadata.empty and int_metadata.empty:
        raise ValueError("Both tip & int. node feature metadata are empty.")

    fm_cols = list(tip_metadata.columns)
    # We want dicts mapping each feature ID to a list of the f.m. values for
    # this feature ID. Since we're not mapping feature IDs to indices first,
    # this is pretty simple to do with DataFrame.to_dict() using the
    # orient="list" option -- however, orient="list" uses column-major order,
    # so we transpose the metadata DFs before calling to_dict() in order to
    # make sure our dicts are in row-major order (i.e. feature IDs are keys).
    compressed_tm = tip_metadata.T.to_dict(orient="list")
    compressed_im = int_metadata.T.to_dict(orient="list")

    return fm_cols, compressed_tm, compressed_im
