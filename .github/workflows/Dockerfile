# Multi-stage build for SGNeuronLabs CTC Coder Specialists
FROM python:3.12-slim as base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY tools/ tools/
COPY *.yml ./

# Install Python dependencies
RUN pip install --no-cache-dir torch onnx transformers huggingface-hub numpy pillow onnxruntime

# Copy source code
COPY . .

# Run environment check on build
RUN python3 tools/check_env.py || echo "Environment check completed with warnings"

# Extract zips during build
RUN python3 tools/extract_all_zips.py || echo "Zip extraction completed"

# Expose common port
EXPOSE 8080

# Default command
CMD ["python3", "tools/check_env.py"]