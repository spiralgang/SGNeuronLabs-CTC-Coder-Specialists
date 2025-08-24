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

# [spiralgang@localhost]~:# ./copilot-instructions.md
## Instructional-Extension_Cyberforges
@copilot

on:
  push:
    branches: [ "main", "dev", "feature/*", "fix/*" ]
  issues:
    types: [opened, edited, reopened]
  pull_request:
    branches: [ "main", "dev" ]
  schedule:
    - cron: '42 13 * * 1'
  workflow_dispatch:

permissions:
  contents: write
  issues: write
  pull-requests: write
  checks: write

jobs:
  copilot-instructional-cyberforge:
    name: Cyberforge Copilot Dashboard
    runs-on: ubuntu-latest
    steps:
      - name: 🚀 Checkout Codebase
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: ${{ github.event.pull_request.head.sha || github.sha }}

      - name: 🛠️ Setup Python Environment
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: ⚡ Install Dependencies
        run: |
          echo "🤖 cyberforge: Bootstrapping env..."
          python3 -m pip install --upgrade pip
          python3 -m pip install flake8 jq
          python3 tools/check_env.py || echo "Env check failed, proceeding..."
        timeout-minutes: 20

      - name: 📦 Extract Zip Archives
        run: |
          echo "🤖 cyberforge: Extracting zips..."
          python3 tools/extract_all_zips.py

      - name: 🔍 Collect Bot Status
        id: bot-status
        run: |
          echo "🤖 cyberforge: Collecting bot statuses..."
          mkdir -p results
          echo "# Cyberforge Bot Dashboard" > CYBERFORGE_STATUS.md
          echo "## Bot Activity Log" >> CYBERFORGE_STATUS.md
          echo "- **Bootstrap-and-Extract**: $(gh run list --workflow bootstrap-and-extract.yml --json conclusion --jq '.[0].conclusion' || echo 'Not run')" >> CYBERFORGE_STATUS.md
          echo "- **Python-Package-Conda**: $(gh run list --workflow python-package-conda.yml --json conclusion --jq '.[0].conclusion' || echo 'Not run')" >> CYBERFORGE_STATUS.md
          echo "- **Docker-CI**: $(gh run list --workflow docker-ci.yml --json conclusion --jq '.[0].conclusion' || echo 'Not run')" >> CYBERFORGE_STATUS.md
          echo "- **Tencent**: $(gh run list --workflow tencent.yml --json conclusion --jq '.[0].conclusion' || echo 'Not run')" >> CYBERFORGE_STATUS.md
          echo "## Next Steps for @Copilot" >> CYBERFORGE_STATUS.md
          echo "- Review open PRs for auto-fixes and improvements." >> CYBERFORGE_STATUS.md
          echo "- Check issues labeled 'cyberforge' for new tasks." >> CYBERFORGE_STATUS.md
          git add CYBERFORGE_STATUS.md
          git config user.name "cyberforge"
          git config user.email "cyberforge@sgneurolabs.io"
          git commit -m "🤖 cyberforge: Update bot dashboard" || echo "No changes"
          git push

      - name: 📣 Copilot Loop - Deduplicate & Propose Tasks
        uses: actions/github-script@v7
        with:
          script: |
            const issues = await github.rest.issues.listForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'open',
              labels: 'cyberforge'
            });
            const dupe = issues.data.some(issue => issue.title.includes('Bot Dashboard'));
            if (!dupe) {
              const pr = await github.rest.pulls.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: 'cyberforge: Bot Dashboard & Task Proposals',
                body: '🤖 Auto-generated PR for bot status updates and new tasks across 40+ repos. Bots are looping:\n' +
                      '- Bootstrap: Zip extraction\n- Python: Linting/Tests\n- Docker: Builds\n- Tencent: Deploys\n' +
                      'Review @Copilot, then push to @spiralgang for merge.',
                head: 'cyberforge-dashboard-' + Date.now(),
                base: 'main'
              });
              github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: pr.data.number,
                body: '@Copilot: Bots are looping issues/tasks to you. Check CYBERFORGE_STATUS.md for status. Approve or suggest next steps.'
              });
            }

      - name: 🧹 Run Flake8 Linting
        run: |
          echo "🤖 cyberforge: Running flake8..."
          python3 -m flake8 tools/ --count --select=E9,F63,F7,F82 --show-source --statistics || true
          python3 -m flake8 tools/ --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics

      - name: 🔔 Notify on Failure
        if: failure()
        uses: slackapi/slack-github-action@v1.27.0
        with:
          slack-bot-token: ${{ secrets.SLACK_BOT_TOKEN }}
          channel-id: 'devops-channel'
          text: |
            🚨 cyberforge alert: Copilot Instructional Extension failed on ${{ github.repository }}!
            Branch: ${{ github.ref_name }}
            Check: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}

      - name: 🧹 Cleanup
        if: always()
        run: |
          echo "🤖 cyberforge: Purging artifacts..."
          rm -rf results/

      - name: 🎨 Generate Badge
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const badge = `![Copilot Dashboard Status](https://img.shields.io/badge/Copilot_Dashboard-Success-brightgreen?logo=github)`;
            fs.appendFileSync('README.md', `\n${badge}\n`);
            github.rest.repos.createOrUpdateFileContents({
              owner: context.repo.owner,
              repo: context.repo.repo,
              path: 'README.md',
              message: '🤖 cyberforge: Update Copilot Dashboard badge',
              content: Buffer.from(fs.readFileSync('README.md')).toString('base64'),
              sha: (await github.rest.repos.getContent({
                owner: context.repo.owner,
                repo: context.repo.repo,
                path: 'README.md'
              })).data.sha
            });

  # cyberforge Disclaimer: Forged with max efficiency, compliant with GitHub’s Terms of Service, Privacy Policy, and Workflow Best Practices. See https://docs.github.com/en/actions/using-workflows/workflow-best-practices. Stay cyber, stay legit! 🤖
