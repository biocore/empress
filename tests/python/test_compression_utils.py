# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------
import unittest
import pandas as pd
from pandas.testing import assert_frame_equal, assert_series_equal
from empress.compression_utils import (
    compress_table, compress_sample_metadata, compress_feature_metadata
)


class TestCompressionUtils(unittest.TestCase):

    def setUp(self):
        pass

    def test_compress_table_basic(self):
        # TODO: verify that feature indices always in ascending order :)
        pass

    def test_compress_table_empty_sample(self):
        pass

    def test_compress_table_empty_feature(self):
        pass

    def test_compress_table_all_empty(self):
        pass

    def test_compress_sample_metadata_basic(self):
        pass

    def test_compress_sample_metadata_outputs_are_strings(self):
        pass

    def test_compress_sample_metadata_mapping_missing_samples(self):
        # shouldn't be a problem
        pass

    def test_compress_sample_metadata_metadata_missing_samples(self):
        # is definitely a problem
        pass

    def test_compress_feature_metadata_basic(self):
        pass

    def test_compress_feature_metadata_outputs_are_strings(self):
        pass

    def test_compress_feature_metadata_metadata_cols_differ(self):
        pass

    def test_compress_feature_metadata_both_metadata_dfs_empty(self):
        pass
