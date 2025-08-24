const { OpenAI } = require('openai');
const BaseModel = require('./BaseModel');
const logger = require('../utils/logger');

class OpenAIModel extends BaseModel {
  async initialize(keyManager) {
    await super.initialize(keyManager);
    
    this.client = new OpenAI({
      apiKey: this.apiKey
    });
    
    logger.info(`OpenAI model initialized: ${this.name}`);
  }

  async generate(messages, options = {}) {
    try {
      const formattedMessages = this.formatMessages(messages);
      
      const response = await this.client.chat.completions.create({
        model: this.name,
        messages: formattedMessages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        top_p: options.topP || 1,
        stream: false
      });
      
      return {
        content: response.choices[0].message.content,
        usage: response.usage
      };
    } catch (error) {
      logger.error(`OpenAI generation error: ${error.message}`);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  async generateStream(messages, options = {}) {
    try {
      const formattedMessages = this.formatMessages(messages);
      
      const stream = await this.client.chat.completions.create({
        model: this.name,
        messages: formattedMessages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        top_p: options.topP || 1,
        stream: true
      });
      
      return stream;
    } catch (error) {
      logger.error(`OpenAI stream generation error: ${error.message}`);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}

module.exports = OpenAIModel;