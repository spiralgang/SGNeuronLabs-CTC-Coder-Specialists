/**
 * Default configuration for the GitHub Chat Bot
 */
module.exports = {
  // Application settings
  app: {
    name: 'Git Chat Bot',
    version: '1.0.0',
    description: 'A GitHub chat bot for repository interactions'
  },
  
  // Server settings
  server: {
    port: process.env.PORT || 3000,
    hostname: '0.0.0.0'
  },
  
  // GitHub API settings
  github: {
    apiVersion: '2022-11-28', // GitHub API version to use
    appId: process.env.APP_ID,
    privateKeyPath: process.env.PRIVATE_KEY_PATH,
    webhookSecret: process.env.WEBHOOK_SECRET
  },
  
  // Logging settings
  logging: {
    