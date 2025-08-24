/**
 * Logger utility for consistent logging across the application
 */
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Get current log level from env or default to INFO
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;

// File stream for persistent logging
const logStream = fs.createWriteStream(
  path.join(logDir, `bot-${new Date().toISOString().split('T')[0]}.log`),
  { flags: 'a' }
);

/**
 * Format log entry with timestamp and level
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  let metaStr = '';
  
  if (Object.keys(meta).length > 0) {
    try {
      metaStr = JSON.stringify(meta);
    } catch (e) {
      metaStr = '[Circular or non-serializable data]';
    }
  }
  
  return `[${timestamp}] [${level}] ${message} ${metaStr}`.trim() + '\n';
}

/**
 * Write log to console and file
 */
function log(level, levelValue, message, meta = {}) {
  if (levelValue > currentLevel) return;
  
  const logEntry = formatLog(level, message, meta);
  
  // Log to console
  if (levelValue <= LOG_LEVELS.ERROR) {
    console.error(logEntry);
  } else if (levelValue === LOG_LEVELS.WARN) {
    console.warn(logEntry);
  } else {
    console.log(logEntry);
  }
  
  // Log to file
  logStream.write(logEntry);
}

module.exports = {
  error: (message, meta) => log('ERROR', LOG_LEVELS.ERROR, message, meta),
  warn: (message, meta) => log('WARN', LOG_LEVELS.WARN, message, meta),
  info: (message, meta) => log('INFO', LOG_LEVELS.INFO, message, meta),
  debug: (message, meta) => log('DEBUG', LOG_LEVELS.DEBUG, message, meta)
};