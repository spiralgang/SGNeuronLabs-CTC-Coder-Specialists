// Setup script for Git Chat Bot
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Git Chat Bot Setup Wizard");
console.log("=========================\n");

async function setupBot() {
  // Create project structure
  const dirs = ['config', 'logs'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
      console.log(`Created directory: ${dir}`);
    }
  });
  
  // Create .env file if it doesn't exist
  if (!fs.existsSync('.env')) {
    const appId = await question('Enter your GitHub App ID: ');
    const webhookSecret = await question('Enter your Webhook Secret: ');
    const privateKeyPath = await question('Enter path to your private key file (default: ./private-key.pem): ') || './private-key.pem';
    
    const envContent = `APP_ID=${appId}
PRIVATE_KEY_PATH=${privateKeyPath}
WEBHOOK_SECRET=${webhookSecret}
PORT=3000`;
    
    fs.writeFileSync('.env', envContent);
    console.log('Created .env file with your configuration');
  } else {
    console.log('.env file already exists, skipping');
  }
  
  // Create package.json if it doesn't exist
  if (!fs.existsSync('package.json')) {
    const packageJson = {
      "name": "git-chat-bot",
      "version": "1.0.0",
      "description": "A GitHub chat bot for repository interactions",
      "main": "git-chat-bot.js",
      "scripts": {
        "start": "node git-chat-bot.js",
        "dev": "nodemon git-chat-bot.js"
      },
      "dependencies": {
        "@octokit/app": "^13.1.2",
        "@octokit/webhooks": "^10.9.1",
        "dotenv": "^16.0.3",
        "nodemon": "^2.0.22"
      },
      "engines": {
        "node": ">=14"
      },
      "license": "MIT"
    };
    
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    console.log('Created package.json');
  } else {
    console.log('package.json already exists, skipping');
  }
  
  console.log('\nSetup complete!');
  console.log('\nNext steps:');
  console.log('1. Run `npm install` to install dependencies');
  console.log('2. Ensure your private key is in the correct location');
  console.log('3. Start your bot with `npm start`');
  console.log('4. For local development, use ngrok to expose your local server');
  
  rl.close();
}

function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

setupBot();