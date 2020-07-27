require(["jquery", "ByteArray", "BPTree"], function ($, ByteArray, BPTree) {
    $(document).ready(function () {
        // Note: for some of the tests, set the first n elements of array
        //       equal to 1-n
        module("Byte Array", {
            setup: function () {
                this.array = new Uint8Array([1, 2, 3, 1, 1, 2, 1, 3]);
            },

            teardown: function () {
                this.array = null;
            },
        });

        // tests the static function sumVal() of ByteArray
        test("Test ByteArray.sumVal()", function () {
            var sum0 = ByteArray.sumVal(this.array, Uint8Array, 0);
            var expSum0 = new Uint8Array(this.array.length);
            deepEqual(sum0, expSum0, "Test: sumVal() for 0");

            var sum1 = ByteArray.sumVal(this.array, Uint8Array, 1);
            var val = 1;
            var total = 0;
            var expSum1 = new Uint8Array(
                this.array.reduce(function (r, a) {
                    total = a === val ? total + 1 : total;
                    r.push(total);
                    return r;
                }, [])
            );

            deepEqual(sum1, expSum1, "Test: sumVal() for 1");
        });

        test("Test ByteArray.seqUnique()", function () {
            var seqArr = ByteArray.seqUniqueIndx(this.array, Uint8Array);
            var expArr = [];
            for (var i = 0; i < 3; i++) {
                expArr.push(i);
            }
            expArr = new Uint8Array(expArr);
            deepEqual(seqArr, expArr, "Test: seqUnique()");
        });
    });
});
