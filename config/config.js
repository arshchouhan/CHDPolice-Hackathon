const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Path to .env file
const envPath = path.resolve(__dirname, '..', '.env');

// Load .env file if it exists
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  
  // Set environment variables
  for (const key in envConfig) {
    if (!process.env[key]) {
      process.env[key] = envConfig[key];
    }
  }
}

// Log loaded environment variables for debugging
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '***' + process.env.GEMINI_API_KEY.slice(-4) : 'Not set',
  MONGO_URI: process.env.MONGO_URI ? '***' + process.env.MONGO_URI.split('@').pop() : 'Not set',
  JWT_SECRET: process.env.JWT_SECRET ? '***' + process.env.JWT_SECRET.slice(-4) : 'Not set'
});

// Export configuration
module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
  frontendUrl: process.env.FRONTEND_URL,
  geminiApiKey: process.env.GEMINI_API_KEY,
  virusTotalApiKey: process.env.VIRUSTOTAL_API_KEY
};
