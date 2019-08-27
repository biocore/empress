// Karma configuration
// Generated on Tue Aug 27 2019 05:27:59 GMT-0700 (PDT)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '.',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: [],


    // list of files / patterns to load in the browser
    files: [
        /* QUnit */
      'node_modules/qunit/qunit/qunit.js',
      'node_modules/qunit/qunit/qunit.css',
      'node_modules/karma-qunit/lib/adapter.js',

      /* requireJS */
      'node_modules/requirejs/require.js',
      'node_modules/karma-requirejs/lib/adapter.js',

      'test-main.js',
      { pattern: '*.js', included: false },
      // { pattern: '../empress/support_files/js/*.js', included: false },
      // { pattern: '../empress/support_files/vendor/*.js', included: false }
    ],


    // list of files / patterns to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    // browsers: ['ChromeHeadless', 'Chrome'],
    browsers: ['ChromeHeadless'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
