require(['jquery', 'Colorer'], function($, Colorer) {
    $(document).ready(function() {
        // Setup test variables
        module('Colorer' , {
            setup: function() {
            },

            teardown: function() {
            }
        });
        test('Test that default QIIME colors are correct', function() {
            // I copied this in from https://github.com/biocore/emperor/blob/659b62a9f02a6423b6258c814d0e83dbfd05220e/emperor/support_files/js/color-view-controller.js#L624,
            // so this lets us guarantee that (at least in terms of the default
            // discrete color values) Emperor and Empress are consistent >:)
            var exp_qiime_colors = [
                '#ff0000', '#0000ff', '#f27304', '#008000', '#91278d',
                '#ffff00', '#7cecf4', '#f49ac2', '#5da09e', '#6b440b',
                '#808080', '#f79679', '#7da9d8', '#fcc688', '#80c99b',
                '#a287bf', '#fff899', '#c49c6b', '#c0c0c0', '#ed008a',
                '#00b6ff', '#a54700', '#808000', '#008080'
            ];
            for (var i = 0; i < exp_qiime_colors.length; i++) {
                equal(Colorer.__qiimeDiscrete[i], exp_qiime_colors[i]);
            }
        });
    });
});
