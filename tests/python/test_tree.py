# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

import unittest
from bp import parse_newick
from empress.tree import TreeFormatWarning, validate_tree


class TestTree(unittest.TestCase):

    def setUp(self):
        self.nwk = '(((a:1,e:2)f:1,b:2)g:1,(c:1,d:3)h:2)i:1;'
        self.tree = parse_newick(self.nwk)

    def test_validate_tree(self):
        validate_tree(self.tree)

        # check the tree is still equivalent
        obs = self.tree
        exp = parse_newick(self.nwk)

        self.assertEqual(len(obs), len(exp))

        for i in range(1, len(exp) + 1):
            node_o = obs.postorderselect(i)
            node_e = exp.postorderselect(i)

            self.assertEqual(node_o, node_e)
            self.assertEqual(obs.length(node_o), exp.length(node_e))
            self.assertEqual(obs.name(node_o), exp.name(node_e))

    def test_validate_tree_duplicate_tip_names(self):
        t = parse_newick('((i:1,a:3)b:2,i:5)r:2;')
        with self.assertRaisesRegex(
            ValueError, "Tip names in the tree must be unique"
        ):
            validate_tree(t)

    def test_validate_tree_overlapping_tip_and_internal_node_names(self):
        bad_newicks = [
            # Tip overlaps with non-root internal node
            '((a:1,b:3)a:2,d:5)e:2;',
            # Tip overlaps with root node
            '((a:1,b:3)c:2,d:5)a:2;',
            # Tip overlaps with both non-root and root internal nodes
            '((a:1,b:3)a:2,d:5)a:2;'
        ]
        for nwk in bad_newicks:
            t = parse_newick(nwk)
            with self.assertRaisesRegex(
                ValueError,
                "Tip names in the tree cannot overlap with internal node names"
            ):
                validate_tree(t)

    def test_validate_tree_duplicate_internal_node_names(self):
        bad_newicks = [
            # Two non-root internal nodes have same name
            '((a:1,b:3)c:2,(d:2,e:3)c:5)r:2;',
            # Two internal nodes (one of which is the root) have same name
            '((a:1,b:3)c:2,(d:2,e:3)f:5)c:2;'
        ]
        for nwk in bad_newicks:
            t = parse_newick(nwk)
            with self.assertWarnsRegex(
                TreeFormatWarning,
                "Internal node names in the tree are not unique"
            ):
                validate_tree(t)

    def test_nonroot_negative_branchlengths(self):
        newicks = [
            '((b:-1)a:1)root:1;', '((b:100)a:-100)root:0;',
            '(b:1,c:-1)a:2;', '((b:-1)a:0)root;'
        ]
        for nwk in newicks:
            st = parse_newick(nwk)
            with self.assertRaisesRegex(
                ValueError,
                "must have nonnegative lengths"
            ):
                validate_tree(st)

    def test_all_nonroot_branchlengths_zero(self):
        newicks = ['((b:0)a:0)root:0;', '((b:0)a:0)root:1;']
        for nwk in newicks:
            st = parse_newick(nwk)
            with self.assertRaisesRegex(
                ValueError,
                "must have a positive length"
            ):
                validate_tree(st)


if __name__ == "__main__":
    unittest.main()
