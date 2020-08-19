# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

import unittest
from skbio import TreeNode
from empress import Tree
from empress.tree import TreeFormatWarning
from math import sqrt


class TestTree(unittest.TestCase):

    def mock_tree_from_nwk(self):
        return TreeNode.read(['(((a:1,e:2)f:1,b:2)g:1,(c:1,d:3)h:2)i:1;'])

    def setUp(self):
        self.tree = self.mock_tree_from_nwk()

    def test_from_tree(self):
        t = Tree.from_tree(self.tree)
        self.assertEqual(t.__class__, Tree)
        # Check that trees match by iterating over original and Empress trees
        # simultaneously: see https://stackoverflow.com/a/20910242/10730311
        for n1, n2 in zip(t.preorder(), self.tree.preorder()):
            self.assertEqual(n1.name, n2.name)
            self.assertEqual(n1.length, n2.length)

    def test_from_tree_singlenode(self):
        st = TreeNode.read(['i:1;'])
        with self.assertRaisesRegex(
            ValueError, "must contain at least 2 nodes"
        ):
            Tree.from_tree(st)

    def test_from_tree_duplicate_tip_names(self):
        t = TreeNode.read(['((i:1,a:3)b:2,i:5)r:2;'])
        with self.assertRaisesRegex(
            ValueError, "Tip names in the tree must be unique"
        ):
            Tree.from_tree(t)

    def test_from_tree_overlapping_tip_and_internal_node_names(self):
        bad_newicks = [
            # Tip overlaps with non-root internal node
            '((a:1,b:3)a:2,d:5)e:2;',
            # Tip overlaps with root node
            '((a:1,b:3)c:2,d:5)a:2;',
            # Tip overlaps with both non-root and root internal nodes
            '((a:1,b:3)a:2,d:5)a:2;'
        ]
        for nwk in bad_newicks:
            t = TreeNode.read([nwk])
            with self.assertRaisesRegex(
                ValueError,
                "Tip names in the tree cannot overlap with internal node names"
            ):
                Tree.from_tree(t)

    def test_from_tree_duplicate_internal_node_names(self):
        bad_newicks = [
            # Two non-root internal nodes have same name
            '((a:1,b:3)c:2,(d:2,e:3)c:5)r:2;',
            # Two internal nodes (one of which is the root) have same name
            '((a:1,b:3)c:2,(d:2,e:3)f:5)c:2;'
        ]
        for nwk in bad_newicks:
            t = TreeNode.read([nwk])
            with self.assertWarnsRegex(
                TreeFormatWarning,
                "Internal node names in the tree are not unique"
            ):
                Tree.from_tree(t)

    def test_from_tree_node_starts_with_EmpressNode(self):
        t = TreeNode.read(['((a:1,b:3)c:2,EmpressNode1:5)e:2;'])
        with self.assertRaisesRegex(
            ValueError, 'Node names can\'t start with "EmpressNode"'
        ):
            Tree.from_tree(t)

    def test_nonroot_missing_branchlengths(self):
        # Note about the fourth test tree here: the reason this triggers a
        # missing-branch-length error before a negative-branch-length error is
        # because the tree is checked in postorder. This sort of "precedence"
        # can be changed in the future if desired.
        bad_newicks = [
            '((b)a:1)root:1;', '((b:1)a)root:0;', '(b,c)a;',
            '((b)a:-1)root:3;', '((b:0,c)a:0)root:0;'
        ]
        for nwk in bad_newicks:
            st = TreeNode.read([nwk])
            with self.assertRaisesRegex(ValueError, "must have lengths"):
                Tree.from_tree(st)

        # Check that roots *with* missing branch lengths don't trigger an error
        # on tree creation
        ok_newicks = ['((b:0,c:1)a:0)root;']
        for nwk in ok_newicks:
            st = TreeNode.read([nwk])
            Tree.from_tree(st)

    def test_nonroot_negative_branchlengths(self):
        newicks = [
            '((b:-1)a:1)root:1;', '((b:100)a:-100)root:0;',
            '(b:1,c:-1)a:2;', '((b:-1)a:0)root;'
        ]
        for nwk in newicks:
            st = TreeNode.read([nwk])
            with self.assertRaisesRegex(
                ValueError,
                "must have nonnegative lengths"
            ):
                Tree.from_tree(st)

    def test_all_nonroot_branchlengths_0(self):
        newicks = ['((b:0)a:0)root:0;', '((b:0)a:0)root:1;']
        for nwk in newicks:
            st = TreeNode.read([nwk])
            with self.assertRaisesRegex(
                ValueError,
                "must have a positive length"
            ):
                Tree.from_tree(st)


if __name__ == "__main__":
    unittest.main()
