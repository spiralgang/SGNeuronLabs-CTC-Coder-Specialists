/**
 * Simple NLP processing for command and intent recognition
 * Uses regex patterns and keyword matching as a lightweight approach
 * without requiring external API dependencies
 */
const logger = require('../utils/logger');

// Command patterns
const COMMAND_REGEX = /^\/(help|status|search|issues|prs|stats|pingping|chatgptchat|chatgpt|reviewauto|review)(?:\s+(.+))?$/i;

// Intent recognition patterns
const INTENT_PATTERNS = [
  { intent: 'help', patterns: [/how\s+to/i, /help\s+with/i, /how\s+do\s+i/i] },
  { intent: 'bug', patterns: [/bug/i, /error/i, /not\s+working/i, /broken/i] },
  { intent: 'feature', patterns: [/feature\s+request/i, /would\s+like/i, /suggest/i] },
  { intent: 'thanks', patterns: [/thank/i, /appreciate/i, /awesome/i] }
];

/**
 * Analyzes text to determine if it's a command, query, or general comment
 * @param {string} text - The text to analyze
 * @returns {Object} Analysis results including type and extracted parameters
 */
async function analyzeText(text) {
  if (!text) {
    return { isCommand: false, isQuery: false };
  }

  logger.debug('Analyzing text input', { textLength: text.length });
  
  // Check if it's a command
  const commandMatch = text.match(COMMAND_REGEX);
  if (commandMatch) {
    return {
      isCommand: true,
      isQuery: false,
      command: commandMatch[1].toLowerCase(),
      params: commandMatch[2] || ''
    };
  }
  
  // Check for intents
  const matchedIntents = INTENT_PATTERNS.filter(ip => 
    ip.patterns.some(pattern => pattern.test(text))
  ).map(ip => ip.intent);
  
  const isQuery = matchedIntents.length > 0 || 
    text.includes('?') || 
    /^(what|how|when|where|who|why)/i.test(text);
  
  return {
    isCommand: false,
    isQuery,
    intents: matchedIntents,
    text
  };
}

module.exports = {
  analyzeText
};