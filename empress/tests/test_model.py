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
import math
from pandas.util.testing import assert_frame_equal
from empress.model import Model


class TestModel(unittest.TestCase):

    def setUp(self):
        self.RT_X = 750
        self.RT_Y = 450

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
                0: [np.nan, np.nan, True, 'a1'],
                1: [np.nan, np.nan, False, 'b1'],
                2: [np.nan, np.nan, True, 'c1'],
                3: [np.nan, np.nan, False, 'd1'],
                4: ['left', 11, np.nan, np.nan],
                5: ['right', 12, np.nan, np.nan],
            },
            index=['clade', 'time', 'gram-positive', 'species']).T

        # hack to make time column's dtype to be float64 instead of object
        merge_exp[['time']] = merge_exp[['time']].apply(pd.to_numeric)

        merge_res = self.tree.edge_metadata[[
            'clade', 'time', 'gram-positive', 'species']].copy()
        assert_frame_equal(merge_exp, merge_res)

    def test_center(self):
        center_exp = pd.DataFrame({
            0: [(332.627 - self.RT_X), (self.RT_Y - self.RT_Y), (37.5 - self.RT_X), (154.873 - self.RT_Y)],
            1: [(332.627 - self.RT_X), (self.RT_Y - self.RT_Y), (37.5 - self.RT_X), (745.127 - self.RT_Y)],
            2: [(1167.37 - self.RT_X), (self.RT_Y - self.RT_Y), (1462.5 - self.RT_X), (745.127 - self.RT_Y)],
            3: [(1167.37 - self.RT_X), (self.RT_Y - self.RT_Y), (1462.5 - self.RT_X), (154.873 - self.RT_Y)],
            4: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (332.627 - self.RT_X), (self.RT_Y - self.RT_Y)],
            5: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (1167.37 - self.RT_X), (self.RT_Y - self.RT_Y)]},
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
            0: [(332.627 - self.RT_X), (self.RT_Y - self.RT_Y), (37.5 - self.RT_X), (154.873 - self.RT_Y)],
            1: [(332.627 - self.RT_X), (self.RT_Y - self.RT_Y), (37.5 - self.RT_X), (745.127 - self.RT_Y)],
            4: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (332.627 - self.RT_X), (self.RT_Y - self.RT_Y)],
            5: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (1167.37 - self.RT_X), (self.RT_Y - self.RT_Y)]},
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
                0: [(332.627 - self.RT_X), (self.RT_Y - self.RT_Y), (37.5 - self.RT_X), (154.873 - self.RT_Y),
                    'FFFFFF'],
                1: [(332.627 - self.RT_X), (self.RT_Y - self.RT_Y), (37.5 - self.RT_X), (745.127 - self.RT_Y),
                    'FFFFFF'],
                2: [(1167.37 - self.RT_X), (self.RT_Y - self.RT_Y), (1462.5 - self.RT_X), (745.127 - self.RT_Y),
                    'FFFFFF'],
                3: [(1167.37 - self.RT_X), (self.RT_Y - self.RT_Y), (1462.5 - self.RT_X), (154.873 - self.RT_Y),
                    'FFFFFF'],
                4: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (332.627 - self.RT_X), (self.RT_Y - self.RT_Y),
                    'FFFFFF'],
                5: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (1167.37 - self.RT_X), (self.RT_Y - self.RT_Y),
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
                0: [(37.5 - self.RT_X), (154.873 - self.RT_Y), 'FFFFFF', 1],
                1: [(37.5 - self.RT_X), (745.127 - self.RT_Y), 'FFFFFF', 1],
                2: [(1462.5 - self.RT_X), (745.127 - self.RT_Y), 'FFFFFF', 1],
                3: [(1462.5 - self.RT_X), (154.873 - self.RT_Y), 'FFFFFF', 1],
                4: [(332.627 - self.RT_X), (self.RT_Y - self.RT_Y), 'FFFFFF', 1],
                5: [(1167.37 - self.RT_X), (self.RT_Y - self.RT_Y), 'FFFFFF', 1]
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
                0: [(332.627 - self.RT_X), (self.RT_Y - self.RT_Y), (37.5 - self.RT_X), (154.873 - self.RT_Y),
                    '000000'],
                1: [(332.627 - self.RT_X), (self.RT_Y - self.RT_Y), (37.5 - self.RT_X), (745.127 - self.RT_Y),
                    'FFFFFF'],
                2: [(1167.37 - self.RT_X), (self.RT_Y - self.RT_Y), (1462.5 - self.RT_X), (745.127 - self.RT_Y),
                    'FFFFFF'],
                3: [(1167.37 - self.RT_X), (self.RT_Y - self.RT_Y), (1462.5 - self.RT_X), (154.873 - self.RT_Y),
                    'FFFFFF'],
                4: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (332.627 - self.RT_X), (self.RT_Y - self.RT_Y),
                    'FFFFFF'],
                5: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (1167.37 - self.RT_X), (self.RT_Y - self.RT_Y),
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
                0: [(332.627 - self.RT_X), (self.RT_Y - self.RT_Y), (37.5 - self.RT_X), (154.873 - self.RT_Y),
                    '000000'],
                1: [(332.627 - self.RT_X), (self.RT_Y - self.RT_Y), (37.5 - self.RT_X), (745.127 - self.RT_Y),
                    'FFFFFF'],
                2: [(1167.37 - self.RT_X), (self.RT_Y - self.RT_Y), (1462.5 - self.RT_X), (745.127 - self.RT_Y),
                    'FFFFFF'],
                3: [(1167.37 - self.RT_X), (self.RT_Y - self.RT_Y), (1462.5 - self.RT_X), (154.873 - self.RT_Y),
                    'FFFFFF'],
                4: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (332.627 - self.RT_X), (self.RT_Y - self.RT_Y),
                    '111111'],
                5: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (1167.37 - self.RT_X), (self.RT_Y - self.RT_Y),
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
                0: [(332.627 - self.RT_X), (self.RT_Y - self.RT_Y), (37.5 - self.RT_X), (154.873 - self.RT_Y),
                    '000000'],
                1: [(332.627 - self.RT_X), (self.RT_Y - self.RT_Y), (37.5 - self.RT_X), (745.127 - self.RT_Y),
                    'FFFFFF'],
                2: [(1167.37 - self.RT_X), (self.RT_Y - self.RT_Y), (1462.5 - self.RT_X), (745.127 - self.RT_Y),
                    'FFFFFF'],
                3: [(1167.37 - self.RT_X), (self.RT_Y - self.RT_Y), (1462.5 - self.RT_X), (154.873 - self.RT_Y),
                    'FFFFFF'],
                4: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (332.627 - self.RT_X), (self.RT_Y - self.RT_Y),
                    '121212'],
                5: [(self.RT_X - self.RT_X), (self.RT_Y - self.RT_Y), (1167.37 - self.RT_X), (self.RT_Y - self.RT_Y),
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

    def test_in_quad_1(self):
        q_1 = math.pi / 4
        q_2 = 3 * math.pi / 4
        q_3 = 5 * math.pi / 4
        q_4 = 7 * math.pi / 4

        self.assertEqual(self.tree.in_quad_1(q_1), True)
        self.assertEqual(self.tree.in_quad_1(q_2), False)
        self.assertEqual(self.tree.in_quad_1(q_3), False)
        self.assertEqual(self.tree.in_quad_1(q_4), False)

    def test_in_quad_4(self):
        q_1 = math.pi / 4
        q_2 = 3 * math.pi / 4
        q_3 = 5 * math.pi / 4
        q_4 = 7 * math.pi / 4

        self.assertEqual(self.tree.in_quad_4(q_1), False)
        self.assertEqual(self.tree.in_quad_4(q_2), False)
        self.assertEqual(self.tree.in_quad_4(q_3), False)
        self.assertEqual(self.tree.in_quad_4(q_4), True)

    def test_calculate_angle(self):
        p_x_axis = (1, 0)
        p_y_axis = (0, 1)
        n_x_axis = (-1, 0)
        n_y_axis = (0, -1)
        self.assertEqual(0, self.tree.calculate_angle(p_x_axis))
        self.assertEqual(math.pi / 2, self.tree.calculate_angle(p_y_axis))
        self.assertEqual(math.pi, self.tree.calculate_angle(n_x_axis))
        self.assertEqual(3 * math.pi / 2, self.tree.calculate_angle(n_y_axis))

        p_1 = (1, 1)
        p_2 = (-1, 1)
        p_3 = (-1, -1)
        p_4 = (1, -1)
        self.assertEqual(math.pi / 4, self.tree.calculate_angle(p_1))
        self.assertEqual(3 * math.pi / 4, self.tree.calculate_angle(p_2))
        self.assertEqual(5 * math.pi / 4, self.tree.calculate_angle(p_3))
        self.assertEqual(7 * math.pi / 4, self.tree.calculate_angle(p_4))

    def test_hull_sector_into(self):
        a_1 = 0
        a_2 = math.pi / 2
        (starting_angle, theta) = self.tree.hull_sector_info(a_1, a_2)
        self.assertEqual(starting_angle, 0)
        self.assertEqual(theta, math.pi / 2)

        a_2 = 0
        a_1 = math.pi / 2
        (starting_angle, theta) = self.tree.hull_sector_info(a_1, a_2)
        self.assertEqual(starting_angle, 0)
        self.assertEqual(theta, math.pi / 2)

        a_1 = math.pi / 2
        a_2 = math.pi
        (starting_angle, theta) = self.tree.hull_sector_info(a_1, a_2)
        self.assertEqual(starting_angle, math.pi / 2)
        self.assertEqual(theta, math.pi / 2)

        a_2 = math.pi / 2
        a_1 = math.pi
        (starting_angle, theta) = self.tree.hull_sector_info(a_1, a_2)
        self.assertEqual(starting_angle, math.pi / 2)
        self.assertEqual(theta, math.pi / 2)

        a_1 = math.pi / 4
        a_2 = 7 * math.pi / 4
        (starting_angle, theta) = self.tree.hull_sector_info(a_1, a_2)
        self.assertEqual(starting_angle, 7 * math.pi / 4)
        self.assertEqual(theta, math.pi / 2)


if __name__ == '__main__':
    unittest.main()
