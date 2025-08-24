const functions = require('firebase-functions');
const { App } = require('@octokit/app');
const { createNodeMiddleware } = require('@octokit/webhooks');

// Import custom modules
const CommandParser = require('./advanced-parser');
const authManager = require('./auth-controls');
const userPreferences = require('./user-preferences');
const freeModels = require('./free-models');

// Initialize parser and models on cold start
const parser = new CommandParser();
initializeCommands();
freeModels.trainIntentClassifier();

// Create Express app for Firebase Functions
const express = require('express');
const app = express();

// Initialize GitHub App
const githubApp = new App({
  appId: functions.config().github.app_id,
  privateKey: functions.config().github.private_key.replace(/\\n/g, '\n'),
  webhooks: {
    secret: functions.config().github.webhook_secret
  }
});

// Use the webhook middleware with Express
app.use(createNodeMiddleware(githubApp.webhooks));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Export the function
exports.gitChatBot = functions.https.onRequest(app);