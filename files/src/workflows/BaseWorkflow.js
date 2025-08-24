const logger = require('../utils/logger');

class BaseWorkflow {
  constructor(agentCore) {
    this.agentCore = agentCore;
    this.name = 'base-workflow';
  }

  getRequiredCapabilities() {
    return [];
  }

  async execute(context, model) {
    throw new Error('Method not implemented');
  }
  
  async executeStep(stepName, context, model) {
    const stepMethod = this[stepName];
    if (!stepMethod || typeof stepMethod !== 'function') {
      throw new Error(`Step method ${stepName} not found in workflow ${this.name}`);
    }
    
    logger.info(`Executing step ${stepName} in workflow ${this.name}`);
    
    try {
      const result = await stepMethod.call(this, context, model);
      logger.info(`Completed step ${stepName} in workflow ${this.name}`);
      return result;
    } catch (error) {
      logger.error(`Failed to execute step ${stepName} in workflow ${this.name}`, error);
      throw error;
    }
  }
}

module.exports = BaseWorkflow;