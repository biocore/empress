# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

import os
import tempfile
import unittest
from qiime2.sdk import Results, Visualization
from qiime2.plugin.testing import TestPluginBase

from .util import load_mp_data


PREFIX_DIR = os.path.join("docs", "moving-pictures")


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
        self.community_plot = self.plugin.visualizers["community_plot"]
        self.tree_plot = self.plugin.visualizers["tree_plot"]

        self.tree, self.table, self.md, self.fmd, _ = load_mp_data()

        # Helps us distinguish between if the test was successful or not
        self.result = None

        # If the test was successful, we'll save the output QZV to this path
        # during tearDown().
        self.output_path = os.path.join(PREFIX_DIR, "empress-tree.qzv")

    def _check_in_HTML(self, needle):
        """Utility method: after a visualization has been generated, this
        exports the visualization to a temporary directory and asserts that
        a given string (needle) is present within the empress.html file.

        Parameters
        ----------
        needle: str
            Text to attempt to find in the generated empress.html file.

        References
        ----------
        Use of tempfile.TemporaryDirectory() (for inspecting the HTML) based
        on the q2-taxa visualizer tests:
        https://github.com/qiime2/q2-taxa/blob/master/q2_taxa/tests/test_visualizer.py
        """
        with tempfile.TemporaryDirectory() as output_dir:
            self.result.visualization.export_data(output_dir)
            with open(os.path.join(output_dir, "empress.html"), "r") as efile:
                empress_html = efile.read()
                try:
                    self.assertIn(needle, empress_html)
                except AssertionError:
                    # If the assertion fails, then let's still raise an error
                    # -- but only include the needle in the error message,
                    # because the default assertIn() error message includes all
                    # of empress.html as well (which makes the error basically
                    # unreadable without a lot of scrolling).
                    raise AssertionError(
                        '"{}" not in empress.html.'.format(needle)
                    )

    def test_community_plot_execution(self):
        """Checks that the community plot visualizer (basic case) works."""
        # 1. The visualizer shouldn't error out.
        self.result = self.community_plot(
            tree=self.tree,
            feature_table=self.table,
            sample_metadata=self.md,
            feature_metadata=self.fmd
        )
        # 2. The visualizer should generate a result containing a
        # visualization.
        self.assertIsInstance(self.result, Results)
        self.assertIsInstance(self.result.visualization, Visualization)
        # 3. Within this visualization's HTML, the "isCommunityPlot" JS flag
        # variable should be set to true, indicating that we'll hide various
        # parts of the UI that are only useful for sample metadata coloring /
        # animations / etc.
        self._check_in_HTML("var isCommunityPlot = true;")
        self._check_in_HTML(
            'var fmCols = ["Level 1", "Level 2", "Level 3", "Level 4", '
            '"Level 5", "Level 6", "Level 7", "Confidence"];'
        )

    def test_community_plot_fails_if_table_and_sm_not_provided(self):
        with self.assertRaisesRegex(
            TypeError,
            "missing 1 required positional argument: 'sample_metadata'"
        ):
            self.community_plot(tree=self.tree, feature_table=self.table)
        with self.assertRaisesRegex(
            TypeError,
            "missing 1 required positional argument: 'feature_table'"
        ):
            self.community_plot(tree=self.tree, sample_metadata=self.md)

    def test_tree_plot_execution_with_fm(self):
        """Checks that tree plot visualizer runs without errors, given fm."""
        self.result = self.tree_plot(tree=self.tree, feature_metadata=self.fmd)
        self.assertIsInstance(self.result, Results)
        self.assertIsInstance(self.result.visualization, Visualization)
        self._check_in_HTML("var isCommunityPlot = false;")
        self._check_in_HTML(
            'var fmCols = ["Level 1", "Level 2", "Level 3", "Level 4", '
            '"Level 5", "Level 6", "Level 7", "Confidence"];'
        )

    def test_tree_plot_execution_no_fm(self):
        """Checks that tree plot visualizer runs without errors; just tree."""
        self.result = self.tree_plot(tree=self.tree)
        self.assertIsInstance(self.result, Results)
        self.assertIsInstance(self.result.visualization, Visualization)
        self._check_in_HTML("var isCommunityPlot = false;")
        self._check_in_HTML("var fmCols = [];")

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
