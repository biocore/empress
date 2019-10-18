# ----------------------------------------------------------------------------
# Copyright (c) 2016-2019, QIIME 2 development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

import pkg_resources

import qiime2
import skbio
import q2templates
import numpy as np
from q2_types.tree import NewickFormat
from biom import Table

# TEMPLATES = pkg_resources.resource_filename('q2_empress', 'assets')


def plot(output_dir: str,
         tree: NewickFormat,
         feature_table: Table,
         sample_metadata: qiime2.Metadata,
         feature_metadata: qiime2.Metadata = None) -> None:
    mf = metadata.to_dataframe()
    if feature_metadata is not None:
        feature_metadata = feature_metadata.to_dataframe()

    # if other_pcoa is None:
    #     procrustes = None
    # else:
    #     procrustes = [other_pcoa]

    # if custom_axes is not None:
    #     viz.custom_axes = custom_axes

    # if other_pcoa:
    #     viz.procrustes_names = ['reference', 'other']

    # viz.settings = settings

    # html = viz.make_empress(standalone=True)
    # viz.copy_support_files(output_dir)
    # with open(os.path.join(output_dir, 'empress.html'), 'w') as fh:
    #     fh.write(html)

    # index = os.path.join(TEMPLATES, 'index.html')
    # q2templates.render(index, output_dir, context={'plot_name': plot_name})
