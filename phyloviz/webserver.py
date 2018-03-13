import tornado
from controller import ModelHandler, IndexHandler, NodeHandler, EdgeHandler, ZoomHandler, BenchmarkHandler
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop


class Application(tornado.web.Application):
    def __init__(self):
        # dirpath = dirname(__file__)
        handlers = [(r"/", ModelHandler),
                    (r"/api/nodes", NodeHandler),
                    (r"/api/edges", EdgeHandler),
                    (r"/zoom", ZoomHandler),
                    (r"/benchmark",BenchmarkHandler)
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
    print("server started at port 8080")
    ioloop.start()
