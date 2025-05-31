// This file is required for Vercel serverless functions
const startServer = require('../server');

// Initialize the server when this module is loaded
const serverPromise = startServer().catch(err => {
  console.error('Failed to initialize server:', err);
  // Don't throw here to allow for potential recovery
});

// Export the serverless function handler
module.exports = async (req, res) => {
  try {
    // Get the app instance, which will be initialized if not already
    const app = await serverPromise;
    
    // If we couldn't initialize the server, return an error
    if (!app) {
      console.error('Server initialization failed');
      return res.status(500).json({ 
        error: 'Server initialization failed',
        timestamp: new Date().toISOString()
      });
    }
    
    // Handle the request
    return app(req, res);
  } catch (error) {
    console.error('Error handling request:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      message: error.message
    });
  }
};
