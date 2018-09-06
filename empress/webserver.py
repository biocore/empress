#!/usr/bin/env python
import tornado
from empress.controller import (
    ModelHandler, EdgeHandler, NodeHandler, BenchmarkHandler,
    HighlightHandler, TriangleHandler, CollapseHandler, TableHandler,
    TableChangeHandler, HeaderHandler, ColorCladeHandler, SubtreeHandler,
    OldTreeHandler, SelectHandler, CollapseSelectedHandler, ClearColorCladeHandler,
    CladeHandler)
import os.path


class Application(tornado.web.Application):

    def __init__(self, m):
        handlers = [(r"/", ModelHandler),
                    (r"/api/edges", EdgeHandler, dict(m=m)),
                    (r"/api/nodes", NodeHandler, dict(m=m)),
                    (r"/api/triangles", TriangleHandler, dict(m=m)),
                    (r"/benchmark", BenchmarkHandler),
                    (r"/collapse", CollapseHandler, dict(m=m)),
                    (r"/highlight", HighlightHandler, dict(m=m)),
                    (r"/table_values", TableHandler,  dict(m=m)),
                    (r"/table_change", TableChangeHandler, dict(m=m)),
                    (r"/headers", HeaderHandler, dict(m=m)),
                    (r"/clades", CladeHandler, dict(m=m)),
                    (r"/color_clade", ColorCladeHandler, dict(m=m)),
                    (r"/clear_clade", ClearColorCladeHandler, dict(m=m)),
                    (r"/subtree", SubtreeHandler, dict(m=m)),
                    (r"/oldtree", OldTreeHandler, dict(m=m)),
                    (r"/selectNodes", SelectHandler, dict(m=m)),
                    (r"/collapseSTree", CollapseSelectedHandler, dict(m=m))
                    ]

        settings = dict(
            static_path=os.path.join(os.path.dirname(__file__), "support_files"),
            debug=True
        )
        tornado.web.Application.__init__(self, handlers, **settings)
