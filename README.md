# Empress
[![Build Status](https://travis-ci.org/biocore/empress.svg?branch=master)](https://travis-ci.org/biocore/empress)

Empress is currently being rebuilt. Please see legacy branch for the last stable build.

## Running tests

Empress' JavaScript tests use [QUnit](https://qunitjs.com/), which is included
in the `tests/vendor/` directory.

You can run tests in two different ways:

1. **Manually, in a web browser:** you can do this by just opening up
   `tests/index.html` in your web browser of choice.
2. **Headlessly, from the command line:** This can be done using the
   [qunit-puppeteer](https://github.com/davidtaylorhq/qunit-puppeteer) package.
See the next section for instructions on how to do this.

### Running tests headlessly

(These commands assume you're using a Linux or macOS system, and that you have
Google Chrome installed. If this isn't the case, these commands might not work
for you.)

First off, install qunit-puppeteer. You only need to do this once for any
computer you're running Empress on.

```bash
$ npm install -g qunit-puppeteer
```

Once qunit-puppeteer has been installed, you should be able to run tests from
the command line!

```bash
$ make test
```
