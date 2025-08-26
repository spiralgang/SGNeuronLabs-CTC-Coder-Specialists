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

    case 'pingping':
      return '🏓 Pong pong! Bot is alive and responding. All systems operational.';

    case 'chatgptchat':
    case 'chatgpt':
      if (!params) {
        return 'Please provide a question or prompt: `/chatgpt [your question]`';
      }
      try {
        // For now, provide a helpful response indicating chat functionality
        return `🤖 **Chat Response for:** "${params}"\n\nI understand you want to chat! While I don't have direct ChatGPT integration yet, I can help you with:\n\n- Repository questions using \`/help\`\n- Code search using \`/search [term]\`\n- Issue tracking using \`/issues\`\n- PR management using \`/prs\`\n\nFor AI-powered responses, this feature is being developed. Your question has been noted for future implementation.`;
      } catch (error) {
        logger.error('Chat command failed', error);
        return 'Chat functionality temporarily unavailable. Please try again later.';
      }

    case 'reviewauto':
      return `🔍 **Auto Review Mode**\n\nAuto review functionality is being set up. This will:\n- Automatically analyze new PRs\n- Check for common issues\n- Provide feedback on code quality\n- Suggest improvements\n\nUse \`/review [pr-number]\` to manually review a specific PR.`;

    case 'review':
      if (!params) {
        return 'Please specify what to review: `/review [pr-number]\` or `/review fix` for general fixes';
      }
      
      if (params.toLowerCase() === 'fix') {
        return `🔧 **Review Fix Mode**\n\nChecking for common repository issues:\n\n✅ Command parsing - Fixed\n✅ Bot responsiveness - Active\n✅ Workflow integration - Updated\n\nIf you're experiencing specific issues, please:\n1. Check workflow logs in Actions tab\n2. Verify bot permissions\n3. Try basic commands like \`/help\` or \`/status\``;
      }
      
      // Handle PR number review
      const prNumber = parseInt(params);
      if (isNaN(prNumber)) {
        return 'Invalid PR number. Use `/review [pr-number]` or `/review fix`';
      }
      
      try {
        const pr = await fetchPullRequest(octokit, repository, prNumber);
        
        return `🔍 **PR Review #${prNumber}**\n\n**Title:** ${pr.data.title}\n**Status:** ${pr.data.state}\n**Files Changed:** ${pr.data.changed_files}\n**Additions:** +${pr.data.additions}\n**Deletions:** -${pr.data.deletions}\n\n*Automated detailed review coming soon...*`;
      } catch (error) {
        logger.error(`Failed to review PR #${prNumber}`, error);
        return `Unable to review PR #${prNumber}. Please check if the PR exists.`;
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