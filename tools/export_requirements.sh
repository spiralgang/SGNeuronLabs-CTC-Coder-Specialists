#!/bin/bash
# Export current Python environment to requirements.txt (audit baseline).
# Usage: bash tools/export_requirements.sh
set -e
pip freeze > requirements.txt
echo "Exported environment to requirements.txt"
# References: Vault: /reference (pip freeze, requirements best practices)
