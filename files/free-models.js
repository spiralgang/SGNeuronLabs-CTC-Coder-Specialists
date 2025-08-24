// Integration with free machine learning models
const axios = require('axios');
const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');
const { Classifier } = require('ml-classify-text');

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
    
    // Cache for loaded models
    this.loadedModels = new Map();
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
    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();
    
    // Split text into sentences
    const tokenizer = new natural.SentenceTokenizer();
    const sentences = tokenizer.tokenize(text);
    
    if (sentences.length <= sentenceCount) {
      return text;
    }
    
    // Add each sentence to TF-IDF
    sentences.forEach(sentence => {
      tfidf.addDocument(sentence);
    });
    
    // Score each sentence based on term importance
    const sentenceScores = sentences.map((sentence, i) => {
      let score = 0;
      const words = new natural.WordTokenizer().tokenize(sentence);
      const uniqueWords = [...new Set(words)];
      
      uniqueWords.forEach(word => {
        const tfidfScore = tfidf.tfidf(word, i);
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
    const TfIdf = natural.TfIdf;
    const tfidf = new TfIdf();
    
    tfidf.addDocument(text);
    
    const terms = [];
    tfidf.listTerms(0).forEach(item => {
      terms.push({ term: item.term, tfidf: item.tfidf });
    });
    
    return terms
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, count)
      .map(item => item.term);
  }
  
  // Use TensorFlow.js for text classification
  async classifyWithTensorflow(text, categories) {
    try {
      // Load or create a simple text classification model
      const model = await this.getOrCreateModel('text-classifier', categories);
      
      // Encode input text
      const encoded = this.encodeText(text);
      
      // Make prediction
      const prediction = await model.predict(encoded).data();
      
      // Get highest scoring category
      const maxIndex = prediction.indexOf(Math.max(...prediction));
      return categories[maxIndex];
    } catch (error) {
      console.error('Error in TensorFlow classification:', error);
      return null;
    }
  }
  
  // Helper to get or create TF model
  async getOrCreateModel(modelId, categories) {
    if (this.loadedModels.has(modelId)) {
      return this.loadedModels.get(modelId);
    }
    
    // Create a simple text classification model
    const model = tf.sequential();
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu',
      inputShape: [100]  // Simple bag-of-words encoding
    }));
    model.add(tf.layers.dense({
      units: categories.length,
      activation: 'softmax'
    }));
    
    model.compile({
      optimizer: tf.train.adam(),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    this.loadedModels.set(modelId, model);
    return model;
  }
  
  // Simple text encoding (bag of words)
  encodeText(text) {
    // This is a very simplified implementation
    // Real-world would use tokenization, embeddings, etc.
    const vector = new Array(100).fill(0);
    
    const words = text.toLowerCase().split(/\W+/);
    words.forEach(word => {
      const hash = this.simpleHash(word) % 100;
      vector[hash] += 1;
    });
    
    return tf.tensor2d([vector]);
  }
  
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

module.exports = new FreeModels();