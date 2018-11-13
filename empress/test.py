import skbio
import math
from skbio import TreeNode
#tree = skbio.read("tree.nwk","newick", into=TreeNode)
#nodes = [tree.find("A")]
#ancestor = tree.lowest_common_ancestor(nodes)
#print(ancestor.name)
#print(math.is_close(1.2,1.3, rel_tol=1e-5))
l = [1,2]
l2 = [2]
print(set(l)-set(l2))
