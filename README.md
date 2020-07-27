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
- `biplot.qza` [view](https://view.qiime2.org/?src=https%3A%2F%2Fraw.githubusercontent.com%2Fbiocore%2Fempress%2Fmaster%2Fdocs%2Fmoving-pictures%2Fbiplot.qza) | [download](https://raw.githubusercontent.com/biocore/empress/master/docs/moving-pictures/biplot.qza) - this artifact was generated using the `qiime diversity pcoa-biplot command.

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

![Empress screenshot in q2view](https://raw.githubusercontent.com/biocore/empress/master/docs/moving-pictures/screenshot.png)

### Example 2: Using Empress to visualize a tree in tandem with an ordination

**Note**: When your ordination was created from a subset of your original
dataset (e.g. the feature table was rarefied, or certain low-frequency features
or samples were otherwise filtered out), we recommend that you carefully
consider *which* feature table you would like to visualize in Empress. You can
use either:

- A *filtered table* that matches the ordination (e.g. with rarefaction done,
  and/or with low-abundance features/samples removed), or
- A *raw table* -- that is, the original table before performing
  rarefaction/filtering for the ordination.

There are some pros and cons for either of these choices. If you use a
*filtered table*, then the Empress visualization will include less data than in
the *raw dataset*: this will impact sample presence information, sample
metadata coloring, and other parts of the visualization. If you select the *raw
table*, you might find that some nodes in the tree won't be represented by any
of the samples in the ordination (if the ordination was made using a *filtered
table*, and `--p-no-filter-unobserved-features-from-phylogeny` is used).
If you'd like to read more about this, there's some informal
discussion in [pull request 237](https://github.com/biocore/empress/pull/237).

The command below uses the *raw dataset* and removes extra samples not
represented in the ordination (using the `--p-filter-extra-samples` flag):

```bash
qiime empress plot \
    --i-tree docs/moving-pictures/rooted-tree.qza \
    --i-pcoa docs/moving-pictures/unweighted_unifrac_pcoa_results.qza \
    --i-feature-table docs/moving-pictures/table.qza \
    --m-sample-metadata-file docs/moving-pictures/sample_metadata.tsv \
    --m-feature-metadata-file docs/moving-pictures/taxonomy.qza \
    --o-visualization docs/moving-pictures/empress-tree-tandem.qzv \
    --p-filter-extra-samples
```

This generates a visualization of a phylogenetic tree alongside a visualization
of a PCoA plot (using Emperor) at `docs/moving-pictures/empress-tree-tandem.qzv`.

![Empress and Emperor example GIF in q2view](https://user-images.githubusercontent.com/4177727/87364282-221e5b80-c528-11ea-9aac-383518307a75.gif)

### Example 3: Using Empress to visualize a tree in tandem with a biplot

Empress also supports visualizing biplot ordinations i.e. ordinations that
include arrows representing explanatory variables in the dataset. In this case
users should pay attention to the `--p-number-of-features` to select the number
of arrows to visualize.

For biplots, when the user clicks on an arrow, the corresponding node in the
tree will be revealed. As a side-effect samples where this feature was present
will also be highlighted in the Emperor interface.

Additionally, the inputed feature metadata is also available in the Emperor UI.

```bash
qiime empress plot \
    --i-tree docs/moving-pictures/rooted-tree.qza \
    --i-pcoa docs/moving-pictures/biplot.qza \
    --i-feature-table docs/moving-pictures/table.qza \
    --m-sample-metadata-file docs/moving-pictures/sample_metadata.tsv \
    --m-feature-metadata-file docs/moving-pictures/taxonomy.qza \
    --o-visualization docs/moving-pictures/empress-tree-tandem-biplot.qzv \
    --p-filter-extra-samples \
    --p-number-of-features 10
```

![Empress and Emperor with biplot example GIF in q2view](https://user-images.githubusercontent.com/375307/88004768-945ce600-cabc-11ea-9894-bb6ba5ffcee8.gif)

##### Output Artifacts

- `empress-tree.qzv` [view](https://view.qiime2.org/?src=https%3A%2F%2Fraw.githubusercontent.com%2Fbiocore%2Fempress%2Fmaster%2Fdocs%2Fmoving-pictures%2Fempress-tree.qzv) | [download](https://raw.githubusercontent.com/biocore/empress/master/docs/moving-pictures/empress-tree.qzv)
- `empress-tree-tandem.qzv` [view](https://view.qiime2.org/?src=https%3A%2F%2Fraw.githubusercontent.com%2Fbiocore%2Fempress%2Fmaster%2Fdocs%2Fmoving-pictures%2Fempress-tree-tandem.qzv) | [download](https://raw.githubusercontent.com/biocore/empress/master/docs/moving-pictures/empress-tree-tandem.qzv)
- `empress-tree-tandem-biplot.qzv` [view](https://view.qiime2.org/?src=https%3A%2F%2Fraw.githubusercontent.com%2Fbiocore%2Fempress%2Fmaster%2Fdocs%2Fmoving-pictures%2Fempress-tree-tandem-biplot.qzv) | [download](https://raw.githubusercontent.com/biocore/empress/master/docs/moving-pictures/empress-tree-tandem-biplot.qzv)

This QIIME 2 visualization can be viewed either using `qiime tools view` or by
uploading it to [`view.qiime2.org`](https://view.qiime2.org).

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
