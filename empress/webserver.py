#!/usr/bin/env python
import tornado
from empress.model import Model
from empress.controller import (
    ModelHandler, EdgeHandler, NodeHandler, ZoomHandler,
    BenchmarkHandler, HighlightHandler, TriangleHandler,
    CollapseHandler, TableHandler)
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
import os.path
import click


class Application(tornado.web.Application):

    def __init__(self, m):
        handlers = [(r"/", ModelHandler),
                    (r"/api/edges", EdgeHandler, dict(m=m)),
                    (r"/api/nodes", NodeHandler, dict(m=m)),
                    (r"/api/triangles", TriangleHandler, dict(m=m)),
                    (r"/zoom", ZoomHandler, dict(m=m)),
                    (r"/benchmark", BenchmarkHandler),
                    (r"/collapse", CollapseHandler, dict(m=m)),
                    (r"/highlight", HighlightHandler, dict(m=m)),
                    (r"/table_values", TableHandler,  dict(m=m))
                    ]

        settings = dict(
            static_path=os.path.join(os.path.dirname(__file__), "support_files"),
            debug=True
        )
        tornado.web.Application.__init__(self, handlers, **settings)

