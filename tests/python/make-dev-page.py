#!/usr/bin/env python

import click
import numpy as np
import qiime2 as q2
import pkg_resources

from test_integration import load_mp_data

from bp import parse_newick
from empress.core import Empress
from emperor.util import get_emperor_support_files_dir
from skbio import OrdinationResults
from scipy.spatial.distance import euclidean
from q2_types.tree import NewickFormat
import biom

ARG_TYPE = click.Path(exists=True, dir_okay=False, file_okay=True)


@click.command()
@click.argument('tree', required=False, type=ARG_TYPE)
@click.argument('table', required=False, type=ARG_TYPE)
@click.argument('sample_metadata', required=False, type=ARG_TYPE)
@click.argument('feature_metadata', required=False, type=ARG_TYPE)
@click.argument('ordination', required=False, type=ARG_TYPE)
@click.option('--ignore-missing-samples', is_flag=True)
@click.option('--filter-extra-samples', is_flag=True)
@click.option('--filter-missing-features', is_flag=True)
@click.option('--filter-unobserved-features-from-phylogeny', is_flag=True)
@click.option('--number-of-features', default=10, type=click.IntRange(0, None),
              show_default=True)
def main(tree, table, sample_metadata, feature_metadata, ordination,
         ignore_missing_samples, filter_extra_samples, filter_missing_features,
         filter_unobserved_features_from_phylogeny, number_of_features):
    """Generate a development plot

    If no arguments are provided the moving pictures dataset will be loaded,
    and a tandem plot will be generated. Alternatively, the user can input a
    new dataset.
    """

    # by default load the moving pictures data (tandem plot)
    if tree is None or table is None or sample_metadata is None:
        tree, table, sample_metadata, feature_metadata, ordination = \
                load_mp_data()
        filter_extra_samples = True
    # otherwise require a tree, table and sample meadata
    elif (tree is not None and table is not None
          and sample_metadata is not None):
        tree = q2.Artifact.load(tree)
        table = q2.Artifact.load(table)
        sample_metadata = q2.Metadata.load(sample_metadata)

        if feature_metadata is not None:
            feature_metadata = q2.Artifact.load(
                    feature_metadata).view(q2.Metadata)

        if ordination is not None:
            ordination = q2.Artifact.load(ordination)
    else:
        raise ValueError('Tree, table and sample metadata are required!')

    with open(str(tree.view(NewickFormat))) as f:
        tree = parse_newick(f.readline())

    table = table.view(biom.Table)
    sample_metadata = sample_metadata.to_dataframe()
    feature_metadata = feature_metadata.to_dataframe()

    if ordination is not None:
        ordination = ordination.view(OrdinationResults)

        if ordination.features is not None:
            # select the top N most important features based on the vector's
            # magnitude (coped from q2-emperor)
            feats = ordination.features.copy()
            # in cases where the the axes are all zero there might be all-NA
            # columns
            feats.fillna(0, inplace=True)
            origin = np.zeros_like(feats.columns)
            feats['importance'] = feats.apply(euclidean, axis=1,
                                              args=(origin,))
            feats.sort_values('importance', inplace=True, ascending=False)
            feats.drop(['importance'], inplace=True, axis=1)
            ordination.features = feats[:number_of_features].copy()

    # These two lines fetch the JS files for both apps directly from the
    # installation directory - this makes testing/developing easier
    empress_resources = pkg_resources.resource_filename('empress',
                                                        'support_files')
    emperor_resources = get_emperor_support_files_dir()

    # this variable is too long for PEP8
    unobserved = filter_unobserved_features_from_phylogeny
    viz = Empress(table=table, tree=tree, ordination=ordination,
                  feature_metadata=feature_metadata,
                  sample_metadata=sample_metadata,
                  resource_path=empress_resources,
                  ignore_missing_samples=ignore_missing_samples,
                  filter_extra_samples=filter_extra_samples,
                  filter_missing_features=filter_missing_features,
                  filter_unobserved_features_from_phylogeny=unobserved)

    if ordination is not None:
        viz._emperor.base_url = emperor_resources

    with open('development-page.html', 'w') as f:
        f.write(viz.make_empress())


if __name__ == '__main__':
    main()
