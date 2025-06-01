require('dotenv').config();

console.log('Testing .env file loading');
console.log('=========================');

// Log all environment variables that start with GEMINI
console.log('Gemini-related environment variables:');
Object.entries(process.env).forEach(([key, value]) => {
  if (key.includes('GEMINI')) {
    console.log(`${key}: ${value ? '***' + value.slice(-4) : 'empty'}`);
  }
});

// Test if the key is accessible
console.log('\nTesting API key access:');
console.log(`GEMINI_API_KEY exists: ${!!process.env.GEMINI_API_KEY}`);
console.log(`GEMINI_API_KEY length: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0}`);

// Try to access the Gemini API
console.log('\nAttempting to initialize Gemini client...');
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  console.log('Successfully initialized Gemini client');
} catch (error) {
  console.error('Failed to initialize Gemini client:', error.message);
}
