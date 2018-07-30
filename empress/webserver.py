import tornado
from empress.model import Model
from empress.controller import (
    ModelHandler, EdgeHandler, NodeHandler, ZoomHandler,
    BenchmarkHandler, HighlightHandler, TriangleHandler,
    CollapseHandler, TableHandler, LabelHandler)
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
                    (r"/table_values", TableHandler,  dict(m=m)),
                    (r"/label", LabelHandler, dict(m=m))
                    ]

        settings = dict(
            static_path=os.path.join(os.path.dirname(__file__), "support_files"),
            debug=True
        )
        tornado.web.Application.__init__(self, handlers, **settings)


@click.command()
@click.option('--tree_file', '-f', required=True,
              help='The file that contains the tree')
@click.option('--tree_format', '-e', help='The format of the tree file',
              default='newick')
@click.option('--internal_metadata', '-i', required=True,
              help='The file that contains internal node metadata')
@click.option('--leaf_metadata', '-l', required=True,
              help='The file that contains tip node metadata')
@click.option('--port', '-p', default=8080,
              help='The port to run the local server on')
def start(tree_file, tree_format, internal_metadata, leaf_metadata, port):

    # Build the tree
    m = Model(tree_file, tree_format, internal_metadata, leaf_metadata)
    m.center_tree()

    # Create the webserver
    print("build web server")
    http_server = HTTPServer(Application(m))
    http_server.listen(port)
    ioloop = IOLoop.instance()
    print("server started at port", port)
    ioloop.start()
    print("done")


if __name__ == '__main__':
    start()
