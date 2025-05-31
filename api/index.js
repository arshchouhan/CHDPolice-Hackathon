// This file is required for Vercel serverless functions
const startServer = require('../server');

// Export the serverless function handler
module.exports = async (req, res) => {
  try {
    const app = await startServer();
    return app(req, res);
  } catch (error) {
    console.error('Error starting server:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
