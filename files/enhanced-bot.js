const CommandParser = require('./advanced-parser');
const { enhanceWithAI } = require('./ai-enhancer');

// Initialize command parser
const parser = new CommandParser();

// Register standard commands
parser.register('help', (args, context) => {
  return `
## Git Chat Bot Commands
- \`/help\` - Show this help message
- \`/status\` - Check repository status
- \`/search [term]\` - Search repository for term
- \`/issues\` - List open issues
- \`/prs\` - List open pull requests
- \`/analyze [file]\` - Analyze code in a file
- \`/stats [username]\` - Get contributor statistics
  `;
});

// Register natural language intents
parser.registerIntent('repo_status', [
  'how is the repository doing',
  'show me repo stats',
  'what is the status of this project',
  'give me repository information'
], async (text, context) => {
  const { octokit, repository } = context;
  
  const repoData = await octokit.request('GET /repos/{owner}/{repo}', {
    owner: repository.owner.login,
    repo: repository.name
  });
  
  return `
## Repository Status
- Stars: ${repoData.data.stargazers_count}
- Forks: ${repoData.data.forks_count}
- Open Issues: ${repoData.data.open_issues_count}
- Last Updated: ${new Date(repoData.data.updated_at).toLocaleString()}
  `;
});

// Set fallback handler with AI enhancement if available
parser.setFallback(async (text, context) => {
  // Try to enhance response with free AI service
  const aiResponse = await enhanceWithAI(text);
  if (aiResponse) {
    return aiResponse;
  }
  
  // Default response if AI enhancement failed
  return `
I couldn't understand that command. You can use:
- \`/help\` - Show all available commands
- Or ask me questions about this repository in natural language
  `;
});

// Export the parser for use in main application
module.exports = parser;