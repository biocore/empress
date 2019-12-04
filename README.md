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
