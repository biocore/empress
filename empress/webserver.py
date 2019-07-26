#!/usr/bin/env python
import tornado
from empress.controller import (
    ModelHandler, EdgeHandler, BenchmarkHandler, ColorBranchHandler,
    TriangleHoverHandler, CollapseHandler, HeaderHandler, NodeHoverHandler,
    ColorCladeHandler, UpdateCollapseCladeHandler, RetriveTopLabelHandler,
    CladeHandler)
import os.path


class Application(tornado.web.Application):

    def __init__(self, m):
        handlers = [(r'/', ModelHandler),
                    (r'/api/edges', EdgeHandler, dict(m=m)),
                    (r'/api/triangles', TriangleHoverHandler, dict(m=m)),
                    (r'/benchmark', BenchmarkHandler),
                    (r'/collapse', CollapseHandler, dict(m=m)),
                    (r'/color_branch', ColorBranchHandler, dict(m=m)),
                    (r'/headers', HeaderHandler, dict(m=m)),
                    (r'/clades', CladeHandler, dict(m=m)),
                    (r'/color_clade', ColorCladeHandler, dict(m=m)),
                    (r'/labels', RetriveTopLabelHandler, dict(m=m)),
                    (r'/update_collapse_clade', UpdateCollapseCladeHandler, dict(m=m)),
                    (r"/node_hover", NodeHoverHandler, dict(m=m))
                    ]

        settings = dict(
            static_path=os.path.join(os.path.dirname(__file__), "support_files"),
            debug=True
        )
        tornado.web.Application.__init__(self, handlers, **settings)
