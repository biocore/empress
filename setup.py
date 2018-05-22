#!/usr/bin/env python

# ----------------------------------------------------------------------------
# Copyright (c) 2016--, Empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file COPYING.txt, distributed with this software.
# ----------------------------------------------------------------------------

from setuptools import find_packages, setup

extensions = []

classes = """
    Development Status :: 4 - Beta
    License :: OSI Approved :: BSD License
    Topic :: Software Development :: Libraries
    Topic :: Scientific/Engineering
    Topic :: Scientific/Engineering :: Bio-Informatics
    Programming Language :: Python :: 3
    Programming Language :: Python :: 3 :: Only
    Operating System :: Unix
    Operating System :: POSIX
    Operating System :: MacOS :: MacOS X
"""
classifiers = [s.strip() for s in classes.split('\n') if s]

description = ('Phylogenetic visualizations')

with open('README.md') as f:
    long_description = f.read()

# version parsing from __init__ pulled from Flask's setup.py
# https://github.com/mitsuhiko/flask/blob/master/setup.py
version = "0.0.1"

setup(
    name='Empress',
    version=version,
    license='BSD',
    description=description,
    long_description=long_description,
    author="Empress development team",
    author_email="jamietmorton@gmail.com",
    maintainer="Empress development team",
    maintainer_email="jamietmorton@gmail.com",
    packages=find_packages(),
    setup_requires=['numpy >= 1.9.2'],
    ext_modules=extensions,
    install_requires=[
        'IPython >= 3.2.0',
        'matplotlib >= 1.4.3',
        'numpy >= 1.9.2',
        'pandas >= 0.18.0',
        'scipy >= 0.15.1',
        'nose >= 1.3.7',
        'scikit-bio==0.5.1',
    ],
    classifiers=classifiers,
    package_data={},
)
