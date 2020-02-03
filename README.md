# Empress
[![Build Status](https://travis-ci.org/biocore/empress.svg?branch=master)](https://travis-ci.org/biocore/empress)

Empress is a fast and scalable phylogenetic tree viewer.

## Installation

To install the current development version, we recommend creating a new conda
environment:

```bash
conda create -n empress python=3.6 numpy scipy pandas cython
conda activate empress
conda install -c bioconda scikit-bio biom-format
pip install .
```

## Installing and using Empress through QIIME 2

### Installing into a QIIME 2 environment

Before following these instructions, make sure your QIIME 2 conda environment
is activated (a version of at least 2019.1 is required). Then, run the
following commands:

```bash
pip install git+https://github.com/biocore/empress.git
qiime dev refresh-cache
qiime empress
```

If you see information about Empress' QIIME 2 plugin, the installation was
successful!

### Example: running Empress through QIIME 2

Empress can visualize `Phylogeny[Rooted]` QIIME 2 artifacts.
We're going to use data from the QIIME 2 [Moving Pictures Tutorial](https://docs.qiime2.org/2019.10/tutorials/moving-pictures/):

##### Input Artifacts and Metadata

- `rooted-tree.qza` [view](https://view.qiime2.org/?src=https%3A%2F%2Fdocs.qiime2.org%2F2019.10%2Fdata%2Ftutorials%2Fmoving-pictures%2Frooted-tree.qza) | [download](https://docs.qiime2.org/2019.10/data/tutorials/moving-pictures/rooted-tree.qza)
- `table.qza` [view](https://view.qiime2.org/?src=https%3A%2F%2Fdocs.qiime2.org%2F2019.10%2Fdata%2Ftutorials%2Fmoving-pictures%2Ftable.qza) | [download](https://docs.qiime2.org/2019.10/data/tutorials/moving-pictures/table.qza)
- `taxonomy.qza` [view](https://view.qiime2.org/?src=https%3A%2F%2Fdocs.qiime2.org%2F2019.10%2Fdata%2Ftutorials%2Fmoving-pictures%2Ftaxonomy.qza) | [download](https://docs.qiime2.org/2019.10/data/tutorials/moving-pictures/taxonomy.qza)
- `sample_metadata.tsv` [download](https://data.qiime2.org/2019.10/tutorials/moving-pictures/sample_metadata.tsv)

Once you've got the above files downloaded into a single directory, run the
following command:

```bash
qiime empress plot \
    --i-tree rooted-tree.qza \
    --i-feature-table table.qza \
    --m-sample-metadata-file sample_metadata.tsv \
    --m-feature-metadata-file taxonomy.qza \
    --o-visualization empress-tree.qzv
```

##### Output Artifacts

- `empress-tree.qzv` [view](https://view.qiime2.org/?src=) | [download]()

This QIIME 2 visualization can be viewed either using `qiime tools view` or by
uploading it to [`view.qiime2.org`](https://view.qiime2.org).

#### Empress' tests

Please see the `tests/README.md` file for instructions on how to run Empress' tests.

## Acknowledgements

This work is supported by IBM Research AI through the AI Horizons Network. For
more information visit the [IBM AI Horizons Network website](https://www.research.ibm.com/artificial-intelligence/horizons-network/).

Empress' JavaScript code is distributed with the source code of various
third-party dependencies (in the `empress/support_files/vendor/` directory).
Please see
[DEPENDENCY_LICENSES.md](https://github.com/biocore/empress/blob/master/DEPENDENCY_LICENSES.md)
for copies of these dependencies' licenses.
