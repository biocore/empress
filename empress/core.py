# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE, distributed with this software.
# ----------------------------------------------------------------------------

from empress.tree import validate_tree, bp_tree_tips
from empress.tools import (
    match_inputs, match_tree_and_feature_metadata,
    shifting, filter_feature_metadata_to_tree
)
from empress.compression_utils import (
    remove_empty_samples_and_features, compress_table,
    compress_sample_metadata, compress_feature_metadata
)

import pkg_resources
import os
import pandas as pd

from shutil import copytree
from emperor import Emperor
from jinja2 import Environment, FileSystemLoader

SUPPORT_FILES = pkg_resources.resource_filename('empress', 'support_files')
TEMPLATES = os.path.join(SUPPORT_FILES, 'templates')
EMPEROR_CALLBACK_PATH = os.path.join(SUPPORT_FILES, 'js',
                                     'emperor-callbacks.js')


class Empress():
    def __init__(self, tree, table=None, sample_metadata=None,
                 feature_metadata=None, ordination=None,
                 ignore_missing_samples=False, filter_extra_samples=False,
                 filter_missing_features=False, resource_path=None,
                 shear_to_table=True, shear_to_feature_metadata=False):
        """Visualize a phylogenetic tree

        Use this object to interactively display a phylogenetic tree using the
        Empress GUI.

        Note that the table and sample metadata must either both be specified
        or both be None. If only one of them is None, this will raise a
        ValueError. If both are None, then the values of the ordination,
        ignore_missing_samples, filter_extra_samples, filter_missing_features,
        and shear_to_table arguments will be ignored since no sample
        information is available.

        Parameters
        ----------
        tree: bp.BP
            The phylogenetic tree to visualize.
        table: biom.Table, optional
            The matrix to visualize paired with the phylogenetic tree.
        sample_metadata: pd.DataFrame, optional
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
        shear_to_table: bool, optional
            If True, shears the tree to just the tips that are present as
            features in the feature table. Otherwise, the tree is not shorn.


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
        # Use XOR to verify that either both or neither of the table and
        # sample metadata are None. Parens needed for precedence stuff.
        if (table is None) ^ (sample_metadata is None):
            # The caller messed something up, so raise an error.
            # It should not be possible for the user to pass *just* one of
            # these things (qiime empress community-plot requires both, and
            # qiime empress tree-plot accepts neither).
            raise ValueError(
                "Both the table and sample metadata should be specified or "
                "None. However, only one of them is None."
            )
        elif table is not None and sample_metadata is not None:
            self.is_community_plot = True
        else:
            self.is_community_plot = False

        self.table = table

        if sample_metadata is not None:
            self.samples = sample_metadata.copy()
        else:
            self.samples = None

        if feature_metadata is not None:
            # this will be transformed into self.tip_md and self.int_md in
            # self._validate_and_match_data()
            self.features = feature_metadata.copy()
        else:
            if shear_to_feature_metadata:
                raise ValueError(
                    "Feature metadata must be provided in order to shear "
                    "to feature metadata."
                )
            self.features = None

        self.ordination = ordination
        self.is_empire_plot = (self.ordination is not None)

        self.base_url = resource_path
        if self.base_url is None:
            self.base_url = 'support_files'

        self._validate_and_match_data(
            ignore_missing_samples,
            filter_extra_samples,
            filter_missing_features,
            shear_to_table,
            shear_to_feature_metadata,
        )

        if self.is_empire_plot:

            # biplot arrows can optionally have metadata, think for example
            # a study where the arrows represent pH, Alkalinity, etc.
            # Therefore, check if there are matches in the metadata, if
            # there aren't additional errors can be overriden with the
            # ignore_missing_samples flag
            feature_metadata = None
            if self.ordination.features is not None:

                # if there are no matches set to None so Emperor can ignore
                # the feature metadata
                if self.tip_md is None and self.int_md is None:
                    feature_metadata = pd.DataFrame()
                else:
                    feature_metadata = pd.concat([self.tip_md, self.int_md])
                arrows = self.ordination.features.index
                if (feature_metadata.index.intersection(arrows).empty or
                   feature_metadata.empty):
                    feature_metadata = None

            self._emperor = Emperor(
                self.ordination, mapping_file=self.samples,
                feature_mapping_file=feature_metadata,
                ignore_missing_samples=ignore_missing_samples,
                remote='./emperor-resources')
        else:
            self._emperor = None

    def _validate_and_match_data(self, ignore_missing_samples,
                                 filter_extra_samples,
                                 filter_missing_features,
                                 shear_to_table,
                                 shear_to_feature_metadata):

        if self.is_community_plot:
            # Hack to unpack long tuples: https://stackoverflow.com/q/26036143
            (
                self.table, self.samples, self.tip_md, self.int_md,
                self.tax_cols
            ) = match_inputs(
                self.tree, self.table, self.samples, self.features,
                self.ordination, ignore_missing_samples, filter_extra_samples,
                filter_missing_features
            )
            # Remove empty samples and features from the table (and remove the
            # removed samples from the sample metadata). We also pass in the
            # ordination, if present, to this function -- so we can throw an
            # error if the ordination actually contains these empty
            # samples/features.
            #
            # We purposefully do this removal *after* matching (so we know the
            # data inputs match up) and *before* shearing (so empty features
            # in the table are no longer included as tips in the tree).
            self.table, self.samples = remove_empty_samples_and_features(
                self.table, self.samples, self.ordination
            )
            # remove unobserved features from the phylogeny (shear the tree)
            if shear_to_table:
                features = set(self.table.ids(axis='observation'))
                self.tree = self.tree.shear(features)
                # Remove features in the feature metadata that are no longer
                # present in the tree, due to being shorn off
                if self.tip_md is not None or self.int_md is not None:
                    # (Technically they should always both be None or both be
                    # DataFrames -- there's no in-between)
                    self.tip_md, self.int_md = filter_feature_metadata_to_tree(
                        self.tip_md, self.int_md, self.tree
                    )

        else:
            if shear_to_feature_metadata:
                features = set(self.features.index)
                all_tips = set(bp_tree_tips(self.tree))
                # check that feature metadata contains at least 1 tip
                if not features.intersection(all_tips):
                    raise ValueError(
                        "Cannot shear tree to feature metadata: no tips in "
                        "the tree are present in the feature metadata."
                    )
                self.tree = self.tree.shear(features)
            (
                self.tip_md, self.int_md, self.tax_cols
            ) = match_tree_and_feature_metadata(self.tree, self.features)
        validate_tree(self.tree)

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
        # to_dict puts the data into a dictionary-like object for consumption
        data = self.to_dict()

        plot = main_template.render(data)

        return plot

    def to_dict(self):
        """Convert processed data into a dictionary

        Warning: the object returned by to_dict will contain references to
        internal variables. Exercise caution if modifying the value of objects
        returned by to_dict.

        Returns
        -------
        dict
            A dictionary describing the plots contained in the ordination
            object and the sample + feature metadata.
        """

        s_ids = f_ids = cmp_table = sm_cols = compressed_sm = None
        sid2idxs = fid2idxs = {}
        if self.is_community_plot:
            # The fid2idxs dict we get from compress_table() is temporary --
            # later, we'll restructure it so that the keys (feature IDs) are
            # nodes' postorder positions in the tree rather than arbitrary
            # unique integers. (TODO: it should be possible to speed this up by
            # passing the tree to compress_table() so postorder positions can
            # immediately be used as keys / feature IDs without an intermediate
            # step.)
            s_ids, f_ids, sid2idxs, fid2idxs_t, cmp_table = compress_table(
                self.table
            )
            sm_cols, compressed_sm = compress_sample_metadata(
                sid2idxs, self.samples
            )
        fm_cols, compressed_tm_tmp, compressed_im_tmp = \
            compress_feature_metadata(self.tip_md, self.int_md)

        # Use nodes' postorder positions as their "IDs" for the BIOM table and
        # feature metadata
        compressed_tm = {}
        compressed_im = {}
        # bptree indices start at one, hence we pad the arrays
        names = [-1]
        lengths = [-1]
        for i in range(1, len(self.tree) + 1):
            node = self.tree.postorderselect(i)
            name = self.tree.name(node)

            names.append(name)
            lengths.append(self.tree.length(node))

            if self.is_community_plot and name in fid2idxs_t:
                fid2idxs[i] = fid2idxs_t[name]
                f_ids[fid2idxs[i]] = i

            if name in compressed_tm_tmp:
                compressed_tm[i] = compressed_tm_tmp[name]

            # Note: for internal metadata, node names may not be unique. Thus,
            # we duplicate the internal node metadata for each node in the
            # metadata with the same name.
            if name in compressed_im_tmp:
                compressed_im[i] = compressed_im_tmp[name]

        data_to_render = {
            'base_url': self.base_url,
            # tree info
            'tree': shifting(self.tree.B),
            'lengths': lengths,
            'names': names,
            # Should we show sample metadata coloring / animation panels?
            'is_community_plot': self.is_community_plot,
            # Are we working with an EMPire plot?
            'is_empire_plot': self.is_empire_plot,
            # feature table
            's_ids': s_ids,
            'f_ids': f_ids,
            's_ids_to_indices': sid2idxs,
            'f_ids_to_indices': fid2idxs,
            'compressed_table': cmp_table,
            # sample metadata
            'sample_metadata_columns': sm_cols,
            'compressed_sample_metadata': compressed_sm,
            # feature metadata
            'feature_metadata_columns': fm_cols,
            'split_taxonomy_columns': self.tax_cols,
            'compressed_tip_metadata': compressed_tm,
            'compressed_int_metadata': compressed_im,
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

        # The following line references will be replace with API calls to the
        # Emperor object, however those are not implemented yet
        emperor_base_dependencies = self._emperor.render_base_dependencies()

        style = self._emperor.render_style()

        # main divs for emperor
        emperor_div = self._emperor.render_html('emperor-in-empire')

        # main js script for emperor, including additional callbacks
        with open(EMPEROR_CALLBACK_PATH) as f:
            self._emperor.js_on_ready = f.read()
        emperor_require_logic = self._emperor.render_js('emperor-in-empire')

        emperor_data = {
            'emperor_div': emperor_div,
            'emperor_require_logic': emperor_require_logic,
            'emperor_style': style,
            'emperor_base_dependencies': emperor_base_dependencies,
            'emperor_classes': 'combined-plot-container'
        }

        return emperor_data
