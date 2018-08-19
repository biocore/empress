# Installation
Please install the following packages in order to run Empress

```
conda create -n empress pip tornado
source activate empress
conda install -c conda-forge scikit-bio
pip install git+https://github.com/biocore/empress.git
```

# Run
Type the following commands in the terminal for more information

```
empress --help
```

TODO: Need example command + datasets

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
