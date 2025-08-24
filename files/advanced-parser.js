// Advanced command parser using natural language patterns
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

class CommandParser {
  constructor() {
    this.commands = new Map();
    this.fallbackHandler = null;
    this.intentPatterns = new Map();
  }

  // Register a command with its handler and aliases
  register(command, handler, aliases = []) {
    this.commands.set(command.toLowerCase(), handler);
    aliases.forEach(alias => this.commands.set(alias.toLowerCase(), handler));
    return this;
  }

  // Register intent patterns for natural language understanding
  registerIntent(intent, patterns, handler) {
    this.intentPatterns.set(intent, {
      patterns: patterns.map(pattern => this.tokenizeAndStem(pattern)),
      handler
    });
    return this;
  }

  // Set fallback handler for unrecognized commands
  setFallback(handler) {
    this.fallbackHandler = handler;
    return this;
  }

  // Process the input text and execute the appropriate handler
  async process(text, context) {
    // First try direct command matching (for /command style)
    if (text.startsWith('/')) {
      const parts = text.split(' ');
      const command = parts[0].substring(1).toLowerCase();
      const args = parts.slice(1).join(' ');
      
      if (this.commands.has(command)) {
        return this.commands.get(command)(args, context);
      }
    }
    
    // Then try natural language intent matching
    const processedInput = this.tokenizeAndStem(text);
    let bestMatch = null;
    let highestScore = 0;
    
    for (const [intent, { patterns, handler }] of this.intentPatterns.entries()) {
      for (const pattern of patterns) {
        const score = this.calculateSimilarity(processedInput, pattern);
        if (score > highestScore && score > 0.6) { // Threshold for intent matching
          highestScore = score;
          bestMatch = handler;
        }
      }
    }
    
    if (bestMatch) {
      return bestMatch(text, context);
    }
    
    // Fall back to default handler
    if (this.fallbackHandler) {
      return this.fallbackHandler(text, context);
    }
    
    return "I'm not sure how to respond to that. Type /help for available commands.";
  }
  
  // Helper methods for text processing
  tokenizeAndStem(text) {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    return tokens.map(token => stemmer.stem(token));
  }
  
  calculateSimilarity(tokens1, tokens2) {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }
}

module.exports = CommandParser;