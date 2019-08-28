var allTestFiles = []
var TEST_REGEXP = /test/

// Get a list of all the test files to include
// This will be usefull to only load tests files once the soure and vendor files
// are used
Object.keys(window.__karma__.files).forEach(function (file) {
  if (TEST_REGEXP.test(file)) {
    // console.log(file)
    // Normalize paths to RequireJS module names.
    // If you require sub-dependencies of test files to be loaded as-is (requiring file extension)
    // then do not normalize the paths
    var normalizedTestModule = file.replace(/^\/base\/|\.js$/g, '')
    allTestFiles.push(normalizedTestModule)
  }
})

// QUnit.config.autostart = false;
require.config({
  // Karma serves files under /base, which is the basePath from your config file
  baseUrl: '/base',

  shim: {
    'qunit' : {exports : 'qunit'}
  },

  // dynamically load all test files
  deps: ['tests/test-hello'],

  // we have to kickoff jasmine, as it is asynchronous
  callback: window.__karma__.start
});
