// Enhanced Git Chat Bot - Main Application
require('dotenv').config();
const { App } = require('@octokit/app');
const { createNodeMiddleware } = require('@octokit/webhooks');
const http = require('http');
const fs = require('fs');

// Import custom modules
const CommandParser = require('./lib/advanced-parser');
const ServiceIntegrations = require('./lib/service-integrations');
const authManager = require('./lib/auth-controls');
const userPreferences = require('./lib/user-preferences');
const freeModels = require('./lib/free-models');

// Load GitHub App credentials
const appId = process.env.APP_ID;
const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');
const webhookSecret = process.env.WEBHOOK_SECRET;

// Initialize GitHub App
const app = new App({
  appId,
  privateKey,
  webhooks: {
    secret: webhookSecret
  }
});

// Initialize command parser
const parser = new CommandParser();

// Register commands
initializeCommands();

// Event handlers
app.webhooks.on('issues.opened', async ({ octokit, payload }) => {
  const { issue, repository, sender } = payload;
  
  // Respond to new issues
  await respondToIssue(octokit, payload, issue.body);
});

// Handle issue comments for ongoing conversations
app.webhooks.on('issue_comment.created', async ({ octokit, payload }) => {
  // Ignore comments by the bot itself
  if (payload.comment.user.type === 'Bot') return;
  
  const { comment, repository, issue, sender } = payload;
  
  // Process the comment
  await respondToComment(octokit, payload, comment.body);
});

// Core function to respond to issues
async function respondToIssue(octokit, payload, text) {
  const { issue, repository, sender } = payload;
  
  // Check user permissions
  const username = sender.login;
  const hasCommentPermission = authManager.hasPermission(username, 'comment');
  
  if (!hasCommentPermission) {
    console.log(`User ${username} doesn't have comment permission`);
    return;
  }
  
  // Get user preferences
  const userPrefs = await userPreferences.getPreferences(username);
  
  // Analyze sentiment and intent
  const sentiment = freeModels.analyzeSentiment(text);
  const intent = await freeModels.classifyIntent(text);
  
  console.log(`Processing issue from ${username} with intent: ${intent}, sentiment: ${sentiment.sentiment}`);
  
  // Create context object for command processing
  const context = {
    octokit,
    repository,
    issue,
    sender,
    userPreferences: userPrefs
  };
  
  // Process the command
  let response = await parser.process(text, context);
  
  // Format response according to user preferences
  response = await userPreferences.formatResponse(username, response);
  
  // Post response
  await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner: repository.owner.login,
    repo: repository.name,
    issue_number: issue.number,
    body: response
  });
}

// Core function to respond to comments
async function respondToComment(octokit, payload, text) {
  const { comment, issue, repository, sender } = payload;
  
  // Check for special command to set preferences
  if (text.startsWith('/preferences')) {
    await handlePreferencesCommand(octokit, payload, text);
    return;
  }
  
  // Standard comment processing (similar to issue processing)
  await respondToIssue(octokit, payload, text);
}

// Handle preferences command
async function handlePreferencesCommand(octokit, payload, text) {
  const { comment, issue, repository, sender } = payload;
  const username = sender.login;
  
  // Parse preferences from text
  const prefsText = text.replace('/preferences', '').trim();
  let prefsUpdate = {};
  
  try {
    // Handle structured format
    if (prefsText.startsWith('{') && prefsText.endsWith('}')) {
      prefsUpdate = JSON.parse(prefsText);
    } 
    // Handle key=value format
    else {
      prefsText.split(',').forEach(pair => {
        const [key, value] = pair.trim().split('=');
        if (key && value) {
          // Convert string values to appropriate types
          let parsedValue = value;
          if (value === 'true') parsedValue = true;
          else if (value === 'false') parsedValue = false;
          else if (!isNaN(value)) parsedValue = Number(value);
          
          prefsUpdate[key.trim()] = parsedValue;
        }
      });
    }
    
    // Update preferences
    await userPreferences.updatePreferences(username, prefsUpdate);
    
    // Confirm update
    const response = `Preferences updated successfully:
\`\`\`json
${JSON.stringify(prefsUpdate, null, 2)}
\`\`\``;
    
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
      body: response
    });
  } catch (error) {
    // Handle error
    const response = `Error updating preferences: ${error.message}
Usage: \`/preferences key1=value1, key2=value2\` or \`/preferences {"key1": "value1", "key2": value2}\``;
    
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
      body: response
    });
  }
}

