define(["underscore", "papa", "util"], function (_, Papa, util) {
    /**
     * @class Parser
     *
     * Parses tab seperated feature metadata files (.tsv)
     * 
     *
     * @return {Parser}
     * constructs Parser
     */
    function Parser(file, callback) {
        this.file = file;
        this.callback = callback;
        this.success = false;
        this.caseInsensitiveIDHeader = [
            "id",
            "sampleid",
            "sample id",
            "sample-id",
            "featureid",
            "feature id",
            "feature-id",
        ];
        this.caseSensitiveIDHeader = [
            "#SampleID",
            "#Sample ID",
            "#OTUID",
            "#OTU ID",
            "sample_name",
        ];

        var scope = this;

        // right now the only validation we are doing is checking to make sure
        // the id header matches what qiime2 expects.
        // https://docs.qiime2.org/2019.10/tutorials/metadata/
        var validate = function(results, file) {
            // remove trailing and leading white space from field headers
            var fields = results.meta.fields;
            fields = _.map(fields, function(field) {return field.trim();});

            // check if id header is valid. see qiime2 documentation for info.
            // https://docs.qiime2.org/2019.10/tutorials/metadata/
            var header = fields[0];
            var checkHeader = (validHeaders, header) =>
                    validHeaders.findIndex(validHeader =>
                        validHeader === header
                    );
            if ( // check case insensitive ID headers
                checkHeader(scope.caseInsensitiveIDHeader, header.toLowerCase())
                    !== -1 ||
                checkHeader(scope.caseSensitiveIDHeader, header)
                    !== -1
            ) {
                scope.success = true;
            }
            
            if (scope.success) {
                scope.callback(fields, results.data);
            } else {
                window.alert("Error: " +
                    "'" + header + "' is an invalid Identifier Column name! " +
                    "Please see Qiime2 documentation.\n\n" +
                    "https://docs.qiime2.org/2020.11/tutorials/metadata/")
            }
        }
        this.config = {
            delimiter: "\t",  // auto-detect
            newline: "",    // auto-detect
            quoteChar: '"',
            escapeChar: '"',
            comments: "#\t",
            header: true,
            dynamicTyping: false,
            preview: 0,
            encoding: "",
            worker: false,
            step: undefined,
            complete: validate, // controls what happens after file is parsed
            download: false,
            skipEmptyLines: "greedy",
            // delimitersToGuess: ['\t']
        }
    }

    Parser.prototype.parse = function () {
        // calls validate() when done
        Papa.parse(this.file, this.config);
        
    };

    return Parser;
});
