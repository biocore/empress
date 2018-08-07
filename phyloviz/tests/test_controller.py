# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import os
import filecmp
from phyloviz.tests.test_handler import TestHandler
from unittest import main


class TestController(TestHandler):
    def test_model_handler(self):
        response = self.get('/')
        self.assertEqual(response.code, 200)

        # compare html with html text file to see if they match
        with open('model_html_res_temp.txt', 'w') as f:
            f.write(response.body.decode('utf-8'))

        # need to remove every thing before the body tag in order to get rid of the <link> and <source
        # tags since the html response expands them so the files will not be equal with them
        res = []
        with open(os.path.join(os.path.dirname(__file__), 'model_html_res_temp.txt'), 'r')as f:
            lines = f.readlines()
            start = False
            res = []

            for line in lines:
                if line == '<body>\n':
                    start = True
                if start:
                    res.append(line)

        with open('model_html_res.txt', 'w') as f:
            res = list(map(lambda x: x.lstrip(), res))
            f.writelines(res)

        # taken from https://codereview.stackexchange.com/questions/145126
        # /open-a-text-file-and-remove-any-blank-lines
        expt = []
        with open(os.path.join(os.path.dirname(__file__), '../tree_with_webgl.html'), 'r')as f:
            lines = f.readlines()
            start = False

            for line in lines:
                if line == '<body>\n':
                    start = True
                if start:
                    expt.append(line)

        with open('model_html_exp.txt', 'w') as f:
            expt = list(map(lambda x: x.lstrip(), expt))
            f.writelines(expt)

        self.assertTrue(
            filecmp.cmp(
                'model_html_res.txt',
                'model_html_exp.txt'))

    def test_edge_handler(self):
        pass


if __name__ == "__main__":
    main()
