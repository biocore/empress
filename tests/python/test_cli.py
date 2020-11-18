import unittest

import biom
from click.testing import CliRunner
import pandas as pd
from qiime2 import Artifact
from skbio.tree import TreeNode

from empress.scripts._cli import empress


class TestCLI(unittest.TestCase):

    def setUp(self):
        q2_tree_loc = "docs/moving-pictures/rooted-tree.qza"
        q2_table_loc = "docs/moving-pictures/table.qza"
        q2_sm_loc = "docs/moving-pictures/sample_metadata.tsv"
        q2_fm_loc = "docs/moving-pictures/taxonomy.qza"

        self.tree_loc = "rooted-tree.nwk"
        self.table_loc = "table.biom"
        self.sm_loc = "sample_metadata.tsv"
        self.fm_loc = "taxonomy.tsv"

        # convert tree to .nwk
        nwk_tree = Artifact.load(q2_tree_loc).view(TreeNode)

        # convert table to .biom
        biom_tbl = Artifact.load(q2_table_loc).view(biom.table.Table)

        # remove comment rows from sample metadata
        sm = pd.read_csv(q2_sm_loc, sep="\t", index_col=0, skiprows=[1])

        # convert feature metadata to .tsv
        fm = Artifact.load(q2_fm_loc).view(pd.DataFrame)

        # create isolated filesystem for tests in this file
        # manually using __enter__ so that we can run all tests and close in
        # tearDown rather than use 'with runner.isolated_filesystem():'
        self.runner = CliRunner()
        self.iso_fs = self.runner.isolated_filesystem()
        self.iso_fs.__enter__()

        nwk_tree.write(self.tree_loc)
        with biom.util.biom_open(self.table_loc, "w") as f:
            biom_tbl.to_hdf5(f, "test")
        sm.to_csv(self.sm_loc, index=True, sep="\t")
        fm.to_csv(self.fm_loc, index=True, sep="\t")

    def tearDown(self):
        # https://stackoverflow.com/questions/51706836/manually-open-context-manager
        self.iso_fs.__exit__(None, None, None)

    def test_tree_plot_basic(self):
        output_dir = "tree_plot_basic"
        result = self.runner.invoke(
            empress,
            ["tree-plot", "--tree", self.tree_loc, "--output-dir",
             output_dir]
        )
        assert result.exit_code == 0
