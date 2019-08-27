var allTestFiles = []
// // var TEST_REGEXP = /(spec|test)\.js$/i
var TEST_REGEXP = /test/

// Get a list of all the test files to include
Object.keys(window.__karma__.files).forEach(function (file) {
  console.log(file)
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
console.log({tests: allTestFiles});
require.config({
  // Karma serves files under /base, which is the basePath from your config file
  baseUrl: '/base',

  shim: {
    'qunit' : {exports : 'qunit'}
  },

  // dynamically load all test files
  deps: ['test-hello'],

  // we have to kickoff jasmine, as it is asynchronous
  callback: window.__karma__.start
});
// require.config({
//   // Karma serves files under /base, which is the basePath from your config file
//   'baseUrl': '/base/../empress',

//   // all paths are relative to baseUrl, note that .js extension should
//   // // not be used
//   // 'paths' : {
//   //   /* vendor paths */
//   //   'jquery' : './support_files/vendor/jquery-2.2.4.min',
//   //   'glMatrix' : './support_files/vendor/gl-matrix.min',

//   //   /* succinct tree paths */
//   //   'ByteArray': './support_files/js/byte-array',
//   //   'BPTree' : './support_files/js/bp-tree',
//   //   'Camera' : './support_files/js/camera',

//   //   // /* test paths */
//   //   // 'testBPTree' : './../tests/test-bp-tree',
//   //   // 'testByteTree' : './../tests/test-byte-array',
//   //   // 'testCamera' : './../tests/test-camera',
//   // },

//   // dynamically load all test files
//   deps: allTestFiles,

//   // we have to kickoff jasmine, as it is asynchronous
//   callback: window.__karma__.start
// })
