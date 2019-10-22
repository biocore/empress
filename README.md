# Empress
[![Build Status](https://travis-ci.org/biocore/empress.svg?branch=master)](https://travis-ci.org/biocore/empress)

Empress is a fast and scalable phylogenetic tree viewer.

## Installation

To install the current development version, we recommend creating a new conda
environment:

```bash
conda create -n empress python=3.6 numpy scipy pandas cython
conda install -c bioconda scikit-bio biom-format
pip install .
```

## Empress' tests

Please see the `tests/README.md` file for instructions on how to run Empress' tests.
