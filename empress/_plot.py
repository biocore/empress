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


def plot(
    output_dir: str,
    tree: NewickFormat,
    feature_table: pd.DataFrame,
    sample_metadata: qiime2.Metadata,
    feature_metadata: qiime2.Metadata = None,
    ignore_missing_samples: bool = False,
    filter_missing_features: bool = False
) -> None:

    # 1. Convert inputs to the formats we want

    if feature_metadata is not None:
        feature_metadata = feature_metadata.to_dataframe()

    sample_metadata = sample_metadata.to_dataframe()

    # create/parse tree
    tree_file = str(tree)
    # path to the actual newick file
    with open(tree_file) as file:
        t = parse_newick(file.readline())
    empress_tree = Tree.from_tree(to_skbio_treenode(t))

    # 2. Now that we've converted/read/etc. all of the four input sources,
    # ensure that the samples and features they describe "match up" sanely.

    # Note that the feature_table we get from QIIME 2 (as an argument to this
    # function) is set up such that the index describes sample IDs and the
    # columns describe feature IDs. We transpose this table before sending it
    # to tools.match_inputs() and keep using the transposed table for the rest
    # of this visualizer.

    feature_table, sample_md, tip_md, int_md = tools.match_inputs(
        empress_tree, feature_table.T, sample_metadata, feature_metadata,
        ignore_missing_samples, filter_missing_features
    )

    # TODO: Add a check for empty samples/features in the table? Filtering this
    # sorta stuff out would help speed things up (and would be good to report
    # to the user on via warnings).

    # 3. Go forward with creating the Empress visualization!

    # Fill in missing Node names *after* doing input matching, so that we
    # don't get things mixed up (e.g. if the table contains a feature named
    # EmpressNode0, we shouldn't match it up with a re-named node in the tree
    # named EmpressNode0)
    tools.fill_missing_node_names(empress_tree)

    # extract balance parenthesis
    bp_tree = list(t.B)

    # Compute coordinates resulting from layout algorithm(s)
    # TODO: figure out implications of screen size
    layout_to_coordsuffix, default_layout = empress_tree.coords(4020, 4020)

    tree_data = {}
    names_to_keys = {}
    for i, node in enumerate(empress_tree.postorder(include_self=True), 1):
        tree_data[i] = {
            'name': node.name,
            'color': [0.75, 0.75, 0.75],
            'sampVal': 1,
            'visible': True,
            'single_samp': False
        }
        # Add coordinate data from all layouts for this node
        for layoutsuffix in layout_to_coordsuffix.values():
            xcoord = "x" + layoutsuffix
            ycoord = "y" + layoutsuffix
            tree_data[i][xcoord] = getattr(node, xcoord)
            tree_data[i][ycoord] = getattr(node, ycoord)
        # Hack: it isn't mentioned above, but we need start pos info for
        # circular layout
        tree_data[i]["xc0"] = node.xc0
        tree_data[i]["yc0"] = node.yc0
        # Also add vertical bar coordinate info for the rectangular layout,
        # and start point & arc coordinate info for the circular layout
        if not node.is_tip():
            tree_data[i]["highestchildyr"] = node.highest_child_yr
            tree_data[i]["lowestchildyr"] = node.lowest_child_yr
            if not node.is_root():
                tree_data[i]["arcx0"] = node.arcx0
                tree_data[i]["arcy0"] = node.arcy0
                tree_data[i]["arcx1"] = node.arcx1
                tree_data[i]["arcy1"] = node.arcy1
                tree_data[i]["arcstartangle"] = node.highest_child_clangle
                tree_data[i]["arcendangle"] = node.lowest_child_clangle

        if node.name in names_to_keys:
            names_to_keys[node.name].append(i)
        else:
            names_to_keys[node.name] = [i]

    names = []
    for node in empress_tree.preorder(include_self=True):
        names.append(node.name)

    env = Environment(loader=FileSystemLoader(TEMPLATES))
    temp = env.get_template('empress-template.html')

    # Convert sample metadata to a JSON-esque format
    sample_data = sample_md.to_dict(orient='index')

    # TODO: Empress is currently storing all metadata as strings. This is
    # memory intensive and won't scale well. We should convert all numeric
    # data/compress metadata.

    # This is used in biom-table. Currently this is only used to ignore null
    # data (i.e. NaN and "unknown") and also determines sorting order. The
    # original intent is to signal what columns are discrete/continuous.
    # type of sample metadata (n - number, o - object)
    sample_data_type = sample_md.dtypes.to_dict()
    sample_data_type = {k: 'n' if pd.api.types.is_numeric_dtype(v) else 'o'
                        for k, v in sample_data_type.items()}

    # Convert feature metadata, similarly to how we handle sample metadata
    if tip_md is not None or int_md is not None:
        # We can just use tip_md.columns, since both tip_md and int_md (the
        # feature metadata split up by tips and internal nodes) should have
        # identical columns. (TODO: explicitly test that.)
        feature_metadata_columns = list(tip_md.columns)
        tip_md_json = tip_md.to_dict(orient='index')
        int_md_json = int_md.to_dict(orient='index')
    else:
        feature_metadata_columns = []
        tip_md_json = {}
        int_md_json = {}

    # create a mapping of observation ids and the samples that contain them
    obs_data = {}
    feature_table = (feature_table > 0)
    for _, series in feature_table.iteritems():
        sample_ids = series[series].index.tolist()
        obs_data[series.name] = sample_ids

    main_page = temp.render({
        'base_url': './support_files',
        'tree': bp_tree,
        'tree_data': tree_data,
        'names_to_keys': names_to_keys,
        'sample_data': sample_data,
        'sample_data_type': sample_data_type,
        'tip_metadata': tip_md_json,
        'int_metadata': int_md_json,
        'feature_metadata_columns': feature_metadata_columns,
        'obs_data': obs_data,
        'names': names,
        'layout_to_coordsuffix': layout_to_coordsuffix,
        'default_layout': default_layout,
    })

    copytree(SUPPORT_FILES, os.path.join(output_dir, 'support_files'))

    with open(os.path.join(output_dir, 'empress.html'), 'w') as ehtmlfile:
        ehtmlfile.write(main_page)

    index = os.path.join(TEMPLATES, 'index.html')
    q2templates.render(index, output_dir)
