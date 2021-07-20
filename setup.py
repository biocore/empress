#!/usr/bin/env python
# ----------------------------------------------------------------------------
# Copyright (c) 2016-2020, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE.md, distributed with this software.
# ----------------------------------------------------------------------------

from setuptools import setup, find_packages

__version__ = "1.2.0"
__maintainer__ = "Empress development team"
__email__ = "kcantrel@ucsd.edu"

# based on the text found in github.com/qiime/pynast
classes = """
    Development Status :: 5 - Production/Stable
    License :: OSI Approved :: BSD License
    Topic :: Software Development :: Libraries :: Application Frameworks
    Topic :: Software Development :: User Interfaces
    Programming Language :: Python
    Programming Language :: Python :: 3.5
    Programming Language :: Python :: 3.6
    Programming Language :: Python :: 3.7
    Programming Language :: Python :: Implementation :: CPython
    Operating System :: OS Independent
    Operating System :: POSIX
    Operating System :: MacOS :: MacOS X
"""

classifiers = [s.strip() for s in classes.split('\n') if s]

with open('README.md') as f:
    long_description = f.read()

base = ["numpy", "scipy", "pandas", "click",
        "jinja2", "scikit-bio", "biom-format", "iow",
        "emperor>=1.0.2"]
test = ["flake8", "nose"]
all_deps = base + test

setup(
    name='empress',
    version=__version__,
    description=(
        "Fast and scalable phylogenetic tree viewer for multi-omic data "
        "analysis"
    ),
    author="Empress Development Team",
    author_email=__email__,
    maintainer=__maintainer__,
    maintainer_email=__email__,
    url='http://github.com/biocore/empress',
    entry_points={
        'qiime2.plugins': ['q2-empress=empress.plugin_setup:plugin'],
        'console_scripts': ['empress=empress.scripts._cli:empress'],
    },
    packages=find_packages(),
    package_data={
        'empress': ['support_files/vendor/*.js',
                    'support_files/vendor/*.css',
                    'support_files/css/*.css',
                    'support_files/js/*.js',
                    'support_files/templates/*.html',
                    'citations.bib']},
    data_files={},
    # Yanked from Qurro: NumPy and Cython need to be installed before
    # trying to install EMPress / other pip packages.
    # https://github.com/biocore/qurro/blob/master/setup.py
    setup_requires=["cython", "numpy >= 1.12.0"],
    install_requires=base,
    extras_require={'test': test, 'all': all_deps},
    long_description=long_description,
    long_description_content_type='text/markdown',
    license='BSD-3-Clause',
    classifiers=classifiers)
