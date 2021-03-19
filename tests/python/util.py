import os
import glob
import tempfile
from zipfile import ZipFile

PREFIX_DIR = os.path.join("docs", "moving-pictures")


def extract_q2_artifact_to_path(dir_name, artifact_loc, file_name):
    """Gets relevant data from a Q2 Artifact.

    Figures out the path of an extracted Artifact's data and returns it. This
    function unzips to the current directory so it should be called in some
    kind of temporary directory.

    For example: if tmp.qza is a FeatureTable[Frequency] Artifact

        extract_q2_artifact_to_path("table", "tmp.qza", "feature-table.biom")

    would return "table/<UUID>/data/feature-table.biom" and create the
    "table/<UUID>" subdirectory. We use the glob module to find the filepath
    because an Artifact unzips to a directory named by a UUID.

    Parameters
    ----------
    dir_name: str
        Name of subdirectory to create with extracted Artifact
    artifact_loc: str
        Filepath of Artifact to unzip
    file_name: str
        Name of file to search for in data directory

    Returns
    -------
    str
        Filepath of data file in new temporary directory
    """
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

    Parameters
    ----------
    use_artifact_api: bool, optional (default True)
        If True, this will load the artifacts using the QIIME 2 Artifact API,
        and the returned objects will have types corresponding to the first
        listed types (before the | characters) shown below.
        If False, this will instead load the artifacts without using QIIME 2's
        APIs; in this case, the returned objects will have types corresponding
        to the second listed types (after the | characters) shown below.

    Returns
    -------
    (tree, table, md, fmd, ordination)
        tree: qiime2.Artifact | skbio.tree.TreeNode
            Phylogenetic tree.
        table: qiime2.Artifact | biom.Table
            Feature table.
        md: qiime2.Metadata | pandas.DataFrame
            Sample metadata.
        fmd: qiime2.Metadata | pandas.DataFrame
            Feature metadata. (Although this is stored in the repository as a
            FeatureData[Taxonomy] artifact, we transform it to Metadata if
            use_artifact_api is True.)
        pcoa: qiime2.Artifact | skbio.OrdinationResults
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
            tree_loc = extract_q2_artifact_to_path(_tmp, q2_tree_loc,
                                                   "tree.nwk")
            tree = TreeNode.read(tree_loc)
            tbl_loc = extract_q2_artifact_to_path(_tmp, q2_table_loc,
                                                  "feature-table.biom")
            table = biom.load_table(tbl_loc)
            pcoa_loc = extract_q2_artifact_to_path(_tmp, q2_pcoa_loc,
                                                   "ordination.txt")
            pcoa = OrdinationResults.read(pcoa_loc)
            tax_loc = extract_q2_artifact_to_path(_tmp, q2_tax_loc,
                                                  "taxonomy.tsv")
            fmd = pd.read_csv(tax_loc, sep="\t", index_col=0)
            md = pd.read_csv(md_loc, sep="\t", index_col=0, skiprows=[1])
    return tree, table, md, fmd, pcoa