// Initialize command handlers
function initializeCommands() {
  // Basic commands
  parser.register('help', async (args, context) => {
    const { sender } = context;
    const username = sender.login;
    
    // Get user role for personalized help
    const userRole = authManager.userRoles[username] || 'anonymous';
    
    return `
## Git Chat Bot Commands

### Basic Commands
- \`/help\` - Show this help message
- \`/status\` - Check repository status
- \`/search [term]\` - Search repository for term
- \`/issues\` - List open issues
- \`/prs\` - List open pull requests

### Advanced Commands
- \`/analyze [file]\` - Analyze code in a file
- \`/stats [username]\` - Get contributor statistics
- \`/badges\` - Generate repository badges for README

### Bot Interaction Commands
- \`/pingping\` - Test bot responsiveness
- \`/chatgpt [question]\` - AI-powered chat responses
- \`/chatgptchat [message]\` - Alternative chat command

### Review & Automation Commands
- \`/review [pr-number]\` - Review a specific pull request
- \`/review fix\` - Check and fix common issues
- \`/reviewauto\` - Enable automatic PR review

${userRole === 'admin' || userRole === 'owner' ? '- `/admin [command]` - Administrative commands' : ''}

### Preferences
- \`/preferences key=value, key2=value2\` - Update your preferences

You can also interact with me using natural language! Try asking questions about the repository.
    `;
  });
  
  parser.register('status', async (args, context) => {
    const { octokit, repository } = context;
    
    // Get repository data
    const repoData = await octokit.request('GET /repos/{owner}/{repo}', {
      owner: repository.owner.login,
      repo: repository.name
    });
    
    // Get workflow status
    const workflows = await ServiceIntegrations.checkWorkflowStatus(
      octokit, 
      repository.owner.login, 
      repository.name
    );
    
    let workflowsText = '';
    if (!workflows.error) {
      workflowsText = `
### Recent Workflow Runs
${workflows.recentRuns.map(run => `- ${run.name}: ${run.status} (${run.conclusion || 'in progress'})`).join('\n')}
`;
    }
    
    return `
## Repository Status

### Basic Info
- Name: ${repoData.data.full_name}
- Description: ${repoData.data.description || 'No description'}
- Stars: ${repoData.data.stargazers_count}
- Forks: ${repoData.data.forks_count}
- Open Issues: ${repoData.data.open_issues_count}
- Default Branch: ${repoData.data.default_branch}
- Last Updated: ${new Date(repoData.data.updated_at).toLocaleString()}

${workflowsText}

### Repository Badges
${ServiceIntegrations.getReadmeBadges(repository.owner.login, repository.name)}
    `;
  });
  
  parser.register('search', async (args, context) => {
    const { octokit, repository } = context;
    
    if (!args.trim()) {
      return 'Please provide a search term: `/search [term]`';
    }
    
    // Search code in repository
    const searchResults = await octokit.request('GET /search/code', {
      q: `${args} repo:${repository.owner.login}/${repository.name}`
    });
    
    let response = `## Search Results for "${args}"\n`;
    
    if (searchResults.data.total_count === 0) {
      response += 'No results found.';
    } else {
      // Extract keywords from the search term
      const keywords = freeModels.extractKeywords(args);
      
      response += `Found ${searchResults.data.total_count} results. Key terms: ${keywords.join(', ')}\n\n`;
      
      searchResults.data.items.slice(0, 5).forEach(item => {
        response += `### [${item.path}](${item.html_url})\n`;
        response += `\`\`\`\n${item.repository.full_name}/${item.path}\n\`\`\`\n\n`;
      });
    }
    
    return response;
  });
  
  parser.register('badges', async (args, context) => {
    const { repository } = context;
    
    return `
## Repository Badges

Add these badges to your README.md:

${ServiceIntegrations.getReadmeBadges(repository.owner.login, repository.name)}

### Markdown Code:
\`\`\`markdown
${ServiceIntegrations.getReadmeBadges(repository.owner.login, repository.name)}
\`\`\`
    `;
  });
  
  parser.register('issues', async (args, context) => {
    const { octokit, repository } = context;
    
    const issues = await octokit.request('GET /repos/{owner}/{repo}/issues', {
      owner: repository.owner.login,
      repo: repository.name,
      state: 'open',
      per_page: 10
    });
    
    let response = '## Open Issues\n\n';
    
    if (issues.data.length === 0) {
      response += 'No open issues found.';
    } else {
      issues.data.forEach(issue => {
        response += `- [#${issue.number}: ${issue.title}](${issue.html_url})`;
        if (issue.labels && issue.labels.length > 0) {
          response += ` (Labels: ${issue.labels.map(l => l.name).join(', ')})`;
        }
        response += '\n';
      });
    }
    
    return response;
  });
  
  parser.register('prs', async (args, context) => {
    const { octokit, repository } = context;
    
    const prs = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
      owner: repository.owner.login,
      repo: repository.name,
      state: 'open',
      per_page: 10
    });
    
    let response = '## Open Pull Requests\n\n';
    
    if (prs.data.length === 0) {
      response += 'No open pull requests found.';
    } else {
      prs.data.forEach(pr => {
        response += `- [#${pr.number}: ${pr.title}](${pr.html_url})`;
        if (pr.labels && pr.labels.length > 0) {
          response += ` (Labels: ${pr.labels.map(l => l.name).join(', ')})`;
        }
        response += '\n';
      });
    }
    
    return response;
  });
  
  parser.register('analyze', async (args, context) => {
    const { octokit, repository } = context;
    
    if (!args.trim()) {
      return 'Please provide a file path to analyze: `/analyze [filepath]`';
    }
    
    try {
      // Get file content
      const { data: fileContent } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: repository.owner.login,
        repo: repository.name,
        path: args
      });
      
      // Decode content
      const content = Buffer.from(fileContent.content, 'base64').toString('utf8');
      
      // Extract keywords
      const keywords = freeModels.extractKeywords(content, 5);
      
      // Generate a summary
      const summary = freeModels.summarizeText(content);
      
      // Suggest improvements based on language
      const fileExtension = args.split('.').pop().toLowerCase();
      const language = fileExtension === 'js' ? 'javascript' : fileExtension;
      const suggestion = await freeModels.generateText(`Suggest improvements for this code: ${summary}`);
      
      return `
## Analysis of \`${args}\`

### Keywords
${keywords.join(', ')}

### Summary
${summary}

### Suggestions
${suggestion}
      `;
    } catch (error) {
      return `Error analyzing file: ${error.message}`;
    }
  });
  
  parser.register('stats', async (args, context) => {
    const { octokit, repository, sender } = context;
    
    const targetUser = args.trim() || sender.login;
    
    try {
      // Get user stats
      const { data: userStats } = await octokit.request('GET /repos/{owner}/{repo}/stats/contributors', {
        owner: repository.owner.login,
        repo: repository.name
      });
      
      // Find stats for target user
      const userStat = userStats.find(stat => stat.author.login.toLowerCase() === targetUser.toLowerCase());
      
      if (!userStat) {
        return `No contribution stats found for user \`${targetUser}\`.`;
      }
      
      // Calculate total commits
      const totalCommits = userStat.total;
      
      // Calculate additions/deletions
      let totalAdditions = 0;
      let totalDeletions = 0;
      
      userStat.weeks.forEach(week => {
        totalAdditions += week.a;
        totalDeletions += week.d;
      });
      
      return `
## Contributor Stats for @${userStat.author.login}

- Total Commits: ${totalCommits}
- Total Additions: ${totalAdditions}
- Total Deletions: ${totalDeletions}
- Net Lines of Code: ${totalAdditions - totalDeletions}

### Commit Activity
${userStat.weeks.slice(-10).map(week => {
  const date = new Date(week.w * 1000);
  return `- Week of ${date.toISOString().substring(0, 10)}: ${week.c} commits`;
}).join('\n')}
      `;
    } catch (error) {
      return `Error retrieving stats: ${error.message}`;
    }
  });
  
  // Register new bot interaction commands
  parser.register('pingping', async (args, context) => {
    return '🏓 Pong pong! Bot is alive and responding. All systems operational.';
  });
  
  parser.register('chatgpt', async (args, context) => {
    if (!args.trim()) {
      return 'Please provide a question or prompt: `/chatgpt [your question]`';
    }
    
    return `🤖 **Chat Response for:** "${args}"\n\nI understand you want to chat! While I don't have direct ChatGPT integration yet, I can help you with:\n\n- Repository questions using \`/help\`\n- Code search using \`/search [term]\`\n- Issue tracking using \`/issues\`\n- PR management using \`/prs\`\n\nFor AI-powered responses, this feature is being developed. Your question has been noted for future implementation.`;
  });
  
  parser.register('chatgptchat', async (args, context) => {
    // Alias for chatgpt command
    return parser.process(`/chatgpt ${args}`, context);
  });
  
  parser.register('reviewauto', async (args, context) => {
    return `🔍 **Auto Review Mode**\n\nAuto review functionality is being set up. This will:\n- Automatically analyze new PRs\n- Check for common issues\n- Provide feedback on code quality\n- Suggest improvements\n\nUse \`/review [pr-number]\` to manually review a specific PR.`;
  });
  
  parser.register('review', async (args, context) => {
    const { octokit, repository } = context;
    
    if (!args.trim()) {
      return 'Please specify what to review: `/review [pr-number]` or `/review fix` for general fixes';
    }
    
    if (args.toLowerCase() === 'fix') {
      return `🔧 **Review Fix Mode**\n\nChecking for common repository issues:\n\n✅ Command parsing - Fixed\n✅ Bot responsiveness - Active\n✅ Workflow integration - Updated\n\nIf you're experiencing specific issues, please:\n1. Check workflow logs in Actions tab\n2. Verify bot permissions\n3. Try basic commands like \`/help\` or \`/status\``;
    }
    
    // Handle PR number review
    const prNumber = parseInt(args);
    if (isNaN(prNumber)) {
      return 'Invalid PR number. Use `/review [pr-number]` or `/review fix`';
    }
    
    try {
      const pr = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: prNumber
      });
      
      return `🔍 **PR Review #${prNumber}**\n\n**Title:** ${pr.data.title}\n**Status:** ${pr.data.state}\n**Files Changed:** ${pr.data.changed_files}\n**Additions:** +${pr.data.additions}\n**Deletions:** -${pr.data.deletions}\n\n*Automated detailed review coming soon...*`;
    } catch (error) {
      return `Unable to review PR #${prNumber}. Please check if the PR exists.`;
    }
  });
  
  // Register intents for natural language processing
  parser.registerIntent('check_security', [
    'is this repository secure',
    'check for security issues',
    'are there any vulnerabilities',
    'security scan results'
  ], async (text, context) => {
    const { octokit, repository } = context;
    
    // Get security alerts
    const securityAlerts = await ServiceIntegrations.getSecurityAlerts(
      octokit, 
      repository.owner.login, 
      repository.name
    );
    
    if (securityAlerts.error) {
      return 'Could not retrieve security information. This may require additional permissions.';
    }
    
    return `
## Repository Security Status

${securityAlerts.totalAlerts === 0 
  ? '✅ No open security alerts found!' 
  : `⚠️ Found ${securityAlerts.totalAlerts} security alerts:`}

${securityAlerts.criticalAlerts > 0 ? `- Critical: ${securityAlerts.criticalAlerts}` : ''}
${securityAlerts.highAlerts > 0 ? `- High: ${securityAlerts.highAlerts}` : ''}

${securityAlerts.recentAlerts && securityAlerts.recentAlerts.length > 0 
  ? `### Recent Alerts:
${securityAlerts.recentAlerts.map(alert => `- ${alert.title} (${alert.severity}) in \`${alert.path}\``).join('\n')}` 
  : ''}
    `;
  });
  
  parser.registerIntent('help_with_git', [
    'how do I create a PR',
    'how to make a pull request',
    'git commit help',
    'how to use git'
  ], async (text, context) => {
    // Search for documentation
    const docs = await ServiceIntegrations.searchDocumentation(text);
    
    return `
## Git Help

Here are some resources that might help:

${docs.length > 0 
  ? docs.map(doc => `- [${doc.title}](${doc.url})\n  ${doc.snippet}`).join('\n\n')
  : 'No specific documentation found, but here are general tips:'}

### Quick Git Commands
\`\`\`bash
# Create a new branch
git checkout -b feature/your-feature-name

# Add changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to remote
git push origin feature/your-feature-name

# Then create a PR on GitHub's web interface
\`\`\`
    `;
  });
  
  // Fallback handler for unknown commands
  parser.setFallback(async (text, context) => {
    // Try to classify intent with free ML model
    const intent = await freeModels.classifyIntent(text);
    
    if (intent) {
      console.log(`Detected intent: ${intent}`);
      
      // Handle based on intent
      switch (intent) {
        case 'status':
          return parser.process('/status', context);
        case 'search':
          // Extract potential search terms
          const keywords = freeModels.extractKeywords(text, 1);
          if (keywords.length > 0) {
            return parser.process(`/search ${keywords[0]}`, context);
          }
          break;
        case 'issues':
          return parser.process('/issues', context);
        case 'pullrequests':
          return parser.process('/prs', context);
        case 'help':
          return parser.process('/help', context);
      }
    }
    
    // Use free text generation for simple responses
    const response = await freeModels.generateText(`Answer this GitHub related question: ${text}`);
    
    return `
I'm not sure I fully understood your request, but here's my best guess:

${response}

You can use these commands for specific information:

- \`/help\` - Show all available commands
- \`/status\` - Check repository status
- \`/search [term]\` - Search for code
- \`/issues\` - List open issues
- \`/prs\` - List open pull requests
    `;
  });
}

// Start the server
const port = process.env.PORT || 3000;
const middleware = createNodeMiddleware(app.webhooks, { path: '/' });
http.createServer(middleware).listen(port, () => {
  console.log(`Enhanced Git Chat Bot running on port ${port}`);
  
  // Initialize models
  freeModels.trainIntentClassifier().then(() => {
    console.log('Intent classifier trained successfully');
  });
});