require(['jquery', 'SidePanel'], function($, SidePanel) {
    $(document).ready(function() {

        // test variables
        var sContainer;
        var panel;

        // Cannot have global test variables since SidePanel creates global
        // html components
        module('Side Bar',{
            setup: function() {
                // create container for panel
                sContainer = document.createElement('div');
                sContainer.id = 'side-panel';
                document.getElementById('qunit').appendChild(sContainer);

                // create side panel
                panel = new SidePanel(sContainer);
            },
            teardown: function() {}
        });

        test('Test SidePanel Constructor', function() {
            // check if header bar was created
            equal(document.getElementsByClassName(panel.HEADER_CLASS).length,
                1);

            // check if search bar was created
            notEqual(document.getElementById(panel.SEARCH_ID), null);

            // check if collapse button was created
            notEqual(document.getElementById(panel.COLLAPSE_ID), null);

            // check if show button was created
            notEqual(document.getElementById(panel.SHOW_ID), null);
        });
    });
});