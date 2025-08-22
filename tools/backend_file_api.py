"""
Bulk-unzip all .zip files in the repository, preserving directory structure.
References: Vault: /reference (Python stdlib, zipfile, pathlib, mobile compatibility)
"""
import zipfile, pathlib

repo_root = pathlib.Path(__file__).resolve().parents[1]
for zip_path in repo_root.glob("**/*.zip"):
    extract_dir = zip_path.parent / zip_path.stem
    extract_dir.mkdir(exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(extract_dir)
    print(f"Extracted {zip_path} to {extract_dir}")

# References: Vault: /reference (Python stdlib, zipfile, pathlib)
# @app.post("/delete_file")
# def delete_file(req: PathRequest):
#     file_path = os.path.join(REPO_ROOT, req.path)
#     if os.path.isfile(file_path):
#         os.remove(file_path)
#         return {"status": "deleted"}
#     raise HTTPException(status_code=404, detail="File not found.")

# Security: Add authentication (API key/bearer token) in production!
# See FastAPI security guides in /reference.

# References
# - Vault: /reference (FastAPI, REST, Python security, file handling)
# - https://fastapi.tiangolo.com/tutorial/security/
# - https://docs.python.org/3/library/zipfile.html
# - https://peps.python.org/pep-0008/
