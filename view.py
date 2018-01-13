import pandas as pd
import matplotlib
import numpy as np
import matplotlib.pyplot as plt

def plot(node_metadata, edge_metadata):
    """ Plot the tree with the given dataframe of coordinates of points

    We are now plotting with matplotlib
    Parameters
    ----------
    node_metadata : pd.DataFrame
       Contains all of the species attributes.
       Every row corresponds to a unique species
       and every column corresponds to an attribute.
       Metadata may also contain ancestors.
    edge_metadata : pd.DataFrame
       Contains all of the edge attributes.
       Every row corresponds to a unique edge
       and every column corresponds to an attribute.

    """
    # Plot nodes
    col_node_x = node_metadata['x']
    col_node_y = node_metadata['y']
    # TODO: annotation on points
    plt.scatter(x,y)
    # Plot edges
    # Get the four columns of coordinates
    col_edge_x = edge_metadata['x']
    col_edge_y = edge_metadata['y']
    col_edge_px = edge_metadata['px']
    col_edge_py = edge_metadata['py']

    row_count = len(edge_metadata.index)

    # Loop through each row and plot the edge
    for index in range(row_count):
        plot_x=[col_edge_x[index],col_edge_px[index]]
        plot_y=[col_edge_y[index],col_edge_py[index]]
        plt.plot(plot_x, plot_y)
