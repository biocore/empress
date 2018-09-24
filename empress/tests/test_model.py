# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import unittest
import pandas as pd
from pandas.util.testing import assert_frame_equal
from empress.model import Model
from empress.tree import DEFAULT_COLOR
from skbio import TreeNode


class TestModel(unittest.TestCase):

    def setUp(self):
        self.RT_X = 750
        self.RT_Y = 450

        self.tree_obj = TreeNode.read(['((a, b)le1, (c,d)ri1)r;\n'])

        self.internal_md = pd.DataFrame(
            {
             'clade': ['left', 'right'],
             'time': [11, 12]
            },
            index=pd.Index(['le1', 'ri1'], name='Node_id')
        )

        self.leaf_md = pd.DataFrame(
            {
             'species': ['a1', 'b1', 'c1', 'd1'],
             'gram-positive': [True, False, True, False]
            },
            index=pd.Index(['a', 'b', 'c', 'd'], name='Node_id')
        )
        self.md = pd.merge(self.internal_md, self.leaf_md,
                           how='outer', on='Node_id')
        self.tree = Model(self.tree_obj, self.md, 'clade')

    def test_center(self):
        center_exp = pd.DataFrame({
            0: [(-534), (self.RT_Y - self.RT_Y), (-912), (-377)],
            1: [(-534), (self.RT_Y - self.RT_Y), (-912), (377)],
            2: [(534), (self.RT_Y - self.RT_Y), (912), (377)],
            3: [(534), (self.RT_Y - self.RT_Y), (912), (-377)],
            4: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (-534), (self.RT_Y - self.RT_Y)],
            5: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (534), (self.RT_Y - self.RT_Y)]},
            index=['px', 'py', 'x', 'y']).T
        self.tree.center_tree()
        center_res = self.tree.edge_metadata[['px', 'py', 'x', 'y']].copy()

        # convert to integer to remove precision error
        center_exp[['px', 'py', 'x', 'y']] = center_exp[[
            'px', 'py', 'x', 'y']].astype(int)
        center_res[['px', 'py', 'x', 'y']] = center_res[[
            'px', 'py', 'x', 'y']].astype(int)
        assert_frame_equal(center_exp, center_res)

    def test_select_category(self):
        self.tree.center_tree()
        self.tree.edge_metadata['node_is_visible'] = [
            True, True, False, False, True, True]
        select_exp = pd.DataFrame({
            0: [(-534), (self.RT_Y - self.RT_Y), (-912), (-377)],
            1: [(-534), (self.RT_Y - self.RT_Y), (-912), (377)],
            4: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (-534), (self.RT_Y - self.RT_Y)],
            5: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (534), (self.RT_Y - self.RT_Y)]},
            index=['px', 'py', 'x', 'y']).T
        select_res = self.tree.select_category(
            ['px', 'py', 'x', 'y'], 'node_is_visible')
        select_exp = select_exp[['px', 'py', 'x', 'y']].astype(int)
        select_res = select_res[['px', 'py', 'x', 'y']].astype(int)
        assert_frame_equal(select_exp, select_res)

    def test_select_edge_category(self):
        self.tree.center_tree()
        select_exp = pd.DataFrame(
            {
                0: [(-534), (self.RT_Y - self.RT_Y), (-912), (-377),
                    DEFAULT_COLOR],
                1: [(-534), (self.RT_Y - self.RT_Y), (-912), (377),
                    DEFAULT_COLOR],
                2: [(534), (self.RT_Y - self.RT_Y), (912), (377),
                    DEFAULT_COLOR],
                3: [(534), (self.RT_Y - self.RT_Y), (912), (-377),
                    DEFAULT_COLOR],
                4: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (-534), (self.RT_Y - self.RT_Y),
                    DEFAULT_COLOR],
                5: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (534), (self.RT_Y - self.RT_Y),
                    DEFAULT_COLOR]
            },
            index=['px', 'py', 'x', 'y', 'branch_color']).T
        select_res = self.tree.select_edge_category()
        select_exp = select_exp[['px', 'py', 'x', 'y', 'branch_color']]
        select_res = select_res[['px', 'py', 'x', 'y', 'branch_color']]
        select_exp[['px', 'py', 'x', 'y']] = select_exp[[
            'px', 'py', 'x', 'y']].astype(int)
        select_res[['px', 'py', 'x', 'y']] = select_res[[
            'px', 'py', 'x', 'y']].astype(int)
        assert_frame_equal(select_exp, select_res)

    def test_select_node_category(self):
        self.tree.center_tree()
        select_exp = pd.DataFrame(
            {
                0: [(-912), (-377), DEFAULT_COLOR, 1],
                1: [(-912), (377), DEFAULT_COLOR, 1],
                2: [(912), (377), DEFAULT_COLOR, 1],
                3: [(912), (-377), DEFAULT_COLOR, 1],
                4: [(-534), (self.RT_Y - self.RT_Y), DEFAULT_COLOR, 1],
                5: [(534), (self.RT_Y - self.RT_Y), DEFAULT_COLOR, 1]
            },
            index=['x', 'y', 'node_color', 'size']).T
        select_res = self.tree.select_node_category()
        select_exp = select_exp[['x', 'y', 'node_color', 'size']]
        select_res = select_res[['x', 'y', 'node_color', 'size']]
        select_exp[['x', 'y', 'size']] = select_exp[[
            'x', 'y', 'size']].astype(int)
        select_res[['x', 'y', 'size']] = select_res[[
            'x', 'y', 'size']].astype(int)
        assert_frame_equal(select_exp, select_res)

    def test_update_edge_category(self):
        self.tree.center_tree()
        update_equal_exp = pd.DataFrame(
            {
                0: [(-534), (self.RT_Y - self.RT_Y), (-912), (-377),
                    DEFAULT_COLOR],
                1: [(-534), (self.RT_Y - self.RT_Y), (-912), (377),
                    DEFAULT_COLOR],
                2: [(534), (self.RT_Y - self.RT_Y), (912), (377),
                    DEFAULT_COLOR],
                3: [(534), (self.RT_Y - self.RT_Y), (912), (-377),
                    DEFAULT_COLOR],
                4: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (-534), (self.RT_Y - self.RT_Y),
                    DEFAULT_COLOR],
                5: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (534), (self.RT_Y - self.RT_Y),
                    DEFAULT_COLOR]
            },
            index=['px', 'py', 'x', 'y', 'branch_color']).T
        update_equal_res = self.tree.update_edge_category(
            'species', 'branch_color', equal='a1')
        update_equal_exp = update_equal_exp[[
            'px', 'py', 'x', 'y', 'branch_color']]
        update_equal_res = update_equal_res[[
            'px', 'py', 'x', 'y', 'branch_color']]
        update_equal_exp[['px', 'py', 'x', 'y']] = update_equal_exp[[
            'px', 'py', 'x', 'y']].astype(int)
        update_equal_res[['px', 'py', 'x', 'y']] = update_equal_res[[
            'px', 'py', 'x', 'y']].astype(int)
        assert_frame_equal(update_equal_exp, update_equal_res)

        update_less_exp = pd.DataFrame(
            {
                0: [(-534), (self.RT_Y - self.RT_Y), (-912), (-377),
                    DEFAULT_COLOR],
                1: [(-534), (self.RT_Y - self.RT_Y), (-912), (377),
                    DEFAULT_COLOR],
                2: [(534), (self.RT_Y - self.RT_Y), (912), (377),
                    DEFAULT_COLOR],
                3: [(534), (self.RT_Y - self.RT_Y), (912), (-377),
                    DEFAULT_COLOR],
                4: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (-534), (self.RT_Y - self.RT_Y),
                    '111111'],
                5: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (534), (self.RT_Y - self.RT_Y),
                    '111111']
            },
            index=['px', 'py', 'x', 'y', 'branch_color']).T
        update_less_res = self.tree.update_edge_category(
            'time', 'branch_color', new_value='111111', lower=10)
        update_less_exp = update_less_exp[[
            'px', 'py', 'x', 'y', 'branch_color']]
        update_less_res = update_less_res[[
            'px', 'py', 'x', 'y', 'branch_color']]
        update_less_exp[['px', 'py', 'x', 'y']
                        ] = update_less_exp[['px', 'py', 'x', 'y']].astype(int)
        update_less_res[['px', 'py', 'x', 'y']
                        ] = update_less_res[['px', 'py', 'x', 'y']].astype(int)
        assert_frame_equal(update_less_exp, update_less_res)

        update_greater_exp = pd.DataFrame(
            {
                0: [(-534), (self.RT_Y - self.RT_Y), (-912), (-377),
                    DEFAULT_COLOR],
                1: [(-534), (self.RT_Y - self.RT_Y), (-912), (377),
                    DEFAULT_COLOR],
                2: [(534), (self.RT_Y - self.RT_Y), (912), (377),
                    DEFAULT_COLOR],
                3: [(534), (self.RT_Y - self.RT_Y), (912), (-377),
                    DEFAULT_COLOR],
                4: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (-534), (self.RT_Y - self.RT_Y),
                    '121212'],
                5: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (534), (self.RT_Y - self.RT_Y),
                    '111111']
            },
            index=['px', 'py', 'x', 'y', 'branch_color']).T
        update_greater_res = self.tree.update_edge_category(
            'time', 'branch_color', new_value='121212', upper=12)
        update_greater_exp = update_greater_exp[[
            'px', 'py', 'x', 'y', 'branch_color']]
        update_greater_res = update_greater_res[[
            'px', 'py', 'x', 'y', 'branch_color']]
        update_greater_exp[['px', 'py', 'x', 'y']] = update_greater_exp[[
            'px', 'py', 'x', 'y']].astype(int)
        update_greater_res[['px', 'py', 'x', 'y']] = update_greater_res[[
            'px', 'py', 'x', 'y']].astype(int)
        assert_frame_equal(update_greater_exp, update_greater_res)


if __name__ == '__main__':
    unittest.main()
