const natural = require('natural');
const { Classifier } = require('ml-classify-text');
const axios = require('axios');

class FreeModels {
  constructor() {
    // Initialize text classifier for intent recognition
    this.intentClassifier = new Classifier();
    this.trained = false;
    
    // Initialize sentiment analyzer
    this.sentimentAnalyzer = new natural.SentimentAnalyzer(
      'English', 
      natural.PorterStemmer,
      'afinn'
    );
    
    // Initialize the TF-IDF
    this.tfidf = new natural.TfIdf();
  }
  
  // Train intent classifier with sample data
  async trainIntentClassifier() {
    if (this.trained) return;
    
    const trainingData = [
      { text: 'show repository status', category: 'status' },
      { text: 'how is the repo doing', category: 'status' },
      { text: 'give me stats about this project', category: 'status' },
      
      { text: 'search for files with auth', category: 'search' },
      { text: 'find code about login', category: 'search' },
      { text: 'look for authentication code', category: 'search' },
      
      { text: 'show open issues', category: 'issues' },
      { text: 'list all issues', category: 'issues' },
      { text: 'what bugs are there', category: 'issues' },
      
      { text: 'list pull requests', category: 'pullrequests' },
      { text: 'show open PRs', category: 'pullrequests' },
      { text: 'what changes are pending', category: 'pullrequests' },
      
      { text: 'how do I create a PR', category: 'help' },
      { text: 'help me with git commands', category: 'help' },
      { text: 'I need assistance', category: 'help' }
    ];
    
    for (const item of trainingData) {
      this.intentClassifier.addDocument(item.text, item.category);
    }
    
    await this.intentClassifier.train();
    this.trained = true;
    
    return 'Intent classifier trained successfully';
  }
  
  // Classify intent of user text
  async classifyIntent(text) {
    if (!this.trained) {
      await this.trainIntentClassifier();
    }
    
    const classifications = this.intentClassifier.classify(text);
    return classifications.length > 0 ? classifications[0].label : null;
  }
  
  // Analyze sentiment of text
  analyzeSentiment(text) {
    const tokenized = new natural.WordTokenizer().tokenize(text);
    const score = this.sentimentAnalyzer.getSentiment(tokenized);
    
    let sentiment;
    if (score > 0.2) sentiment = 'positive';
    else if (score < -0.2) sentiment = 'negative';
    else sentiment = 'neutral';
    
    return { score, sentiment };
  }
  
  // Summarize text using TF-IDF for extractive summarization
  summarizeText(text, sentenceCount = 3) {
    // Clear previous documents
    this.tfidf = new natural.TfIdf();
    
    // Split text into sentences
    const tokenizer = new natural.SentenceTokenizer();
    const sentences = tokenizer.tokenize(text);
    
    if (sentences.length <= sentenceCount) {
      return text;
    }
    
    // Add each sentence to TF-IDF
    sentences.forEach(sentence => {
      this.tfidf.addDocument(sentence);
    });
    
    // Score each sentence based on term importance
    const sentenceScores = sentences.map((sentence, i) => {
      let score = 0;
      const words = new natural.WordTokenizer().tokenize(sentence);
      const uniqueWords = [...new Set(words)];
      
      uniqueWords.forEach(word => {
        const tfidfScore = this.tfidf.tfidf(word, i);
        score += tfidfScore;
      });
      
      return { index: i, sentence, score: score / uniqueWords.length };
    });
    
    // Sort by score and take top N sentences
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, sentenceCount)
      .sort((a, b) => a.index - b.index);
    
    return topSentences.map(item => item.sentence).join(' ');
  }
  
  // Extract keywords using TF-IDF
  extractKeywords(text, count = 5) {
    // Clear and add the document
    this.tfidf = new natural.TfIdf();
    this.tfidf.addDocument(text);
    
    const terms = [];
    this.tfidf.listTerms(0).forEach(item => {
      terms.push({ term: item.term, tfidf: item.tfidf });
    });
    
    return terms
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, count)
      .map(item => item.term);
  }
  
  // Use Hugging Face Inference API for free text generation (limited usage)
  async generateText(prompt) {
    try {
      // Use a smaller, free model
      const response = await axios({
        url: "https://api-inference.huggingface.co/models/google/flan-t5-small",
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          inputs: prompt,
          parameters: {
            max_length: 100,
            temperature: 0.7
          }
        },
        timeout: 5000 // 5s timeout to avoid hanging
      });
      
      return response.data[0]?.generated_text || "Sorry, I couldn't generate text";
    } catch (error) {
      console.error('Error generating text:', error);
      return "Sorry, text generation failed";
    }
  }
  
  // Basic code suggestion using predefined patterns (no API needed)
  suggestCode(language, requirement) {
    const templates = {
      'javascript': {
        'fetch': `
// Fetch data from an API
fetch('https://api.example.com/data')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
        'function': `
// Example function
function processData(data) {
  // TODO: Implement data processing
  return data;
}`
      },
      'python': {
        'requests': `
# Fetch data from an API
import requests

response = requests.get('https://api.example.com/data')
data = response.json()
print(data)`,
        'function': `
# Example function
def process_data(data):
    # TODO: Implement data processing
    return data`
      }
    };
    
    // Match requirement keywords to templates
    const lowerReq = requirement.toLowerCase();
    if (templates[language]) {
      for (const [key, template] of Object.entries(templates[language])) {
        if (lowerReq.includes(key)) {
          return template;
        }
      }
    }
    
    return `# Sorry, I don't have a template for ${language} - ${requirement}`;
  }
}

module.exports = new FreeModels();