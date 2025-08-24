// Authorization controls for sensitive operations
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class AuthorizationManager {
  constructor(configPath = './config/auth.json') {
    this.configPath = configPath;
    this.permissions = new Map();
    this.tokenCache = new Map();
    this.loadConfig();
  }
  
  async loadConfig() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(data);
      
      // Setup permission levels
      this.setupPermissions(config.permissions || {});
      
      // Setup user roles
      this.userRoles = config.userRoles || {};
      
      console.log('Authorization configuration loaded');
    } catch (error) {
      console.warn('Could not load authorization config, using defaults');
      this.setupDefaultPermissions();
      this.userRoles = {};
      
      // Create default config file
      this.saveConfig();
    }
  }
  
  setupPermissions(permissions) {
    // Clear existing permissions
    this.permissions.clear();
    
    // Set up permission levels from config or defaults
    Object.entries(permissions).forEach(([action, roles]) => {
      this.permissions.set(action, new Set(roles));
    });
  }
  
  setupDefaultPermissions() {
    // Default permissions hierarchy
    const defaultPerms = {
      'read': ['anonymous', 'user', 'contributor', 'maintainer', 'admin', 'owner'],
      'comment': ['user', 'contributor', 'maintainer', 'admin', 'owner'],
      'create_issue': ['user', 'contributor', 'maintainer', 'admin', 'owner'],
      'close_issue': ['contributor', 'maintainer', 'admin', 'owner'],
      'create_pr': ['contributor', 'maintainer', 'admin', 'owner'],
      'merge_pr': ['maintainer', 'admin', 'owner'],
      'manage_repo': ['admin', 'owner']
    };
    
    this.setupPermissions(defaultPerms);
  }
  
  async saveConfig() {
    try {
      const permissionsObj = {};
      for (const [action, roles] of this.permissions.entries()) {
        permissionsObj[action] = Array.from(roles);
      }
      
      const config = {
        permissions: permissionsObj,
        userRoles: this.userRoles
      };
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      
      // Write config file
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      console.log('Authorization configuration saved');
    } catch (error) {
      console.error('Error saving authorization config:', error);
    }
  }
  
  // Check if user has permission for an action
  hasPermission(username, action) {
    // Get user role, default to 'anonymous'
    const userRole = this.userRoles[username] || 'anonymous';
    
    // Check if the action exists in permissions
    if (!this.permissions.has(action)) {
      return false;
    }
    
    // Check if user role is allowed for this action
    return this.permissions.get(action).has(userRole);
  }
  
  // Generate temporary access token for sensitive operations
  generateToken(username, action, expiryMinutes = 10) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + (expiryMinutes * 60 * 1000);
    
    this.tokenCache.set(token, {
      username,
      action,
      expiry
    });
    
    // Clean expired tokens
    this.cleanExpiredTokens();
    
    return token;
  }
  
  // Verify a token is valid for an action
  verifyToken(token, username, action) {
    const tokenData = this.tokenCache.get(token);
    
    if (!tokenData) {
      return false;
    }
    
    if (tokenData.expiry < Date.now()) {
      this.tokenCache.delete(token);
      return false;
    }
    
    return tokenData.username === username && tokenData.action === action;
  }
  
  // Clean expired tokens
  cleanExpiredTokens() {
    const now = Date.now();
    for (const [token, data] of this.tokenCache.entries()) {
      if (data.expiry < now) {
        this.tokenCache.delete(token);
      }
    }
  }
  
  // Set role for a user
  async setUserRole(username, role) {
    this.userRoles[username] = role;
    await this.saveConfig();
  }
}

module.exports = new AuthorizationManager();