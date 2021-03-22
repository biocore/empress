# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------


import os
import pkg_resources

from bp import parse_newick
import numpy as np
import pandas as pd
from scipy.spatial.distance import euclidean

SUPPORT_FILES = pkg_resources.resource_filename('empress', 'support_files')
TEMPLATES = os.path.join(SUPPORT_FILES, 'templates')


def get_bp(newickfmt):
    """Loads a bp.BP tree from a QIIME 2 NewickFormat object.

    This function, along with save_viz(), was moved here from _plot.py so it
    could be reused between different Empress commands.

    Parameters
    ----------
    newickfmt : q2_types.tree.NewickFormat

    Returns
    -------
    bp.BP
    """
    with open(str(newickfmt)) as treefile:
        # The file will still be closed even though we return from within the
        # with block: see https://stackoverflow.com/a/9885287/10730311.
        return parse_newick(treefile.readline())


def save_viz(viz, output_dir, q2=True):
    """Saves an Empress visualization to a filepath.

    Parameters
    ----------
    viz : empress.Empress
    output_dir : str
    q2 : bool
    """
    with open(os.path.join(output_dir, 'empress.html'), 'w') as htmlfile:
        htmlfile.write(str(viz))

    viz.copy_support_files(output_dir)

    if q2:
        import q2templates
        index = os.path.join(TEMPLATES, 'index.html')
        q2templates.render(index, output_dir)


def prepare_pcoa(pcoa, number_of_features):
    """Selects top N biplot features by magnitude (coped from q2-emperor).

    Parameters
    ----------
    pcoa : skbio.stats.ordination.OrdinationResults
    number_of_features : int

    Returns
    -------
    skbio.stats.ordination.OrdinationResults
    """
    feats = pcoa.features.copy()
    # in cases where the axes are all zero there might be all-NA
    # columns
    feats.fillna(0, inplace=True)
    origin = np.zeros_like(feats.columns)
    feats['importance'] = feats.apply(euclidean, axis=1, args=(origin,))
    feats.sort_values('importance', inplace=True, ascending=False)
    feats.drop(['importance'], inplace=True, axis=1)
    pcoa.features = feats[:number_of_features].copy()
    return pcoa


def check_and_process_files(output_dir, tree_file, feature_metadata):
    """Initial checks and processing of files for standalone CLI plotting.

    Parameters
    ----------
    output_dir : str
    tree_file : str
    fm_file : str

    Returns
    -------
    bp.Tree
    pd.DataFrame
    """
    if os.path.isdir(output_dir):
        raise OSError("Output directory already exists!")
    with open(str(tree_file), "r") as f:
        tree_newick = parse_newick(f.readline())
    if feature_metadata is not None:
        feature_metadata = pd.read_csv(feature_metadata, sep="\t", index_col=0)

    return tree_newick, feature_metadata
