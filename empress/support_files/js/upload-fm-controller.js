define(['Parser'], function (Parser) {
    
    function UploadFMController(model) {
        this.model = model;
        this.uploadFileInput = document.getElementById("upload-fmetadata-input");

        var scope = this;
        this.uploadFileInput.addEventListener("change", function() {
            var parser = new Parser(scope.uploadFileInput.files[0], function(fmCols, metadata) {
                scope.model.uploadFMetadata(fmCols, metadata);
            });
            parser.parse();
            
        });
    }

    return UploadFMController;
});
