# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

import warnings
from skbio import TreeNode


class TreeFormatWarning(Warning):
    pass


class Tree(TreeNode):
    """
    Attributes
    ----------
    length
    leafcount
    height
    depth

    Notes
    -----
    `length` refers to the branch length of a node to its parent.
    `leafcount` is the number of tips within a subtree. `height` refers
    to the longest path from root to the deepst leaf in that subtree.
    `depth` is the number of nodes found in the longest path.
    """

    def __init__(self, use_lengths=False, **kwargs):
        """ Constructs a Dendrogram object for visualization.

        Parameters
        ----------
        use_lengths: bool
            Specifies if the branch lengths should be included in the
            resulting visualization (default True).

        Returns
        -------

        """
        super().__init__(**kwargs)
        self.childRem = -1

    @classmethod
    def from_tree(cls, tree, use_lengths=True):
        """ Creates an Tree object from a skbio tree.

        Parameters
        ----------
        tree : skbio.TreeNode
            Input skbio tree
        use_lengths: Boolean
            Specify if the branch length should be incorporated into
            the geometry calculations for visualization.
        Returns
        -------
        Tree

        """
        if tree.count() <= 1:
            raise ValueError("Tree must contain at least 2 nodes.")

        # While traversing the tree, record tip / internal node names
        # (Nodes without names are ignored, since we'll assign those later
        # using tools.fill_missing_node_names())
        tip_names = []
        internal_node_names = []
        max_branch_length = 0
        for n in tree.postorder(include_self=False):
            if n.name is not None:
                # NOTE: This should eventually be taken out when
                # fill_missing_node_names() is refactored. However, for now,
                # this makes sure that users can't accidentally break things by
                # naming nodes identical to our default names for missing nodes
                if n.name.startswith("EmpressNode"):
                    raise ValueError(
                        'Node names can\'t start with "EmpressNode".'
                    )
                if n.is_tip():
                    tip_names.append(n.name)
                else:
                    internal_node_names.append(n.name)
            if n.length is None:
                raise ValueError(
                    "Non-root branches of the tree must have lengths."
                )

            if n.length < 0:
                raise ValueError(
                    "Non-root branches of the tree must have nonnegative "
                    "lengths."
                )
            max_branch_length = max(n.length, max_branch_length)

        # We didn't consider the root node in the above traversal since we
        # don't care about its length. However, we do care about its name,
        # so we add the root's name to internal_node_names.
        internal_node_names.append(tree.name)

        if max_branch_length == 0:
            raise ValueError(
                "At least one non-root branch of the tree must have a "
                "positive length."
            )

        unique_tip_name_set = set(tip_names)
        if len(unique_tip_name_set) != len(tip_names):
            raise ValueError("Tip names in the tree must be unique.")

        unique_internal_node_name_set = set(internal_node_names)
        if len(unique_tip_name_set & unique_internal_node_name_set) > 0:
            raise ValueError(
                "Tip names in the tree cannot overlap with internal node "
                "names."
            )

        if len(unique_internal_node_name_set) != len(internal_node_names):
            warnings.warn(
                "Internal node names in the tree are not unique.",
                TreeFormatWarning
            )

        for n in tree.postorder():
            n.__class__ = Tree
            n.tip_count = 0

        return tree


def bp_tree_tips(bp_tree):
    """ Extracts tip names in the tree, ignoring unnamed tips.

    Parameters
    ----------
    bp_tree : bp.BP
        Input BP tree
    Returns
    -------
    tips : list of strings
        list of tip names in the tree
    """
    tips = []
    # Iterate through all open and closing parentheses and extract tip names
    for i in range(bp_tree.B.size):
        pos_name = bp_tree.name(i)
        # Check if this is a leaf node with a label
        if isleaf(bp_tree, i) and (pos_name is not None):
            tips.append(pos_name)
    return tips


def bp_tree_non_tips(bp_tree):
    """ Extracts internal node names in the tree, ignoring unnamed nodes.

       Parameters
       ----------
       bp_tree : bp.BP
           Input BP tree
       Returns
       -------
       non_tips : list of strings
           list of internal node names in the tree
    """
    non_tips = []
    for i in range(bp_tree.B.size):
        pos_name = bp_tree.name(i)
        # Check if this is an opening parenthesis, is not a leaf, and
        # has a node label
        if bp_tree.B[i] and not isleaf(bp_tree, i) and pos_name is not None:
            non_tips.append(pos_name)
    return non_tips


def isleaf(bp_tree, i):
    """ Checks if node at position i belongs to a leaf node or not

        Parameters
       ----------
       bp_tree : bp.BP
           Input BP tree
        i : int
           The query node index
       Returns
       -------
       bool
           True if this is a leaf node, False otherwise
    """
    return bp_tree.B[i] and (not bp_tree.B[i + 1])
