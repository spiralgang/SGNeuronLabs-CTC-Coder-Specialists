"""
Production-grade backend tool API for file and zip archive operations.
- Place this file in your repo (e.g., tools/backend_file_api.py).
- Run with: `uvicorn tools.backend_file_api:app --reload`
- Secure endpoints and restrict access in production!
References: Vault /reference (FastAPI, Python security, RESTful API patterns)
"""

import os
import zipfile
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Backend File Tool API", version="1.0.0")

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class PathRequest(BaseModel):
    path: str

@app.get("/list_files", response_model=List[str])
def list_files(dir_path: Optional[str] = ""):
    """Recursively list all files and folders from a given directory."""
    abs_path = os.path.join(REPO_ROOT, dir_path)
    if not abs_path.startswith(REPO_ROOT):
        raise HTTPException(status_code=400, detail="Invalid directory.")
    if not os.path.isdir(abs_path):
        raise HTTPException(status_code=404, detail="Directory not found.")
    results = []
    for root, dirs, files in os.walk(abs_path):
        for name in files:
            results.append(os.path.relpath(os.path.join(root, name), REPO_ROOT))
        for name in dirs:
            results.append(os.path.relpath(os.path.join(root, name), REPO_ROOT) + "/")
    return results

@app.post("/unzip")
def unzip_file(req: PathRequest):
    """Unzip a zip file to its containing directory."""
    zip_path = os.path.join(REPO_ROOT, req.path)
    if not zip_path.endswith(".zip") or not os.path.isfile(zip_path):
        raise HTTPException(status_code=400, detail="File is not a zip archive.")
    extract_dir = os.path.dirname(zip_path)
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_dir)
    return {"status": "ok", "extracted_to": os.path.relpath(extract_dir, REPO_ROOT)}

@app.post("/read_file")
def read_file(req: PathRequest):
    """Read a file as text (for audit/debug)."""
    file_path = os.path.join(REPO_ROOT, req.path)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found.")
    with open(file_path, "r", encoding="utf-8") as f:
        return {"content": f.read()}

# (Optional) File write/delete endpoints can be added as needed, but are commented out for audit/safety.

# from fastapi import Body
# @app.post("/write_file")
# def write_file(req: PathRequest, content: str = Body(...)):
#     file_path = os.path.join(REPO_ROOT, req.path)
#     with open(file_path, "w", encoding="utf-8") as f:
#         f.write(content)
#     return {"status": "ok"}

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
