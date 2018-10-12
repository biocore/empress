# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import unittest
import math
import empress.tools as tools


class TestTools(unittest.TestCase):

    def test_in_quad_1(self):
        q_1 = math.pi / 4
        q_2 = 3 * math.pi / 4
        q_3 = 5 * math.pi / 4
        q_4 = 7 * math.pi / 4
        self.assertEqual(tools.in_quad_1(q_1), True)
        self.assertEqual(tools.in_quad_1(q_2), False)
        self.assertEqual(tools.in_quad_1(q_3), False)
        self.assertEqual(tools.in_quad_1(q_4), False)

    def test_in_quad_4(self):
        q_1 = math.pi / 4
        q_2 = 3 * math.pi / 4
        q_3 = 5 * math.pi / 4
        q_4 = 7 * math.pi / 4
        self.assertEqual(tools.in_quad_4(q_1), False)
        self.assertEqual(tools.in_quad_4(q_2), False)
        self.assertEqual(tools.in_quad_4(q_3), False)
        self.assertEqual(tools.in_quad_4(q_4), True)

    def test_calculate_angle(self):
        p_x_axis = (1, 0)
        p_y_axis = (0, 1)
        n_x_axis = (-1, 0)
        n_y_axis = (0, -1)
        self.assertEqual(0, tools.calculate_angle(p_x_axis))
        self.assertEqual(math.pi / 2, tools.calculate_angle(p_y_axis))
        self.assertEqual(math.pi, tools.calculate_angle(n_x_axis))
        self.assertEqual(3 * math.pi / 2, tools.calculate_angle(n_y_axis))

        p_1 = (1, 1)
        p_2 = (-1, 1)
        p_3 = (-1, -1)
        p_4 = (1, -1)
        self.assertEqual(math.pi / 4, tools.calculate_angle(p_1))
        self.assertEqual(3 * math.pi / 4, tools.calculate_angle(p_2))
        self.assertEqual(5 * math.pi / 4, tools.calculate_angle(p_3))
        self.assertEqual(7 * math.pi / 4, tools.calculate_angle(p_4))

    def test_total_angle(self):
        a_1 = 0
        a_2 = math.pi / 2
        theta = tools.total_angle(a_1, a_2, True)
        self.assertEqual(theta, math.pi / 2)

        a_2 = 0
        a_1 = math.pi / 2
        theta = tools.total_angle(a_1, a_2, True)
        self.assertEqual(theta, math.pi / 2)

        a_1 = math.pi / 2
        a_2 = math.pi
        theta = tools.total_angle(a_1, a_2, True)
        self.assertEqual(theta, math.pi / 2)

        a_2 = math.pi / 2
        a_1 = math.pi
        theta = tools.total_angle(a_1, a_2, True)
        self.assertEqual(theta, math.pi / 2)

        a_1 = math.pi / 4
        a_2 = 7 * math.pi / 4
        theta = tools.total_angle(a_1, a_2, True)
        self.assertEqual(theta, math.pi / 2)

    def test_extract_color(self):
        exp_color = (1, 1, 1)
        res_color = tools.extract_color('FFFFFF')
        self.assertEqual(exp_color, res_color)

    def test_create_arc_sector(self):
        tools.NUM_TRI = 1
        sector_info = {
            'theta': math.pi / 2,
            'starting_angle': 0,
            'center_x': 0,
            'center_y': 0,
            'largest_branch': 1,
            'color': 'FFFFFF'
        }
        exp_arc = [0, 0, 1, 1, 1,
                   1, 0, 1, 1, 1,
                   0, 1, 1, 1, 1]
        res_arc = tools.create_arc_sector(sector_info)
        for i in range(len(res_arc)):
            self.assertEqual(math.isclose(exp_arc[i], res_arc[i], abs_tol=1e-09), True)

    def test_sector_info(self):
        points = [[1, -1], [1, 1]]
        exp_info = {
            'center_x': 0, 'center_y': 0,
            'starting_angle': 7 * math.pi / 4, 'theta': math.pi / 2,
            'largest_branch': math.sqrt(2), 'smallest_branch': math.sqrt(2)
        }
        res_info = tools.sector_info(points, [0, 0], [-1, 0])
        self.assertEqual(exp_info, res_info)

        points = [[1, -1], [1, 1], [-1, 1], [-1, -1]]
        exp_info = {
            'center_x': 0, 'center_y': 0,
            'starting_angle': 5 * math.pi / 4, 'theta': 3 * math.pi / 2,
            'largest_branch': math.sqrt(2), 'smallest_branch': math.sqrt(2)
        }
        res_info = tools.sector_info(points, [0, 0], [-1, 0])
        self.assertEqual(exp_info, res_info)

        exp_info = {
            'center_x': 0, 'center_y': 0,
            'starting_angle': 3 * math.pi / 4, 'theta': 3 * math.pi / 2,
            'largest_branch': math.sqrt(2), 'smallest_branch': math.sqrt(2)
        }
        res_info = tools.sector_info(points, [0, 0], [0, 1])
        self.assertEqual(exp_info, res_info)


if __name__ == '__main__':
    unittest.main()
