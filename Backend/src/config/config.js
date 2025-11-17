// src/config/config.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from one level up (backend/.env)
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

// Log environment status in development
if (process.env.NODE_ENV === 'development') {
  console.log('Environment variables loaded.');

  const requiredVars = ['JWT_SECRET', 'MONGODB_URI'];
  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (missingVars.length > 0)
    console.error('Missing required environment variables:', missingVars.join(', '));
  else
    console.log('All essential configurations are set.');
}

// Export configuration
export default {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,   // exact match
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  frontendUrl: process.env.FRONTEND_URL,
  geminiApiKey: process.env.GEMINI_API_KEY,
  virusTotalApiKey: process.env.VIRUSTOTAL_API_KEY
};
