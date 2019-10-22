# ----------------------------------------------------------------------------
# Copyright (c) 2016-2019, QIIME 2 development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

import os
import pkg_resources

import qiime2
import skbio
import q2templates
import numpy as np
from q2_types.tree import NewickFormat
from biom import Table

TEMPLATES = pkg_resources.resource_filename('empress', 'support_files',
                                            'templates')


def plot(output_dir: str,
         tree: NewickFormat,
         feature_table: Table,
         sample_metadata: qiime2.Metadata,
         feature_metadata: qiime2.Metadata = None) -> None:
    mf = metadata.to_dataframe()
    if feature_metadata is not None:
        feature_metadata = feature_metadata.to_dataframe()

    #line of code generates empress ui
    # lines of code to copy empress support files into output_dir

    # with open(os.path.join(output_dir, 'empress.html'), 'w') as fh:
    #     fh.write(html)

    index = os.path.join(TEMPLATES, 'index.html')
    q2templates.render(index, output_dir)
