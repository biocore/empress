define([], function () {
    /**
     * This file adds aditional functionality on top of javascripts
     * ArrayBuffer objects.
     *
     * @ return ByteArray
     */
    var ByteArray = {};

    /**
     * Creates a new array whose ith index is the number of times val appears
     * up to the ith index of arr
     *
     * @param {ArrayBuffer} arr Any ArrayBuffer object
     * @param {ArrayBuffer} ArrayType The constructor for the new array
     * @param {Number} val The val to count
     *
     * @return {ArrayBuffer}
     */
    ByteArray.sumVal = function (arr, ArrayType, val) {
        var l = arr.length;
        var sumArr = new ArrayType(arr);
        var total = 0;
        for (var i = 0; i < l; i++) {
            total = arr[i] === val ? total + 1 : total;
            sumArr[i] = total;
        }
        return sumArr;
    };

    /**
     * Creates a new array whose ith index is the index of the first element in
     * arr that equals startVal + i
     *
     * @param {ArrayBuffer} arr Any ArrayBuffer object
     * @param {ArrayBuffer} ArrayType The constructor for the new array
     * @param {Number} startVal The value to start at
     *
     * @return {ArrayBuffer}
     */
    ByteArray.seqUniqueIndx = function (arr, ArrayType, startVal = 1) {
        var l = arr.length;
        var unqArr = [];
        var currentVal = startVal;
        for (var i = 0; i < l; i++) {
            if (arr[i] === currentVal) {
                unqArr.push(i);
                currentVal += 1;
            }
        }
        return new ArrayType(unqArr);
    };

    return ByteArray;
});
