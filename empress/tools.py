import skbio
from skbio import TreeNode

def name_internal_nodes(tree):
    """ Name internal nodes that does not have name

     Parameters
     ----------
     tree : skbio.TreeNode or empress.Tree
         Input tree with labeled tips and partially unlabeled internal nodes or branch lengths.

    Returns
    -------
    skbio.TreeNode or empress.Tree
         Tree with fully labeled internal nodes and branches.
    """
    # initialize tree with branch lengths and node names if they are missing
    l = 0
    for n in tree.postorder(include_self=True):
        if n.length is None:
            n.length = 1
        if n.name is None:
            new_name = 'EmpressNode%d' % l
            n.name = new_name
            l += 1
        # n.name = str(n.name)

def read(file_name, file_format='newick'):
    """ Reads in contents from a file.
    """

    if file_format == 'newick':
        tree = skbio.read(file_name, file_format, into=TreeNode)
        return tree
    return None
