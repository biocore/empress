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

        test("Test that naturalSort doesn't treat Infinity / NaN as numbers", function () {
            var eles = [
                "1",
                "2",
                "3",
                "10",
                "4",
                "5",
                "invalid",
                "nan",
                "NaN",
                "Infinity",
                "-Infinity",
                " ",
                "zzz",
            ];
            res = util.naturalSort(eles);
            deepEqual(res, [
                " ",
                "-Infinity",
                "Infinity",
                "invalid",
                "nan",
                "NaN",
                "zzz",
                "1",
                "2",
                "3",
                "4",
                "5",
                "10",
            ]);
        });

        /**
         * Tests the splitNumericValues() utility function.
         *
         * This test was taken from Emperor:
         * https://github.com/biocore/emperor/blob/659b62a9f02a6423b6258c814d0e83dbfd05220e/tests/javascript_tests/test_util.js
         * */
        test("Test splitNumericValues", function () {
            var values = [
                "1.112",
                "stringvalue",
                "",
                "Other String Value",
                "-2.2",
                "4",
                null,
                undefined,
                NaN,
                Infinity,
                -Infinity,
                0,
                [],
                ["string", 1.0],
                [1.0, "string"],
                {},
                { key: "val" },
            ];
            var numeric = ["1.112", "-2.2", "4", 0];
            var nonNumeric = [
                "stringvalue",
                "",
                "Other String Value",
                null,
                undefined,
                NaN,
                Infinity,
                -Infinity,
                [],
                ["string", 1.0],
                [1.0, "string"],
                {},
                { key: "val" },
            ];

            var split = util.splitNumericValues(values);
            deepEqual(split.numeric, numeric);
            deepEqual(split.nonNumeric, nonNumeric);

            split = util.splitNumericValues(["+1", "0", "foo", "-1", "boaty"]);
            deepEqual(split.numeric, ["+1", "0", "-1"]);
            deepEqual(split.nonNumeric, ["foo", "boaty"]);

            split = util.splitNumericValues([
                "1.0",
                "0.0.0",
                "0.0",
                "-3.0",
                "boaty",
            ]);
            deepEqual(split.numeric, ["1.0", "0.0", "-3.0"]);
            deepEqual(split.nonNumeric, ["0.0.0", "boaty"]);
        });

        test("Test keepUniqueKeys without removeAll", function() {
            var keys  = {
                "a" : new Set([1, 2, 3, 4]),
                "b" : new Set([3, 4, 5, 6]),
                "c" : new Set([1, 3, 4, 5, 7]),
                "d" : new Set([10, 11, 12]),
            };
            var expectedResult = {
                "a" : new Set([2]),
                "b" : new Set([6]),
                "c" : new Set([7]),
                "d" : new Set([10, 11, 12]),
            }
            var result = util.keepUniqueKeys(keys, new Set());
            // qunit does not have a way to directly compare Set. So, first,
            // each set has to be converted into an Array
            var groups = ["a", "b", "c", "d"];
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                var expectedArray = Array.from(expectedResult[group]);
                var resultArray = Array.from(result[group]);
                deepEqual(resultArray, expectedArray);
            }
        });

        test("Test keepUniqueKeys with removeAll", function() {
            var keys  = {
                "a" : new Set([1, 2, 3, 4]),
                "b" : new Set([3, 4, 5, 6]),
                "c" : new Set([1, 3, 4, 5, 7]),
                "d" : new Set([10, 11, 12]),
            };
            var expectedResult = {
                "a" : new Set([]),
                "b" : new Set([]),
                "c" : new Set([7]),
                "d" : new Set([11, 12]),
            }

            var result = util.keepUniqueKeys(keys, new Set([1,2,3,4,5,6,10]));

            // qunit does not have a way to directly compare Set. So, first,
            // each set has to be converted into an Array
            var groups = ["a", "b", "c", "d"];
            for (var i = 0; i  < groups.length; i++) {
                var group = groups[i];
                var expectedArray = Array.from(expectedResult[group]);
                var resultArray = Array.from(result[group]);
                deepEqual(resultArray, expectedArray);
            }
        });
    });
});
