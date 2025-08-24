# GitHub Multi-Model Agent

A production-grade GitHub bot that automatically discovers free-tier AI model API keys and agentically uses them with selectable models.

## Features

- **API Key Auto-Discovery**: Automatically finds API keys for popular AI services
- **Local Model Support**: Use Hugging Face models directly in your GitHub repository
- **Workflow Automation**: Code review, issue triage, and security scanning
- **Model Selection**: Choose specific models for different tasks
- **Docker Ready**: Easy deployment with Docker and Docker Compose

## Quick Start

### Prerequisites

- GitHub account with repository access
- Docker and Docker Compose (for containerized deployment)
- API keys for one or more AI services (auto-discovered if available)

### Setup with Docker

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/github-multi-model-agent.git
cd github-multi-model-agent