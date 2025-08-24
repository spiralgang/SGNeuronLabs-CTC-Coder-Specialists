// Atlassian Forge integration for Jira
const api = require('@forge/api');
const { App } = require('@octokit/app');

// Import custom modules 
const CommandParser = require('./advanced-parser');
const userPreferences = require('./user-preferences');

// Initialize parser
const parser = new CommandParser();
initializeCommands();

// Handler for issue comments in Jira
export async function handleJiraComment(event, context) {
  const { comment, issue } = event;
  
  // Skip if not a command
  if (!comment.body.startsWith('/github')) {
    return;
  }
  
  // Extract command
  const command = comment.body.replace('/github', '').trim();
  
  // Initialize GitHub App with secure credentials
  const githubApp = new App({
    appId: context.environmentVariables.GITHUB_APP_ID,
    privateKey: context.environmentVariables.GITHUB_PRIVATE_KEY,
    webhooks: { secret: context.environmentVariables.GITHUB_WEBHOOK_SECRET }
  });
  
  // Process the command
  const response = await parser.process(command, {
    jiraContext: { issue, comment },
    username: comment.author.displayName
  });
  
  // Reply to the comment
  await api.asApp().requestJira('/rest/api/3/issue/{issueIdOrKey}/comment', {
    method: 'POST',
    pathParams: {
      issueIdOrKey: issue.key
    },
    body: {
      body: {
        version: 1,
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: response
              }
            ]
          }
        ]
      }
    }
  });
}