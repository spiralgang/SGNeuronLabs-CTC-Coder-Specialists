const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const logger = require('../utils/logger');
const ModelFactory = require('../models/ModelFactory');

class ModelRegistry {
  constructor() {
    this.models = {
      // OpenAI models with capabilities and metrics
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
      // HuggingFace models
      'codellama-34b': {
        provider: 'huggingface',
        capabilities: ['code'],
        contextWindow: 16000,
        performance: 0.85,
        localSupport: true, // Can be downloaded and run locally
        repoId: 'codellama/CodeLlama-34b-Instruct-hf'
      },
      'mistral-7b': {
        provider: 'huggingface',
        capabilities: ['reasoning', 'summarization'],
        contextWindow: 8000,
        performance: 0.80,
        localSupport: true,
        repoId: 'mistralai/Mistral-7B-Instruct-v0.2'
      }
    };
    
    this.localModels = new Map();
    this.modelFactory = new ModelFactory();
    this.defaultModel = 'gpt-3.5-turbo';
  }

  async scanLocalModels(modelsDir) {
    try {
      await fs.access(modelsDir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Models directory doesn't exist, create it
        try {
          await fs.mkdir(modelsDir, { recursive: true });
          logger.info(`Created models directory at ${modelsDir}`);
        } catch (mkdirError) {
          logger.error(`Failed to create models directory at ${modelsDir}`, mkdirError);
        }
      } else {
        logger.error(`Cannot access models directory at ${modelsDir}`, error);
      }
      return;
    }

    try {
      const entries = await fs.readdir(modelsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const modelName = entry.name;
          const configPath = path.join(modelsDir, modelName, 'config.json');
          
          try {
            const configData = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(configData);
            
            this.localModels.set(modelName, {
              ...config,
              path: path.join(modelsDir, modelName),
              local: true
            });
            
            logger.info(`Registered local model: ${modelName}`);
          } catch (error) {
            logger.warn(`Failed to load local model ${modelName}`, error);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to scan models directory at ${modelsDir}`, error);
    }
  }

  async downloadModel(modelName, targetDir) {
    const model = this.models[modelName];
    if (!model || !model.localSupport || !model.repoId) {
      throw new Error(`Model ${modelName} does not support local download`);
    }
    
    logger.info(`Downloading model ${modelName} from HuggingFace`);
    
    try {
      // Use Git LFS to clone the model repository
      const modelDir = path.join(targetDir, modelName);
      await fs.mkdir(modelDir, { recursive: true });
      
      // Use Git LFS to efficiently download the model
      execSync(`git lfs install && git clone https://huggingface.co/${model.repoId} ${modelDir}`, {
        stdio: 'inherit'
      });
      
      // Create a config file with model metadata
      const configPath = path.join(modelDir, 'config.json');
      await fs.writeFile(configPath, JSON.stringify({
        name: modelName,
        provider: model.provider,
        capabilities: model.capabilities,
        contextWindow: model.contextWindow,
        performance: model.performance,
        repoId: model.repoId
      }, null, 2));
      
      // Register the downloaded model
      this.localModels.set(modelName, {
        ...model,
        path: modelDir,
        local: true
      });
      
      logger.info(`Successfully downloaded model ${modelName} to ${modelDir}`);
      
      return modelDir;
    } catch (error) {
      logger.error(`Failed to download model ${modelName}`, error);
      throw error;
    }
  }

  async getModel(name) {
    // Check if it's a local model
    if (this.localModels.has(name)) {
      const localModel = this.localModels.get(name);
      return this.modelFactory.createModel(name, localModel);
    }
    
    // Check if it's a remote model
    if (this.models[name]) {
      return this.modelFactory.createModel(name, this.models[name]);
    }
    
    logger.warn(`Model ${name} not found, using default model ${this.defaultModel}`);
    return this.modelFactory.createModel(this.defaultModel, this.models[this.defaultModel]);
  }

  async hasModel(name) {
    return this.localModels.has(name) || this.models.hasOwnProperty(name);
  }

  async findOptimalModel(requiredCapabilities = []) {
    // First check if any local models meet the requirements
    const localCandidates = Array.from(this.localModels.entries())
      .filter(([_, model]) => {
        return requiredCapabilities.every(cap => model.capabilities?.includes(cap));
      })
      .sort((a, b) => b[1].performance - a[1].performance);
    
    if (localCandidates.length > 0) {
      const [name, model] = localCandidates[0];
      logger.info(`Selected optimal local model: ${name}`);
      return this.modelFactory.createModel(name, model);
    }
    
    // Otherwise check remote models
    const remoteCandidates = Object.entries(this.models)
      .filter(([_, model]) => {
        return requiredCapabilities.every(cap => model.capabilities?.includes(cap));
      })
      .sort((a, b) => b[1].performance - a[1].performance);
    
    if (remoteCandidates.length > 0) {
      const [name, model] = remoteCandidates[0];
      logger.info(`Selected optimal remote model: ${name}`);
      return this.modelFactory.createModel(name, model);
    }
    
    // Fallback to default model
    logger.warn(`No suitable model found for capabilities: ${requiredCapabilities.join(', ')}, using default model`);
    return this.modelFactory.createModel(this.defaultModel, this.models[this.defaultModel]);
  }
}

module.exports = ModelRegistry;