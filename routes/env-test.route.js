const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

/**
 * @route GET /env-test
 * @description Show current environment configuration
 * @access Public
 */
router.get('/', (req, res) => {
  try {
    // Read the .env file directly
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.existsSync(envPath) 
      ? fs.readFileSync(envPath, 'utf8') 
      : '.env file not found';
    
    // Get environment variables
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '***' + process.env.GEMINI_API_KEY.slice(-4) : 'Not set',
      MONGO_URI: process.env.MONGO_URI ? '***' + process.env.MONGO_URI.split('@').pop() : 'Not set',
      JWT_SECRET: process.env.JWT_SECRET ? '***' + process.env.JWT_SECRET.slice(-4) : 'Not set',
      // Add other sensitive variables here with masking
    };

    // Get the current working directory and file paths
    const cwd = process.cwd();
    const envFilePath = path.join(cwd, '.env');
    
    return res.json({
      success: true,
      message: 'Environment test',
      nodeEnv: process.env.NODE_ENV,
      cwd,
      envFileExists: fs.existsSync(envFilePath),
      envFileContent: envContent.split('\n').map(line => line.split('=')[0] + '=***'),
      envVars,
      loadedEnv: process.env.LOADED_MOCHA_OPTS ? 'Mocha loaded' : 'Regular load'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error reading environment',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;
