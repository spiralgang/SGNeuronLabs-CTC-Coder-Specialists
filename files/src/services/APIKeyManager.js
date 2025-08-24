const axios = require('axios');
const crypto = require('crypto');
const { readFile, writeFile, mkdir } = require('fs/promises');
const path = require('path');
const logger = require('../utils/logger');

class APIKeyManager {
  constructor() {
    this.keys = {};
    this.keyDirectory = path.join(process.cwd(), '.api-keys');
    this.keyFile = path.join(this.keyDirectory, 'keys.json');
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    this.supportedProviders = [
      { name: 'openai', discoveryUrl: 'https://platform.openai.com/docs/api-reference' },
      { name: 'huggingface', discoveryUrl: 'https://huggingface.co/docs/api-inference/index' },
      { name: 'replicate', discoveryUrl: 'https://replicate.com/docs/reference/http' },
      { name: 'anthropic', discoveryUrl: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api' },
      { name: 'cohere', discoveryUrl: 'https://docs.cohere.com/reference/about' },
      { name: 'perplexity', discoveryUrl: 'https://docs.perplexity.ai/' }
    ];
  }

  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Encryption and decryption methods
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  decrypt(text) {
    const [ivHex, encryptedText] = text.split(':');
    if (!ivHex || !encryptedText) return null;
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async initialize() {
    try {
      await mkdir(this.keyDirectory, { recursive: true });
      
      try {
        const data = await readFile(this.keyFile, 'utf8');
        const encryptedKeys = JSON.parse(data);
        
        // Decrypt keys
        Object.keys(encryptedKeys).forEach(provider => {
          this.keys[provider] = this.decrypt(encryptedKeys[provider]);
        });
        
        logger.info('API keys loaded successfully');
      } catch (err) {
        if (err.code !== 'ENOENT') {
          logger.error('Error reading API keys:', err);
        } else {
          logger.info('No existing API keys found, will create new file');
          await this.saveKeys();
        }
      }
    } catch (error) {
      logger.error('Failed to initialize API key manager:', error);
      throw error;
    }
  }

  async saveKeys() {
    // Encrypt keys before saving
    const encryptedKeys = {};
    Object.keys(this.keys).forEach(provider => {
      encryptedKeys[provider] = this.encrypt(this.keys[provider]);
    });
    
    await writeFile(this.keyFile, JSON.stringify(encryptedKeys, null, 2));
    logger.info('API keys saved successfully');
  }

  async discoverAndSourceKeys() {
    logger.info('Starting API key discovery...');
    
    for (const provider of this.supportedProviders) {
      try {
        // Skip if we already have a key for this provider
        if (this.keys[provider.name]) {
          logger.info(`Key for ${provider.name} already exists, skipping discovery`);
          continue;
        }

        logger.info(`Attempting to discover ${provider.name} API key...`);
        const key = await this.attemptKeyDiscovery(provider);
        
        if (key) {
          this.keys[provider.name] = key;
          logger.info(`Successfully obtained API key for ${provider.name}`);
        } else {
          logger.info(`Could not discover API key for ${provider.name}`);
        }
      } catch (error) {
        logger.error(`Error discovering API key for ${provider.name}:`, error);
      }
    }
    
    await this.saveKeys();
  }

  async attemptKeyDiscovery(provider) {
    // First check environment variables
    const envVarKey = `${provider.name.toUpperCase()}_API_KEY`;
    if (process.env[envVarKey]) {
      return process.env[envVarKey];
    }
    
    // Then check configuration files in common locations
    const configLocations = [
      path.join(process.env.HOME || process.env.USERPROFILE, '.config', provider.name),
      path.join(process.env.HOME || process.env.USERPROFILE, `.${provider.name}`),
    ];
    
    for (const configPath of configLocations) {
      try {
        const content = await readFile(configPath, 'utf8');
        const match = content.match(/"?api[_-]?key"?\s*[:=]\s*["']([^"']+)["']/i);
        if (match && match[1]) {
          return match[1];
        }
      } catch (err) {
        // File doesn't exist or can't be read, continue to next method
      }
    }
    
    // As a last resort, we could attempt to use OAuth flows or web-based discovery
    // This is a simplified example and would need more robust implementation
    // for production use
    
    return null;
  }

  getKey(provider) {
    return this.keys[provider] || null;
  }

  async setKey(provider, key) {
    this.keys[provider] = key;
    await this.saveKeys();
  }

  getAvailableProviders() {
    return Object.keys(this.keys);
  }
}

module.exports = APIKeyManager;