const logger = require('../utils/logger');

class BaseModel {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.provider = config.provider;
    this.contextWindow = config.contextWindow || 4096;
    this.capabilities = config.capabilities || [];
  }

  async initialize(keyManager) {
    this.apiKey = keyManager.getKey(this.provider);
    
    if (!this.apiKey) {
      throw new Error(`No API key found for provider: ${this.provider}`);
    }
    
    logger.debug(`Initialized ${this.provider} model: ${this.name}`);
  }

  async generate(prompt, options = {}) {
    throw new Error('Method not implemented');
  }

  async generateStream(prompt, options = {}) {
    throw new Error('Method not implemented');
  }
  
  estimateTokens(text) {
    // Simple estimation - 1 token ~= 4 chars for English text
    if (typeof text === 'string') {
      return Math.ceil(text.length / 4);
    }
    if (typeof text === 'object') {
      return Math.ceil(JSON.stringify(text).length / 4);
    }
    return 0;
  }
  
  formatMessages(messages) {
    // Default implementation for OpenAI-like format
    return messages;
  }
}

module.exports = BaseModel;