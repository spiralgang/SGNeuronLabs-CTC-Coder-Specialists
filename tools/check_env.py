"""
Check core environment versions (Python, pip, CUDA, ONNX, torch, system info).
References: Vault: /reference (Python, sys, platform, auditability)
"""
import sys, platform, subprocess

def run(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, encoding='utf8').strip()
    except Exception:
        return "N/A"

print(f"Python: {sys.version}")
print(f"pip: {run('pip --version')}")
print(f"Platform: {platform.platform()}")
print(f"CPU: {platform.processor()}")
print(f"RAM: {run('free -h')}")
print(f"CUDA: {run('nvcc --version')}")
print(f"ONNX: {run('python3 -c \"import onnx; print(onnx.__version__)\"')}")
print(f"Torch: {run('python3 -c \"import torch; print(torch.__version__)\"')}")
# References: Vault: /reference (Python stdlib, platform, subprocess)
