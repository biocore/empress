from tornado.testing import AsyncHTTPTestCase
from phyloviz.controller import ModelHandler
from phyloviz.webserver import Application
from unittest import main
from urllib.parse import urlencode



class TestModelHandler(AsyncHTTPTestCase):
    app = Application()

    @classmethod
    def tearDownClass(cls):
        pass

    def get_app(self):
        #BaseHandler.get_current_user = Mock(return_value=User("test@foo.bar"))
        #self.app.settings['debug'] = False
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


class TestsIWantToRun(TestModelHandler):
    def test_get(self):
        response = self.get('/')
        self.assertEqual(response.code, 200)

        # TODO: Test the html
        print(response.body)
        # TODO: self.assertEqual(response.body, ...)
        # read the expected content from a file that you created


if __name__ == "__main__":
    main()
