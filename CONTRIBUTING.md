# Contributing to Empress

## Setting up an Empress development environment

You should be able to install Empress as described in the README. However,
instead of running `pip install .`, please run `pip install -e .[all]`. This
will install some various dependencies needed to test Empress' python code. In
addition, make sure you install the latest development version of Emperor using
`pip install git+https://github.com/biocore/emperor.git`.

You will also need to install a few Node.js packages in order to test Empress'
JavaScript code. The `.travis.yml` file (under the `install` section) shows
how to install these packages: essentially, you'll just need to run

```bash
npm install -g qunit-puppeteer jshint prettier
```

If you don't have `npm` installed, you will need to install that first.

**Note**: if you can't install puppeteer, the test suite can be run using a
web browser by opening the page in `tests/index.html`.

## Running tests

The Makefile contained in the root of the Empress repository is the easiest way
to run Empress' tests.

You can run both the Python and JavaScript tests by running

```bash
make test
```

If you just want to run the Python or JavaScript tests, you can run
`make pytest` or `make jstest` respectively.

## Front-end development

For convenience, a utility script `./tests/python/make-dev-page.py` is bundled
in the test suite. This script works best if you install the package in
"editable mode" i.e. by running `pip install -e .` from the base directory.

After installing the package, the script can be run without any arguments. This
will load the moving pictures dataset and create a page
`development-page.html`. Using this page developers can modify CSS and JS files
and simply reload the page on the browser to see their changes take effect.
Alternatively, you can set the input data for development using the various
options and arguments in the script. For a full list of options and arguments,
you can run `./tests/python/make-dev-page.py --help`.

Note, modifications to the Python code, or the template code require that you
re-generate `development-page.html`.

## Linting and style-checking

Empress' python code is linted/style-checked using `flake8`.
Empress' JavaScript code is linted using `jshint` and style-checked using
`prettier`.

Assuming you have these dependencies installed (see above for instructions),
you can just run

```bash
make stylecheck
```

to see if your code passes these checks.

**`make stylecheck` will be run on Travis-CI**, so it's useful to run this
periodically while developing to make sure that your code looks good (and so
you can address any issues as they come up, rather than all at once when trying
to submit a pull request).

### Running `make stylecheck` automatically before every commit

If you'd like to ensure that `make stylecheck` is run automatically before you
can commit something locally -- thus ensuring that the stuff you do commit
is well-formatted -- then you can run

```bash
make githook
```

to add on a [pre-commit hook](https://githooks.com/) to your Empress git
repository that just runs `make stylecheck`.

## Auto-formatting the JavaScript code

Although some code issues (e.g. many things identified by jshint) will require
manual resolution, you can use `prettier` to automatically format your
JavaScript code. This can be done by just running

```bash
make jsstyle
```
