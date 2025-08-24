const logger = require('../utils/logger');

class ModelSelector {
  constructor() {
    this.models = {
      // OpenAI models
      'gpt-4o': {
        provider: 'openai',
        capabilities: ['code', 'reasoning', 'summarization', 'security'],
        contextWindow: 128000,
        performance: 0.95,
      },
      'gpt-3.5-turbo': {
        provider: 'openai',
        capabilities: ['code', 'reasoning', 'summarization'],
        contextWindow: 16000,
        performance: 0.85,
      },
      // Anthropic models
      'claude-3-opus': {
        provider: 'anthropic',
        capabilities: ['reasoning', 'summarization', 'security'],
        contextWindow: 200000,
        performance: 0.95,
      },
      'claude-3-sonnet': {
        provider: 'anthropic',
        capabilities: ['reasoning', 'summarization'],
        contextWindow: 180000,
        performance: 0.9,
      },
      // Hugging Face models
      'codellama-70b': {
        provider: 'huggingface',
        capabilities: ['code'],
        contextWindow: 16000,
        performance: 0.85,
      },
      // Replicate models
      'llama-3-70b': {
        provider: 'replicate',
        capabilities: ['code', 'reasoning', 'summarization'],
        contextWindow: 8000,
        performance: 0.85,
      },
      // Perplexity models
      'pplx-7b-online': {
        provider: 'perplexity',
        capabilities: ['research', 'summarization'],
        contextWindow: 4000,
        performance: 0.80,
        online: true
      }
    };
    
    // Default model for when nothing else is available
    this.fallbackModel = 'gpt-3.5-turbo';
  }

  async getModel(modelName) {
    if (this.models[modelName]) {
      return {
        name: modelName,
        ...this.models[modelName]
      };
    }
    
    logger.warn(`Model ${modelName} not found, using fallback model`);
    return {
      name: this.fallbackModel,
      ...this.models[this.fallbackModel]
    };
  }

  async selectOptimalModel(workflowName, context) {
    // Map workflows to required capabilities
    const capabilityMap = {
      'code-review': ['code', 'reasoning'],
      'issue-triage': ['reasoning', 'summarization'],
      'pr-summary': ['summarization', 'code'],
      'security-scan': ['security', 'code'],
    };
    
    const requiredCapabilities = capabilityMap[workflowName] || ['reasoning'];
    
    // Consider context size constraints
    const contextSize = this.estimateContextSize(context);
    
    // Find models that meet all requirements
    const eligibleModels = Object.entries(this.models).filter(([_, model]) => {
      // Check if model has all required capabilities
      const hasCapabilities = requiredCapabilities.every(cap => 
        model.capabilities.includes(cap)
      );
      
      // Check if context fits in model's context window
      const fitsContext = model.contextWindow >= contextSize;
      
      return hasCapabilities && fitsContext;
    });
    
    if (eligibleModels.length === 0) {
      logger.warn('No eligible models found, using fallback model');
      return {
        name: this.fallbackModel,
        ...this.models[this.fallbackModel]
      };
    }
    
    // Sort by performance (highest first)
    eligibleModels.sort((a, b) => b[1].performance - a[1].performance);
    
    const selectedModel = eligibleModels[0][0];
    
    logger.info(`Selected model ${selectedModel} for workflow ${workflowName}`);
    
    return {
      name: selectedModel,
      ...this.models[selectedModel]
    };
  }

  estimateContextSize(context) {
    // Simple estimation - 4 chars per token
    if (typeof context === 'string') {
      return Math.ceil(context.length / 4);
    }
    
    if (typeof context === 'object') {
      return Math.ceil(JSON.stringify(context).length / 4);
    }
    
    return 1000; // Default estimation
  }
}

module.exports = ModelSelector;