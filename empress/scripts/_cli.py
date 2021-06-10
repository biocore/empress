import os

from biom import load_table
import click
import pandas as pd
from skbio.stats.ordination import OrdinationResults

from empress.core import Empress
import empress._parameter_descriptions as desc
from empress._plot_utils import save_viz, prepare_pcoa, check_and_process_files


@click.group()
def empress():
    """Generates an interactive visualization of a phylogenetic tree."""
    pass


# Allow using -h to show help information
# https://click.palletsprojects.com/en/7.x/documentation/#help-parameter-customization
CTXSETS = {"help_option_names": ["-h", "--help"]}


@empress.command(
    "tree-plot", short_help=desc.TREE_PLOT_DESC, context_settings=CTXSETS
)
@click.option("-t", "--tree", required=True, help=desc.TREE_DESC)
@click.option("-o", "--output-dir", required=True, help=desc.OUTPUT_DIR)
@click.option("-fm", "--feature-metadata", required=False, default=None,
              help=desc.FM_DESC)
@click.option("--shear-to-feature-metadata", required=False, default=False,
              help=desc.SHEAR_TO_FM, is_flag=True)
def tree_plot(
    tree: str,
    output_dir: str,
    feature_metadata: str,
    shear_to_feature_metadata: bool,
) -> None:
    tree_newick, fm = check_and_process_files(
        output_dir,
        tree,
        feature_metadata
    )

    viz = Empress(tree_newick, feature_metadata=fm,
                  shear_to_feature_metadata=shear_to_feature_metadata)
    os.makedirs(output_dir)
    save_viz(viz, output_dir, q2=False)


@empress.command(
    "community-plot", short_help=desc.COMM_PLOT_DESC, context_settings=CTXSETS
)
@click.option("-t", "--tree", required=True, help=desc.TREE_DESC)
@click.option("-tbl", "--table", required=True, help=desc.TBL)
@click.option("-sm", "--sample-metadata", required=True, help=desc.SM_DESC)
@click.option("-o", "--output-dir", required=True, help=desc.OUTPUT_DIR)
@click.option("-p", "--pcoa", required=False, default=None, help=desc.PCOA)
@click.option("-fm", "--feature-metadata", required=False, default=None,
              help=desc.FM_DESC)
@click.option("--ignore-missing-samples", required=False, default=False,
              help=desc.IGNORE_MISS_SAMP, is_flag=True)
@click.option("--filter-extra-samples", required=False, default=False,
              help=desc.FILT_EX_SAMP, is_flag=True)
@click.option("--filter-missing-features", required=False, default=False,
              help=desc.FILT_MISS_FEAT, is_flag=True)
@click.option("--number-of-pcoa-features", required=False, default=5,
              help=desc.NUM_FEAT)
@click.option("--shear-to-table", required=False, default=True,
              help=desc.SHEAR_TO_TBL, is_flag=True)
def community_plot(
    tree: str,
    table: str,
    sample_metadata: str,
    output_dir: str,
    pcoa: str,
    feature_metadata: str,
    ignore_missing_samples: bool,
    filter_extra_samples: bool,
    filter_missing_features: bool,
    number_of_pcoa_features: int,
    shear_to_table: bool,
) -> None:
    tree_newick, fm = check_and_process_files(
        output_dir,
        tree,
        feature_metadata
    )
    table = load_table(table)
    sample_metadata = pd.read_csv(sample_metadata, sep="\t", index_col=0)

    if pcoa is not None:
        pcoa = OrdinationResults.read(pcoa)
        pcoa = prepare_pcoa(pcoa, number_of_pcoa_features)

    viz = Empress(
        tree_newick,
        table=table,
        sample_metadata=sample_metadata,
        feature_metadata=fm,
        ordination=pcoa,
        ignore_missing_samples=ignore_missing_samples,
        filter_extra_samples=filter_extra_samples,
        filter_missing_features=filter_missing_features,
        shear_to_table=shear_to_table,
    )
    os.makedirs(output_dir)
    save_viz(viz, output_dir, q2=False)


if __name__ == "__main__":
    empress()
