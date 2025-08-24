/**
 * GitHub API service module
 * Handles interactions with GitHub API
 */
const logger = require('../utils/logger');
const responseFormatter = require('../utils/response');
const aiService = require('./ai-service');

/**
 * Posts a comment on an issue or PR
 */
async function postComment(octokit, payload, body) {
  const { repository, issue, pull_request } = payload;
  const issueNumber = issue ? issue.number : pull_request.number;
  
  try {
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issueNumber,
      body
    });
    logger.info(`Posted comment to ${repository.full_name}#${issueNumber}`);
  } catch (error) {
    logger.error(`Failed to post comment to ${repository.full_name}#${issueNumber}`, error);
    throw error;
  }
}

/**
 * Process a query or command and generate a response
 */
async function processQuery(octokit, payload, analysis) {
  const { repository } = payload;
  
  // Handle commands
  if (analysis.isCommand) {
    return await processCommand(octokit, payload, analysis);
  }
  
  // Handle general queries with intent recognition
  if (analysis.intents.length > 0) {
    switch(analysis.intents[0]) {
      case 'help':
        return responseFormatter.formatHelpGuide();
      case 'bug':
        return responseFormatter.formatBugReportingGuide();
      case 'feature':
        return responseFormatter.formatFeatureRequestGuide();
      case 'thanks':
        return responseFormatter.formatThankYouResponse();
    }
  }
  
  // For general questions, try the AI service if available
  try {
    const aiResponse = await aiService.getResponse(analysis.text);
    if (aiResponse) {
      return aiResponse;
    }
  } catch (error) {
    logger.warn('AI service failed, falling back to default response', error);
  }
  
  // Default response
  return responseFormatter.formatDefaultResponse();
}

/**
 * Process command-based queries
 */
async function processCommand(octokit, payload, analysis) {
  const { repository } = payload;
  const { command, params } = analysis;
  
  switch(command) {
    case 'help':
      return responseFormatter.formatCommandHelp();
      
    case 'status':
      try {
        const repoData = await octokit.request('GET /repos/{owner}/{repo}', {
          owner: repository.owner.login,
          repo: repository.name
        });
        return responseFormatter.formatRepositoryStatus(repoData.data);
      } catch (error) {
        logger.error('Failed to fetch repository status', error);
        return 'Unable to fetch repository status. Please try again later.';
      }
      
    case 'search':
      if (!params) {
        return 'Please provide a search term: `/search [term]`';
      }
      try {
        const searchResults = await octokit.request('GET /search/code', {
          q: `${params} repo:${repository.owner.login}/${repository.name}`
        });
        return responseFormatter.formatSearchResults(params, searchResults.data);
      } catch (error) {
        logger.error('Failed to search repository', error);
        return `Error searching for "${params}". Please try again later.`;
      }
      
    case 'issues':
      try {
        const issues = await octokit.request('GET /repos/{owner}/{repo}/issues', {
          owner: repository.owner.login,
          repo: repository.name,
          state: 'open',
          per_page: 5
        });
        return responseFormatter.formatIssuesList(issues.data);
      } catch (error) {
        logger.error('Failed to fetch issues', error);
        return 'Unable to fetch issues. Please try again later.';
      }
      
    case 'prs':
      try {
        const prs = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
          owner: repository.owner.login,
          repo: repository.name,
          state: 'open',
          per_page: 5
        });
        return responseFormatter.formatPullRequestsList(prs.data);
      } catch (error) {
        logger.error('Failed to fetch pull requests', error);
        return 'Unable to fetch pull requests. Please try again later.';
      }
      
    case 'stats':
      try {
        const [commits, contributors] = await Promise.all([
          octokit.request('GET /repos/{owner}/{repo}/commits', {
            owner: repository.owner.login,
            repo: repository.name,
            per_page: 1
          }),
          octokit.request('GET /repos/{owner}/{repo}/contributors', {
            owner: repository.owner.login,
            repo: repository.name,
            per_page: 5
          })
        ]);
        return responseFormatter.formatRepositoryStats(repository, commits.data, contributors.data);
      } catch (error) {
        logger.error('Failed to fetch repository statistics', error);
        return 'Unable to fetch repository statistics. Please try again later.';
      }
      
    default:
      return `Unknown command: \`/${command}\`. Type \`/help\` for a list of available commands.`;
  }
}

/**
 * Analyze a pull request for common issues
 */
async function analyzePullRequest(octokit, payload) {
  const { repository, pull_request } = payload;
  
  try {
    // Get the PR files
    const files = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pull_request.number
    });
    
    let feedback = [];
    
    // Simple checks for common issues
    if (files.data.length > 20) {
      feedback.push("This PR modifies a large number of files. Consider breaking it into smaller, focused PRs for easier review.");
    }
    
    if (pull_request.body && pull_request.body.length < 50) {
      feedback.push("Consider adding a more detailed description to help reviewers understand your changes.");
    }
    
    const hasFeedback = feedback.length > 0;
    return {
      hasFeedback,
      feedback: hasFeedback ? 
        `## Pull Request Feedback\n\n${feedback.map(f => `- ${f}`).join('\n')}` : 
        ''
    };
  } catch (error) {
    logger.error(`Failed to analyze PR #${pull_request.number}`, error);
    return { hasFeedback: false };
  }
}

module.exports = {
  postComment,
  processQuery,
  analyzePullRequest
};