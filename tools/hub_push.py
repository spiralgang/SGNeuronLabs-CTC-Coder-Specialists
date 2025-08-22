"""
Push models or files to Hugging Face Hub. Requires 'huggingface_hub' package.
References: Vault: /reference (Hugging Face Hub CLI/API, mobile-friendly Python)
"""
from huggingface_hub import HfApi
import argparse

def push_to_hub(repo_id, filepath, token):
    api = HfApi()
    api.upload_file(
        path_or_fileobj=filepath,
        path_in_repo=filepath.split("/")[-1],
        repo_id=repo_id,
        token=token,
    )
    print(f"Uploaded {filepath} to {repo_id}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("repo_id")
    parser.add_argument("filepath")
    parser.add_argument("token")
    args = parser.parse_args()
    push_to_hub(args.repo_id, args.filepath, args.token)

# References: Vault: /reference (Hugging Face Hub, mobile Python)
