import pandas as pd

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
