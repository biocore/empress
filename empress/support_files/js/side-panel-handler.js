define(['ColorSelect'], function(ColorSelect) {

    // class name for css tags
    var COLLAPSE_CLASS = 'collapsible';
    /**
     *
     * @class SidePanel
     *
     * Creates table for the side panel and handles their events events. This
     * class will init a side panel with the search bar and collapse button.
     * Additional tabs such as Sample Metadata can be added by calling their
     * initialization function.
     *
     * @param {div} the container where the side panel will live.
     * @param {Empress} The tree/metadata
     *
     * @return {SidePanel}
     * @constructs SidePanel
     */
    function SidePanel(container, empress) {
        // the container for the side menu
        this.container = container;
        this.SIDE_PANEL_ID = container.id;

        // names of header components
        this.HEADER_CLASS = 'side-header';
        this.SEARCH_ID = 'quick-search';
        this.COLLAPSE_ID = 'hide-ctrl';
        this.SHOW_ID = 'show-ctrl';

        // used to event triggers
        this.empress = empress;

        this.colorSelect = new ColorSelect();

        // used in event closers
        var panel = this;

        //header bar container
        var header = document.createElement('p',);
        header.classList.add(this.HEADER_CLASS);

        // search bar
        var search = document.createElement('input');
        search.id = this.SEARCH_ID;
        search.placeholder = 'Search...';
        search.title = 'Enter a taxonomic name to search';
        search.style = 'width: 100%;';
        header.appendChild(search);

        // triggers search when enter key is pressed in search menu
        search.keyup = function(e) {
            e.preventDefault();
            if (e.keyCode === 13) {
                // TODO: model search function goes here
            }
        };

        // triggers the 'active' look when user enters the search bar
        search.focus = function() {
            document.getElementById(panel.SIDE_PANEL_ID).classList
                .add("panel-active");
        };

        // triggers the 'unactive' look when user leaves search bar
        search.blur = function() {
            document.getElementById(panel.SIDE_PANEL_ID)
                .classList.toggle("panel-active",
                  document.querySelector(".side-content:not(.hidden)"));
        };

        // collapse menu button
        var collapse = document.createElement('button');
        collapse.id = this.COLLAPSE_ID;
        collapse.title = 'Hide control panel';
        collapse.innerHTML = '&#9701;';
        collapse.style = 'font-size: 10pt; padding: 0 0 3px 3px;';
        header.appendChild(collapse);

        // hides the side menu
        collapse.onclick = function() {
            document.getElementById(panel.SIDE_PANEL_ID)
                .classList.add("hidden");
            document.getElementById(panel.SHOW_ID).classList.remove("hidden");
        }

        // show side menu button
        var show = document.createElement('button');
        show.id = this.SHOW_ID;
        show.classList.add('hidden');
        show.title = 'Show control panel';
        show.innerHTML = '&#9699;';
        show.style = 'font-size: 10pt; padding: 0 0 3px 3px;';

        // shows the side menu
        show.onclick = function() {
            document.getElementById(panel.SHOW_ID).classList.add("hidden");
            document.getElementById(panel.SIDE_PANEL_ID)
                .classList.remove("hidden");
        }

        // add header to top of side menu
        this.container.appendChild(header);
        this.container.parentNode.appendChild(show);
    };

    SidePanel.prototype.createCatSelector = function(lblMsg, chkId, selId,
            selOpts, numId=null, numMsg=null) {
        // holds the category selector
        var container = document.createElement('p');

        // label for checkbox
        var lbl = document.createElement('label');
        lbl.for = chkId;
        lbl.innerHTML = lblMsg;
        container.appendChild(lbl);

        // toggle button for the category select
        var chkbox = document.createElement('input');
        chkbox.id = chkId;
        chkbox.type = 'checkbox';
        container.appendChild(chkbox);

        // add number controller to allow user to adjust how many items are
        // displayed
        if (numId != null) {
            var numCtrl = document.createElement('input');
            numCtrl,id = numId;
            numCtrl.type = 'number';
            numCtrl.title = numMsg;
            numCtrl.disabled = true;
            container.appendChild(numCtrl);
        }

        // container for select box
        var selContainer = document.createElement('label');
        selContainer.classList.add('select-container');
        container.appendChild(selContainer);

        // select box
        var sel = document.createElement('select');
        sel.id = selId;
        sel.disabled = true;
        for (var i = 0; i < selOpts.length; i++) {
            var opt = document.createElement('option');
            opt.value = selOpts[i];
            opt.innerHTML = selOpts[i];
            sel.appendChild(opt);
        }
        selContainer.appendChild(sel);

        return container;
    }

    SidePanel.prototype.createColorMap_  = function() {
        // color map row
        var container = document.createElement('p');
        container.classList.add('hidden');
        // color select
        var lbl = document.createElement('label');
        lbl.innerHTML = 'Choose Color Map';
        container.appendChild(lbl);

        var colorSel = this.colorSelect.createSelect()
        container.appendChild(colorSel);

        container.select = colorSel;

        return container;
    }

    SidePanel.prototype.addSampleTab = function() {
        // for use in closers
        var sp = this;

        // collapse button
        var tab = document.createElement('button');
        tab.classList.add('side-header');
        tab.classList.add('collapsible');
        tab.innerHTML = 'Sample Coloring';

        // container that holds the different option to color sample data
        var container = document.createElement('div');
        container.classList.add('side-content');
        container.classList.add('control');
        container.classList.add('hidden');

        // sample category selector
        var lblMsg = 'Color by...';
        var chkId = 'sample-color';
        var selId = 'sample-color-options';
        var sampleContainer = this.createCatSelector(lblMsg, chkId, selId,
            this.empress.getSampleCats());
        container.appendChild(sampleContainer);

        // The color map selector
        var cm = this.createColorMap_();
        cm.select.onchange(function() {
            console.log(cm.select.getColor());
        });
        container.appendChild(cm);

        // toggle the sample/color map selectors
        sampleContainer.onclick = function() {
            var chkbox = document.getElementById('sample-color');
            var sel = document.getElementById('sample-color-options');
            if (chkbox.checked) {
                sel.disabled = false;
                cm.classList.remove('hidden');
                sp.empress.colorBySample();
                sp.empress.drawTree();
            }
            else {
                sel.disabled = true;
                cm.classList.add('hidden');
                sp.empress.resetTree();
                sp.empress.drawTree();
            }
        };


        // add sample tob to side panel
        this.container.appendChild(tab);
        this.container.appendChild(container);
    };

     return SidePanel;
});