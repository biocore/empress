from jinja2 import Environment, FileSystemLoader
from bp import parse_newick
import numpy as numpy
import webbrowser
import os
import tools
from tree import Tree

# create/parse tree
tree_file = 'data/tree_p.nwk'
with open(tree_file) as file:
    nwk = file.readline();
t = parse_newick(nwk)
print('read tree')
tree = list(t.B)
print('cacluate coords')
coords = tools.read(tree_file)
coords = Tree.from_tree(coords)
coords.coords(4020, 4020)
coord_array = []
for node in coords.postorder(include_self=True):
    for child in node.children:
        coord_array.append(child.x2)
        coord_array.append(child.y2)
        coord_array.append(0.75)
        coord_array.append(0.75)
        coord_array.append(0.75)
        coord_array.append(node.x2)
        coord_array.append(node.y2)
        coord_array.append(0.75)
        coord_array.append(0.75)
        coord_array.append(0.75)
# create template
loader = FileSystemLoader('support_files/templates')
env = Environment(loader=loader)
temp = env.get_template('empress-template.html')
dev_temp_str = temp.render({
    'base_url' : './support_files',
    'tree' : tree,
    'coords' : coord_array
    })
with open('test_init.html', 'w') as file:
    file.write(dev_temp_str)

webbrowser.open('file://' + os.path.realpath('test_init.html'))
