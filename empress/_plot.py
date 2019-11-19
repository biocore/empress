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
import q2templates
from q2_types.tree import NewickFormat

from jinja2 import Environment, FileSystemLoader
from bp import parse_newick, to_skbio_treenode
from empress import tools
import pandas as pd
from empress.tree import Tree
from shutil import copytree

SUPPORT_FILES = pkg_resources.resource_filename('empress', 'support_files')
TEMPLATES = os.path.join(SUPPORT_FILES, 'templates')


def plot(output_dir: str,
         tree: NewickFormat,
         feature_table: pd.DataFrame,
         sample_metadata: qiime2.Metadata,
         feature_metadata: qiime2.Metadata = None) -> None:

    # TODO: do not ignore the feature metadata when specified by the user
    if feature_metadata is not None:
        feature_metadata = feature_metadata.to_dataframe()

    # create/parse tree
    tree_file = str(tree)
    # path to the actual newick file
    with open(tree_file) as file:
        t = parse_newick(file.readline())

    # extract balance parenthesis
    bp_tree = list(t.B)

    # calculate tree coordinates
    empress_tree = Tree.from_tree(to_skbio_treenode(t))
    tools.name_internal_nodes(empress_tree)

    # TODO: figure out implications of screen size
    empress_tree.coords(4020, 4020)

    tree_data = {}
    names_to_keys = {}
    for i, node in enumerate(empress_tree.postorder(include_self=True), 1):
        tree_data[i] = {
            'name': node.name,
            'x': node.x2,
            'y': node.y2,
            'color': [0.75, 0.75, 0.75],
            'sampVal': 1,
            'visible': True,
            'single_samp': False}
        if node.name in names_to_keys:
            names_to_keys[node.name].append(i)
        else:
            names_to_keys[node.name] = [i]

    names = []
    for node in empress_tree.preorder(include_self=True):
        names.append(node.name)

    env = Environment(loader=FileSystemLoader(TEMPLATES))
    temp = env.get_template('empress-template.html')

    # sample metadata
    sample_data = sample_metadata \
        .to_dataframe().filter(feature_table.index, axis=0) \
        .to_dict(orient='index')

    # create a mapping of observation ids and the samples that contain them
    obs_data = {}
    feature_table = (feature_table > 0).T
    for _, series in feature_table.iteritems():
        sample_ids = series[series].index.tolist()
        obs_data[series.name] = sample_ids

    main_page = temp.render({
        'base_url': './support_files',
        'tree': bp_tree,
        'tree_data': tree_data,
        'names_to_keys': names_to_keys,
        'sample_data': sample_data,
        'obs_data': obs_data,
        'names': names,
        })

    copytree(SUPPORT_FILES, os.path.join(output_dir, 'support_files'))

    with open(os.path.join(output_dir, 'empress.html'), 'w') as file:
        file.write(main_page)

    index = os.path.join(TEMPLATES, 'index.html')
    q2templates.render(index, output_dir)
