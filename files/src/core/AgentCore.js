const { Octokit } = require('@octokit/rest');
const { App } = require('@octokit/app');
const path = require('path');
const ModelRegistry = require('../services/ModelRegistry');
const KeyManager = require('../services/KeyManager');
const WorkflowRegistry = require('../workflows/WorkflowRegistry');
const logger = require('../utils/logger');

class AgentCore {
  constructor(options = {}) {
    this.options = options;
    this.modelRegistry = new ModelRegistry();
    this.keyManager = new KeyManager();
    this.workflowRegistry = new WorkflowRegistry(this);
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize GitHub authentication
      await this._initGitHubAuth();
      
      // Discover available API keys
      await this.keyManager.initialize();
      await this.keyManager.discoverKeys();
      
      // Register local models
      await this._initLocalModels();
      
      // Register workflows
      this.workflowRegistry.registerDefaultWorkflows();
      
      this.initialized = true;
      logger.info('AgentCore initialized successfully');
    } catch (error) {
      logger.error('AgentCore initialization failed', error);
      throw error;
    }
  }

  async _initGitHubAuth() {
    // GitHub App authentication for webhook handling
    if (process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY) {
      this.app = new App({
        appId: process.env.GITHUB_APP_ID,
        privateKey: process.env.GITHUB_PRIVATE_KEY,
        webhooks: {
          secret: process.env.GITHUB_WEBHOOK_SECRET
        }
      });
      logger.info('GitHub App authentication configured');
    }
    
    // Personal access token authentication for API operations
    if (process.env.GITHUB_TOKEN) {
      this.octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
      });
      logger.info('GitHub API client initialized with personal access token');
    } else if (this.app) {
      // Use installation token from app
      const installationId = process.env.GITHUB_INSTALLATION_ID;
      if (installationId) {
        const { data: { token } } = await this.app.octokit.apps.createInstallationAccessToken({
          installation_id: installationId
        });
        
        this.octokit = new Octokit({ auth: token });
        logger.info('GitHub API client initialized with installation token');
      }
    }
    
    if (!this.octokit) {
      logger.warn('No GitHub authentication configured');
    }
  }

  async _initLocalModels() {
    const repoRoot = await this._getRepositoryRoot();
    if (!repoRoot) {
      logger.warn('Not in a Git repository, skipping local model initialization');
      return;
    }
    
    const modelsDir = path.join(repoRoot, '.github', 'models');
    await this.modelRegistry.scanLocalModels(modelsDir);
  }

  async _getRepositoryRoot() {
    try {
      // Simple repository detection - in real implementation this would be more robust
      const { execSync } = require('child_process');
      const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
      return repoRoot;
    } catch (error) {
      logger.debug('Not in a Git repository', error.message);
      return null;
    }
  }

  async runWorkflow(name, context, modelPreference = null) {
    if (!this.initialized) await this.initialize();
    
    const workflow = this.workflowRegistry.getWorkflow(name);
    if (!workflow) {
      throw new Error(`Workflow '${name}' not registered`);
    }
    
    const model = await this._selectModel(modelPreference, workflow.getRequiredCapabilities());
    
    return workflow.execute(context, model);
  }

  async _selectModel(modelPreference, requiredCapabilities = []) {
    if (modelPreference && await this.modelRegistry.hasModel(modelPreference)) {
      return this.modelRegistry.getModel(modelPreference);
    }
    
    return this.modelRegistry.findOptimalModel(requiredCapabilities);
  }

  async handleCommand(command, context) {
    if (!this.initialized) await this.initialize();
    
    const { workflow, model } = this._parseCommand(command);
    if (!workflow) {
      throw new Error('No workflow specified in command');
    }
    
    return this.runWorkflow(workflow, context, model);
  }

  _parseCommand(command) {
    // Parse commands like "run code-review using gpt-4"
    const workflowMatch = command.match(/(?:run\s+)?(\w+(?:-\w+)*)/i);
    const modelMatch = command.match(/using\s+(\w+(?:-[\w.]+)*)/i);
    
    return {
      workflow: workflowMatch ? workflowMatch[1] : null,
      model: modelMatch ? modelMatch[1] : null
    };
  }
}

module.exports = AgentCore;