// Git Chat Bot - Core Application
require('dotenv').config();
const { App } = require('@octokit/app');
const { createNodeMiddleware } = require('@octokit/webhooks');
const http = require('http');
const fs = require('fs');
const CommandParser = require('./lib/advanced-parser');
const authManager = require('./lib/auth-controls');
const userPreferences = require('./lib/user-preferences');
const freeModels = require('./lib/free-models');

// Load GitHub App credentials securely
const appId = process.env.APP_ID;
const privateKey = process.env.PRIVATE_KEY || fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');
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
initializeCommands();

// Event handlers
app.webhooks.on('issues.opened', async ({ octokit, payload }) => {
  await respondToIssue(octokit, payload, payload.issue.body);
});

app.webhooks.on('issue_comment.created', async ({ octokit, payload }) => {
  if (payload.comment.user.type === 'Bot') return;
  await respondToComment(octokit, payload, payload.comment.body);
});

// Core response functions
async function respondToIssue(octokit, payload, text) {
  const { issue, repository, sender } = payload;
  
  // Security check
  const username = sender.login;
  const hasCommentPermission = await authManager.hasPermission(username, 'comment');
  if (!hasCommentPermission) {
    console.log(`User ${username} doesn't have comment permission`);
    return;
  }
  
  // Process and respond
  const userPrefs = await userPreferences.getPreferences(username);
  const context = { octokit, repository, issue, sender, userPreferences: userPrefs };
  let response = await parser.process(text, context);
  response = await userPreferences.formatResponse(username, response);
  
  await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner: repository.owner.login,
    repo: repository.name,
    issue_number: issue.number,
    body: response
  });
}

async function respondToComment(octokit, payload, text) {
  // Special case for preferences
  if (text.startsWith('/preferences')) {
    await handlePreferencesCommand(octokit, payload, text);
    return;
  }
  
  await respondToIssue(octokit, payload, text);
}

// Start the server
const port = process.env.PORT || 3000;
const middleware = createNodeMiddleware(app.webhooks, { path: '/' });
http.createServer(middleware).listen(port, () => {
  console.log(`Git Chat Bot running on port ${port}`);
  freeModels.trainIntentClassifier();
});

module.exports = { app };