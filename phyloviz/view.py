import pandas as pd
import matplotlib
import numpy as np
import matplotlib.pyplot as plt


def plot(node_metadata, edge_metadata,
         node_color=None, node_size=None,
         node_alpha=None, edge_color=None,
         edge_width=None, edge_alpha=None):
    """ Plot the tree with the given dataframe of coordinates of points

    We are now plotting with matplotlib
    Parameters
    -----------
    node_metadata : pd.DataFrame
        Contains all of the species attributes.
        Every row corresponds to a unique species
        and every column corresponds to an attribute.
        Metadata may also contain ancestors.
    edge_metadata : pd.DataFrame
        Contains all of the edge attributes.
        Every row corresponds to a unique edge
        and every column corresponds to an attribute.
    node_color : str
        Name of column in `node_metadata` to plot node colors.
        If None, all nodes will be colored black.
    node_size : str
        Name of column in `node_metadata` to resize the nodes.
        If None, all nodes will be 10.
    node_alpha : str
        Name of column in `node_metadata` to specify transparency of nodes.
        If None, the nodes won't be transparent.
    edge_color : str
        Name of column in `edge_metadata` to plot edge colors.
        If None, all edges will be colored black.
    edge_size : str
        Name of column in `edge_metadata` to resize the nodes.
        If None, all edge will have a width of 1.
    edge_alpha : str
        Name of column in `edge_metadata` to specify transparency of edges.
        If None, all edges won't be transparent.
    ax : matplotlib.axes.Axes
         optional matplotlib axes object

    Returns
    --------
    matplotlib.axes.Axes
         Axes with fully rendered tree
    """
    # Plot nodes
    col_node_x = node_metadata['x']
    col_node_y = node_metadata['y']
    # TODO: annotation on points
    plt.scatter(col_node_x, col_node_y)

    # Plot edges
    # Get the four columns of coordinates
    col_edge_x = edge_metadata['x']
    col_edge_y = edge_metadata['y']
    col_edge_px = edge_metadata['px']
    col_edge_py = edge_metadata['py']

    row_count = len(edge_metadata.index)

    # Loop through each row and plot the edge
    for index in range(row_count):
        plot_x = [col_edge_x[index], col_edge_px[index]]
        plot_y = [col_edge_y[index], col_edge_py[index]]
        plt.plot(plot_x, plot_y)


def color_nodes(node_metadata, color_column='Disease_Type'):
    """
    Parameters
    ------------
    node_metadata : pd.DataFrame
       Contains the metadata + attributes, where the row names are the node ids
       and the column names are the attributes to be plotted
    color_column : pd.DataFrame
       The column that specifies the colors for each node
    ...
    """
    pass
