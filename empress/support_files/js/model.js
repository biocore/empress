define([], function() {
    /**
     *
     * @class EmpressTree
     *
     */
    function Model(tree) { //, sampleData=null, otuTable=null, treeData=null) {
        /**
         * @type {BPTree}
         * The phylogentic balance parenthesis tree
         * @private
         */
        this.tree_ = tree;

        /**
         * @type {Dictionary}
         * sample metadata.
         * Format:
         * {
         *   sampleID1: {cat1: ..., cat2: ...},
         *   sampleID2: {cat1: ..., cat2: ...},
         *   ...
         * }
         * @private
         */
        // this.sampleData = sampleData;

        /**
         * @type {Dictionary}
         * Store which otus where observered in each sample along with there
         * frequency.
         * Format:
         * {
         *   sampleID1: [(otu, freq), (otu, freq), ...],
         *   sampleID2: [(otu, freq), (otu, freq), ...],
         *   ...
         * }
         */
        // this.otuTable = otuTable;

        /**
         * @type {Dictionary}
         * Tip/node metedata
         * Format:
         * {
         *   Tip/NodeID1: {cat1: ..., cat2: ...},
         *   Tip/NodeID2: {cat1: ..., cat2: ...},
         *   ...
         * }
         * Note: The tip/node Id must match its name in the newick tree
         */
        // this.treeData = treeData;
    };

    return Model;
});