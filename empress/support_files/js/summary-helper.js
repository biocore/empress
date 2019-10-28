define([], function() {

    /**
     * @class SummaryHelper
     * Class functions for generating summary used in empress
     */
    function SummaryHelper() { };

    /**
     * Returns unifrac value for 2 set of sample IDs given biom table
     * @param {BiomTable} biomTable - biom table that contains info about samples
     * @param {BPTree} tree - bp tree
     * @param {Array} sIds1 - First array of sample IDs to calculate unifrac for
     * @param {Array} sIds2 - Second array of sample IDs to calculate unifrac for
     *
     * @return{Number}
     */
     SummaryHelper.unifrac = function(biomTable, tree, sIds1, sIds2) {
        var uniq = 0;
        var total = 0;
        uniqObs1 = biomTable.getObjservationUnionForSamples(sIds1)[0];
        uniqObs2 = biomTable.getObjservationUnionForSamples(sIds2)[0];

        for (var i = 1; i <= tree.size; i++) {
            if (tree.postorderselect(i) !== tree.root()) {
                var treeIndex = tree.postorderselect(i);
                var node = tree.name(treeIndex);

                var inObs1 = uniqObs1.has(node);
                var inObs2 = uniqObs2.has(node);
                if (inObs1 ^ inObs2){
                  uniq += tree.length(treeIndex);
                }
                if (inObs1 || inObs2) {
                  total += tree.length(treeIndex);
                }
            }
        }
        return uniq / total;
    };

    return SummaryHelper;
});
