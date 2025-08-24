const axios = require('axios');
const logger = require('../utils/logger');

class AIModelProxy {
  constructor(model, apiKey) {
    this.model = model;
    this.apiKey = apiKey;
    this.provider = model.provider;
    this.name = model.name;
    this.client = this.initializeClient();
  }

  initializeClient() {
    // Configure axios client based on provider
    const client = axios.create();
    
    // Set default headers based on provider
    switch (this.provider) {
      case 'openai':
        client.defaults.baseURL = 'https://api.openai.com/v1';
        client.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey}`;
        break;
      case 'anthropic':
        client.defaults.baseURL = 'https://api.anthropic.com/v1';
        client.defaults.headers.common['x-api-key'] = this.apiKey;
        client.defaults.headers.common['anthropic-version'] = '2023-06-01';
        break;
      case 'huggingface':
        client.defaults.baseURL = 'https://api-inference.huggingface.co/models';
        client.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey}`;
        break;
      case 'replicate':
        client.defaults.baseURL = 'https://api.replicate.com/v1';
        client.defaults.headers.common['Authorization'] = `Token ${this.apiKey}`;
        break;
      case 'cohere':
        client.defaults.baseURL = 'https://api.cohere.ai/v1';
        client.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey}`;
        break;
      case 'perplexity':
        client.defaults.baseURL = 'https://api.perplexity.ai';
        client.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey}`;
        break;
      default:
        logger.warn(`Unknown provider: ${this.provider}`);
    }
    
    client.defaults.headers.post['Content-Type'] = 'application/json';
    
    return client;
  }

  async complete(options) {
    const startTime = Date.now();
    try {
      logger.info(`Calling ${this.provider} model: ${this.name}`);
      
      let response;
      
      switch (this.provider) {
        case 'openai':
          response = await this.openaiComplete(options);
          break;
        case 'anthropic':
          response = await this.anthropicComplete(options);
          break;
        case 'huggingface':
          response = await this.huggingfaceComplete(options);
          break;
        case 'replicate':
          response = await this.replicateComplete(options);
          break;
        case 'cohere':
          response = await this.cohereComplete(options);
          break;
        case 'perplexity':
          response = await this.perplexityComplete(options);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }
      
      const duration = Date.now() - startTime;
      logger.info(`Completed ${this.provider}:${this.name} call in ${duration}ms`);
      
      return response;
    } catch (error) {
      logger.error(`Error calling ${this.provider} API:`, error);
      throw new Error(`${this.provider} API error: ${error.message}`);
    }
  }

  async openaiComplete(options) {
    const { messages, max_tokens = 1000, temperature = 0.7 } = options;
    
    const response = await this.client.post('/chat/completions', {
      model: this.name,
      messages,
      max_tokens,
      temperature
    });
    
    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage
    };
  }

  async anthropicComplete(options) {
    const { messages, max_tokens = 1000, temperature = 0.7 } = options;
    
    // Convert messages to Anthropic format
    const prompt = messages.map(msg => {
      if (msg.role === 'system') {
        return `Human: <system>${msg.content}</system>\n`;
      } else if (msg.role === 'user') {
        return `Human: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        return `Assistant: ${msg.content}\n`;
      }
      return '';
    }).join('') + 'Assistant: ';
    
    const response = await this.client.post('/messages', {
      model: this.name,
      prompt,
      max_tokens_to_sample: max_tokens,
      temperature
    });
    
    return {
      content: response.data.completion,
      usage: {
        prompt_tokens: response.data.usage?.prompt_tokens,
        completion_tokens: response.data.usage?.completion_tokens,
        total_tokens: response.data.usage?.total_tokens
      }
    };
  }

  async huggingfaceComplete(options) {
    const { messages, max_tokens = 1000 } = options;
    
    // Combine messages into a single prompt
    const prompt = messages.map(msg => msg.content).join('\n');
    
    const response = await this.client.post(`/${this.name}`, {
      inputs: prompt,
      parameters: {
        max_new_tokens: max_tokens,
        return_full_text: false
      }
    });
    
    return {
      content: response.data[0]?.generated_text || '',
      usage: {}
    };
  }

  async replicateComplete(options) {
    const { messages, max_tokens = 1000, temperature = 0.7 } = options;
    
    // Combine messages into a single prompt
    const prompt = messages.map(msg => {
      if (msg.role === 'system') {
        return `<system>\n${msg.content}\n</system>`;
      } else if (msg.role === 'user') {
        return `<user>\n${msg.content}\n</user>`;
      } else if (msg.role === 'assistant') {
        return `<assistant>\n${msg.content}\n</assistant>`;
      }
      return msg.content;
    }).join('\n');
    
    const response = await this.client.post('/predictions', {
      version: this.name,
      input: {
        prompt,
        max_tokens,
        temperature
      }
    });
    
    // Replicate is asynchronous, need to poll for results
    let prediction = response.data;
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await this.client.get(`/predictions/${prediction.id}`);
      prediction = statusResponse.data;
    }
    
    if (prediction.status === 'failed') {
      throw new Error(`Replicate prediction failed: ${prediction.error}`);
    }
    
    return {
      content: prediction.output,
      usage: {}
    };
  }

  async cohereComplete(options) {
    const { messages, max_tokens = 1000, temperature = 0.7 } = options;
    
    // Extract the last user message
    const userMessage = messages.filter(msg => msg.role === 'user').pop()?.content || '';
    
    const response = await this.client.post('/generate', {
      model: this.name,
      prompt: userMessage,
      max_tokens,
      temperature
    });
    
    return {
      content: response.data.generations[0].text,
      usage: {
        total_tokens: response.data.meta?.billed_units?.total_tokens
      }
    };
  }

  async perplexityComplete(options) {
    const { messages, max_tokens = 1000, temperature = 0.7 } = options;
    
    const response = await this.client.post('/chat/completions', {
      model: this.name,
      messages,
      max_tokens,
      temperature
    });
    
    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage
    };
  }
}

module.exports = AIModelProxy;