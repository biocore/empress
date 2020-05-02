require(["jquery", "util"], function ($, util) {
    $(document).ready(function () {
        module("Utilities");
        /**
         * Test that elements in the list are sorted correctly when only words are
         * contained.
         *
         * This test was taken from Emperor:
         * https://github.com/biocore/emperor/blob/659b62a9f02a6423b6258c814d0e83dbfd05220e/tests/javascript_tests/test_util.js
         */
        test("Test naturalSort with words only", function () {
            var res, elements;

            elements = ["foo", "Bar", "BAZ", "duck", "duck", "go"];
            res = util.naturalSort(elements);
            deepEqual(
                res,
                ["Bar", "BAZ", "duck", "duck", "foo", "go"],
                "Array is sorted correctly"
            );

            elements = ["foo", "foo", "FOO", "FoO", "FOOOO", "fOO"];
            res = util.naturalSort(elements);
            deepEqual(
                res,
                ["foo", "foo", "FOO", "FoO", "fOO", "FOOOO"],
                "Array " + "is sorted correctly"
            );

            elements = ["a", "c", "X", "Y", "Z", "y"];
            res = util.naturalSort(elements);
            deepEqual(
                res,
                ["a", "c", "X", "Y", "y", "Z"],
                "Array is sorted " + "correctly"
            );
        });

        /**
         * Test that elements in the list are sorted correctly when only numbers
         * are contained.
         *
         * This test was taken from Emperor:
         * https://github.com/biocore/emperor/blob/659b62a9f02a6423b6258c814d0e83dbfd05220e/tests/javascript_tests/test_util.js
         */
        test("Test naturalSort with numbers only", function () {
            var res, elements;

            elements = ["8", "7", "3", "2", "1", "0"];
            res = util.naturalSort(elements);
            deepEqual(
                res,
                ["0", "1", "2", "3", "7", "8"],
                "Array is " + "sorted correctly"
            );

            elements = ["1", "2", "3", "4", "5", "0"];
            res = util.naturalSort(elements);
            deepEqual(
                res,
                ["0", "1", "2", "3", "4", "5"],
                "Array is " + "sorted correctly"
            );

            elements = ["-100", "0", "-0", "-200", "100", "100.001"];
            res = util.naturalSort(elements);
            deepEqual(
                res,
                ["-200", "-100", "0", "-0", "100", "100.001"],
                "Array is sorted correctly"
            );
        });

        /**
         * Test that elements in the list are sorted correctly when there's a
         * mixture of numbers and words.
         *
         * This test was taken from Emperor:
         * https://github.com/biocore/emperor/blob/659b62a9f02a6423b6258c814d0e83dbfd05220e/tests/javascript_tests/test_util.js
         */
        test("Test naturalSort with numbers and words", function () {
            var res, elements;

            elements = ["foo", "7", "bar", "2", "baz", "0"];
            res = util.naturalSort(elements);
            deepEqual(
                res,
                ["bar", "baz", "foo", "0", "2", "7"],
                "Array is sorted " + "correctly"
            );

            elements = ["Foo", "floo", "BAAARR", "-1", "2", "0"];
            res = util.naturalSort(elements);
            deepEqual(
                res,
                ["BAAARR", "floo", "Foo", "-1", "0", "2"],
                "Array is " + "sorted correctly"
            );

            elements = ["lorem", "ipsum", "boom.mooo", "-2.345563353", "-2.4"];
            res = util.naturalSort(elements);
            deepEqual(
                res,
                ["boom.mooo", "ipsum", "lorem", "-2.4", "-2.345563353"],
                "Array is sorted correctly"
            );
        });
    });
});
