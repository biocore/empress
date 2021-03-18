import os
import glob
import tempfile
from zipfile import ZipFile

PREFIX_DIR = os.path.join("docs", "moving-pictures")


def extracted_artifact_path(dir_name, artifact_loc, file_name):
    with ZipFile(artifact_loc, "r") as zip_ref:
        zip_ref.extractall(dir_name)
        f = glob.glob(f"{dir_name}/*/data/{file_name}")[0]
    return f


def load_mp_data(use_artifact_api=True):
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
    q2_tree_loc = os.path.join(PREFIX_DIR, "rooted-tree.qza")
    q2_table_loc = os.path.join(PREFIX_DIR, "table.qza")
    q2_pcoa_loc = os.path.join(PREFIX_DIR,
                               "unweighted_unifrac_pcoa_results.qza")
    q2_tax_loc = os.path.join(PREFIX_DIR, "taxonomy.qza")
    md_loc = os.path.join(PREFIX_DIR, "sample_metadata.tsv")
    if use_artifact_api:
        from qiime2 import Artifact, Metadata

        tree = Artifact.load(q2_tree_loc)
        table = Artifact.load(q2_table_loc)
        pcoa = Artifact.load(q2_pcoa_loc)
        md = Metadata.load(md_loc)
        # We have to transform the taxonomy QZA to Metadata ourselves
        fmd = Artifact.load(q2_tax_loc).view(Metadata)
    else:
        import biom
        import pandas as pd
        from skbio.stats.ordination import OrdinationResults
        from skbio.tree import TreeNode
        with tempfile.TemporaryDirectory() as _tmp:
            tree_loc = extracted_artifact_path(_tmp, q2_tree_loc, "tree.nwk")
            tree = TreeNode.read(tree_loc)
            tbl_loc = extracted_artifact_path(_tmp, q2_table_loc,
                                              "feature-table.biom")
            table = biom.load_table(tbl_loc)
            pcoa_loc = extracted_artifact_path(_tmp, q2_pcoa_loc,
                                               "ordination.txt")
            pcoa = OrdinationResults.read(pcoa_loc)
            tax_loc = extracted_artifact_path(_tmp, q2_tax_loc,
                                              "taxonomy.tsv")
            fmd = pd.read_csv(tax_loc, sep="\t", index_col=0)
            md = pd.read_csv(md_loc, sep="\t", index_col=0, skiprows=[1])
        pass
    return tree, table, md, fmd, pcoa
