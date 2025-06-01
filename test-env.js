require('dotenv').config();

console.log('Environment Variables Test');
console.log('=========================');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'Not set'}`);
console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '***' + process.env.GEMINI_API_KEY.slice(-4) : 'Not set'}`);
console.log(`MONGO_URI: ${process.env.MONGO_URI ? '***' + process.env.MONGO_URI.split('@').pop() : 'Not set'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '***' + process.env.JWT_SECRET.slice(-4) : 'Not set'}`);

// Test dotenv loading
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
console.log(`\n.env file exists: ${fs.existsSync(envPath)}`);

if (fs.existsSync(envPath)) {
  console.log('\nContents of .env file (keys only):');
  const content = fs.readFileSync(envPath, 'utf8');
  console.log(content.split('\n').map(line => line.split('=')[0] + '=***').join('\n'));
}

console.log('\nEnvironment test complete.');
