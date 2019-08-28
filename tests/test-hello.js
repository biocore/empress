/* Hello world test for headless chrome test */

require([], function() {
    // $(document).ready(function() {
        QUnit.test('hello world', function(assert) {
            assert.equal(1,1,'works');
        });
    // });
})