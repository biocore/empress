define([], function () {
    /**
     * @class SummaryHelper
     * Class functions for generating summary used in empress
     */
    function SummaryHelper() {}

    /**
     * Returns unifrac value for 2 sets of sample IDs given a biom table
     * @param {BiomTable} biomTable - biom table that contains info about samples
     * @param {BPTree} tree - bp tree
     * @param {Array} sIds1 - First array of sample IDs to calculate unifrac for
     * @param {Array} sIds2 - Second array of sample IDs to calculate unifrac for
     *
     * @return{Number}
     */
    SummaryHelper.unifrac = function (biomTable, tree, sIds1, sIds2) {
        var uniq = 0;
        var total = 0;
        var uniqObs1 = biomTable.getObjservationUnionForSamples(sIds1);
        var uniqObs2 = biomTable.getObjservationUnionForSamples(sIds2);

        // Elements are in postorder with first element at index 0
        // To keep track of if the node is in the sample1
        var count1 = new Uint8Array(tree.names_.length);
        // To keep track of if the node is in the sample2
        var count2 = new Uint8Array(tree.names_.length);

        // Based on the info in count1 and count2, calculate branch length
        // Some optimization can be done, maybe perform the operation on the arrays
        for (var i = 1; i < tree.size; i++) {
            var treeIndex = tree.postorderselect(i);
            var node = tree.name(treeIndex);

            // If the node is leaf, check if it is in the union for sample
            if (tree.isleaf(treeIndex)) {
                count1[i - 1] = uniqObs1.includes(node);
                count2[i - 1] = uniqObs2.includes(node);
            }

            // Update parent status
            var parentPostOrder = tree.postorder(tree.parent(treeIndex));
            count1[parentPostOrder - 1] |= count1[i - 1];
            count2[parentPostOrder - 1] |= count2[i - 1];

            var branchLength = tree.length(treeIndex);
            if (branchLength) {
                // Unique branch
                if (count1[i - 1] ^ count2[i - 1]) {
                    uniq += branchLength;
                }
                // The branch belongs to either or both samples
                if (count1[i - 1] || count2[i - 1]) {
                    total += branchLength;
                }
            }
        }

        return total == 0 ? 0 : uniq / total;
    };

    return SummaryHelper;
});