"""
Bulk-unzip all .zip files in the repository, preserving directory structure.
References: Vault: /reference (Python stdlib, pathlib, zipfile best practices)
"""
import zipfile, pathlib

repo_root = pathlib.Path(__file__).resolve().parents[1]
for zip_path in repo_root.glob("**/*.zip"):
    extract_dir = zip_path.parent / zip_path.stem
    extract_dir.mkdir(exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(extract_dir)
    print(f"Extracted {zip_path} to {extract_dir}")

# References: Vault: /reference (Python stdlib, pathlib, zipfile)
