#!/bin/bash
# Remove Python cache and temp files for repo hygiene.
# Usage: bash tools/clean_python_cache.sh
find . -type d -name "__pycache__" -exec rm -rf {} +
find . -type f -name "*.pyc" -delete
find . -type f -name "*.pyo" -delete
echo "Removed Python cache and temp files."
# References: Vault: /reference (Python cache cleanup, repo hygiene)
