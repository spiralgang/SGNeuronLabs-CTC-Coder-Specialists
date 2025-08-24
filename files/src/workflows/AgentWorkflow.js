const logger = require('../utils/logger');
const AIModelProxy = require('../models/AIModelProxy');

class AgentWorkflow {
  constructor(name, keyManager, modelSelector) {
    this.name = name;
    this.keyManager = keyManager;
    this.modelSelector = modelSelector;
    this.steps = this.defineWorkflow(name);
  }

  defineWorkflow(name) {
    // Define workflow steps based on workflow name
    const workflows = {
      'code-review': [
        { name: 'extract-files', description: 'Extract changed files from PR' },
        { name: 'analyze-code', description: 'Analyze code for issues' },
        { name: 'generate-review', description: 'Generate review comments' },
        { name: 'post-comments', description: 'Post comments to GitHub PR' }
      ],
      'issue-triage': [
        { name: 'analyze-issue', description: 'Analyze issue content' },
        { name: 'categorize', description: 'Categorize issue type' },
        { name: 'assign-labels', description: 'Assign appropriate labels' },
        { name: 'suggest-assignee', description: 'Suggest appropriate assignee' }
      ],
      'pr-summary': [
        { name: 'extract-changes', description: 'Extract PR changes' },
        { name: 'summarize-changes', description: 'Create a summary of changes' },
        { name: 'identify-tests', description: 'Identify test coverage' },
        { name: 'generate-summary', description: 'Generate a complete PR summary' }
      ],
      'security-scan': [
        { name: 'extract-code', description: 'Extract code to analyze' },
        { name: 'scan-vulnerabilities', description: 'Scan for security vulnerabilities' },
        { name: 'assess-risk', description: 'Assess risk level of findings' },
        { name: 'generate-report', description: 'Generate security report' }
      ]
    };
    
    return workflows[name] || [];
  }

  async execute(context, model) {
    if (!model) {
      throw new Error('No model provided for workflow execution');
    }

    // Get API key for the model's provider
    const apiKey = this.keyManager.getKey(model.provider);
    if (!apiKey) {
      throw new Error(`No API key available for provider: ${model.provider}`);
    }

    // Initialize model proxy
    const modelProxy = new AIModelProxy(model, apiKey);
    
    logger.info(`Starting workflow: ${this.name} with model: ${model.name}`);
    
    // Execute workflow steps
    const results = {};
    let currentContext = { ...context };
    
    for (const step of this.steps) {
      try {
        logger.info(`Executing step: ${step.name}`);
        
        // Execute step using appropriate method
        const stepResult = await this[step.name](currentContext, modelProxy);
        
        // Update results and context for next step
        results[step.name] = stepResult;
        currentContext = { ...currentContext, ...stepResult };
        
        logger.info(`Completed step: ${step.name}`);
      } catch (error) {
        logger.error(`Error in step ${step.name}:`, error);
        results[step.name] = { error: error.message };
        // Decide whether to continue or abort based on step criticality
        if (this.isCriticalStep(step.name)) {
          throw new Error(`Critical step ${step.name} failed: ${error.message}`);
        }
      }
    }
    
    logger.info(`Workflow ${this.name} completed successfully`);
    return {
      workflow: this.name,
      model: model.name,
      results
    };
  }

  isCriticalStep(stepName) {
    // Define which steps are critical (workflow cannot continue if they fail)
    const criticalSteps = {
      'code-review': ['extract-files'],
      'issue-triage': ['analyze-issue'],
      'pr-summary': ['extract-changes'],
      'security-scan': ['extract-code']
    };
    
    return criticalSteps[this.name] ? criticalSteps[this.name].includes(stepName) : false;
  }

  // Implement workflow-specific step methods
  async ['extract-files'](context, modelProxy) {
    // Implementation for extracting files from a PR
    // This would use GitHub API to get the files changed in a PR
    const { owner, repo, pull_number } = context;
    
    // This would typically use the octokit client from the context
    // For brevity, we're simulating the response
    return {
      files: [
        { filename: 'src/index.js', status: 'modified', additions: 10, deletions: 5 },
        { filename: 'src/utils.js', status: 'added', additions: 20, deletions: 0 }
      ]
    };
  }

  async ['analyze-code'](context, modelProxy) {
    const { files } = context;
    
    // Prepare prompt for code analysis
    const prompt = `
    Analyze the following files for code quality, potential bugs, and improvement suggestions:
    
    ${files.map(file => `File: ${file.filename}
    Changes: +${file.additions} -${file.deletions}
    Status: ${file.status}
    `).join('\n')}
    
    Provide detailed analysis focusing on:
    1. Code quality issues
    2. Potential bugs
    3. Performance concerns
    4. Security vulnerabilities
    5. Improvement suggestions
    `;
    
    // Call the AI model
    const response = await modelProxy.complete({
      messages: [{ role: 'system', content: 'You are a code review assistant.' },
                { role: 'user', content: prompt }],
      max_tokens: 2000
    });
    
    return {
      analysis: response.content,
      issues: this.extractIssuesFromAnalysis(response.content)
    };
  }

  extractIssuesFromAnalysis(analysis) {
    // Simple regex-based extraction of issues
    // In a real implementation, this would be more sophisticated
    const issues = [];
    const regex = /(\d+\.\s.*?)(?=\d+\.|$)/gs;
    let match;
    
    while ((match = regex.exec(analysis)) !== null) {
      issues.push(match[1].trim());
    }
    
    return issues;
  }

  // Implement other workflow step methods similarly...
}

module.exports = AgentWorkflow;