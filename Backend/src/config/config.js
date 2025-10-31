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

// Log loaded environment variables for debugging (sensitive values are hidden)
if (process.env.NODE_ENV !== 'test') {
  console.log('Environment variables loaded.');
  
  // Only check for essential variables
  const requiredVars = ['JWT_SECRET', 'MONGO_URI'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '));
  } else {
    console.log('Essential configurations are set.');
  }
  
  // Check if Google OAuth is configured (informational only, not required)
  const hasGoogleAuth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI;
  console.log(`Google OAuth: ${hasGoogleAuth ? 'Configured' : 'Not configured'}`);
}

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
