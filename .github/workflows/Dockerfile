# Use lightweight Python image
FROM python:3.11-slim

WORKDIR /repo

# Copy the entire repo into the container
COPY . .

# Install Python dependencies if requirements exist
RUN python3 -m pip install --upgrade pip && \
    if [ -f requirements.txt ]; then pip install -r requirements.txt; fi

# Extract all zips (and optionally run more scripts)
RUN python3 tools/extract_all_zips.py

# Default to bash for exploration or further commands
CMD ["/bin/bash"]
