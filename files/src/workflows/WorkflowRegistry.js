const CodeReviewWorkflow = require('./CodeReviewWorkflow');
const IssueSummaryWorkflow = require('./IssueSummaryWorkflow');
const SecurityScanWorkflow = require('./SecurityScanWorkflow');
const logger = require('../utils/logger');

class WorkflowRegistry {
  constructor(agentCore) {
    this.agentCore = agentCore;
    this.workflows = new Map();
  }

  registerDefaultWorkflows() {
    this.register('code-review', new CodeReviewWorkflow(this.agentCore));
    this.register('issue-summary', new IssueSummaryWorkflow(this.agentCore));
    this.register('security-scan', new SecurityScanWorkflow(this.agentCore));
    
    logger.info(`Registered default workflows: ${Array.from(this.workflows.keys()).join(', ')}`);
  }

  register(name, workflow) {
    this.workflows.set(name, workflow);
    logger.debug(`Registered workflow: ${name}`);
  }

  getWorkflow(name) {
    return this.workflows.get(name);
  }

  getAllWorkflows() {
    return Array.from(this.workflows.keys());
  }
}

module.exports = WorkflowRegistry;