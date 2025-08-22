#!/bin/bash
# Update Python environment to match requirements.txt (or requirements-mobile.txt).
# Usage: bash tools/update_env_from_requirements.sh
set -e
REQS="requirements.txt"
ALT_REQS="requirements-mobile.txt"
if [ -f "$ALT_REQS" ]; then
    REQS="$ALT_REQS"
fi
echo "Upgrading Python packages to match $REQS"
python3 -m pip install --upgrade pip
pip freeze > .old_requirements.txt
python3 -m pip install --upgrade -r "$REQS"
pip freeze > .current_requirements.txt
echo "Environment updated. See .old_requirements.txt and .current_requirements.txt for diffs."
# References: Vault: /reference (pip, Python env management)
