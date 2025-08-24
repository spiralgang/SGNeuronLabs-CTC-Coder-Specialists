const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

class CommandParser {
  constructor() {
    this.commands = new Map();
    this.intentPatterns = new Map();
    this.fallbackHandler = null;
  }

  register(command, handler, aliases = []) {
    this.commands.set(command.toLowerCase(), handler);
    aliases.forEach(alias => this.commands.set(alias.toLowerCase(), handler));
    return this;
  }

  registerIntent(intent, patterns, handler) {
    this.intentPatterns.set(intent, {
      patterns: patterns.map(pattern => this.tokenizeAndStem(pattern)),
      handler
    });
    return this;
  }

  setFallback(handler) {
    this.fallbackHandler = handler;
    return this;
  }

  async process(text, context) {
    // Direct command matching (e.g., /help)
    if (text.startsWith('/')) {
      const parts = text.split(' ');
      const command = parts[0].substring(1).toLowerCase();
      const args = parts.slice(1).join(' ');
      
      if (this.commands.has(command)) {
        return await this.commands.get(command)(args, context);
      }
    }
    
    // Natural language intent matching
    const processedInput = this.tokenizeAndStem(text);
    let bestMatch = null;
    let highestScore = 0;
    
    for (const [intent, { patterns, handler }] of this.intentPatterns.entries()) {
      for (const pattern of patterns) {
        const score = this.calculateSimilarity(processedInput, pattern);
        if (score > highestScore && score > 0.5) { // Threshold for matching
          highestScore = score;
          bestMatch = handler;
        }
      }
    }
    
    if (bestMatch) {
      return await bestMatch(text, context);
    }
    
    // Use fallback handler
    if (this.fallbackHandler) {
      return await this.fallbackHandler(text, context);
    }
    
    return "I don't understand that command. Type `/help` for available commands.";
  }
  
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