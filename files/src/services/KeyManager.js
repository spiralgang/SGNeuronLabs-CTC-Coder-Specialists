const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const yaml = require('js-yaml');
const logger = require('../utils/logger');

class KeyManager {
  constructor() {
    this.keys = {};
    this.keyStorePath = process.env.KEY_STORE_PATH || path.join(os.homedir(), '.github-agent', 'keys.enc');
    this.encryptionKey = process.env.ENCRYPTION_KEY || this._generateEncryptionKey();
    this.providers = [
      { name: 'openai', envVars: ['OPENAI_API_KEY'], configFiles: ['.openai', '.openai.json'] },
      { name: 'anthropic', envVars: ['ANTHROPIC_API_KEY'], configFiles: ['.anthropic', '.anthropic.json'] },
      { name: 'huggingface', envVars: ['HUGGINGFACE_TOKEN', 'HF_TOKEN'], configFiles: ['.huggingface'] },
      { name: 'replicate', envVars: ['REPLICATE_API_TOKEN'], configFiles: ['.replicate.json'] },
      { name: 'perplexity', envVars: ['PERPLEXITY_API_KEY'], configFiles: ['.perplexity'] },
      { name: 'cohere', envVars: ['COHERE_API_KEY'], configFiles: ['.cohere'] }
    ];
  }

  _generateEncryptionKey() {
    // Only used when no encryption key is provided
    const key = crypto.randomBytes(32).toString('hex');
    logger.warn('No encryption key provided, generated temporary key');
    return key;
  }

  _encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  _decrypt(encryptedData) {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'), iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt data', error);
      return null;
    }
  }

  async initialize() {
    // Ensure storage directory exists
    const storageDir = path.dirname(this.keyStorePath);
    await fs.mkdir(storageDir, { recursive: true });
    
    // Load existing keys
    try {
      const encryptedData = await fs.readFile(this.keyStorePath, 'utf8');
      if (encryptedData) {
        const decryptedData = this._decrypt(encryptedData);
        if (decryptedData) {
          this.keys = JSON.parse(decryptedData);
          logger.info(`Loaded keys for providers: ${Object.keys(this.keys).join(', ')}`);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to load keys', error);
      } else {
        logger.info('No existing keys found, will create new store');
      }
    }
  }

  async saveKeys() {
    if (Object.keys(this.keys).length === 0) {
      logger.debug('No keys to save');
      return;
    }
    
    const encryptedData = this._encrypt(JSON.stringify(this.keys));
    await fs.writeFile(this.keyStorePath, encryptedData);
    logger.info('Saved encrypted keys to disk');
  }

  async discoverKeys() {
    for (const provider of this.providers) {
      if (this.keys[provider.name]) {
        logger.debug(`Key already exists for ${provider.name}`);
        continue;
      }
      
      try {
        const key = await this._discoverKeyForProvider(provider);
        if (key) {
          this.keys[provider.name] = key;
          logger.info(`Discovered key for ${provider.name}`);
        }
      } catch (error) {
        logger.error(`Failed to discover key for ${provider.name}`, error);
      }
    }
    
    await this.saveKeys();
  }

  async _discoverKeyForProvider(provider) {
    // Check environment variables first
    for (const envVar of provider.envVars) {
      if (process.env[envVar]) {
        logger.debug(`Found key in environment variable ${envVar}`);
        return process.env[envVar];
      }
    }
    
    // Check config files in home directory
    for (const configFile of provider.configFiles) {
      try {
        const filePath = path.join(os.homedir(), configFile);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Try parsing as JSON
        try {
          const json = JSON.parse(content);
          const key = json.api_key || json.apiKey || json.key || json.token;
          if (key) {
            logger.debug(`Found key in config file ${configFile} (JSON)`);
            return key;
          }
        } catch {
          // Not JSON, try other formats
        }
        
        // Try parsing as YAML
        try {
          const yaml = yaml.load(content);
          const key = yaml.api_key || yaml.apiKey || yaml.key || yaml.token;
          if (key) {
            logger.debug(`Found key in config file ${configFile} (YAML)`);
            return key;
          }
        } catch {
          // Not YAML, try regex
        }
        
        // Try regex pattern matching
        const keyMatch = content.match(/(?:api[-_]?key|token|secret)[\s=:"']+([a-zA-Z0-9_\-]+)/i);
        if (keyMatch && keyMatch[1]) {
          logger.debug(`Found key in config file ${configFile} (regex)`);
          return keyMatch[1];
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.debug(`Error reading config file ${configFile}`, error);
        }
      }
    }
    
    return null;
  }

  getKey(provider) {
    return this.keys[provider] || null;
  }

  getAvailableProviders() {
    return Object.keys(this.keys);
  }
}

module.exports = KeyManager;