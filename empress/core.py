# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

from empress.tree import Tree
from empress.tools import fill_missing_node_names, match_inputs, shifting
from empress.compression_utils import (
    compress_table, compress_sample_metadata, compress_feature_metadata
)

import pkg_resources
import os

from shutil import copytree
from emperor import Emperor
from bp import to_skbio_treenode
from jinja2 import Environment, FileSystemLoader

SUPPORT_FILES = pkg_resources.resource_filename('empress', 'support_files')
TEMPLATES = os.path.join(SUPPORT_FILES, 'templates')
SELECTION_CALLBACK_PATH = os.path.join(SUPPORT_FILES, 'js',
                                       'selection-callback.js')
NODE_CLICK_CALLBACK_PATH = os.path.join(SUPPORT_FILES, 'js',
                                        'node-click-callback.js')


class Empress():
    def __init__(self, tree, table, sample_metadata,
                 feature_metadata=None, ordination=None,
                 ignore_missing_samples=False, filter_extra_samples=False,
                 filter_missing_features=False, resource_path=None,
                 filter_unobserved_features_from_phylogeny=True):
        """Visualize a phylogenetic tree

        Use this object to interactively display a phylogenetic tree using the
        Empress GUI.

        Parameters
        ----------
        tree: bp.Tree
            The phylogenetic tree to visualize.
        table: pd.DataFrame
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
        filter_extra_samples: bool, optional (default False)
            If True, ignores samples in the feature table that are not present
            in the ordination. If False, raises a DataMatchingError if such
            samples exist.
        filter_missing_features: bool, optional (default False)
            If True, filters features from the table that aren't present as
            tips in the tree. If False, raises a DataMatchingError if any such
            features exist. (Note that in either case, features in the tree but
            not in the table are preserved.)
        resource_path: str, optional
            Load the resources from a user-specified remote location. If set to
            None resources are loaded from the current directory.
        filter_unobserved_features_from_phylogeny: bool, optional
            If True, filters features from the phylogeny that aren't present as
            features in feature table. features in feature table. Otherwise,
            the phylogeny is not filtered.


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
            self.features = feature_metadata.copy()
        else:
            self.features = None

        self.ordination = ordination

        self.base_url = resource_path
        if self.base_url is None:
            self.base_url = 'support_files'

        self._validate_and_match_data(
            filter_extra_samples,
            ignore_missing_samples,
            filter_missing_features,
            filter_unobserved_features_from_phylogeny
        )

        if self.ordination is not None:
            # Note that tip-level metadata is the only "feature metadata" we
            # send to Emperor, because internal nodes in the tree should not
            # correspond to features in the table (and thus to arrows in a
            # biplot).
            self._emperor = Emperor(
                self.ordination, mapping_file=self.samples,
                feature_mapping_file=self.tip_md,
                ignore_missing_samples=ignore_missing_samples,
                remote='./emperor-resources')
        else:
            self._emperor = None

    def _validate_and_match_data(self, ignore_missing_samples,
                                 filter_extra_samples,
                                 filter_missing_features,
                                 filter_unobserved_features_from_phylogeny):

        # Note that the feature_table we get from QIIME 2 (as an argument to
        # this function) is set up such that the index describes sample IDs and
        # the columns describe feature IDs. We transpose this table before
        # sending it to tools.match_inputs() and keep using the transposed
        # table for the rest of this visualizer.
        self.table, self.samples, self.tip_md, self.int_md = match_inputs(
            self.tree, self.table.T, self.samples, self.features,
            self.ordination, ignore_missing_samples, filter_extra_samples,
            filter_missing_features
        )
        # remove unobserved features from the phylogeny
        if filter_unobserved_features_from_phylogeny:
            self.tree = self.tree.shear(set(self.table.index))

        # extract balance parenthesis
        self._bp_tree = list(self.tree.B)

        self.tree = Tree.from_tree(to_skbio_treenode(self.tree))
        fill_missing_node_names(self.tree)

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
        # Note: tree_data starts with index 1 because the bp tree uses 1 based
        # indexing
        for i, node in enumerate(self.tree.postorder(include_self=True), 1):
            tree_data[i] = {
                'name': node.name,
            }
            # Add coordinate data from all layouts for this node
            for layoutsuffix in layout_to_coordsuffix.values():
                xcoord = "x" + layoutsuffix
                ycoord = "y" + layoutsuffix
                tree_data[i][xcoord] = getattr(node, xcoord)
                tree_data[i][ycoord] = getattr(node, ycoord)
            # Hack: it isn't mentioned above, but we need start pos info for
            # circular layout. The start pos for the other layouts is the
            # parent xy coordinates so we need only need to specify the start
            # for circular layout.
            tree_data[i]["xc0"] = node.xc0
            tree_data[i]["yc0"] = node.yc0

            # Also add vertical bar coordinate info for the rectangular layout,
            # and start point & arc coordinate info for the circular layout
            if not node.is_tip():
                tree_data[i]["highestchildyr"] = node.highest_child_yr
                tree_data[i]["lowestchildyr"] = node.lowest_child_yr
                if not node.is_root():
                    tree_data[i]["arcx0"] = node.arcx0
                    tree_data[i]["arcy0"] = node.arcy0
                    tree_data[i]["arcstartangle"] = node.highest_child_clangle
                    tree_data[i]["arcendangle"] = node.lowest_child_clangle

            if node.name in names_to_keys:
                names_to_keys[node.name].append(i)
            else:
                names_to_keys[node.name] = [i]

        names = []
        for node in self.tree.preorder(include_self=True):
            names.append(node.name)

        s_ids, f_ids, sid2idxs, fid2idxs, compressed_table = compress_table(
            self.table
        )
        sm_cols, compressed_sm = compress_sample_metadata(
            sid2idxs, self.samples
        )
        fm_cols, compressed_tm, compressed_im = compress_feature_metadata(
            self.tip_md, self.int_md
        )

        data_to_render = {
            'base_url': self.base_url,
            # tree info
            'tree': shifting(self._bp_tree),
            'tree_data': tree_data,
            'names': names,
            'names_to_keys': names_to_keys,
            # feature table
            's_ids': s_ids,
            'f_ids': f_ids,
            's_ids_to_indices': sid2idxs,
            'f_ids_to_indices': fid2idxs,
            'compressed_table': compressed_table,
            # sample metadata
            'sample_metadata_columns': sm_cols,
            'compressed_sample_metadata': compressed_sm,
            # feature metadata
            'feature_metadata_columns': fm_cols,
            'compressed_tip_metadata': compressed_tm,
            'compressed_int_metadata': compressed_im,
            # layout information
            'layout_to_coordsuffix': layout_to_coordsuffix,
            'default_layout': default_layout,
            # Emperor integration
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
        self._emperor.width = '50vw'
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
        with open(NODE_CLICK_CALLBACK_PATH) as f:
            node_click_callback = f.read()

        emperor_require_logic = emperor_require_logic.replace(
            '/*__select_callback__*/', selection_callback)
        emperor_require_logic = emperor_require_logic.replace(
            '/*__custom_on_ready_code__*/', node_click_callback)

        emperor_data = {
            'emperor_div': emperor_div,
            'emperor_require_logic': emperor_require_logic,
            'emperor_style': style,
            'emperor_base_dependencies': emperor_base_dependencies,
            'emperor_classes': 'combined-plot-container'
        }

        return emperor_data
