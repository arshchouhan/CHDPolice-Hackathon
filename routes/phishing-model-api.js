/**
 * API Routes for Custom Phishing Detection Model
 * 
 * This module provides API endpoints for training and using the custom
 * phishing detection model instead of Gemini API.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const phishingModel = require('../utils/phishing-model');

// Configure multer for dataset upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `phishing-dataset-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

// Initialize the model when the server starts
phishingModel.initModel().then(loaded => {
  console.log(`Phishing detection model ${loaded ? 'loaded successfully' : 'needs training'}`);
});

/**
 * @route POST /api/phishing-model/train
 * @desc Train the phishing detection model with a Kaggle dataset
 * @access Admin only
 */
router.post('/train', authenticateToken, isAdmin, upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No dataset file provided' });
    }

    console.log(`Training model with dataset: ${req.file.path}`);
    
    // Start training in the background
    res.status(202).json({
      success: true,
      message: 'Model training started. This may take several minutes.',
      file: req.file.filename
    });
    
    // Train the model asynchronously
    try {
      await phishingModel.trainModel(req.file.path);
      console.log('Model training completed successfully');
    } catch (trainError) {
      console.error('Model training failed:', trainError);
    }
    
  } catch (error) {
    console.error('Error in model training endpoint:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/phishing-model/status
 * @desc Check if the model is trained and ready
 * @access Admin only
 */
router.get('/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const isLoaded = await phishingModel.initModel();
    res.json({
      success: true,
      isModelTrained: isLoaded,
      message: isLoaded ? 'Model is trained and ready' : 'Model needs training'
    });
  } catch (error) {
    console.error('Error checking model status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/phishing-model/analyze
 * @desc Analyze an email using the trained model
 * @access Authenticated users
 */
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const { subject, body, sender, urls } = req.body;
    
    if (!subject && !body) {
      return res.status(400).json({ success: false, message: 'Email content is required' });
    }
    
    // Prepare email data
    const emailData = {
      subject: subject || '',
      body: body || '',
      sender: sender || '',
      urls: urls || []
    };
    
    // If no URLs provided, extract them from the email content
    if (!emailData.urls || emailData.urls.length === 0) {
      emailData.urls = phishingModel.extractUrlsFromEmail(emailData.body);
    }
    
    // Analyze the email
    const analysisResult = await phishingModel.analyzeEmailWithModel(emailData);
    
    res.json({
      success: true,
      analysis: analysisResult
    });
    
  } catch (error) {
    console.error('Error analyzing email:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.toString()
    });
  }
});

module.exports = router;
