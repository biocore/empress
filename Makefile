# Based on https://github.com/biocore/qurro/blob/master/Makefile.
# This file contains a few directives that make it easy to run all tests for
# Empress ("make test", run style-checking ("make stylecheck"), auto-format the
# JS code ("make jsstyle"), etc.
#
# Requires that a few command-line utilities are installed; see the Travis-CI
# config file (.travis.yml) for examples of installing these utilities.

.PHONY: test pytest jstest stylecheck jsstyle githook docs

JSLOCS = empress/support_files/js/*.js tests/*.js
CSSLOCS = empress/support_files/css/*.css

test: pytest jstest

pytest:
	nosetests tests/python

jstest:
	@# Note: this assumes you're running this on a Linux/macOS system
	qunit-puppeteer file://$(shell pwd)/tests/index.html

# Lints and checks code style
stylecheck:
	jshint $(JSLOCS)
	prettier --check --tab-width 4 $(JSLOCS) $(CSSLOCS)
	flake8 empress/*.py tests/python/*.py setup.py

# Auto-formats the JS code
jsstyle:
	@# To be extra safe, do a dry run of prettier and check that it hasn't
	@# changed the code's abstract syntax tree (AST)
	prettier --debug-check --tab-width 4 $(JSLOCS) $(CSSLOCS)
	prettier --write --tab-width 4 $(JSLOCS) $(CSSLOCS)

githook:
	@# Try to add in a pre-commit hook that runs "make stylecheck"
	@# Solution loosely inspired by
	@# https://www.viget.com/articles/two-ways-to-share-git-hooks-with-your-team/
	echo "#!/bin/bash\nmake stylecheck" > .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit

docs:
	@# For now, this just regenerates the moving pictures QZV
	@# Assumes you're in a QIIME 2 conda environment
	qiime empress tree-plot \
		--i-tree docs/moving-pictures/rooted-tree.qza \
		--o-visualization docs/moving-pictures/plain.qzv
	qiime empress tree-plot \
		--i-tree docs/moving-pictures/rooted-tree.qza \
		--m-feature-metadata-file docs/moving-pictures/taxonomy.qza \
		--o-visualization docs/moving-pictures/just-fm.qzv
	qiime empress community-plot \
		--i-tree docs/moving-pictures/rooted-tree.qza \
		--i-feature-table docs/moving-pictures/table.qza \
		--m-sample-metadata-file docs/moving-pictures/sample_metadata.tsv \
		--m-feature-metadata-file docs/moving-pictures/taxonomy.qza \
		--o-visualization docs/moving-pictures/empress-tree.qzv
	qiime empress community-plot \
		--i-tree docs/moving-pictures/rooted-tree.qza \
		--i-feature-table docs/moving-pictures/table.qza \
		--i-pcoa docs/moving-pictures/unweighted_unifrac_pcoa_results.qza \
		--m-sample-metadata-file docs/moving-pictures/sample_metadata.tsv \
		--m-feature-metadata-file docs/moving-pictures/taxonomy.qza \
		--o-visualization docs/moving-pictures/empire.qzv \
		--p-filter-extra-samples
	qiime empress community-plot \
		--i-tree docs/moving-pictures/rooted-tree.qza \
		--i-pcoa docs/moving-pictures/biplot.qza \
		--i-feature-table docs/moving-pictures/table.qza \
		--m-sample-metadata-file docs/moving-pictures/sample_metadata.tsv \
		--m-feature-metadata-file docs/moving-pictures/taxonomy.qza \
		--o-visualization docs/moving-pictures/empire-biplot.qzv \
		--p-filter-extra-samples \
		--p-number-of-features 10
