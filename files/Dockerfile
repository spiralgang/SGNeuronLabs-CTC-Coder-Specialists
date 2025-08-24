FROM node:18-alpine AS base

# Create app directory
WORKDIR /app

# Install Python and Git LFS for local model support
RUN apk add --no-cache python3 py3-pip git git-lfs && \
    pip3 install --no-cache-dir transformers torch numpy

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Create a non-root user
RUN addgroup -g 1001 appuser && \
    adduser -u 1001 -G appuser -s /bin/sh -D appuser && \
    chown -R appuser:appuser /app

# Create directories for persistency
RUN mkdir -p /app/.api-keys /app/.github/models && \
    chown -R appuser:appuser /app/.api-keys /app/.github/models

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "src/server.js"]