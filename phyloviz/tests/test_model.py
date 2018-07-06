import unittest
import numpy as np
import pandas as pd
import io
from pandas.util.testing import assert_frame_equal
import sys
sys.path.insert(0, r'../')
from phyloviz.model import Model

class TestModel(unittest.TestCase):
  def setUp(self):
    self.tree_file = io.StringIO(r'((a, b)le1, (c,d)ri1)r;')

    self.internal_md = pd.DataFrame(
      {'clade': ['firmi', 'left', 'right'], 'time': [10, 11, 12]},
      index=['r', 'le1', 'ri1']
    )

    self.leaf_md = pd.DataFrame(
      {'species': ['a1', 'b1', 'c1', 'd1'], 'gram-positive': [True, False, True, False]},
      index=['a','b', 'c', 'd']
    )

    f_internal = io.StringIO()
    self.internal_md.to_csv(f_internal, sep='\t')
    f_leaf = io.StringIO()
    self.leaf_md.to_csv(f_leaf, sep='\t')
    # f_edge = io.StringIO()
    # self.edge_md.to_csv(f_edge, sep='\t')

    self.f_internal = io.StringIO(f_internal.getvalue())
    self.f_leaf = io.StringIO(f_leaf.getvalue())

    self.tree = Model(self.tree_file, 'newick', self.f_internal, self.f_leaf)

  def test_merge_metadata(self):
    merge_exp = pd.DataFrame(
      {
        0: [np.NaN, np.NaN, True, 'a1'],
        1: [np.NaN, np.NaN, False, 'b1'],
        2: [np.NaN, np.NaN, True, 'c1'],
        3: [np.NaN, np.NaN, False, 'd1'],
        4: ['left', 11, np.NaN, np.NaN],
        5: ['right', 12, np.NaN, np.NaN],
        6: ['firmi', 10, np.NaN, np.NaN]
      },
      index=['clade', 'time', 'gram-positive', 'species']).T

    #hack to make time column's dtype to be float64 instead of object
    merge_exp[['time']] = merge_exp[['time']].apply(pd.to_numeric)

    merge_res = self.tree.edge_metadata[['clade', 'time', 'gram-positive', 'species']].copy()
    assert_frame_equal(merge_exp, merge_res)

  def test_center(self):
    center_before = self.tree.edge_metadata[['px', 'py', 'x', 'y']].copy()
    center_exp = pd.DataFrame(
      {
        0: [(332.627 - 750), (450 - 450), (37.5 - 750), (154.873 - 450)],
        1: [(332.627 - 750), (450 - 450), (37.5 - 750), (745.127 - 450)],
        2: [(1167.37 - 750), (450 - 450), (1462.5 - 750), (745.127 - 450)],
        3: [(1167.37 - 750), (450 - 450), (1462.5 - 750), (154.873 - 450)],
        4: [(750 - 750), (450 - 450), (332.627 - 750), (450 - 450)],
        5: [(750 - 750), (450 - 450), (1167.37 - 750), (450 - 450)],
      },
      index=['px','py','x','y']).T
    self.tree.center_tree()
    center_res = self.tree.edge_metadata[['px', 'py', 'x', 'y']].copy()
    center_res = center_res[:-1]

    #convert to integer to remove precision error
    center_exp[['px','py','x','y']] = center_exp[['px','py','x','y']].astype(int)
    center_res[['px','py','x','y']] = center_res[['px','py','x','y']].astype(int)
    assert_frame_equal(center_exp, center_res)

  def test_select_edge_category(self):


if __name__ == '__main__':
  unittest.main()