# Empress
Empress is an interactive tree visualization tool. You need to provide three files in order to run it, the tree file (we only support newick currently), the internal node metadata file and the leaf node metadata file.

# Installation
Please install the following packages in order to run Empress

```
conda install tornado
conda install -c conda-forge scikit-bio
```

# Run
From the root directiory of empress type the following commands in the terminal

```
cd phyloviz
python webserver.py --tree_file filename [--tree_format format] --internal_metadata filename --leaf_metadata filename

```

To see the usage:

```
python webserver.py --help
```

You should then see 'start' in the terminal. Wait until you see 'server started at port 8080' and then open up your web brower. Type

```
localhost:8080
```
into the search bar.

# Example

```
python webserver.py --tree_file astral.MR.rooted.nid.nosup.nwk --internal_metadata ncbi.t2t.txt --leaf_metadata metadata.txt
```

"astral.MR.rooted.nid.nosup.nwk" is a Newick tree file. \
"ncbi.t2t.txt" is the metadata file for the internal nodes of the tree. \
"metadata.txt" is the metadata file for the leaf nodes of the tree.

# Input Formats
Empress takes in as input a Newick file for the tree and a tabular mapping file for the feature metadata.

The input feature metadata needs to be a tab delimited file where the row ids correspond to node identifiers in the tree.
Columns in the file correspond to attributes that the user would like to paint on the tree.

An example of a feature metadata file would look like something as follows
```
#OTU_ID      Genome_size     Phyla
OTU_1001     100000          Proteobacteria
OTU_1002     150201          Firmicutes
OTU_2001     502051          Actinobacteria
```
