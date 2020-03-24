import skbio
from skbio import TreeNode


def name_internal_nodes(tree):
    """ Name internal nodes that don't have a name

     Parameters
     ----------
     tree : skbio.TreeNode or empress.Tree
        Input tree with labeled tips and partially unlabeled internal nodes
        or branch lengths.

    Returns
    -------
    skbio.TreeNode or empress.Tree
        Tree with fully labeled internal nodes and branches.
    """
    # initialize tree with branch lengths and node names if they are missing
    current_unlabled_node = 0
    for n in tree.postorder(include_self=True):
        if n.length is None:
            n.length = 0
        if n.name is None:
            new_name = 'EmpressNode%d' % current_unlabled_node
            n.name = new_name
            current_unlabled_node += 1


def read(file_name, file_format='newick'):
    """ Reads in contents from a file.
    """

    if file_format == 'newick':
        tree = skbio.read(file_name, file_format, into=TreeNode)
        return tree
    return None
