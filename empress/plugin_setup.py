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

PARAMETERS = {'metadata': Metadata}
PARAMETERS_DESC = {
    'metadata': 'The sample metadata.'
}

plugin = Plugin(
    name='empress',
    version=__version__,
    website='http://github.com/biocore/empress',
    package='empress',
    citations=Citations.load('citations.bib', package='empress'),
    description=('This QIIME 2 plugin wraps Empress and '
                 'supports interactive visualization of phylogentic '
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
        'tree': 'The phylogentic tree to visualize.',
        'feature_table': 'The feature table to decorate the phylogeny.'
    },
    parameter_descriptions={
        'sample_metadata': 'The sample metadata',
        'feature_metadata': 'The feature metadata',
    },
    name='Visualize and Explore Phylogenies with Empress',
    description='Generates an interactive phylgentic tree where the user '
                'can visually integrate sample and feature metadata. '
)
