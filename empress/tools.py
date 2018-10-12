import io
import math
import skbio
from scipy.spatial import distance
from scipy.spatial import ConvexHull
import pandas as pd
import numpy as np
from skbio import TreeNode


NUM_TRI = 100
VERTS_PER_TRI = 3
ELEMENTS_PER_VERT = 5
(R_INDEX, G_INDEX, B_INDEX) = (0, 1, 2)
(R_OFFSET, G_OFFSET, B_OFFSET) = (2, 3, 4)


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
     tree : skbio.TreeNode or empress.Tree
         Input tree with labeled tips and partially unlabeled internal nodes or branch lengths.

    Returns
    -------
    skbio.TreeNode or empress.Tree
         Tree with fully labeled internal nodes and branches.
    """
    # initialize tree with branch lengths and node names if they are missing
    for i, n in enumerate(tree.postorder(include_self=True)):
        if n.length is None:
            n.length = 1
        if n.name is None:
            new_name = 'y%d' % i
            n.name = new_name


def read_metadata(file_name, skip_row=0, seperator='\t'):
    """ Reads in metadata for internal nodes

    Parameters
    ----------
    file_name :  str
        The name of the file to read the data from
    skip_row : int
        The number of rows to skip when reading in the data
    seperator : str
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
        metadata.rename(columns={metadata.columns[0]: 'Node_id'}, inplace=True)
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


def total_angle(a_1, a_2, small_sector=True):
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
    if small_sector:
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
    else:
        theta = 2 * math.pi - abs(a_1 - a_2)

    return theta


def extract_color(color):
    """
    A 6 digit hex string representing an (r, g, b) color
    """
    HEX_BASE = 16
    NUM_CHAR = 2
    LARGEST_COLOR = 255
    color = color.lower()
    color = [color[i: i+NUM_CHAR] for i in range(0, len(color), NUM_CHAR)]
    color = [int(hex_string, HEX_BASE) for hex_string in color]
    color = [c / LARGEST_COLOR for c in color]
    return (color[R_INDEX], color[G_INDEX], color[B_INDEX])


def create_arc_sector(sector_info):
    """
    Creates an arc using sector_info:
    """
    sector = []
    theta = sector_info['theta'] / NUM_TRI
    rad = sector_info['starting_angle']
    (red, green, blue) = extract_color(sector_info['color'])
    c_x = sector_info['center_x']
    c_y = sector_info['center_y']
    longest_branch = sector_info['largest_branch']

    #  creating the sector
    for i in range(0, NUM_TRI):
        # first vertice of triangle
        sector.append(c_x)
        sector.append(c_y)
        sector.append(red)
        sector.append(green)
        sector.append(blue)

        # second vertice of triangle
        sector.append(math.cos(rad) * longest_branch + c_x)
        sector.append(math.sin(rad) * longest_branch + c_y)
        sector.append(red)
        sector.append(green)
        sector.append(blue)

        rad += theta

        # third vertice of triangle
        sector.append(math.cos(rad) * longest_branch + c_x)
        sector.append(math.sin(rad) * longest_branch + c_y)
        sector.append(red)
        sector.append(green)
        sector.append(blue)

    return sector


def is_sector_large(points):
    """
    determines if a sector spans more than pi / 2 radians

    parameters
    ----------
    points : np.array
        the set of points that define the sector

    Return
    ------
    boolean
        True if sector is larger than pi / 2 radians False otherwise
    """
    # find angle of sector by find the two points that are adjacent to (clade.x2, clade.y2)
    # in the convex hull
    center = 0
    hull = ConvexHull(points)
    hull_vertices = hull.vertices
    clade_index = -1

    for i in range(0, len(hull_vertices)):
        if hull_vertices[i] == center:
            clade_index = i
    return False if clade_index == -1 else True


def sector_info(points, center, ancestor_coords):
    """
    'create_sector' will find the left most branch, right most branch, deepest branch, and
    shortes branch of the clade. Then, 'create_sector' will also find the angle between the
    left and right most branch.
    Parameter
    ---------
    points : 2-d list
        format of list [[x1,y1, x2, y2],...]
    center : list
        the point in points that will be used as the center of the sector. Note center
        should not be in points
    ancestor_coords : list
        the coordinates of the direct parent of center. Note ancestor_coords should not
        be in points
    Return
    ------
    sector_info : Dictionary
        The keys are center_x, center_y, starting_angle, theta, largest_branch, smallest_branch
    """
    # origin
    center_point = np.array([[0, 0]])
    center = (0, 0)

    # find the length of the smallest and longest branches
    distances = [distance.euclidean(tip, center) for tip in points]
    longest_branch = max(distances)
    smallest_branch = min(distances)

    # calculate angles of the tip vectors
    angles = [calculate_angle(points[x]) for x in range(0, len(points))]
    angles = sorted(angles)

    # calculate the angle of the vector going from clade root to its direct ancestor
    ancestor_angle = calculate_angle((ancestor_coords))

    # find position of the left most branch
    num_angles = len(angles)
    l_branch = [i for i in range(0, num_angles - 1) if angles[i] < ancestor_angle < angles[i + 1]]
    l_found = len(l_branch) > 0
    l_index = l_branch[0] if l_found else 0

    # the left and right most branches
    (a_1, a_2) = (angles[l_index], angles[l_index + 1]) if l_found else (angles[l_index], angles[-1])

    # detemines the starting angle(left most branch) of the sectorr
    if l_found:
        starting_angle = a_1 if a_1 > a_2 else a_2
    else:
        starting_angle = a_2 if a_1 > a_2 else a_1

    # calculate the angle between the left and right most branches
    large_sector = is_sector_large(np.concatenate((center_point, points), axis=0))
    theta = total_angle(a_1, a_2, large_sector)

    # the sector webgl will draw
    colored_clades = {
        'center_x': center[0], 'center_y': center[1],
        'starting_angle': starting_angle, 'theta': theta,
        'largest_branch': longest_branch, 'smallest_branch': smallest_branch}

    return colored_clades
