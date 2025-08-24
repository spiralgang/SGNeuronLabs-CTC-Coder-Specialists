// This script guides you through GitHub App setup
const readline = require('readline');
const open = require('open');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("GitHub App Setup Guide:");
console.log("1. Go to https://github.com/settings/apps/new");
console.log("2. Fill in the required fields:");
console.log("   - GitHub App name: your-git-chat-bot");
console.log("   - Homepage URL: https://github.com/yourusername");
console.log("   - Webhook URL: Can be updated later (use ngrok for development)");
console.log("3. Set permissions:");
console.log("   - Repository contents: Read & Write");
console.log("   - Issues: Read & Write");
console.log("   - Pull requests: Read & Write");
console.log("4. Subscribe to events:");
console.log("   - Issues");
console.log("   - Issue comment");
console.log("   - Pull request");
console.log("   - Push");
console.log("5. Create the app and note your App ID");

rl.question('Press Enter to open GitHub App creation page...', async () => {
  await open('https://github.com/settings/apps/new');
  rl.question('Enter your App ID: ', (appId) => {
    console.log(`App ID ${appId} saved.`);
    console.log("Next steps:");
    console.log("1. Generate a private key from the App settings");
    console.log("2. Install the app on your repositories");
    console.log("3. Copy the private key to your project directory");
    rl.close();
  });
});