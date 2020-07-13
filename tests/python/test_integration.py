# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

import os
import unittest
from qiime2 import Artifact, Metadata
from qiime2.sdk import Results, Visualization
from qiime2.plugin.testing import TestPluginBase


PREFIX_DIR = os.path.join("docs", "moving-pictures")


def load_mp_data():
    """Loads data from the QIIME 2 moving pictures tutorial for visualization.

    It's assumed that this data is already stored in docs/moving-pictures/, aka
    the PREFIX_DIR global variable set above, which should be located relative
    to where this function is being run from. If this directory or the data
    files within it cannot be accessed, this function will (probably) break.

    Returns
    -------
    (tree, table, md, fmd, ordination)
        tree: Artifact with semantic type Phylogeny[Rooted]
            Phylogenetic tree.
        table: Artifact with semantic type FeatureTable[Frequency]
            Feature table.
        md: Metadata
            Sample metadata.
        fmd: Metadata
            Feature metadata. (Although this is stored in the repository as a
            FeatureData[Taxonomy] artifact, we transform it to Metadata.)
        pcoa: Artifact with semantic type PCoAResults
            Ordination.
    """
    tree = Artifact.load(os.path.join(PREFIX_DIR, "rooted-tree.qza"))
    table = Artifact.load(os.path.join(PREFIX_DIR, "table.qza"))
    pcoa = Artifact.load(
        os.path.join(PREFIX_DIR, "unweighted_unifrac_pcoa_results.qza")
    )
    md = Metadata.load(os.path.join(PREFIX_DIR, "sample_metadata.tsv"))
    # We have to transform the taxonomy QZA to Metadata ourselves
    taxonomy = Artifact.load(os.path.join(PREFIX_DIR, "taxonomy.qza"))
    fmd = taxonomy.view(Metadata)
    return tree, table, md, fmd, pcoa


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

        self.tree, self.table, self.md, self.fmd, _ = load_mp_data()

        # Helps us distinguish between if the test was successful or not
        self.result = None

        # If the test was successful, we'll save the output QZV to this path
        # during tearDown().
        self.output_path = os.path.join(PREFIX_DIR, "empress-tree.qzv")

    def test_execution(self):
        """Just checks that the visualizer at least runs without errors."""
        self.result = self.plot(tree=self.tree, feature_table=self.table,
                                sample_metadata=self.md,
                                feature_metadata=self.fmd)
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
