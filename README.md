# Empress
[![Build Status](https://travis-ci.org/biocore/empress.svg?branch=master)](https://travis-ci.org/biocore/empress)

Empress is a fast and scalable phylogenetic tree viewer.

## Installation

Before following these instructions, make sure your QIIME 2 conda environment
is activated (a version of at least **2019.10** is required). Then, run the
following commands:

```bash
pip install git+https://github.com/biocore/empress.git
pip install git+https://github.com/biocore/emperor.git
qiime dev refresh-cache
qiime empress
```

If you see information about Empress' QIIME 2 plugin, the installation was
successful!

## Example: Using Empress in QIIME 2

Empress can visualize `Phylogeny[Rooted]` QIIME 2 artifacts.
We're going to use data from the QIIME 2 [Moving Pictures Tutorial](https://docs.qiime2.org/2019.10/tutorials/moving-pictures/):

##### Input Artifacts and Metadata

The following files are included in the repository, alternatively you can
download these individually from the URLs below (note some filenames
may change due to the underlying hosting systems).

- `rooted-tree.qza` [view](https://view.qiime2.org/?src=https%3A%2F%2Fdocs.qiime2.org%2F2019.10%2Fdata%2Ftutorials%2Fmoving-pictures%2Frooted-tree.qza) | [download](https://docs.qiime2.org/2019.10/data/tutorials/moving-pictures/rooted-tree.qza)
- `unweighted_unifrac_pcoa_results.qza` [view](https://view.qiime2.org/?src=https%3A%2F%2Fdocs.qiime2.org%2F2019.10%2Fdata%2Ftutorials%2Fmoving-pictures%2Fcore-metrics-results%2Funweighted_unifrac_pcoa_results.qza) | [download](https://docs.qiime2.org/2019.10/data/tutorials/moving-pictures/core-metrics-results/unweighted_unifrac_pcoa_results.qza)
- `table.qza` [view](https://view.qiime2.org/?src=https%3A%2F%2Fdocs.qiime2.org%2F2019.10%2Fdata%2Ftutorials%2Fmoving-pictures%2Ftable.qza) | [download](https://docs.qiime2.org/2019.10/data/tutorials/moving-pictures/table.qza)
- `taxonomy.qza` [view](https://view.qiime2.org/?src=https%3A%2F%2Fdocs.qiime2.org%2F2019.10%2Fdata%2Ftutorials%2Fmoving-pictures%2Ftaxonomy.qza) | [download](https://docs.qiime2.org/2019.10/data/tutorials/moving-pictures/taxonomy.qza)
- `sample_metadata.tsv` [download](https://data.qiime2.org/2019.10/tutorials/moving-pictures/sample_metadata.tsv)

From the base Empress directory, you can run `qiime empress plot` as shown
below. Alternatively, if you've downloaded the files individually, you'll need
to update the filepaths as needed.

### Example 1: Using Empress to visualize a tree "standalone"

```bash
qiime empress plot \
    --i-tree docs/moving-pictures/rooted-tree.qza \
    --i-feature-table docs/moving-pictures/table.qza \
    --m-sample-metadata-file docs/moving-pictures/sample_metadata.tsv \
    --m-feature-metadata-file docs/moving-pictures/taxonomy.qza \
    --o-visualization docs/moving-pictures/empress-tree.qzv
```

This generates a visualization of a phylogenetic tree at
`docs/moving-pictures/empress-tree.qzv`.

### Example 2: Using Empress to visualize a tree in tandem with an ordination

```bash
qiime empress plot \
    --i-tree docs/moving-pictures/rooted-tree.qza \
    --i-pcoa docs/moving-pictures/unweighted_unifrac_pcoa_results.qza \
    --i-feature-table docs/moving-pictures/table.qza \
    --m-sample-metadata-file docs/moving-pictures/sample_metadata.tsv \
    --m-feature-metadata-file docs/moving-pictures/taxonomy.qza \
    --o-visualization docs/moving-pictures/empress-tree-tandem.qzv
```

This generates a visualization of a phylogenetic tree alongside a visualization
of a PCoA plot (using Emperor) at `docs/moving-pictures/empress-tree-tandem.qzv`.

##### Output Artifacts

- `empress-tree.qzv` [view](https://view.qiime2.org/?src=https%3A%2F%2Fraw.githubusercontent.com%2Fbiocore%2Fempress%2Fmaster%2Fdocs%2Fmoving-pictures%2Fempress-tree.qzv) | [download](https://raw.githubusercontent.com/biocore/empress/master/docs/moving-pictures/empress-tree.qzv)
- `empress-tree-tandem.qzv` [view](https://view.qiime2.org/?src=https%3A%2F%2Fraw.githubusercontent.com%2Fbiocore%2Fempress%2Fmaster%2Fdocs%2Fmoving-pictures%2Fempress-tree-tandem.qzv) | [download](https://raw.githubusercontent.com/biocore/empress/master/docs/moving-pictures/empress-tree-tandem.qzv)

This QIIME 2 visualization can be viewed either using `qiime tools view` or by
uploading it to [`view.qiime2.org`](https://view.qiime2.org).

### Screenshot

![Empress screenshot in q2view](https://raw.githubusercontent.com/biocore/empress/master/docs/moving-pictures/screenshot.png)

## Running Empress' Tests

Please see the `tests/README.md` file for instructions on how to run Empress' tests.

## Acknowledgements

This work is supported by IBM Research AI through the AI Horizons Network. For
more information visit the [IBM AI Horizons Network website](https://www.research.ibm.com/artificial-intelligence/horizons-network/).

Empress' JavaScript code is distributed with the source code of various
third-party dependencies (in the `empress/support_files/vendor/` directory).
Please see
[DEPENDENCY_LICENSES.md](https://github.com/biocore/empress/blob/master/DEPENDENCY_LICENSES.md)
for copies of these dependencies' licenses.
