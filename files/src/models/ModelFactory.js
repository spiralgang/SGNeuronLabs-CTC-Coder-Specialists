const OpenAIModel = require('./OpenAIModel');
const AnthropicModel = require('./AnthropicModel');
const HuggingFaceModel = require('./HuggingFaceModel');
const LocalModel = require('./LocalModel');
const logger = require('../utils/logger');

class ModelFactory {
  createModel(name, config) {
    if (config.local) {
      return new LocalModel(name, config);
    }

    switch (config.provider) {
      case 'openai':
        return new OpenAIModel(name, config);
      case 'anthropic':
        return new AnthropicModel(name, config);
      case 'huggingface':
        return new HuggingFaceModel(name, config);
      default:
        logger.warn(`Unknown provider ${config.provider}, falling back to OpenAI`);
        return new OpenAIModel(name, {...config, provider: 'openai'});
    }
  }
}

module.exports = ModelFactory;