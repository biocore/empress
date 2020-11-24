TREE_DESC = 'The phylogenetic tree to visualize.'

FM_DESC = (
    'Feature metadata. Can be used to color nodes (tips and/or '
    'internal nodes) in the tree, and to display tip-level barplots. '
    'Features described in the metadata that are not present in the tree '
    'will be automatically filtered out of the visualization.'
)

TBL = (
    'A table that documents which features are in which '
    'samples. This information allows us to decorate the '
    'phylogeny by sample metadata. It\'s expected that '
    'all features in the table are also present as tips '
    'in the tree, and that all samples in the table are '
    'also present in the sample metadata file.'
)

SM_DESC = (
    'Sample metadata. Can be used to color tips in the tree by '
    'the samples they are unique to, and to display animations and '
    'tip-level barplots. Samples described in the metadata that are '
    'not present in the feature table will be automatically filtered '
    'out of the visualization.'
)

PCOA = (
    'Principal coordinates matrix to display simultaneously with '
    'the phylogenetic tree using Emperor.'
)

# Parameter descriptions adapted from q2-emperor's
# --p-ignore-missing-samples flag.
IGNORE_MISS_SAMP = (
    'This will suppress the error raised when the feature table '
    'contains samples that are not present in the sample metadata. '
    'Samples without metadata are included in the visualization by '
    'setting all of their metadata values to "This sample has no '
    'metadata". Note that this flag will only be applied if at least '
    'one sample is present in both the feature table and the metadata.'
)

SHEAR_TO_FM = (
    'Determines whether or not to shear the tree to only the tips '
    'that are present as features in the feature metadata. Internal '
    'nodes present in the feature metadata are ignored during '
    'shearing, and can potentially be filtered out if none of their '
    'child tips are present in the feature metadata. By default, '
    'does not shear the tree.'
)

FILT_EX_SAMP = (
    'This will suppress the error raised when samples in the feature '
    'table are not included in the ordination. These samples will be '
    'will be removed from the visualization if this flag is passed. '
    'Note that this flag will only be applied if at least one sample '
    'in the table is also present in the ordination.'
)

FILT_MISS_FEAT = (
    'This will suppress the error raised when the feature table '
    'contains features that are not present as tips in the tree. '
    'These features will be removed from the visualization if this '
    'flag is passed. Note that this flag will only be applied if '
    'at least one feature in the table is also present as a tip in '
    'the tree.'
)

NUM_FEAT = (
    'The number of most important features (arrows) to display in the '
    'ordination. "Importance" is calculated for each feature based on the '
    'vector’s magnitude (euclidean distance from origin). Note, this '
    'parameter is only honored when a biplot is input.'
)

SHEAR_TO_TBL = (
    'Determines whether or not to shear the tree to only the tips '
    'that are present as features in the feature table. By default, '
    'shears the tree.'
)

TREE_PLOT_DESC = (
    'Generates an interactive phylogenetic tree visualization '
    'supporting interaction with feature metadata.'
)

COMM_PLOT_DESC = (
    'Generates an interactive phylogenetic tree visualization '
    'supporting interaction with sample and feature metadata and, '
    'optionally, Emperor integration.'
)

OUTPUT_DIR = (
    'Directory to create in which an EMPress visualization will be written.'
)
