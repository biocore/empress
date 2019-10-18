#!/usr/bin/env python
# ----------------------------------------------------------------------------
# Copyright (c) 2013--, empress development team.
#
# Distributed under the terms of the Modified BSD License.
#
# The full license is in the file LICENSE.md, distributed with this software.
# ----------------------------------------------------------------------------

from setuptools import setup, find_packages

__version__ = "0.1-dev"
__maintainer__ = "Empress development team"
__email__ = "kcantrel@ucsd.edu"

# based on the text found in github.com/qiime/pynast
classes = """
    Development Status :: 4 - Beta
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

base = ["numpy", "scipy", "pandas",
        "jinja2", "scikit-bio", "biom-format", "iow"]
test = ["pep8", "flake8", "nose"]
all_deps = base + test

setup(
    name='empress',
    version=__version__,
    description='Empress',
    author="Empress Development Team",
    author_email=__email__,
    maintainer=__maintainer__,
    maintainer_email=__email__,
    url='http://github.com/biocore/empress',
    packages=find_packages(),
    package_data={
        'empress': ['support_files/vendor/*.js',
                    'support_files/css/*.css',
                    'support_files/js/*.js',
                    'support_files/templates/*.html']},
    data_files={},
    install_requires=base,
    extras_require={'test': test, 'all': all_deps},
    long_description=long_description,
    long_description_content_type='text/markdown',
    license='BSD-3-Clause',
    classifiers=classifiers)
