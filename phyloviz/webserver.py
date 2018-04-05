import tornado
from controller import ModelHandler, NodeHandler, EdgeHandler, ZoomHandler
from controller import BenchmarkHandler, SelectHandler
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
import os.path


class Application(tornado.web.Application):
    def __init__(self):
        # dirpath = dirname(__file__)
        handlers = [(r"/", ModelHandler),
                    (r"/api/nodes", NodeHandler),
                    (r"/api/edges", EdgeHandler),
                    (r"/zoom", ZoomHandler),
                    (r"/benchmark", BenchmarkHandler),
                    (r"/select", SelectHandler)
                    ]

        settings = dict(
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            debug=True
        )
        tornado.web.Application.__init__(self, handlers, **settings)


if __name__ == '__main__':
    # Create the webserver
    http_server = HTTPServer(Application())
    http_server.listen(8080)
    ioloop = IOLoop.instance()
    print("server started at port 8080")
    ioloop.start()
