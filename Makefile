# Based on https://github.com/biocore/qurro/blob/master/Makefile.
# This file contains a few directives that make it easy to run all tests for
# Empress ("make test", run style-checking ("make stylecheck"), auto-format the
# JS code ("make jsstyle"), etc.
#
# Requires that a few command-line utilities are installed; see the Travis-CI
# config file (.travis.yml) for examples of installing these utilities.

.PHONY: test pytest jstest stylecheck jsstyle githook

JSLOCS = empress/support_files/js/*.js

test: pytest jstest

pytest:
	nosetests tests/python

jstest:
	@# Note: this assumes you're running this on a Linux/macOS system
	qunit-puppeteer file://$(shell pwd)/tests/index.html

# Lints and checks code style
stylecheck:
	jshint $(JSLOCS)
	prettier --check --tab-width 4 $(JSLOCS)
	flake8 empress/*.py tests/python/*.py setup.py

# Auto-formats the JS code
jsstyle:
	@# To be extra safe, do a dry run of prettier and check that it hasn't
	@# changed the code's abstract syntax tree (AST)
	prettier --debug-check --tab-width 4 $(JSLOCS)
	prettier --write --tab-width 4 $(JSLOCS)

githook:
	@# Try to add in a pre-commit hook that runs "make stylecheck"
	@# Solution loosely inspired by
	@# https://www.viget.com/articles/two-ways-to-share-git-hooks-with-your-team/
	echo "#!/bin/bash\nmake stylecheck" > .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit
