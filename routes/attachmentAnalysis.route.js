const express = require('express');
const router = express.Router();
const AttachmentAnalyzer = require('../controllers/attachmentAnalysis.controller');
const authenticateUser = require('../middlewares/auth.middleware');

// Route to analyze a specific attachment
router.post('/analyze/:emailId/:attachmentId', authenticateUser, AttachmentAnalyzer.analyzeAttachment);

module.exports = router;
