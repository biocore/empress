# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import os
import unittest
from qiime2 import Artifact, Metadata
from qiime2.sdk import Results, Visualization
from qiime2.plugin.testing import TestPluginBase


class TestIntegration(TestPluginBase):
    """Runs an integration test using the moving pictures tutorial data.

    This assumes that tests are being run from the root directory of Empress.

    References
    ----------

    This test class was adapted from q2-diversity:
    https://github.com/qiime2/q2-diversity/blob/ebb99f8af91f7fe10cb44cd237931b072a7b4fee/q2_diversity/tests/test_beta_correlation.py
    """
    package = "empress"

    def setUp(self):
        super().setUp()

        # Just for reference for anyone reading this, self.plugin is set upon
        # calling super().setUp() which looks at the "package" variable set
        # above
        self.plot = self.plugin.visualizers["plot"]

        # Load the various input QZAs/etc. needed to run this test
        prefixdir = os.path.join("docs", "moving-pictures")
        self.tree = Artifact.load(os.path.join(prefixdir, "rooted-tree.qza"))
        self.table = Artifact.load(os.path.join(prefixdir, "table.qza"))
        self.md = Metadata.load(os.path.join(prefixdir, "sample_metadata.tsv"))

        # We have to transform the taxonomy QZA to Metadata ourselves
        self.taxonomy = Artifact.load(os.path.join(prefixdir, "taxonomy.qza"))
        self.fmd = self.taxonomy.view(Metadata)

        # Helps us distinguish between if the test was successful or not
        self.result = None

        # If the test was successful, we'll save the output QZV to this path
        # during tearDown().
        self.output_path = os.path.join(prefixdir, "empress-tree.qzv")

    def test_execution(self):
        """Just checks that the visualizer at least runs without errors."""
        self.result = self.plot(self.tree, self.table, self.md, self.fmd)
        self.assertIsInstance(self.result, Results)
        self.assertIsInstance(self.result.visualization, Visualization)
        # TODO check details of viz more carefully (likely by digging into the
        # index HTML of self.result.visualization, etc.)

    def tearDown(self):
        super().tearDown()
        # Only overwrite "empress-tree.qzv" if the visualization was generated
        # successfully. Note that "successfully" here just means that the test
        # above passes -- in the future (if/when that TODO is addressed, and
        # the contents of the generated visualization are inspected in detail),
        # we could modify things to prevent overwriting this path if any of the
        # additional tests we'd add would fail.
        if self.result is not None:
            self.result.visualization.save(self.output_path)


if __name__ == "__main__":
    unittest.main()
