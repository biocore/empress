import skbio
from skbio import TreeNode
tree = skbio.read("tree.nwk","newick", into=TreeNode)
nodes = [tree.find("A")]
ancestor = tree.lowest_common_ancestor(nodes)
print(ancestor.name)
