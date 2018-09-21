# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import os
import filecmp
import io
from empress.tests.test_handler import TestHandler
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
            urlSection = False
            res = []

            for line in lines:
                if line == '<body>\n':
                    start = True

                # Need to remove the urls from the html file because they contain a variable in the string
                # similar to why we need to remove everything before the body tag
                if line == 'var urls = { // urls for webserver\n':
                    urlSection = True
                if urlSection:
                    if line == '};\n':
                        urlSection = False

                if start and not urlSection:
                    res.append(line)

        with open('model_html_res.txt', 'w') as f:
            res = list(map(lambda x: x.lstrip(), res))
            f.writelines(res)

        # taken from https://codereview.stackexchange.com/questions/145126
        # /open-a-text-file-and-remove-any-blank-lines
        expt = []
        with open(os.path.join(os.path.dirname(__file__), '../tree_with_webgl.html'), 'r')as f:
            lines = f.readlines()
            lines = list(map(lambda x: x.lstrip(), lines))
            start = False

            for line in lines:
                if line == '<body>\n':
                    start = True
                # Need to remove the urls from the html file because they contain a variable in the string
                # similar to why we need to remove everything before the body tag
                if line == 'var urls = { // urls for webserver\n':
                    urlSection = True
                if urlSection:
                    if line == '};\n':
                        urlSection = False

                if start and not urlSection:
                    expt.append(line)

        with open('model_html_exp.txt', 'w') as f:
            f.writelines(expt)

        self.assertTrue(
            filecmp.cmp(
                'model_html_res.txt',
                'model_html_exp.txt'))

    def test_edge_handler(self):
        pass


if __name__ == "__main__":
    main()
