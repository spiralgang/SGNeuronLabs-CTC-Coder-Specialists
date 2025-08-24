const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');
const APIKeyManager = require('../services/APIKeyManager');
const ModelSelector = require('../services/ModelSelector');
const AgentWorkflow = require('../workflows/AgentWorkflow');
const logger = require('../utils/logger');

class GitHubAgentCore {
  constructor(config) {
    this.config = config;
    this.keyManager = new APIKeyManager();
    this.modelSelector = new ModelSelector();
    this.workflows = {};
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize GitHub app authentication
      this.octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: process.env.GITHUB_APP_ID,
          privateKey: process.env.GITHUB_PRIVATE_KEY,
          installationId: process.env.GITHUB_INSTALLATION_ID,
        },
      });
      
      // Initialize API key manager and source free tier keys
      await this.keyManager.initialize();
      await this.keyManager.discoverAndSourceKeys();
      
      // Register available workflows
      this.registerWorkflows();
      
      this.initialized = true;
      logger.info('GitHub Agent Core initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize GitHub Agent Core:', error);
      throw error;
    }
  }

  registerWorkflows() {
    // Register available workflows
    this.workflows = {
      'code-review': new AgentWorkflow('code-review', this.keyManager, this.modelSelector),
      'issue-triage': new AgentWorkflow('issue-triage', this.keyManager, this.modelSelector),
      'pr-summary': new AgentWorkflow('pr-summary', this.keyManager, this.modelSelector),
      'security-scan': new AgentWorkflow('security-scan', this.keyManager, this.modelSelector),
    };
  }

  async runWorkflow(workflowName, context, modelPreference = null) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const workflow = this.workflows[workflowName];
    if (!workflow) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }

    // Select appropriate model based on preference or task requirements
    const model = modelPreference 
      ? await this.modelSelector.getModel(modelPreference)
      : await this.modelSelector.selectOptimalModel(workflowName, context);

    return workflow.execute(context, model);
  }
}

module.exports = GitHubAgentCore;