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

        # Convert this to a list of feature indices
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


def compress_metadata(index_ids_to_indices, metadata):
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

