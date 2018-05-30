# Empress
Note Empress is still in its early development phase and currently does not support a command line interface.  So, in order
to run Empress you need to have three files located in the same directory as controller.py.  The three files are
astral.MR.rooted.nid.nosup.nwk, ncbi.t2t.txt, and metadata.txt. "astral.MR.rooted.nid.nosup.nwk" is any Newick tree file.
"ncbi.t2t.txt" is the metadata file for the internal nodes of the tree. "metadata.txt" is the metadata file for the leaf nodes of the tree.

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
python webserver.py
```

You should then see 'start' in the terminal. Wait until you see 'server started at port 8080' and then open up your web brower. Type

```
localhost:8080
```
into the search bar.

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
