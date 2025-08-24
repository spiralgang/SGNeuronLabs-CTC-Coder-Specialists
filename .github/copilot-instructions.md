# SGNeuronLabs CTC Coder Specialists

SGNeuronLabs CTC Coder Specialists is a multi-language repository containing Python AI/ML tools, Node.js applications, and various development utilities. The repository includes both core tools and extracted third-party components from zip archives.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

- Bootstrap the Python environment:
  - `python3 --version` (should be 3.12+)
  - `python3 -m pip install --upgrade pip`
  - `python3 -m pip install torch onnx transformers huggingface-hub numpy pillow onnxruntime flake8 pytest` -- NEVER CANCEL: Can take 5-10 minutes depending on network. Set timeout to 15+ minutes.
  - NOTE: pip install may timeout due to network issues. This is expected and documented.

- Extract all repository zip archives:
  - `python3 tools/extract_all_zips.py` -- takes <1 second, extracts 11 zip files
  - This populates: `llvmlite-main/`, `terminal-chat-robot-node/`, `firebase-tools-master/`, `VirtualBoxSDK-7.2.0-170228/`, and others

- Environment validation:
  - `python3 tools/check_env.py` -- takes 2 seconds, shows Python, pip, platform, CUDA, ONNX, and PyTorch versions

- Docker build and run:
  - `docker build -f .github/workflows/Dockerfile . -t sgneurolab` -- NEVER CANCEL: Takes 40-50 seconds with full context. Set timeout to 90+ seconds.
  - `docker run --rm sgneurolab python3 tools/check_env.py`

## Linting and Code Quality

- Run Python linting:
  - `python3 -m flake8 tools/ --count --select=E9,F63,F7,F82 --show-source --statistics` -- critical errors check, takes <1 second
  - `python3 -m flake8 tools/ --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics` -- full linting, takes <1 second
  - KNOWN ISSUES: 35 style violations exist (mostly E401 multiple imports, E302 blank lines, W291 trailing whitespace)

- Clean Python cache:
  - `bash tools/clean_python_cache.sh`

## Testing

- Run pytest discovery:
  - `python3 -m pytest --collect-only` -- discovers tests but extracted packages have missing dependencies
  - EXPECTED: llvmlite tests will fail with "Could not find/load shared object file" - this is normal
  - Only run tests on code you modify, not on extracted third-party packages

## Node.js Applications

- Terminal chat robot (extracted from zip):
  - `cd terminal-chat-robot-node/terminal-chat-robot-node`
  - `npm install` -- takes 4 seconds, installs 54 packages with 3 vulnerabilities (expected)
  - `npm start` or `node bin/tcr` to run

- Firebase tools (extracted from zip):
  - `cd firebase-tools-master/firebase-tools-master`
  - `npm install --no-audit` -- NEVER CANCEL: Can take 5-15 minutes. Set timeout to 20+ minutes.
  - `npm run build` -- TypeScript compilation
  - NOTE: Firebase tools has complex build dependencies and may have warnings

## Key Python Tools

- **batch_inference.py**: Runs PyTorch models on image folders
  - Usage: `python3 tools/batch_inference.py <model_path> <data_dir> <output_csv>`
  - NOTE: Requires `weights_only=False` for torch.load() in newer PyTorch versions due to security changes
  - Test command: Create test images with PIL and run inference

- **onnx_runtime_benchmark.py**: Benchmarks ONNX models
  - Usage: `python3 tools/onnx_runtime_benchmark.py <onnx_path> [--input-shape 1 3 224 224] [--runs 50]`

- **check_env.py**: Environment diagnostics
  - Usage: `python3 tools/check_env.py`
  - Shows Python, pip, platform, CUDA (if available), ONNX, PyTorch versions

- **extract_all_zips.py**: Bulk zip extraction
  - Usage: `python3 tools/extract_all_zips.py`
  - Skips already-extracted directories

- **hub_push.py**: HuggingFace Hub utilities (requires huggingface-hub)

- **clean_python_cache.sh**: Removes __pycache__ and .pyc files

## GitHub Workflows

- **bootstrap-and-extract.yml**: Automatically extracts zips on push to main
- **python-package-conda.yml**: Conda-based Python CI with flake8 and pytest
- **docker-ci.yml**: Builds and pushes Docker images
- **tencent.yml**: (Additional workflow)

## Validation

- ALWAYS run environment check after setup: `python3 tools/check_env.py`
- ALWAYS run zip extraction first: `python3 tools/extract_all_zips.py` 
- ALWAYS test Docker build after changes: `docker build -f .github/workflows/Dockerfile . -t test-build`
- ALWAYS run flake8 critical error check: `python3 -m flake8 tools/ --count --select=E9,F63,F7,F82 --show-source --statistics`
- Test ML tools with dummy data before using real models
- For PyTorch code changes, create test images and models to validate batch_inference.py functionality

## Common Issues and Workarounds

- **PyTorch security**: Use `weights_only=False` parameter for `torch.load()` when loading models created with older PyTorch versions
- **pip timeouts**: Network timeouts during pip install are common - retry with longer timeout or install individual packages
- **Docker context**: Large context (1GB+) makes Docker builds slower - this is expected
- **CUDA unavailable**: No NVCC installed, CUDA operations will use CPU - this is normal in standard environments
- **f-string syntax error in check_env.py**: Contains backslash in f-string, works in Python 3.12+ but may fail in containers with older Python
- **llvmlite tests fail**: Missing shared libraries - only test your own code, not extracted dependencies

## Directory Structure

```
.
├── tools/                          # Core Python utilities
├── github/                         # GitHub model runner scripts  
├── OpenAI/                         # OpenAI API examples
├── meta/                          # Meta/Llama model examples
├── deepseek/                      # DeepSeek integrations
├── xAI/                           # xAI integrations
├── ZhipuAiClient/                 # Zhipu AI client
├── AgenticToolClient/             # Agentic tool client
├── Qualcomm/                      # Qualcomm-specific code
├── .github/workflows/             # CI/CD workflows
└── [extracted-directories]/       # Extracted from zip files
```

## Performance Expectations

- Environment check: 2 seconds
- Zip extraction (first time): <1 second  
- Docker build: 40-50 seconds (NEVER CANCEL - set 90+ second timeout)
- Python dependency install: 5-15 minutes (NEVER CANCEL - set 20+ minute timeout)  
- Flake8 linting: <1 second
- Firebase tools npm install: 5-15 minutes (NEVER CANCEL - set 20+ minute timeout)

## Manual Validation Scenarios

After making changes, ALWAYS test these scenarios:

1. **Environment Setup**: Run `python3 tools/check_env.py` and verify Python, ONNX, PyTorch versions appear
2. **Tool Functionality**: Create test images, run `python3 tools/batch_inference.py --help` to verify tools work
3. **Docker Build**: Run `docker build -f .github/workflows/Dockerfile . -t validation-test` and ensure successful build
4. **Linting**: Run `python3 -m flake8 tools/ --count --select=E9,F63,F7,F82 --show-source --statistics` and verify 0 critical errors
5. **Node.js App**: If modifying Node.js components, cd to `terminal-chat-robot-node/terminal-chat-robot-node` and run `npm install && npm start` to verify basic functionality

## Time Management

- NEVER CANCEL Docker builds or npm installs even if they seem slow
- Always set timeouts of 90+ seconds for Docker builds
- Always set timeouts of 20+ minutes for dependency installations
- If operations appear hung, wait the full timeout period before investigating
- Build times are expected to be long due to large repository size and complex dependencies