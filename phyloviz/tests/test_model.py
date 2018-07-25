# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import unittest
import numpy as np
import pandas as pd
import io
from pandas.util.testing import assert_frame_equal
from phyloviz.model import Model


class TestModel(unittest.TestCase):
    def setUp(self):
        self.tree_file = io.StringIO(r'((a, b)le1, (c,d)ri1)r;')

        self.internal_md = pd.DataFrame(
            {
             'clade': ['left', 'right'],
             'time': [11, 12]
            },
            index=['le1', 'ri1']
        )

        self.leaf_md = pd.DataFrame(
            {
             'species': ['a1', 'b1', 'c1', 'd1'],
             'gram-positive': [True, False, True, False]
            },
            index=['a', 'b', 'c', 'd']
        )

        f_internal = io.StringIO()
        self.internal_md.to_csv(f_internal, sep='\t')
        f_leaf = io.StringIO()
        self.leaf_md.to_csv(f_leaf, sep='\t')

        # need to append three blank in order for file to be read
        self.f_internal = io.StringIO('\n\n\n' + f_internal.getvalue())
        self.f_leaf = io.StringIO(f_leaf.getvalue())

        self.tree = Model(
            self.tree_file,
            'newick',
            self.f_internal,
            self.f_leaf)

    def test_merge_metadata(self):
        merge_exp = pd.DataFrame(
            {
                0: [np.NaN, np.NaN, True, 'a1'],
                1: [np.NaN, np.NaN, False, 'b1'],
                2: [np.NaN, np.NaN, True, 'c1'],
                3: [np.NaN, np.NaN, False, 'd1'],
                4: ['left', 11, np.NaN, np.NaN],
                5: ['right', 12, np.NaN, np.NaN],
            },
            index=['clade', 'time', 'gram-positive', 'species']).T

        # hack to make time column's dtype to be float64 instead of object
        merge_exp[['time']] = merge_exp[['time']].apply(pd.to_numeric)

        merge_res = self.tree.edge_metadata[[
            'clade', 'time', 'gram-positive', 'species']].copy()
        assert_frame_equal(merge_exp, merge_res)

    def test_center(self):
        center_exp = pd.DataFrame({
            0: [(332.627 - 750), (450 - 450), (37.5 - 750), (154.873 - 450)],
            1: [(332.627 - 750), (450 - 450), (37.5 - 750), (745.127 - 450)],
            2: [(1167.37 - 750), (450 - 450), (1462.5 - 750), (745.127 - 450)],
            3: [(1167.37 - 750), (450 - 450), (1462.5 - 750), (154.873 - 450)],
            4: [(750 - 750), (450 - 450), (332.627 - 750), (450 - 450)],
            5: [(750 - 750), (450 - 450),(1167.37 - 750), (450 - 450)]},
            index=['px', 'py', 'x', 'y']).T
        self.tree.center_tree()
        center_res = self.tree.edge_metadata[['px', 'py', 'x', 'y']].copy()
        # center_res = center_res[:-1]

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
            0: [(332.627 - 750), (450 - 450), (37.5 - 750), (154.873 - 450)],
            1: [(332.627 - 750), (450 - 450), (37.5 - 750), (745.127 - 450)],
            4: [(750 - 750), (450 - 450), (332.627 - 750), (450 - 450)],
            5: [(750 - 750), (450 - 450), (1167.37 - 750), (450 - 450)]},
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
                0: [(332.627 - 750), (450 - 450), (37.5 - 750), (154.873 - 450),
                    'FFFFFF'],
                1: [(332.627 - 750), (450 - 450), (37.5 - 750), (745.127 - 450),
                    'FFFFFF'],
                2: [(1167.37 - 750), (450 - 450), (1462.5 - 750), (745.127 - 450),
                    'FFFFFF'],
                3: [(1167.37 - 750), (450 - 450), (1462.5 - 750), (154.873 - 450),
                    'FFFFFF'],
                4: [(750 - 750), (450 - 450), (332.627 - 750), (450 - 450),
                    'FFFFFF'],
                5: [(750 - 750), (450 - 450), (1167.37 - 750), (450 - 450),
                    'FFFFFF']
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
                0: [(37.5 - 750), (154.873 - 450), 'FFFFFF', 1],
                1: [(37.5 - 750), (745.127 - 450), 'FFFFFF', 1],
                2: [(1462.5 - 750), (745.127 - 450), 'FFFFFF', 1],
                3: [(1462.5 - 750), (154.873 - 450), 'FFFFFF', 1],
                4: [(332.627 - 750), (450 - 450), 'FFFFFF', 1],
                5: [(1167.37 - 750), (450 - 450), 'FFFFFF', 1]
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
                0: [(332.627 - 750), (450 - 450), (37.5 - 750), (154.873 - 450),
                    '000000'],
                1: [(332.627 - 750), (450 - 450), (37.5 - 750), (745.127 - 450),
                    'FFFFFF'],
                2: [(1167.37 - 750), (450 - 450), (1462.5 - 750), (745.127 - 450),
                    'FFFFFF'],
                3: [(1167.37 - 750), (450 - 450), (1462.5 - 750), (154.873 - 450),
                    'FFFFFF'],
                4: [(750 - 750), (450 - 450), (332.627 - 750), (450 - 450),
                    'FFFFFF'],
                5: [(750 - 750), (450 - 450), (1167.37 - 750), (450 - 450),
                    'FFFFFF']
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
                0: [(332.627 - 750), (450 - 450), (37.5 - 750), (154.873 - 450),
                    '000000'],
                1: [(332.627 - 750), (450 - 450), (37.5 - 750), (745.127 - 450),
                    'FFFFFF'],
                2: [(1167.37 - 750), (450 - 450), (1462.5 - 750), (745.127 - 450),
                    'FFFFFF'],
                3: [(1167.37 - 750), (450 - 450), (1462.5 - 750), (154.873 - 450),
                    'FFFFFF'],
                4: [(750 - 750), (450 - 450), (332.627 - 750), (450 - 450),
                    '111111'],
                5: [(750 - 750), (450 - 450), (1167.37 - 750), (450 - 450),
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
                0: [(332.627 - 750), (450 - 450), (37.5 - 750), (154.873 - 450),
                    '000000'],
                1: [(332.627 - 750), (450 - 450), (37.5 - 750), (745.127 - 450),
                    'FFFFFF'],
                2: [(1167.37 - 750), (450 - 450), (1462.5 - 750), (745.127 - 450),
                    'FFFFFF'],
                3: [(1167.37 - 750), (450 - 450), (1462.5 - 750), (154.873 - 450),
                    'FFFFFF'],
                4: [(750 - 750), (450 - 450), (332.627 - 750), (450 - 450),
                    '121212'],
                5: [(750 - 750), (450 - 450), (1167.37 - 750), (450 - 450),
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