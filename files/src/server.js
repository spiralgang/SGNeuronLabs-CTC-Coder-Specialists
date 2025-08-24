require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { createNodeMiddleware } = require('@octokit/webhooks');
const AgentCore = require('./core/AgentCore');
const WebhookHandler = require('./handlers/WebhookHandler');
const logger = require('./utils/logger');

async function startServer() {
  // Initialize the agent core
  const agentCore = new AgentCore();
  await agentCore.initialize();
  
  // Initialize webhook handler
  const webhookHandler = new WebhookHandler(agentCore);

  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // Middleware to verify webhook signatures
  app.use(bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  }));
  
  // GitHub webhook endpoint
  app.post('/api/webhook', async (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    
    if (process.env.GITHUB_WEBHOOK_SECRET && signature) {
      // Verify signature
      const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
      const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');
      
      if (signature !== digest) {
        logger.warn('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }
    
    const event = req.headers['x-github-event'];
    if (!event) {
      return res.status(400).json({ error: 'Missing event type' });
    }
    
    try {
      await webhookHandler.handleWebhook(event, req.body);
      return res.status(200).json({ status: 'Webhook processed' });
    } catch (error) {
      logger.error('Error processing webhook', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // If using GitHub App, set up the webhook middleware
  if (agentCore.app) {
    const middleware = createNodeMiddleware(agentCore.app.webhooks, { path: '/api/github-app-webhook' });
    app.use(middleware);
  }
  
  // API endpoints for manual workflow triggers
  app.post('/api/workflows/:workflow', async (req, res) => {
    const { workflow } = req.params;
    const { context, modelPreference } = req.body;
    
    try {
      const result = await agentCore.runWorkflow(workflow, context, modelPreference);
      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error running workflow ${workflow}`, error);
      return res.status(500).json({ error: error.message });
    }
  });
  
  // Model endpoints
  app.get('/api/models', async (req, res) => {
    const models = await agentCore.modelRegistry.getAvailableModels();
    return res.status(200).json(models);
  });
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    return res.status(200).json({ status: 'ok' });
  });
  
  // Start the server
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

// Start the server
startServer().catch(error => {
  logger.error('Failed to start server', error);
  process.exit(1);
});