require(["AnimationPanel", "Colorer"], function(AnimationPanel, Colorer) {
    module("animation-panel-handler", {
        setup: function() {
            // add test compenents to this div
            var div = document.getElementById("test-div");

            // setup all GUI components
            var colorSelect = document.createElement("select");
            colorSelect.setAttribute("id", "animate-color-select");
            div.appendChild(colorSelect);

            var gradient = document.createElement("select");
            gradient.setAttribute("id", "animate-gradient");
            div.appendChild(gradient);

            var trajectory = document.createElement("select");
            trajectory.setAttribute("id", "animate-trajectory");
            div.appendChild(trajectory);

            var hideChk = document.createElement("checkbox");
            hideChk.setAttribute("id", "animate-hide-non-feature");
            div.appendChild(hideChk);

            var startBtn = document.createElement("button");
            startBtn.setAttribute("id", "animate-start-btn");
            div.appendChild(startBtn);

            var stopBtn = document.createElement("button");
            stopBtn.setAttribute("id", "animate-stop-btn");
            div.appendChild(stopBtn);

            var pauseBtn = document.createElement("button");
            pauseBtn.setAttribute("id", "animate-pause-btn");
            div.appendChild(pauseBtn);

            var resumeBtn = document.createElement("button");
            resumeBtn.setAttribute("id", "animate-resume-btn");
            div.appendChild(resumeBtn);

            var prevFrameBtn = document.createElement("button");
            prevFrameBtn.setAttribute("id", "animate-prev-btn");
            div.appendChild(prevFrameBtn);

            var nextFrameBtn = document.createElement("button");
            nextFrameBtn.setAttribute("id", "animate-next-btn");
            div.appendChild(nextFrameBtn);

            // create animate-panel
            this.panel = new AnimationPanel(null);

            // same init as test-empress
        },

        teardown: function() {

        }
    });

    test("__startOptions", function() {
        this.panel.__startOptions();
        // the followinng should be hidden
        ok(this.panel.stopBtn.classList.contains("hidden"));
        ok(this.panel.pauseBtn.classList.contains("hidden"));
        ok(this.panel.resumeBtn.classList.contains("hidden"));
        ok(this.panel.prevFrameBtn.classList.contains("hidden"));
        ok(this.panel.nextFrameBtn.classList.contains("hidden"));

        // show the following buttons
        ok(!this.panel.startBtn.classList.contains("hidden"));
    });

    test("__pauseOptions", function() {
        this.panel.__pauseOptions();
        // the followinng should be hidden
        ok(this.panel.startBtn.classList.contains("hidden"));
        ok(this.panel.resumeBtn.classList.contains("hidden"));
        ok(this.panel.prevFrameBtn.classList.contains("hidden"));
        ok(this.panel.nextFrameBtn.classList.contains("hidden"));

        // show the following buttons
        ok(!this.panel.stopBtn.classList.contains("hidden"));
        ok(!this.panel.pauseBtn.classList.contains("hidden"));
    });

    // test("__resumeOptions", function() {
    //     this.panel.__resumeOptions();
    //     // the followinng should be hidden
    //     ok(this.panel.startBtn.classList.contains("hidden"));
    //     ok(this.panel.resumeBtn.classList.contains("hidden"));
    //     ok(this.panel.prevFrameBtn.classList.contains("hidden"));
    //     ok(this.panel.nextFrameBtn.classList.contains("hidden"));

    //     // show the following buttons
    //     ok(!this.panel.stopBtn.classList.contains("hidden"));
    //     ok(!this.panel.pauseBtn.classList.contains("hidden"));
    // });

    test("__toogleSelects, true", function() {
        this.panel.__toogleSelects(true);
        ok(this.panel.colorSelect.disabled);
        ok(this.panel.gradient.disabled);
        ok(this.panel.trajectory.disabled);
    });

    test("__toogleSelects, false", function() {
        this.panel.__toogleSelects(false);
        ok(!this.panel.colorSelect.disabled);
        ok(!this.panel.gradient.disabled);
        ok(!this.panel.trajectory.disabled);
    });
});