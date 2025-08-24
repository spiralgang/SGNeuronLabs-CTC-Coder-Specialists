/**
 * Response formatting utility for consistent message formatting
 */

/**
 * Formats a welcome message for new issues
 */
function formatWelcomeMessage(username) {
  return `
## 👋 Hello @${username}!

Thanks for opening this issue! I'm your friendly Git Chat Bot.

I can help with:
- Repository information and statistics
- Code search within this repository
- Listing issues and pull requests
- Providing guidance on common GitHub tasks

Just mention me or use commands like \`/help\` to get started!
  `;
}

/**
 * Formats a welcome message for new pull requests
 */
function formatPullRequestWelcomeMessage(username) {
  return `
## 👋 Hello @${username}!

Thanks for submitting this pull request!

I'll help guide your PR through the review process. If you need any assistance, you can:
- Type \`/help\` for a list of commands
- Ask me questions about the repository

Good luck with your contribution!
  `;
}

/**
 * Format command help information
 */
function formatCommandHelp() {
  return `
## 🤖 Git Chat Bot Commands

| Command | Description |
|---------|-------------|
| \`/help\` | Show this help message |
| \`/status\` | Check repository status |
| \`/search [term]\` | Search repository for term |
| \`/issues\` | List open issues |
| \`/prs\` | List open pull requests |
| \`/stats\` | Show repository statistics |

You can also ask me questions in natural language, and I'll do my best to help!
  `;
}

/**
 * Format a generic help guide
 */
function formatHelpGuide() {
  return `
## 📚 How can I help?

It looks like you're asking for help. Here are some resources that might be useful:

### Working with this repository
- Use \`/status\` to see repository information
- Use \`/search [term]\` to find code in this repository
- Check out our documentation (usually in the README.md or docs/ folder)

### Common GitHub tasks
- **Creating a Pull Request**: Fork the repo, create a branch, make changes, and open a PR
- **Reporting bugs**: Include steps to reproduce, expected vs actual behavior
- **Requesting features**: Explain the feature and why it would be valuable

Need more specific help? Feel free to ask!
  `;
}

/**
 * Format bug reporting guide
 */
function formatBugReportingGuide() {
  return `
## 🐛 Bug Reporting Guide

Thanks for reporting this issue! To help us resolve it quickly, please provide:

1. **Steps to Reproduce**
   - A clear sequence of actions that trigger the bug
   - Any specific conditions or context needed

2. **Expected Behavior**
   - What should have happened

3. **Actual Behavior**
   - What actually happened
   - Include error messages, screenshots if applicable

4. **Environment**
   - OS, browser, or other relevant details
   - Version information if applicable

5. **Additional Context**
   - Any other information that might be helpful

The more detail you can provide, the faster we can diagnose and fix the issue!
  `;
}

/**
 * Format feature request guide
 */
function formatFeatureRequestGuide() {
  return `
## 💡 Feature Request Guide

Thanks for suggesting a feature! To help us understand your idea better, please consider providing:

1. **Problem Statement**
   - What problem would this feature solve?
   - Who would benefit from this feature?

2. **Proposed Solution**
   - How do you envision the feature working?
   - Any specific implementation ideas?

3. **Alternatives Considered**
   - Any workarounds or alternatives you've tried?

4. **Additional Context**
   - Any other information that might help explain the need or implementation

We appreciate your contribution to making this project better!
  `;
}

/**
 * Format thank you response
 */
function formatThankYouResponse() {
  return `
## 😊 You're Welcome!

I'm happy to help! If you need anything else, feel free to ask.

Don't forget you can use commands like \`/help\` to see what else I can do.
  `;
}

/**
 * Format default fallback response
 */
function formatDefaultResponse() {
  return `
I'm here to help with this repository! You can:

- Use commands like \`/help\`, \`/status\`, or \`/search [term]\`
- Ask questions about the repository
- Get help with GitHub-related tasks

What would you like to know?
  `;
}

/**
 * Format repository status information
 */
function formatRepositoryStatus(repoData) {
  return `
## 📊 Repository Status

| Metric | Value |
|--------|-------|
| Name | ${repoData.full_name} |
| Stars | ${repoData.stargazers_count} |
| Forks | ${repoData.forks_count} |
| Open Issues | ${repoData.open_issues_count} |
| Default Branch | \`${repoData.default_branch}\` |
| Created | ${new Date(repoData.created_at).toLocaleDateString()} |
| Last Updated | ${new Date(repoData.updated_at).toLocaleDateString()} |

${repoData.description ? `**Description**: ${repoData.description}` : ''}
  `;
}

/**
 * Format search results
 */
function formatSearchResults(searchTerm, data) {
  if (data.items.length === 0) {
    return `No results found for "${searchTerm}".`;
  }
  
  const items = data.items.slice(0, 10).map(item => 
    `- [${item.path}](${item.html_url})`
  ).join('\n');
  
  return `
## 🔍 Search Results for "${searchTerm}"

${items}

${data.total_count > 10 ? `\n*Showing 10 of ${data.total_count} results*` : ''}
  `;
}

/**
 * Format list of issues
 */
function formatIssuesList(issues) {
  if (issues.length === 0) {
    return 'No open issues found.';
  }
  
  const issueItems = issues.map(issue => 
    `- [#${issue.number}: ${issue.title}](${issue.html_url})${issue.labels.length > 0 ? ' `' + issue.labels.map(l => l.name).join(', ') + '`' : ''}`
  ).join('\n');
  
  return `
## 📋 Recent Open Issues

${issueItems}
  `;
}

/**
 * Format list of pull requests
 */
function formatPullRequestsList(prs) {
  if (prs.length === 0) {
    return 'No open pull requests found.';
  }
  
  const prItems = prs.map(pr => 
    `- [#${pr.number}: ${pr.title}](${pr.html_url}) by @${pr.user.login}`
  ).join('\n');
  
  return `
## 🔄 Recent Open Pull Requests

${prItems}
  `;
}

/**
 * Format repository statistics
 */
function formatRepositoryStats(repository, commits, contributors) {
  const contributorsList = contributors.map(contributor => 
    `- [@${contributor.login}](${contributor.html_url}) (${contributor.contributions} commits)`
  ).join('\n');
  
  return `
## 📈 Repository Statistics

### Repository
- Name: [${repository.full_name}](${repository.html_url})
- Stars: ${repository.stargazers_count}
- Watchers: ${repository.watchers_count}
- Forks: ${repository.forks_count}

### Activity
- Latest commit: ${commits.length > 0 ? new Date(commits[0].commit.committer.date).toLocaleString() : 'Unknown'}
- Created: ${new Date(repository.created_at).toLocaleString()}
- Updated: ${new Date(repository.updated_at).toLocaleString()}

### Top Contributors
${contributorsList}
  `;
}

module.exports = {
  formatWelcomeMessage,
  formatPullRequestWelcomeMessage,
  formatCommandHelp,
  formatHelpGuide,
  formatBugReportingGuide,
  formatFeatureRequestGuide,
  formatThankYouResponse,
  formatDefaultResponse,
  formatRepositoryStatus,
  formatSearchResults,
  formatIssuesList,
  formatPullRequestsList,
  formatRepositoryStats
};