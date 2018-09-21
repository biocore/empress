# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import unittest
import math
import empress.tools as tools


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


def test_hull_sector_into(self):
    a_1 = 0
    a_2 = math.pi / 2
    (starting_angle, theta) = tools.start_and_total_angle(a_1, a_2)
    self.assertEqual(starting_angle, 0)
    self.assertEqual(theta, math.pi / 2)

    a_2 = 0
    a_1 = math.pi / 2
    (starting_angle, theta) = tools.start_and_total_angle(a_1, a_2)
    self.assertEqual(starting_angle, 0)
    self.assertEqual(theta, math.pi / 2)

    a_1 = math.pi / 2
    a_2 = math.pi
    (starting_angle, theta) = tools.start_and_total_angle(a_1, a_2)
    self.assertEqual(starting_angle, math.pi / 2)
    self.assertEqual(theta, math.pi / 2)

    a_2 = math.pi / 2
    a_1 = math.pi
    (starting_angle, theta) = tools.start_and_total_angle(a_1, a_2)
    self.assertEqual(starting_angle, math.pi / 2)
    self.assertEqual(theta, math.pi / 2)

    a_1 = math.pi / 4
    a_2 = 7 * math.pi / 4
    (starting_angle, theta) = tools.start_and_total_angle(a_1, a_2)
    self.assertEqual(starting_angle, 7 * math.pi / 4)
    self.assertEqual(theta, math.pi / 2)


if __name__ == '__main__':
    unittest.main()
