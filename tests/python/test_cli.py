import os
import unittest

import biom
from click.testing import CliRunner
import pandas as pd
from qiime2 import Artifact
from skbio.stats.ordination import OrdinationResults
from skbio.tree import TreeNode

from empress.scripts._cli import empress


def files_present(output_dir):
    files = os.listdir(output_dir)
    assert "empress.html" in files
    assert os.path.isdir(f"{output_dir}/support_files")


class TestCLI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        q2_tree_loc = "docs/moving-pictures/rooted-tree.qza"
        q2_table_loc = "docs/moving-pictures/table.qza"
        q2_sm_loc = "docs/moving-pictures/sample_metadata.tsv"
        q2_fm_loc = "docs/moving-pictures/taxonomy.qza"
        q2_pcoa_loc = "docs/moving-pictures/biplot.qza"

        cls.tree_loc = "rooted-tree.nwk"
        cls.table_loc = "table.biom"
        cls.sm_loc = "sample_metadata.tsv"
        cls.fm_loc = "taxonomy.tsv"
        cls.pcoa_loc = "pcoa.txt"

        # convert tree to .nwk
        nwk_tree = Artifact.load(q2_tree_loc).view(TreeNode)

        # convert table to .biom
        biom_tbl = Artifact.load(q2_table_loc).view(biom.table.Table)

        # remove comment rows from sample metadata
        sm = pd.read_csv(q2_sm_loc, sep="\t", index_col=0, skiprows=[1])

        # convert feature metadata to .tsv
        fm = Artifact.load(q2_fm_loc).view(pd.DataFrame)

        # convert biplot to skbio OrdinationResults
        pcoa = Artifact.load(q2_pcoa_loc).view(OrdinationResults)

        # create isolated filesystem for tests in this file
        # manually using __enter__ so that we can run all tests and close in
        # tearDown rather than use 'with runner.isolated_filesystem():'
        cls.runner = CliRunner()
        cls.iso_fs = cls.runner.isolated_filesystem()
        cls.iso_fs.__enter__()

        nwk_tree.write(cls.tree_loc)
        with biom.util.biom_open(cls.table_loc, "w") as f:
            biom_tbl.to_hdf5(f, "test")
        sm.to_csv(cls.sm_loc, index=True, sep="\t")
        fm.to_csv(cls.fm_loc, index=True, sep="\t")
        pcoa.write(cls.pcoa_loc)

    @classmethod
    def tearDownClass(cls):
        # https://stackoverflow.com/questions/51706836/manually-open-context-manager
        cls.iso_fs.__exit__(None, None, None)

    def test_tree_plot_basic(cls):
        output_dir = "tree_plot_basic"
        result = cls.runner.invoke(
            empress,
            ["tree-plot", "--tree", cls.tree_loc, "--output-dir", output_dir]
        )
        assert result.exit_code == 0
        files_present(output_dir)

    def test_comm_plot_basic(cls):
        output_dir = "comm_plot_basic"
        result = cls.runner.invoke(
            empress,
            ["community-plot", "--tree", cls.tree_loc, "--table",
             cls.table_loc, "--sample-metadata", cls.sm_loc,
             "--output-dir", output_dir]
        )
        assert result.exit_code == 0
        files_present(output_dir)

    def test_comm_plot_pcoa(cls):
        output_dir = "comm_plot_pcoa"
        result = cls.runner.invoke(
            empress,
            ["community-plot", "--tree", cls.tree_loc, "--table",
             cls.table_loc, "--sample-metadata", cls.sm_loc,
             "--output-dir", output_dir, "--pcoa", cls.pcoa_loc,
             "--filter-extra-samples", "--feature-metadata", cls.fm_loc]
        )
        assert result.exit_code == 0
        files_present(output_dir)
        assert os.path.isdir(f"{output_dir}/emperor-resources")
