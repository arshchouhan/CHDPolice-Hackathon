const express = require('express');
const router = express.Router();

/**
 * @route GET /test/gemini-status
 * @description Check if Gemini API key is properly configured
 * @access Public
 */
router.get('/gemini-status', (req, res) => {
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  const keyPreview = hasApiKey 
    ? `${process.env.GEMINI_API_KEY.substring(0, 5)}...${process.env.GEMINI_API_KEY.substring(process.env.GEMINI_API_KEY.length - 5)}`
    : 'Not set';
  
  return res.json({
    success: true,
    hasApiKey,
    keyPreview,
    message: hasApiKey 
      ? 'Gemini API key is configured' 
      : 'Gemini API key is not set in environment variables',
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
