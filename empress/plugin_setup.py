# ----------------------------------------------------------------------------
# Copyright (c) 2016-2019, QIIME 2 development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------


from ._plot import plot

from qiime2.plugin import Plugin, Metadata, Citations
from q2_types.tree import Phylogeny, Rooted
from q2_types.feature_table import FeatureTable, Frequency

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

plugin.visualizers.register_function(
    function=plot,
    inputs={
        'tree': Phylogeny[Rooted],
        'feature_table': FeatureTable[Frequency]
    },
    parameters={
        'sample_metadata': Metadata,
        'feature_metadata': Metadata
    },
    input_descriptions={
        'tree': 'The phylogenetic tree to visualize.',
        'feature_table': (
            'The feature table relating samples to features in the tree. '
            'This information allows us to decorate the phylogeny by '
            'sample metadata.'
        )
    },
    parameter_descriptions={
        'sample_metadata': (
            'Sample metadata. Can be used to color tips in the tree by '
            'the samples they are unique to.'
        ),
        'feature_metadata': (
            'Feature metadata. Not currently used for anything, but will '
            'be soon.'
        )
    },
    name='Visualize and Explore Phylogenies with Empress',
    description=(
        'Generates an interactive phylogenetic tree visualization '
        'supporting interaction with sample and feature metadata.'
    )
)
