# Empress' tests

Empress' JavaScript tests use [QUnit](https://qunitjs.com/), which is included
in the `vendor/` directory.

You can run tests in two different ways:

1. **Manually, in a web browser:** you can do this by just opening up
   `index.html` in your web browser of choice.
2. **Headlessly, from the command line:** This can be done using the
   [qunit-puppeteer](https://github.com/davidtaylorhq/qunit-puppeteer) package.
   See the next section for instructions on how to do this.

## Running Empress' tests headlessly

(These commands assume you're using a Linux or macOS system, and that you have
Google Chrome installed. If this isn't the case, these commands might not work
for you.)

First off, install qunit-puppeteer. You only need to do this once for any
computer you're running Empress on.

```bash
npm install -g qunit-puppeteer
```

Once qunit-puppeteer has been installed, you should be able to run tests from
the command line! (You'll need to run this from the root directory of the
Empress repository -- that is, the one above this one.)

```bash
make test
```
