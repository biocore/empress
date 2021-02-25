# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

import qiime2
import biom

from q2_types.tree import NewickFormat
from skbio import OrdinationResults

from empress.core import Empress
from empress._plot_utils import get_bp, save_viz, prepare_pcoa


def community_plot(
    output_dir: str, tree: NewickFormat,
    feature_table: biom.Table,
    sample_metadata: qiime2.Metadata,
    pcoa: OrdinationResults = None,
    feature_metadata: qiime2.Metadata = None,
    ignore_missing_samples: bool = False,
    filter_extra_samples: bool = False,
    filter_missing_features: bool = False,
    number_of_features: int = 5,
    shear_to_table: bool = True
) -> None:
    """Visualizes a tree alongside community-level data.

       The functionality available in this visualization is a superset of the
       functionality in tree_plot() -- including sample metadata coloring /
       barplots, animations, and Emperor integration support.
    """
    if pcoa is not None and pcoa.features is not None:
        pcoa = prepare_pcoa(pcoa, number_of_features)

    sample_metadata = sample_metadata.to_dataframe()

    if feature_metadata is not None:
        feature_metadata = feature_metadata.to_dataframe()

    t = get_bp(tree)
    viz = Empress(tree=t, table=feature_table,
                  sample_metadata=sample_metadata,
                  feature_metadata=feature_metadata, ordination=pcoa,
                  ignore_missing_samples=ignore_missing_samples,
                  filter_extra_samples=filter_extra_samples,
                  filter_missing_features=filter_missing_features,
                  shear_to_table=shear_to_table)
    save_viz(viz, output_dir)


def tree_plot(
    output_dir: str,
    tree: NewickFormat,
    feature_metadata: qiime2.Metadata = None,
    shear_to_feature_metadata: bool = False,
) -> None:
    """Visualizes a tree (optionally with feature metadata)."""

    if feature_metadata is not None:
        feature_metadata = feature_metadata.to_dataframe()

    t = get_bp(tree)
    viz = Empress(tree=t, feature_metadata=feature_metadata,
                  shear_to_feature_metadata=shear_to_feature_metadata)
    save_viz(viz, output_dir)
