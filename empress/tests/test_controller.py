# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import os
import filecmp
from empress.tests.test_handler import TestHandler
from unittest import main


class TestControll(TestHandler):
    def test_model_handler(self):
        response = self.get('/')
        self.assertEqual(response.code, 200)

        # compare html with html text file to see if they match
        with open('model_html_res.txt', 'w') as f:
            f.write(response.body.decode('utf-8'))

        # taken from https://codereview.stackexchange.com/questions/145126
        # /open-a-text-file-and-remove-any-blank-lines
        with open(os.path.join(os.path.dirname(__file__), '../tree_with_webgl.html'), 'r')as f:
            lines = f.readlines()

        with open('model_html_exp.txt', 'w') as f:
            lines = list(map(lambda x: x.lstrip(), lines))
            f.writelines(lines)

        self.assertTrue(
            filecmp.cmp(
                'model_html_res.txt',
                'model_html_exp.txt'))

    def test_edge_handler(self):
        pass


if __name__ == "__main__":
    main()
