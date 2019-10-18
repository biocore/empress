# Based on https://github.com/biocore/qurro/blob/master/Makefile.
# This file contains a few directives that make it easy to run all tests for
# Empress ("make test", run style-checking ("make stylecheck"), auto-format the
# front-end code ("make festyle"), etc.
#
# Requires that a few command-line utilities are installed; see the Travis-CI
# config file (.travis.yml) for examples of installing these utilities.

.PHONY: test pytest jstest stylecheck festyle

JSLOCS = empress/support_files/js/*.js
HTMLCSSLOCS = empress/support_files/css/*.css empress/support_files/templates/*.html

test: pytest jstest

pytest:
	nosetests tests/python

jstest:
	@# Note: this assumes you're running this on a Linux/macOS system
	qunit-puppeteer file://$(shell pwd)/tests/index.html

# Lints and checks code style
stylecheck:
	jshint $(JSLOCS)
	prettier --check --tab-width 4 $(JSLOCS) $(HTMLCSSLOCS)
	flake8 empress/*.py tests/python/*.py setup.py

# Auto-formats the JS, HTML, and CSS code
festyle:
	@# To be extra safe, do a dry run of prettier and check that it hasn't
	@# changed the code's abstract syntax tree (AST)
	prettier --debug-check --tab-width 4 $(JSLOCS) $(HTMLCSSLOCS)
	prettier --write --tab-width 4 $(JSLOCS) $(HTMLCSSLOCS)
