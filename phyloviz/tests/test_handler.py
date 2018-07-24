import os
from phyloviz.webserver import Application
from tornado.testing import AsyncHTTPTestCase
from phyloviz.model import Model


class TestHandler(AsyncHTTPTestCase):
    internal_metadata_file = os.path.join(os.path.dirname(__file__),'internal_md.txt')
    leaf_metadata_file = os.path.join(os.path.dirname(__file__),'leaf_md.tsv')
    tree_file = os.path.join(os.path.dirname(__file__),'tree_file.txt')
    tree_format = 'newick'
    m = Model(tree_file, tree_format,
                       internal_metadata_file, leaf_metadata_file)
    m.center_tree()
    app = Application(m)

    @classmethod
    def tearDownClass(cls):
        pass

    def get_app(self):
        return self.app

    # helpers from http://www.peterbe.com/plog/tricks-asynchttpclient-tornado
    def get(self, url, data=None, headers=None, doseq=True):
        if data is not None:
            if isinstance(data, dict):
                data = urlencode(data, doseq=doseq)
            if '?' in url:
                url += '&%s' % data
            else:
                url += '?%s' % data
        return self._fetch(url, 'GET', headers=headers)

    def _fetch(self, url, method, data=None, headers=None):

        self.http_client.fetch(self.get_url(url), self.stop, method=method,
                               body=data, headers=headers)
        return self.wait()
