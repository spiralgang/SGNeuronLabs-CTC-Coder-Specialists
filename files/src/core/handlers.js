/**
 * Event handlers for GitHub webhook events
 */
const logger = require('../utils/logger');
const githubService = require('../services/github');
const nlpService = require('./nlp');
const responseFormatter = require('../utils/response');

/**
 * Handles new issue creation
 */
async function handleIssueOpened({ octokit, payload }) {
  const { issue, repository } = payload;
  logger.info(`New issue #${issue.number} opened in ${repository.full_name}`);
  
  try {
    // Post welcome message
    await githubService.postComment(octokit, payload, 
      responseFormatter.formatWelcomeMessage(issue.user.login));
    
    // Process the issue content and respond if it contains a query
    if (issue.body) {
      const analysis = await nlpService.analyzeText(issue.body);
      if (analysis.isQuery) {
        const response = await githubService.processQuery(octokit, payload, analysis);
        await githubService.postComment(octokit, payload, response);
      }
    }
  } catch (error) {
    logger.error(`Error handling issue #${issue.number}`, error);
  }
}

/**
 * Handles new comments on issues
 */
async function handleIssueComment({ octokit, payload }) {
  // Skip comments by the bot itself
  if (payload.comment.user.type === 'Bot') return;
  
  const { comment, issue, repository } = payload;
  logger.info(`New comment on issue #${issue.number} in ${repository.full_name}`);
  
  try {
    const analysis = await nlpService.analyzeText(comment.body);
    
    // If it's a command or query, process and respond
    if (analysis.isCommand || analysis.isQuery) {
      const response = await githubService.processQuery(octokit, payload, analysis);
      await githubService.postComment(octokit, payload, response);
    }
  } catch (error) {
    logger.error(`Error handling comment on issue #${issue.number}`, error);
  }
}

/**
 * Handles new pull request creation
 */
async function handlePullRequestOpened({ octokit, payload }) {
  const { pull_request, repository } = payload;
  logger.info(`New PR #${pull_request.number} opened in ${repository.full_name}`);
  
  try {
    // Post welcome message for PR
    await githubService.postComment(octokit, payload, 
      responseFormatter.formatPullRequestWelcomeMessage(pull_request.user.login));
    
    // Run automatic checks and provide feedback
    const prAnalysis = await githubService.analyzePullRequest(octokit, payload);
    if (prAnalysis.hasFeedback) {
      await githubService.postComment(octokit, payload, prAnalysis.feedback);
    }
  } catch (error) {
    logger.error(`Error handling PR #${pull_request.number}`, error);
  }
}

module.exports = {
  handleIssueOpened,
  handleIssueComment,
  handlePullRequestOpened
};