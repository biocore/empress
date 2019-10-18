from jinja2 import Environment, FileSystemLoader
from bp import parse_newick
import webbrowser
import os
import tools
from biom.table import Table
from biom.util import biom_open
import pandas as pd
from tree import Tree

# create/parse tree
tree_file = 'data/97_sites.nwk'
# tree_file = 'data/97_otus_no_none.tree'
with open(tree_file) as file:
    nwk = file.readline()
t = parse_newick(nwk)
print('read tree')
tree = list(t.B)
empress_tree = tools.read(tree_file)
empress_tree = Tree.from_tree(empress_tree)
tools.name_internal_nodes(empress_tree)
print('cacluate coords')
empress_tree.coords(4020, 4020)
tree_data = {}
pre_to_name = {}
for i, node in enumerate(empress_tree.preorder(include_self=True)):
    tree_data[i+1] = {
        'name': node.name,
        'x': node.x2,
        'y': node.y2,
        'color': [0.75, 0.75, 0.75],
        'sampVal': 1,
        'visible': True,
        'single_samp': False}
    pre_to_name[node.name] = i
names = []
for i, node in enumerate(empress_tree.preorder(include_self=True)):
    names.append(i+1)

# create template
loader = FileSystemLoader('support_files/templates')
env = Environment(loader=loader)
temp = env.get_template('empress-template.html')

# biom table
with biom_open('data/76695_hmp_only_rare1250.biom') as f:
    table = Table.from_hdf5(f)

data = pd.read_csv('data/17638_metadata_merged_age1_7_and_hmp.txt', sep='\t')
data = data[['#SampleID', 'env_package', 'age', 'host_age']]
sampMeta = data.values.tolist()
sampMeta = {samp[0]: {'env_package': samp[1], 'host_age': samp[3]}
            for samp in sampMeta if table.exists(samp[0])}

sampleIDs = [id for id in sampMeta.keys()]
obsID = table.ids(axis='observation')

obsMeta = {id: table.data(id, axis='sample') for id in sampleIDs}
for sample in obsMeta.keys():
    obsMeta[sample] = [obsID[i] for i, val in enumerate(obsMeta[sample])
                       if val > 0]


dev_temp_str = temp.render({
    'base_url': './support_files',
    'tree': tree,
    'tree_data': tree_data,
    'sample_data': sampMeta,
    'obs_data': obsMeta,
    'names': names,
    'p_to_n': pre_to_name
    })
with open('test_init.html', 'w') as file:
    file.write(dev_temp_str)
webbrowser.open('file://' + os.path.realpath('test_init.html'))
