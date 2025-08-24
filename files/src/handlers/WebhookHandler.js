const GitHubAgentCore = require('../core/GitHubAgentCore');
const logger = require('../utils/logger');

class WebhookHandler {
  constructor(config) {
    this.agentCore = new GitHubAgentCore(config);
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.agentCore.initialize();
      this.initialized = true;
    }
  }

  async handleWebhook(event, payload) {
    try {
      await this.initialize();
      
      logger.info(`Received ${event} event`);
      
      switch (event) {
        case 'pull_request':
          await this.handlePullRequestEvent(payload);
          break;
        case 'pull_request_review_comment':
          await this.handlePRCommentEvent(payload);
          break;
        case 'issues':
          await this.handleIssueEvent(payload);
          break;
        case 'issue_comment':
          await this.handleIssueCommentEvent(payload);
          break;
        case 'push':
          await this.handlePushEvent(payload);
          break;
        default:
          logger.info(`No handler for event type: ${event}`);
      }
    } catch (error) {
      logger.error(`Error handling webhook ${event}:`, error);
      throw error;
    }
  }

  async handlePullRequestEvent(payload) {
    const { action, pull_request, repository } = payload;
    
    // Only process certain PR actions
    if (!['opened', 'synchronize', 'reopened'].includes(action)) {
      return;
    }
    
    const context = {
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pull_request.number,
      title: pull_request.title,
      body: pull_request.body,
      user: pull_request.user.login,
      base: pull_request.base.ref,
      head: pull_request.head.ref
    };
    
    // Check if PR contains model preference
    const modelPreference = this.extractModelPreference(pull_request.body);
    
    // Run PR summary workflow
    await this.agentCore.runWorkflow('pr-summary', context, modelPreference);
    
    // Run code review workflow for non-draft PRs
    if (!pull_request.draft) {
      await this.agentCore.runWorkflow('code-review', context, modelPreference);
    }
  }

  async handlePRCommentEvent(payload) {
    const { action, comment, pull_request, repository } = payload;
    
    if (action !== 'created') {
      return;
    }
    
    // Check if comment is requesting the bot
    if (!comment.body.toLowerCase().includes('@gitbot')) {
      return;
    }
    
    const context = {
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pull_request.number,
      comment_id: comment.id,
      comment_body: comment.body,
      user: comment.user.login
    };
    
    // Extract workflow and model from comment
    const { workflow, model } = this.parseCommand(comment.body);
    
    if (workflow) {
      await this.agentCore.runWorkflow(workflow, context, model);
    } else {
      // Default to code review if no specific workflow requested
      await this.agentCore.runWorkflow('code-review', context, model);
    }
  }

  async handleIssueEvent(payload) {
    const { action, issue, repository } = payload;
    
    if (action !== 'opened') {
      return;
    }
    
    const context = {
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
      title: issue.title,
      body: issue.body,
      user: issue.user.login
    };
    
    // Check if issue contains model preference
    const modelPreference = this.extractModelPreference(issue.body);
    
    // Run issue triage workflow
    await this.agentCore.runWorkflow('issue-triage', context, modelPreference);
  }

  async handleIssueCommentEvent(payload) {
    const { action, comment, issue, repository } = payload;
    
    if (action !== 'created') {
      return;
    }
    
    // Check if comment is requesting the bot
    if (!comment.body.toLowerCase().includes('@gitbot')) {
      return;
    }
    
    const context = {
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
      comment_id: comment.id,
      comment_body: comment.body,
      user: comment.user.login
    };
    
    // Extract workflow and model from comment
    const { workflow, model } = this.parseCommand(comment.body);
    
    if (workflow) {
      await this.agentCore.runWorkflow(workflow, context, model);
    }
  }

  async handlePushEvent(payload) {
    const { ref, repository, commits } = payload;
    
    // Only process pushes to main branches
    if (!ref.endsWith('main') && !ref.endsWith('master')) {
      return;
    }
    
    const context = {
      owner: repository.owner.login,
      repo: repository.name,
      ref,
      commits
    };
    
    // Run security scan workflow
    await this.agentCore.runWorkflow('security-scan', context);
  }

  parseCommand(text) {
    // Parse command from text (e.g., "@gitbot run code-review using gpt-4")
    const commandRegex = /@gitbot\s+(?:run\s+)?(\w+(?:-\w+)*)?(?:\s+using\s+(\w+(?:-[\w.]+)*))?/i;
    const match = text.match(commandRegex);
    
    if (!match) {
      return {};
    }
    
    return {
      workflow: match[1],
      model: match[2]
    };
  }

  extractModelPreference(text) {
    if (!text) return null;
    
    // Look for model preference in text (e.g., "model: gpt-4" or "using: claude-3")
    const modelRegex = /(?:model|using):\s*(\w+(?:-[\w.]+)*)/i;
    const match = text.match(modelRegex);
    
    return match ? match[1] : null;
  }
}

module.exports = WebhookHandler;