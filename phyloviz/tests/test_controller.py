import os
import filecmp
from tornado.testing import AsyncHTTPTestCase
from phyloviz.controller import ModelHandler
from phyloviz.webserver import Application
from phyloviz.tests.test_handler import TestHandler
from unittest import main
from urllib.parse import urlencode


class TestControll(TestHandler):
    def test_model_handler(self):
        response = self.get('/')
        self.assertEqual(response.code, 200)

        # compare html with html text file to see if they match
        with open('model_html_res.txt', 'w') as f:
            f.write(response.body.decode('utf-8'))

        # taken from https://codereview.stackexchange.com/questions/145126
        # /open-a-text-file-and-remove-any-blank-lines
        with open(os.path.abspath('../tree_with_webgl.html'), 'r') as f:
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
