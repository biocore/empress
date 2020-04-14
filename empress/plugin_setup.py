# ----------------------------------------------------------------------------
# Copyright (c) 2016-2019, QIIME 2 development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------


from ._plot import plot

from qiime2.plugin import Plugin, Metadata, Bool, Citations
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
        'feature_metadata': Metadata,
        'ignore_missing_samples': Bool,
        'filter_missing_features': Bool
    },
    input_descriptions={
        'tree': 'The phylogenetic tree to visualize.',
        'feature_table': (
            'A table containing the abundances of features within samples. '
            'This information allows us to decorate the phylogeny by '
            "sample metadata. It's expected that all features in the table "
            'are also present as tips in the tree, and that all samples in '
            'the table are also present in the sample metadata file.'
        )
    },
    parameter_descriptions={
        'sample_metadata': (
            'Sample metadata. Can be used to color tips in the tree by '
            'the samples they are unique to. Samples described in the '
            'metadata that are not present in the feature table will '
            'be automatically filtered out of the visualization.'
        ),
        'feature_metadata': (
            'Feature metadata. Not currently used for anything, but will '
            'be soon.'
        ),
        # Parameter descriptions adapted from q2-emperor's
        # --p-ignore-missing-samples flag.
        'ignore_missing_samples': (
            'This will suppress the error raised when the feature table '
            'contains samples that are not present in the sample metadata. '
            'Samples without metadata are included in the visualization by '
            'setting all of their metadata values to "This sample has no '
            'metadata". Note that this flag will only be applied if at least '
            'one sample is present in both the feature table and the metadata.'
        ),
        'filter_missing_features': (
            'This will suppress the error raised when the feature table '
            'contains features that are not present as tips in the tree. '
            'These features will be removed from the visualization if this '
            'flag is passed. Note that this flag will only be applied if '
            'at least one feature in the table is also present as a tip in '
            'the tree.'
        ),
    },
    name='Visualize and Explore Phylogenies with Empress',
    description=(
        'Generates an interactive phylogenetic tree visualization '
        'supporting interaction with sample and feature metadata.'
    )
)
