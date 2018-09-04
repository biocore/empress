import io
import math
import skbio
import pandas as pd
from skbio import TreeNode


def in_quad_1(angle):
    """ Determines if the angle is between 0 and pi / 2 radians

    Parameters
    ----------
    angle : float
        the angle of a vector in radians

    Returns
    -------
    return : bool
        true if angle is between 0 and pi / 2 radians
    """
    return True if angle > 0 and angle < math.pi / 2 else False


def in_quad_4(angle):
    """ Determines if the angle is between (3 * pi) / 2 radians and 2 * pi

    angle : float
        the angle of a vector in radians

    Returns
    -------
    return : bool
        true is angle is between 0 and pi / 2 radians
    """
    return True if angle > 3 * math.pi / 2 and angle < 2 * math.pi else False


def calculate_angle(v):
    """ Finds the angle of the two 2-d vectors in radians

    Parameters
    ----------
    v : tuple
        vector

    Returns
    -------
        angle of vector in radians
    """
    if v[0] == 0:
        return math.pi / 2 if v[1] > 0 else 3 * math.pi / 2

    angle = math.atan(v[1] / v[0])

    if v[0] > 0:
        return angle if angle >= 0 else 2 * math.pi + angle
    else:
        return angle + math.pi if angle >= 0 else (2 * math.pi + angle) - math.pi


def name_internal_nodes(tree):
    """ Name internal nodes that does not have name

    Parameters
    ----------
    Returns
    -------
    """
    # initialize tree with branch lengths and node names if they are missing
    for i, n in enumerate(tree.postorder(include_self=True)):
        if n.length is None:
            n.length = 1
        if n.name is None:
            new_name = "y%d" % i
            n.name = new_name


def read_metadata(file_name, skip_row, seperator):
    """ Reads in metadata for internal nodes

    Parameters
    ----------
    file_name :  String
        The name of the file to read the data from
    skip_row : integer
        The number of rows to skip when reading in the data
    seperator : character
        The delimiter used in the data file

    Returns
    -------
       pd.Dataframe

    """
    if seperator == ' ':
        cols = pd.read_csv(
            file_name, skiprows=skip_row, nrows=1, delim_whitespace=True).columns.tolist()

        # StringIO is used in test cases, without this the tests will fail due to the buffer
        # being placed at the end everytime its read
        if type(file_name) is io.StringIO:
            file_name.seek(0)

        metadata = pd.read_table(
            file_name, skiprows=skip_row, delim_whitespace=True, dtype={cols[0]: object})
        metadata.rename(columns={metadata.columns[0]: "Node_id"}, inplace=True)
    else:
        cols = pd.read_csv(
            file_name, skiprows=skip_row, nrows=1, sep=seperator).columns.tolist()

        # StringIO is used in test cases, without this the tests will fail due to the buffer
        # being placed at the end everytime its read
        if type(file_name) is io.StringIO:
            file_name.seek(0)

        metadata = pd.read_table(
            file_name, skiprows=skip_row, sep=seperator, dtype={cols[0]: object})
        metadata.rename(columns={metadata.columns[0]: "Node_id"}, inplace=True)
    return metadata


def read(file_name, file_format='newick'):
    """ Reads in contents from a file.

    This will create a skbio.TreeNode object

    Current Support formats: newick

    Future Suppoert formats: phyloxml,
    cytoscape network.

    cytoscape layout
    - networkx
    phyloxml
    - Python has a parser for it, but it parse it into a phylogeny object.
    - We need to parse the phylogeny object into the metadata table by
    traversing?
    - What is the confidence for each clade?

    Parameters
    ----------
    file_name : str
        The name of the file to read that contains the tree
    file_format : str
        The format of the file to read that contains the tree
    TODO: Need to create parsers for each of these.

    Returns
    -------
    tree - skbio.TreeNode
        A TreeNode object of the newick file
    None - null
        If a non-newick file_format was passed in
    """

    if file_format == 'newick':
        tree = skbio.read(file_name, file_format, into=TreeNode)
        return tree
    return None


def start_and_total_angle(a_1, a_2):
    """ determines the starting angle of the sector and total theta of the sector.
    Note this is only to be used if the sector is less than pi radians

    Parameters
    ----------
    a1 : float
        angle (in radians) of one of the edges of the sector
    a2 : float
        angle (in radians of one of the edges of the sector)

    Returns
    -------
    starting angle : float
        the angle at which to start drawing the sector
    theta : float
        the angle of the sector
    """
    # detemines the angle of the sector as well as the angle to start drawing the sector
    if (not (in_quad_1(a_1) and in_quad_4(a_2) or
             in_quad_4(a_1) and in_quad_1(a_2))):
        a_min, a_max = (min(a_1, a_2), max(a_1, a_2))
        if a_max - a_min > math.pi:
            a_min += 2 * math.pi
            starting_angle = a_max
            theta = a_min - a_max
        else:
            starting_angle = a_2 if a_1 > a_2 else a_1
            theta = abs(a_1 - a_2)
    else:
        starting_angle = a_1 if a_1 > a_2 else a_2
        ending_angle = a_1 if starting_angle == a_2 else a_2
        theta = ending_angle + abs(starting_angle - 2 * math.pi)

    return (starting_angle, theta)