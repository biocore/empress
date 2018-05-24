import tornado
import controller
from controller import (
    ModelHandler, EdgeHandler, ZoomHandler,
    BenchmarkHandler, HighlightHandler, TriangleHandler,
    CollapseHandler, CollapseEdgeHandler)
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
import os.path
import click


class Application(tornado.web.Application):

    def __init__(self):
        handlers = [(r"/", ModelHandler),
                    (r"/api/edges", EdgeHandler),
                    (r"/api/triangles", TriangleHandler),
                    (r"/zoom", ZoomHandler),
                    (r"/benchmark", BenchmarkHandler),
                    (r"/collapse", CollapseHandler),
                    (r"/collapseEdge", CollapseEdgeHandler),
                    (r"/highlight", HighlightHandler)
                    ]

        settings = dict(
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            debug=True
        )
        tornado.web.Application.__init__(self, handlers, **settings)


@click.command()
@click.option('--tree_file', help='The file that contains the tree')
@click.option('--tree_format', help='The format of the tree file')
@click.option('--internal_metadata',
              help='The file that contains internal node metadata')
@click.option('--leaf_metadata',
              help='The file that contains tip node metadata')
def build_tree(tree_file, tree_format, internal_metadata, leaf_metadata):
    controller.build_tree(tree_file, tree_format, internal_metadata,
                          leaf_metadata)
    print("done")
    return


if __name__ == '__main__':
    # Build the tree
    # internal_metadata_file = 'ncbi.t2t.txt'
    # leaf_metadata_file = 'metadata.txt'

    # tree files
    # tree_format = 'newick'
    # tree_file = './astral.MR.rooted.nid.nosup.nwk'
    # print("before building the tree")
    # controller.build_tree(tree_file, tree_format, internal_metadata_file,
    # leaf_metadata_file)
    build_tree()
    print("build web server")
    # Create the webserver
    http_server = HTTPServer(Application())
    http_server.listen(8080)
    ioloop = IOLoop.instance()
    print("server started at port 8080")
    ioloop.start()
