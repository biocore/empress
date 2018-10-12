# ----------------------------------------------------------------------------
# Copyright (c) 2018--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# ----------------------------------------------------------------------------
import os
import pandas as pd
from tornado.testing import AsyncHTTPTestCase
from empress.webserver import Application
from empress.model import Model
from skbio import TreeNode


class TestHandler(AsyncHTTPTestCase):
    internal_metadata_file = os.path.join(
        os.path.dirname(__file__),
        'internal_md.txt')
    leaf_metadata_file = os.path.join(os.path.dirname(__file__), 'leaf_md.tsv')

    internal_md = pd.read_table(internal_metadata_file, index_col=0)
    leaf_md = pd.read_table(leaf_metadata_file, index_col=0)

    # TODO: we will want to knock this out later
    internal_md.index.name = 'Node_id'
    leaf_md.index.name = 'Node_id'

    md = pd.merge(internal_md, leaf_md,
                  how='outer', on='Node_id')

    tree_file = os.path.join(os.path.dirname(__file__), 'tree_file.txt')
    tree = TreeNode.read(tree_file)

    m = Model(tree, md, "clade")
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
            if '?' in url:
                url += '&%s' % data
            else:
                url += '?%s' % data
        return self._fetch(url, 'GET', headers=headers)

    def _fetch(self, url, method, data=None, headers=None):

        self.http_client.fetch(self.get_url(url), self.stop, method=method,
                               body=data, headers=headers)
        return self.wait()
