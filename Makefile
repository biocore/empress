.PHONY: test

test:
	@# Note: this assumes you're running this on a Linux/macOS system
	qunit-puppeteer file://$(shell pwd)/tests/index.html
