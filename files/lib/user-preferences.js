const fs = require('fs').promises;
const path = require('path');

class UserPreferences {
  constructor(storagePath = './config/user_preferences') {
    this.storagePath = storagePath;
    this.userCache = new Map();
    this.defaultPreferences = {
      notifications: true,
      responseFormat: 'markdown',
      language: 'en',
      theme: 'default',
      timezone: 'UTC',
      displayMode: 'detailed'
    };
  }
  
  // Get user preferences, loading from disk if needed
  async getPreferences(username) {
    // Return from cache if available
    if (this.userCache.has(username)) {
      return this.userCache.get(username);
    }
    
    try {
      // Try to load user preferences from disk
      const userPath = this.getUserPath(username);
      const data = await fs.readFile(userPath, 'utf8');
      const preferences = JSON.parse(data);
      
      // Cache the preferences
      this.userCache.set(username, preferences);
      return preferences;
    } catch (error) {
      // Return default preferences if not found
      return { ...this.defaultPreferences };
    }
  }
  
  // Save user preferences
  async savePreferences(username, preferences) {
    try {
      // Merge with defaults for any missing properties
      const mergedPreferences = {
        ...this.defaultPreferences,
        ...preferences
      };
      
      // Update cache
      this.userCache.set(username, mergedPreferences);
      
      // Save to disk
      const userPath = this.getUserPath(username);
      await fs.mkdir(path.dirname(userPath), { recursive: true });
      await fs.writeFile(userPath, JSON.stringify(mergedPreferences, null, 2));
      
      return true;
    } catch (error) {
      console.error(`Error saving preferences for ${username}:`, error);
      return false;
    }
  }
  
  // Update specific preference fields
  async updatePreferences(username, updates) {
    const currentPrefs = await this.getPreferences(username);
    const updatedPrefs = { ...currentPrefs, ...updates };
    return this.savePreferences(username, updatedPrefs);
  }
  
  // Reset user preferences to defaults
  async resetPreferences(username) {
    return this.savePreferences(username, { ...this.defaultPreferences });
  }
  
  // Get path for user preferences file
  getUserPath(username) {
    // Sanitize username for filesystem usage
    const sanitized = username.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storagePath, `${sanitized}.json`);
  }
  
  // Format a response based on user preferences
  async formatResponse(username, content) {
    const prefs = await this.getPreferences(username);
    
    // Apply display mode
    let formattedContent = content;
    if (prefs.displayMode === 'concise') {
      // Simplify content for concise mode
      formattedContent = this.simplifyContent(content);
    }
    
    // Add personalization if enabled
    if (prefs.personalizedGreeting) {
      const greeting = `Hi @${username}! `;
      formattedContent = greeting + formattedContent;
    }
    
    return formattedContent;
  }
  
  // Helper to simplify content for concise display mode
  simplifyContent(content) {
    // Remove extra whitespace and newlines
    let simplified = content.replace(/\n\s*\n/g, '\n');
    
    // Remove markdown headers if too verbose
    if (simplified.split('\n').filter(line => line.startsWith('#')).length > 2) {
      simplified = simplified.replace(/#+\s+/g, '**');
    }
    
    return simplified;
  }
  
  // Get all users with saved preferences
  async getAllUsers() {
    try {
      const files = await fs.readdir(this.storagePath);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => path.basename(file, '.json'));
    } catch (error) {
      return [];
    }
  }
}

module.exports = new UserPreferences();