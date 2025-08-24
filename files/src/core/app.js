/**
 * Main application entry point for the GitHub Chat Bot.
 * Initializes webhooks, sets up event handlers, and starts the server.
 */
require('dotenv').config();
const { App } = require('@octokit/app');
const { createNodeMiddleware } = require('@octokit/webhooks');
const http = require('http');
const fs = require('fs');
const handlers = require('./handlers');
const logger = require('../utils/logger');

// Validate required environment variables
const requiredEnvVars = ['APP_ID', 'PRIVATE_KEY_PATH', 'WEBHOOK_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length) {
  logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Initialize GitHub App
try {
  const appId = process.env.APP_ID;
  const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');
  const webhookSecret = process.env.WEBHOOK_SECRET;

  const app = new App({
    appId,
    privateKey,
    webhooks: {
      secret: webhookSecret
    }
  });

  // Register event handlers
  app.webhooks.on('issues.opened', handlers.handleIssueOpened);
  app.webhooks.on('issue_comment.created', handlers.handleIssueComment);
  app.webhooks.on('pull_request.opened', handlers.handlePullRequestOpened);

  // Start the server
  const port = process.env.PORT || 3000;
  const middleware = createNodeMiddleware(app.webhooks, { path: '/' });
  
  http.createServer(middleware).listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });
  
  logger.info('GitHub Chat Bot initialized successfully');
} catch (error) {
  logger.error('Failed to initialize GitHub Chat Bot', error);
  process.exit(1);
}

module.exports = { app };