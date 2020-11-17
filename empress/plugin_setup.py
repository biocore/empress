# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

from ._plot import community_plot, tree_plot
from . import _parameter_descriptions as desc

from qiime2.plugin import (
    Plugin, Metadata, Bool, Citations, Int, Range, TypeMatch
)
from q2_types.tree import Phylogeny, Rooted
from q2_types.feature_table import (
    FeatureTable, Frequency, RelativeFrequency, PresenceAbsence
)
from q2_types.ordination import PCoAResults

import pkg_resources
__version__ = pkg_resources.get_distribution('empress').version  # noqa

plugin = Plugin(
    name='empress',
    version=__version__,
    website='http://github.com/biocore/empress',
    package='empress',
    citations=Citations.load('citations.bib', package='empress'),
    description=('This QIIME 2 plugin wraps Empress and '
                 'supports interactive visualization of phylogenetic '
                 'trees.'),
    short_description='Plugin for visualizing phylogenies with Empress.'
)

# Accept various types of feature tables -- we (currently) convert things to
# presence/absence, anyway. This line adapted from
# https://github.com/qiime2/q2-feature-table/blob/9ed6160adad45445ec054e5ce034a3b3ba25a9b4/q2_feature_table/plugin_setup.py#L243.
AcceptedTableTypes = TypeMatch([Frequency, RelativeFrequency, PresenceAbsence])

plugin.visualizers.register_function(
    function=community_plot,
    inputs={
        'tree': Phylogeny[Rooted],
        'feature_table': FeatureTable[AcceptedTableTypes],
        'pcoa': PCoAResults,
    },
    parameters={
        'sample_metadata': Metadata,
        'feature_metadata': Metadata,
        'ignore_missing_samples': Bool,
        'filter_extra_samples': Bool,
        'filter_missing_features': Bool,
        'number_of_features': Int % Range(1, None),
        'shear_to_table': Bool
    },
    input_descriptions={
        'tree': desc.TREE_DESC,
        'feature_table': desc.TBL,
        'pcoa': desc.PCOA
    },
    parameter_descriptions={
        'sample_metadata': desc.SM_DESC,
        'feature_metadata': desc.FM_DESC,
        'ignore_missing_samples': desc.IGNORE_MISS_SAMP,
        'filter_extra_samples': desc.FILT_EX_SAMP,
        'filter_missing_features': desc.FILT_MISS_FEAT,
        'number_of_features': desc.NUM_FEAT,
        'shear_to_table': desc.SHEAR_TO_TBL
    },
    name=(
        'Visualize phylogenies and community data with Empress (and, '
        'optionally, Emperor)'
    ),
    description=desc.COMM_PLOT_DESC
)

plugin.visualizers.register_function(
    function=tree_plot,
    inputs={
        'tree': Phylogeny[Rooted]
    },
    parameters={
        'feature_metadata': Metadata,
        'shear_to_feature_metadata': Bool
    },
    input_descriptions={
        'tree': desc.TREE_DESC
    },
    parameter_descriptions={
        'feature_metadata': desc.FM_DESC,
        'shear_to_feature_metadata': desc.SHEAR_TO_FM,
    },
    name='Visualize phylogenies with Empress',
    description=desc.TREE_PLOT_DESC
)
