require(['jquery', 'SidePanel'], function($, SidePanel) {
    $(document).ready(function() {
        module('Side Bar',{
            setup: function() {
                // create container for panel
                this.sContainer = document.createElement('div');
                this.sContainer.id = 'side-panel';
                document.getElementById('qunit').appendChild(this.sContainer);

                // create side panel
                this.panel = new SidePanel(this.sContainer);
            },
            teardown: function() {}
        });

        test('Test SidePanel Constructor', function() {
            // check if header bar was created
            equal(document.getElementsByClassName(
                this.panel.HEADER_CLASS).length, 1);

            // check if search bar was created
            notEqual(document.getElementById(this.panel.SEARCH_ID), null);

            // check if collapse button was created
            notEqual(document.getElementById(this.panel.COLLAPSE_ID), null);

            // check if show button was created
            notEqual(document.getElementById(this.panel.SHOW_ID), null);
        });
    });
});