import os

from biom import load_table
from bp import parse_newick
import click
import pandas as pd
from skbio.stats.ordination import OrdinationResults

from empress.core import Empress
from empress._plot_utils import save_viz, prepare_pcoa


@click.group()
def empress():
    pass


@empress.command("tree-plot")
@click.option("--tree", required=True)
@click.option("--output-dir", required=True)
@click.option("--feature-metadata", required=False, default=None)
@click.option("--shear-to-feature-metadata", required=False, default=False)
def tree_plot(
    tree: str,
    feature_metadata: str,
    shear_to_feature_metadata: bool,
    output_dir: str,
) -> None:
    if os.path.isdir(output_dir):
        raise OSError("Output directory already exists!")
    else:
        os.mkdir(output_dir)
    with open(str(tree), "r") as f:
        tree_newick = parse_newick(f.readline())
    if feature_metadata is not None:
        feature_metadata = pd.read_csv(feature_metadata, sep="\t", index_col=0)

    viz = Empress(tree_newick, feature_metadata=feature_metadata,
                  shear_to_feature_metadata=shear_to_feature_metadata)
    save_viz(viz, output_dir, q2=False)


@empress.command("community-plot")
@click.option("--tree", required=True)
@click.option("--table", required=True)
@click.option("--sample-metadata", required=True)
@click.option("--output-dir", required=True)
@click.option("--pcoa", required=False, default=None)
@click.option("--feature-metadata", required=False, default=None)
@click.option("--ignore-missing-samples", required=False, default=False)
@click.option("--filter-extra-samples", required=False, default=False)
@click.option("--filter-missing-features", required=False, default=False)
@click.option("--number-of-pcoa-features", required=False, default=5)
@click.option("--shear-to-table", required=False, default=True)
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
    if os.path.isdir(output_dir):
        raise OSError("Output directory already exists!")
    else:
        os.mkdir(output_dir)
    with open(str(tree), "r") as f:
        tree_newick = parse_newick(f.readline())
    table = load_table(table)
    sample_metadata = pd.read_csv(sample_metadata, sep="\t", index_col=0)

    if pcoa is not None:
        pcoa = OrdinationResults.read(pcoa)
        pcoa = prepare_pcoa(pcoa, number_of_pcoa_features)
    if feature_metadata is not None:
        feature_metadata = pd.read_csv(feature_metadata, sep="\t", index_col=0)

    viz = Empress(
        tree_newick,
        table=table,
        sample_metadata=sample_metadata,
        feature_metadata=feature_metadata,
        ordination=pcoa,
        ignore_missing_samples=ignore_missing_samples,
        filter_extra_samples=filter_extra_samples,
        filter_missing_features=filter_missing_features,
        shear_to_table=shear_to_table,
    )
    save_viz(viz, output_dir, q2=False)


if __name__ == "__main__":
    empress()
