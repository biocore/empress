import os
import unittest

from click.testing import CliRunner
import pandas as pd

from empress.scripts._cli import empress
from .util import extract_q2_artifact_to_path


def files_present(output_dir):
    files = os.listdir(output_dir)
    assert "empress.html" in files
    assert os.path.isdir(f"{output_dir}/support_files")


class TestCLI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        q2_tree_loc = os.path.abspath("docs/moving-pictures/rooted-tree.qza")
        q2_table_loc = os.path.abspath("docs/moving-pictures/table.qza")
        q2_fm_loc = os.path.abspath("docs/moving-pictures/taxonomy.qza")
        q2_pcoa_loc = os.path.abspath("docs/moving-pictures/biplot.qza")

        q2_sm_loc = os.path.abspath(
            "docs/moving-pictures/sample_metadata.tsv"
        )

        # create isolated filesystem for tests in this file
        # manually using __enter__ so that we can run all tests and close in
        # tearDown rather than use 'with runner.isolated_filesystem():'
        cls.runner = CliRunner()
        cls.iso_fs = cls.runner.isolated_filesystem()
        cls.iso_fs.__enter__()

        # extract Artifacts to temporary filesystem
        cls.tree_loc = extract_q2_artifact_to_path("tree", q2_tree_loc,
                                                   "tree.nwk")
        cls.table_loc = extract_q2_artifact_to_path("tbl", q2_table_loc,
                                                    "feature-table.biom")
        cls.fm_loc = extract_q2_artifact_to_path("fm", q2_fm_loc,
                                                 "taxonomy.tsv")
        cls.pcoa_loc = extract_q2_artifact_to_path("pcoa", q2_pcoa_loc,
                                                   "ordination.txt")
        # need to re-save sample metadata to remove q2:types row
        cls.sm_loc = "tmp_sample_metadata.tsv"
        pd.read_csv(q2_sm_loc, sep="\t", index_col=0, skiprows=[1]).to_csv(
            cls.sm_loc,
            sep="\t",
            index=True
        )

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

    def test_existing_directory(cls):
        output_dir = "existing_dir"
        os.mkdir("existing_dir")
        result = cls.runner.invoke(
            empress,
            ["community-plot", "--tree", cls.tree_loc, "--table",
             cls.table_loc, "--sample-metadata", cls.sm_loc,
             "--output-dir", output_dir]
        )
        assert result.exit_code == 1
        error_class, value, _ = result.exc_info
        assert error_class == OSError
        assert str(value) == "Output directory already exists!"
        assert not os.path.isdir(f"{output_dir}/support_files")
        assert "empress.html" not in os.listdir(output_dir)

    def test_tree_plot_basic_cli_abbrev(cls):
        output_dir = "tree_plot_basic_cli_abbrev"
        result = cls.runner.invoke(
            empress,
            ["tree-plot", "-t", cls.tree_loc, "-o", output_dir]
        )
        assert result.exit_code == 0
        files_present(output_dir)
