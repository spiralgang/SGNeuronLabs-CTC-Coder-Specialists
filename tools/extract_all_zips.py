"""
Bulk-unzip all .zip files in the repository (recursively), preserving directory structure.
- Extracts each archive to a subdirectory named after the zip file (minus extension).
- Skips already-extracted targets to avoid overwriting.
- Designed for mobile/Android user-space Linux (UserLAnd, ACR Shell Terminal, etc.).

References: Vault: /reference (Python stdlib, pathlib, zipfile, mobile Python practices)
"""
import zipfile, pathlib, sys

def extract_zip(zip_path):
    extract_dir = zip_path.parent / zip_path.stem
    if extract_dir.exists() and any(extract_dir.iterdir()):
        print(f"[SKIP] {extract_dir} already exists and is not empty.")
        return
    extract_dir.mkdir(exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(extract_dir)
    print(f"[OK] Extracted {zip_path} → {extract_dir}")

def main(root="."):
    repo_root = pathlib.Path(root).resolve()
    zips = list(repo_root.glob("**/*.zip"))
    if not zips:
        print("[INFO] No .zip files found in repo.")
        return
    for zip_path in zips:
        try:
            extract_zip(zip_path)
        except Exception as e:
            print(f"[ERROR] Failed to extract {zip_path}: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()

# References: Vault: /reference (Python stdlib, pathlib, zipfile, mobile-friendly scripting)
