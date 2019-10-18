from jinja2 import Environment, FileSystemLoader
from bp import parse_newick
import webbrowser
import os
# create/parse tree
nwk = '((d),(c),(b))a;'
t = parse_newick(nwk)
tree = list(t.B)

# create template
loader = FileSystemLoader('support_files/templates')
env = Environment(loader=loader)
temp = env.get_template('empress-template.html')
dev_temp_str = temp.render({
    'base_url': './support_files',
    'tree': tree
    })
with open('test_init.html', 'w') as file:
    file.write(dev_temp_str)

webbrowser.open('file://' + os.path.realpath('test_init.html'))
