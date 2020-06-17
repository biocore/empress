# ----------------------------------------------------------------------------
# Copyright (c) 2016-2019, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

from empress.tree import Tree
from empress.tools import name_internal_nodes, match_inputs

import warnings
import pkg_resources
import os
import pandas as pd

from shutil import copytree
from emperor import Emperor
from bp import to_skbio_treenode
from jinja2 import Environment, FileSystemLoader

SUPPORT_FILES = pkg_resources.resource_filename('empress', 'support_files')
TEMPLATES = os.path.join(SUPPORT_FILES, 'templates')
SELECTION_CALLBACK_PATH = os.path.join(SUPPORT_FILES, 'js',
                                       'selection-callback.js')


class Empress():
    def __init__(self, tree, table, sample_metadata,
                 feature_metadata=None, ordination=None,
                 ignore_missing_samples=False, filter_missing_features=False,
                 resource_path=None):
        """Visualize a phylogenetic tree

        Use this object to interactively display a phylogenetic tree using the
        Empress GUI.

        Parameters
        ----------
        tree: bp.Tree:
            The phylogenetic tree to visualize.
        table: pd.DataFrame:
            The matrix to visualize paired with the phylogenetic tree.
        sample_metadata: pd.DataFrame
            DataFrame object with the metadata associated to the samples in the
            ``ordination`` object, should have an index set and it should match
            the identifiers in the ``ordination`` object.
        feature_metadata: pd.DataFrame, optional
            DataFrame object with the metadata associated to the names of
            tips and/or internal nodes in the  ``tree`` object, should have an
            index set and it should match at least one of these nodes' names.
        ordination: skbio.OrdinationResults, optional
            Object containing the computed values for an ordination method in
            scikit-bio. Currently supports skbio.stats.ordination.PCoA and
            skbio.stats.ordination.RDA results.
        ignore_missing_samples: bool, optional (default False)
            If True, pads missing samples (i.e. samples in the table but not
            the metadata) with placeholder metadata. If False, raises a
            DataMatchingError if any such samples exist. (Note that in either
            case, samples in the metadata but not in the table are filtered
            out; and if no samples are shared between the table and metadata, a
            DataMatchingError is raised regardless.) This is analogous to the
            ignore_missing_samples flag in Emperor.
        filter_missing_features: bool, optional (default False)
            If True, filters features from the table that aren't present as
            tips in the tree. If False, raises a DataMatchingError if any such
            features exist. (Note that in either case, features in the tree but
            not in the table are preserved.)
        resource_path: str, optional
            Load the resources from a user-specified remote location. If set to
            None resources are loaded from the current directory.


        Attributes
        ----------
        tree:
            Phylogenetic tree.
        table:
            Contingency matrix for the phylogeny.
        samples:
            Sample metadata.
        features:
            Feature metadata.
        ordination:
            Ordination matrix to visualize simultaneously with the tree.
        base_url:
            Base path to the remote resources.
        """

        self.tree = tree
        self.table = table
        self.samples = sample_metadata.copy()

        if feature_metadata is not None:
            warnings.warn('Feature metadata is currently not supported',
                          UserWarning)
            self.features = feature_metadata.copy()
        else:
            self.features = None

        self.ordination = ordination

        self.base_url = resource_path
        if self.base_url is None:
            self.base_url = './'

        self._validate_data(ignore_missing_samples, filter_missing_features)

        if self.ordination is not None:
            self._emperor = Emperor(
                self.ordination, mapping_file=self.samples,
                feature_mapping_file=self.features,
                ignore_missing_samples=ignore_missing_samples,
                remote='./emperor-resources')
        else:
            self._emperor = None

    def _validate_data(self, ignore_missing_samples, filter_missing_features):
        # extract balance parenthesis
        self._bp_tree = list(self.tree.B)

        self.tree = Tree.from_tree(to_skbio_treenode(self.tree))
        name_internal_nodes(self.tree)

        # Note that the feature_table we get from QIIME 2 (as an argument to
        # this function) is set up such that the index describes sample IDs and
        # the columns describe feature IDs. We transpose this table before
        # sending it to tools.match_inputs() and keep using the transposed
        # table for the rest of this visualizer.
        self.table, self.samples = match_inputs(self.tree, self.table.T,
                                                self.samples, self.features,
                                                ignore_missing_samples,
                                                filter_missing_features)

    def copy_support_files(self, target=None):
        """Copies the support files to a target directory

        If an ordination is included Emperor's support files will also be
        copied over (in a directory named emperor-resources).

        Parameters
        ----------
        target : str
            The path where resources should be copied to. By default it copies
            the files to ``self.base_url``.
        """
        if target is None:
            target = self.base_url

        # copy the required resources
        copytree(SUPPORT_FILES, os.path.join(target, 'support_files'))

        if self._emperor is not None:
            self._emperor.copy_support_files(os.path.join(target,
                                                          'emperor-resources'))

    def __str__(self):
        return self.make_empress()

    def make_empress(self):
        """Build an empress plot

        Returns
        -------
        str
            Formatted empress plot.

        Notes
        -----
        Once you generate the plot (and write it to a HTML file in a given
        directory) you will need to copy the support files (the JS/CSS/etc.
        code needed to view the visualization) to the same directory by calling
        the ``copy_support_files`` method.

        See Also
        --------
        empress.core.Empress.copy_support_files
        """
        main_template = self._get_template()

        # _process_data does a lot of munging to the coordinates data and
        # _to_dict puts the data into a dictionary-like object for consumption
        data = self._to_dict()

        plot = main_template.render(data)

        return plot

    def _to_dict(self):
        """Convert processed data into a dictionary

        Returns
        -------
        dict
            A dictionary describing the plots contained in the ordination
            object and the sample + feature metadata.
        """

        # Compute coordinates resulting from layout algorithm(s)
        # TODO: figure out implications of screen size
        layout_to_coordsuffix, default_layout = self.tree.coords(4020, 4020)

        tree_data = {}
        names_to_keys = {}
        for i, node in enumerate(self.tree.postorder(include_self=True), 1):
            tree_data[i] = {
                'name': node.name,
                'color': [0.75, 0.75, 0.75],
                'sampVal': 1,
                'visible': True,
                'single_samp': False
            }
            # Add coordinate data from all layouts for this node
            for layoutsuffix in layout_to_coordsuffix.values():
                xcoord = "x" + layoutsuffix
                ycoord = "y" + layoutsuffix
                tree_data[i][xcoord] = getattr(node, xcoord)
                tree_data[i][ycoord] = getattr(node, ycoord)
            # Also add vertical bar coordinate info for the rectangular layout
            if not node.is_tip():
                tree_data[i]["highestchildyr"] = node.highestchildyr
                tree_data[i]["lowestchildyr"] = node.lowestchildyr

            if node.name in names_to_keys:
                names_to_keys[node.name].append(i)
            else:
                names_to_keys[node.name] = [i]

        names = []
        for node in self.tree.preorder(include_self=True):
            names.append(node.name)

        # Convert sample metadata to a JSON-esque format
        sample_data = self.samples.to_dict(orient='index')

        # TODO: Empress is currently storing all metadata as strings. This is
        # memory intensive and won't scale well. We should convert all numeric
        # data/compress metadata.

        # This is used in biom-table. Currently this is only used to ignore
        # null data (i.e. NaN and "unknown") and also determines sorting order.
        # The original intent is to signal what columns are
        # discrete/continuous.  type of sample metadata (n - number, o -
        # object)
        sample_data_type = self.samples.dtypes.to_dict()
        sample_data_type = {k: 'n' if pd.api.types.is_numeric_dtype(v) else 'o'
                            for k, v in sample_data_type.items()}

        # create a mapping of observation ids and the samples that contain them
        obs_data = {}
        feature_table = (self.table > 0)
        for _, series in feature_table.iteritems():
            sample_ids = series[series].index.tolist()
            obs_data[series.name] = sample_ids

        data_to_render = {
            'base_url': './support_files',
            'tree': self._bp_tree,
            'tree_data': tree_data,
            'names_to_keys': names_to_keys,
            'sample_data': sample_data,
            'sample_data_type': sample_data_type,
            'obs_data': obs_data,
            'names': names,
            'layout_to_coordsuffix': layout_to_coordsuffix,
            'default_layout': default_layout,
            'emperor_div': '',
            'emperor_require_logic': '',
            'emperor_style': '',
            'emperor_base_dependencies': '',
            'emperor_classes': ''
        }

        if self._emperor is not None:
            data_to_render.update(self._scavenge_emperor())

        return data_to_render

    def _get_template(self, standalone=False):
        """Get the jinja template object

        Parameters
        ----------
        standalone: bool, optional
            Whether or not the generated plot will load resources locally
            (``True``), or from a specified URL (``False``).

        Returns
        -------
        jinja2.Template
            Template where the plot is created.
        """

        # based on: http://stackoverflow.com/a/6196098
        env = Environment(loader=FileSystemLoader(TEMPLATES))
        return env.get_template('empress-template.html')

    def _scavenge_emperor(self):
        # can't make this 50vw because one of the plot containers has some
        # padding that makes the divs stack on top of each other
        self._emperor.width = '48vw'
        self._emperor.height = '100vh; float: right'

        # make the background white so it matches Empress
        self._emperor.set_background_color('white')
        self._emperor.set_axes(color='black')

        html = self._emperor.make_emperor(standalone=True)
        html = html.split('\n')

        # The following line references will be replace with API calls to the
        # Emperor object, however those are not implemented yet
        emperor_base_dependencies = html[6]

        # line 14 is where the CSS includes start, but it is surrounded by
        # unnecessary tags so we strip those out
        style = '\n'.join([line.strip().replace("'", '').replace(',', '')
                           for line in html[14:20]])

        # main divs for emperor
        emperor_div = '\n'.join(html[39:44])

        # main js script for emperor
        emperor_require_logic = '\n'.join(html[45:-3])

        # once everything is loaded replace the callback tag for custom JS
        with open(SELECTION_CALLBACK_PATH) as f:
            selection_callback = f.read()
        emperor_require_logic = emperor_require_logic.replace(
            '/*__select_callback__*/', selection_callback)

        emperor_data = {
            'emperor_div': emperor_div,
            'emperor_require_logic': emperor_require_logic,
            'emperor_style': style,
            'emperor_base_dependencies': emperor_base_dependencies,
            'emperor_classes': 'combined-plot-container'
        }

        return emperor_data
