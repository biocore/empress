import tornado
from controller import ModelHandler, EdgeHandler, ZoomHandler
from controller import BenchmarkHandler, HighlightHandler
from controller import CollapseHandler
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
import os.path


class Application(tornado.web.Application):

    def __init__(self):
        handlers = [(r"/", ModelHandler),
                    (r"/api/edges", EdgeHandler),
                    (r"/zoom", ZoomHandler),
                    (r"/benchmark", BenchmarkHandler),
                    (r"/collapse", CollapseHandler),
                    (r"/highlight", HighlightHandler)
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
