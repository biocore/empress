from jinja2 import Environment, FileSystemLoader
from bp import parse_newick, to_skbio_treenode
import numpy as np
import webbrowser
import os
import tools
from biom.table import Table
from biom.util import biom_open
import pandas as pd
import json
import skbio
from skbio import TreeNode
from statistics import mean
from tree import Tree

# create/parse tree
# tree_file = 'data/97_sites.nwk'
tree_file = 'data/97_otus_no_none.tree'

# create/parse tree
with open(tree_file) as file:
        t = parse_newick(file.readline())
print('read tree')

# extract balance parenthesis
bp_tree = list(t.B)

# calculate tree coordinates
empress_tree = Tree.from_tree(to_skbio_treenode(t))
tools.name_internal_nodes(empress_tree)
print('cacluate coords')
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

# create template
loader = FileSystemLoader('support_files/templates')
env = Environment(loader=loader)
temp = env.get_template('empress-template.html')

# biom table (OLD CODE)
# with biom_open('data/76695_hmp_only_rare1250.biom') as f:
# with biom_open('data/17638_feature-table_merged_age1_7_and_hmp_rare1250.biom') as f:
#     feature_table = Table.from_hdf5(f).to_dataframe().T

# biom table (NEW CODE)
# feature_table = pd.read_csv("data/biom-pd.csv", index_col=0).T
feature_table = pd.read_csv("data/all-biom-pd.csv", index_col=0)

sample_metadata = pd.read_csv('data/metadata.tsv', sep='\t', index_col=0)

# sample metadata
sample_data = sample_metadata \
    .filter(feature_table.index, axis=0) \
    .to_dict(orient='index')

# create a mapping of observation ids and the samples that contain them
obs_data = {}
feature_table = (feature_table > 0).T
for _, series in feature_table.iteritems():
    sample_ids = series[series].index.tolist()
    obs_data[series.name] = sample_ids

# print(sample_data)
dev_temp_str = temp.render({
    'base_url': './support_files',
    'tree': bp_tree,
    'tree_data': tree_data,
    'names_to_keys': names_to_keys,
    'sample_data': sample_data,
    'obs_data': obs_data,
    'names': names,
    })

with open('test_init_large.html', 'w') as file:
    file.write(dev_temp_str)
webbrowser.open('file://' + os.path.realpath('test_init_large.html'))
