import tornado
from model import ModelHandler, IndexHandler
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop

class Application(tornado.web.Application):
    def __init__(self):
        # dirpath = dirname(__file__)
        handlers = [(r"/", IndexHandler),
                    (r"/nodes", ModelHandler)
                   ]


        settings = {
            "debug": True
        }
        tornado.web.Application.__init__(self, handlers, **settings)

if __name__ == '__main__':
    # Create the webserver
    http_server = HTTPServer(Application())
    http_server.listen(8080)
    ioloop = IOLoop.instance()
    ioloop.start()