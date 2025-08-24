const path = require('path');
const { spawn } = require('child_process');
const BaseModel = require('./BaseModel');
const logger = require('../utils/logger');

class LocalModel extends BaseModel {
  async initialize() {
    if (!this.config.path) {
      throw new Error('Local model path not specified');
    }
    
    // No API key needed for local models
    logger.info(`Local model initialized: ${this.name} at ${this.config.path}`);
  }

  async generate(messages, options = {}) {
    try {
      const input = this._formatInput(messages, options);
      
      return new Promise((resolve, reject) => {
        const modelProcess = spawn(
          'python', 
          [
            path.join(__dirname, '../scripts/run_local_model.py'),
            '--model-path', this.config.path,
            '--max-tokens', options.maxTokens || 1000,
            '--temperature', options.temperature || 0.7
          ],
          { stdio: ['pipe', 'pipe', 'pipe'] }
        );
        
        let output = '';
        let errorOutput = '';
        
        modelProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        modelProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        modelProcess.on('close', (code) => {
          if (code !== 0) {
            logger.error(`Local model process exited with code ${code}: ${errorOutput}`);
            reject(new Error(`Model execution failed: ${errorOutput}`));
            return;
          }
          
          try {
            const result = JSON.parse(output);
            resolve({
              content: result.text,
              usage: result.usage || {}
            });
          } catch (error) {
            reject(new Error(`Failed to parse model output: ${error.message}`));
          }
        });
        
        modelProcess.stdin.write(JSON.stringify(input));
        modelProcess.stdin.end();
      });
    } catch (error) {
      logger.error(`Local model generation error: ${error.message}`);
      throw new Error(`Local model error: ${error.message}`);
    }
  }

  _formatInput(messages, options) {
    // Format messages for local model inference
    const concatenated = messages.map(m => {
      if (m.role === 'system') {
        return `<|system|>\n${m.content}`;
      } else if (m.role === 'user') {
        return `<|user|>\n${m.content}`;
      } else if (m.role === 'assistant') {
        return `<|assistant|>\n${m.content}`;
      }
      return m.content;
    }).join('\n');
    
    return {
      prompt: concatenated + '\n<|assistant|>\n',
      options
    };
  }
}

module.exports = LocalModel;