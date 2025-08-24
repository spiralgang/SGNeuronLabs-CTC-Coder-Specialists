/**
 * AI service integration using free-tier services
 * Falls back gracefully when services are unavailable
 */
const axios = require('axios');
const logger = require('../utils/logger');

// Supported free AI services
const AI_SERVICES = {
  HUGGINGFACE: 'huggingface',
  CODEGEEX: 'codegeex',
  DEEPSEEK: 'deepseek'
};

// Determine which AI service to use based on available configuration
function getActiveService() {
  if (process.env.HUGGINGFACE_TOKEN) {
    return AI_SERVICES.HUGGINGFACE;
  }
  if (process.env.CODEGEEX_KEY && process.env.CODEGEEX_SECRET) {
    return AI_SERVICES.CODEGEEX;
  }
  if (process.env.DEEPSEEK_TOKEN) {
    return AI_SERVICES.DEEPSEEK;
  }
  return null;
}

/**
 * Get an AI-generated response for a given text
 * @param {string} text - The input text to process
 * @returns {Promise<string|null>} The AI response or null if unavailable
 */
async function getResponse(text) {
  const service = getActiveService();
  if (!service) {
    logger.debug('No AI service configured, skipping AI response');
    return null;
  }
  
  try {
    logger.debug(`Using ${service} for AI response`);
    
    switch(service) {
      case AI_SERVICES.HUGGINGFACE:
        return await getHuggingFaceResponse(text);
      case AI_SERVICES.CODEGEEX:
        return await getCodegeexResponse(text);
      case AI_SERVICES.DEEPSEEK:
        return await getDeepseekResponse(text);
      default:
        return null;
    }
  } catch (error) {
    logger.error(`AI service (${service}) request failed`, error);
    return null;
  }
}

/**
 * Get response from Hugging Face Inference API (free tier)
 */
async function getHuggingFaceResponse(text) {
  const response = await axios({
    url: "https://api-inference.huggingface.co/models/google/flan-t5-small",
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    data: {
      inputs: `Answer this GitHub related question: ${text}`,
      parameters: {
        max_length: 500,
        temperature: 0.7
      }
    },
    timeout: 10000 // 10 second timeout
  });
  
  return response.data[0].generated_text;
}

/**
 * Get response from CodeGeex API (free tier)
 */
async function getCodegeexResponse(text) {
  // Implementation for CodeGeex API
  // This is a placeholder as the actual implementation would depend on
  // CodeGeex's specific API structure
  const response = await axios({
    url: "https://api.codegeex.com/v1/chat/completions",
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CODEGEEX_KEY}:${process.env.CODEGEEX_SECRET}`
    },
    data: {
      model: "codegeex",
      messages: [
        {
          role: "user",
          content: `Answer this GitHub related question: ${text}`
        }
      ]
    },
    timeout: 10000
  });
  
  return response.data.choices[0].message.content;
}

/**
 * Get response from DeepSeek Coder API (free tier)
 */
async function getDeepseekResponse(text) {
  // Implementation for DeepSeek API
  const response = await axios({
    url: "https://api.deepseek.com/v1/chat/completions",
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_TOKEN}`
    },
    data: {
      model: "deepseek-coder",
      messages: [
        {
          role: "user",
          content: `Answer this GitHub related question: ${text}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    },
    timeout: 10000
  });
  
  return response.data.choices[0].message.content;
}

module.exports = {
  getResponse
};