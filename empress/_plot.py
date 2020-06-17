# ----------------------------------------------------------------------------
# Copyright (c) 2016-2019, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

import os
import pkg_resources

import qiime2
import q2templates
import numpy as np
import pandas as pd

from scipy.spatial.distance import euclidean
from q2_types.tree import NewickFormat
from skbio import OrdinationResults
from bp import parse_newick

from empress.core import Empress

SUPPORT_FILES = pkg_resources.resource_filename('empress', 'support_files')
TEMPLATES = os.path.join(SUPPORT_FILES, 'templates')


def plot(output_dir: str, tree: NewickFormat, feature_table: pd.DataFrame,
         sample_metadata: qiime2.Metadata, pcoa: OrdinationResults = None,
         feature_metadata: qiime2.Metadata = None,
         ignore_missing_samples: bool = False,
         filter_missing_features: bool = False,
         number_of_features: int = 5) -> None:
    # TODO: do not ignore the feature metadata when specified by the user
    if feature_metadata is not None:
        feature_metadata = feature_metadata.to_dataframe()

    if pcoa is not None and pcoa.features is not None:
        # select the top N most important features based on the vector's
        # magnitude (coped from q2-emperor)
        feats = pcoa.features.copy()
        origin = np.zeros_like(feats.columns)
        feats['importance'] = feats.apply(euclidean, axis=1, args=(origin,))
        feats.sort_values('importance', inplace=True, ascending=False)
        feats.drop(['importance'], inplace=True, axis=1)
        pcoa.features = feats[:number_of_features].copy()

    sample_metadata = sample_metadata.to_dataframe()

    # path to the actual newick file
    with open(str(tree)) as file:
        t = parse_newick(file.readline())

    viz = Empress(tree=t, table=feature_table,
                  sample_metadata=sample_metadata,
                  feature_metadata=feature_metadata, ordination=pcoa,
                  ignore_missing_samples=ignore_missing_samples,
                  filter_missing_features=filter_missing_features)

    with open(os.path.join(output_dir, 'empress.html'), 'w') as file:
        file.write(str(viz))

    viz.copy_support_files(output_dir)

    index = os.path.join(TEMPLATES, 'index.html')
    q2templates.render(index, output_dir)
