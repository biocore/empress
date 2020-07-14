#!/usr/bin/env python
"""
Generate a development plot with data from the moving pictures tutorial

The following command creates a standard tree plot:
    ./make-dev-page.py

The following command creates a tandem plot:
    ./make-dev-page.py --tandem
"""

import pkg_resources
import pandas as pd

from test_integration import load_mp_data

from sys import argv
from bp import parse_newick
from empress.core import Empress
from emperor.util import get_emperor_support_files_dir
from skbio import OrdinationResults
from q2_types.tree import NewickFormat


def main(tandem):
    tree, table, md, fmd, pcoa = load_mp_data()

    with open(str(tree.view(NewickFormat))) as f:
        tree = parse_newick(f.readline())

    table = table.view(pd.DataFrame)
    md = md.to_dataframe()
    fmd = fmd.to_dataframe()

    if tandem:
        pcoa = pcoa.view(OrdinationResults)
    else:
        pcoa = None

    # These two lines fetch the JS files for both apps directly from the
    # installation directory - this makes testing/developing easier
    empress_resources = pkg_resources.resource_filename('empress',
                                                        'support_files')
    emperor_resources = get_emperor_support_files_dir()

    viz = Empress(table=table, tree=tree, ordination=pcoa,
                  feature_metadata=fmd, sample_metadata=md,
                  resource_path=empress_resources,
                  ignore_missing_samples=False,
                  filter_extra_samples=True, filter_missing_features=False,
                  filter_unobserved_features_from_phylogeny=True)

    if tandem:
        viz._emperor.base_url = emperor_resources

    with open('development-page.html', 'w') as f:
        f.write(viz.make_empress())


if __name__ == '__main__':
    tandem = False

    if len(argv) != 1:
        if argv[1] == '--tandem':
            tandem = True
        else:
            raise ValueError('Invalid option %s, only valid option is --tandem'
                             % argv[1])

    main(tandem)
