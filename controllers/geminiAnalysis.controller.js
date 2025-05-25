/**
 * Gemini Analysis Controller
 * 
 * Handles API endpoints related to email analysis using Google's Gemini API
 */

const { analyzeEmailWithGemini, extractUrlsFromEmail } = require('../utils/gemini-analyzer');
const Email = require('../models/Email');
const UrlAnalysis = require('../models/UrlAnalysis');

/**
 * Analyze an email using Gemini API
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.analyzeEmail = async (req, res) => {
  try {
    const { emailId, emailContent, subject, sender } = req.body;

    if (!emailContent) {
      return res.status(400).json({
        success: false,
        message: 'Email content is required'
      });
    }

    // Extract URLs from email content
    const urls = extractUrlsFromEmail(emailContent);

    // Prepare email data for Gemini analysis
    const emailData = {
      subject: subject || 'No Subject',
      body: emailContent,
      sender: sender || 'unknown@sender.com',
      urls: urls
    };

    // Analyze email with Gemini API
    const analysisResult = await analyzeEmailWithGemini(emailData);

    // If emailId is provided, update the email record
    if (emailId) {
      await Email.findByIdAndUpdate(emailId, {
        geminiAnalysis: analysisResult,
        analysisComplete: true,
        riskScore: analysisResult.overallRiskScore
      });
    }

    // For each suspicious URL, create a URL analysis record
    if (analysisResult.urlAnalysis && analysisResult.urlAnalysis.length > 0) {
      const suspiciousUrls = analysisResult.urlAnalysis.filter(url => url.riskScore > 50);
      
      for (const urlData of suspiciousUrls) {
        // Check if URL already exists in database
        const existingUrl = await UrlAnalysis.findOne({ url: urlData.url });
        
        if (!existingUrl) {
          // Create new URL analysis record
          await UrlAnalysis.create({
            url: urlData.url,
            email_id: emailId,
            status: 'pending',
            riskScore: urlData.riskScore,
            reasons: urlData.reasons
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: analysisResult
    });

  } catch (error) {
    console.error('Error in Gemini analysis:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during email analysis'
    });
  }
};

/**
 * Get suspicious URLs from an email
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSuspiciousUrls = async (req, res) => {
  try {
    const { emailId } = req.params;

    if (!emailId) {
      return res.status(400).json({
        success: false,
        message: 'Email ID is required'
      });
    }

    // Find email by ID
    const email = await Email.findById(emailId);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    // Check if Gemini analysis exists
    if (!email.geminiAnalysis || !email.geminiAnalysis.urlAnalysis) {
      return res.status(404).json({
        success: false,
        message: 'No Gemini analysis found for this email'
      });
    }

    // Filter suspicious URLs (risk score > 50)
    const suspiciousUrls = email.geminiAnalysis.urlAnalysis.filter(url => url.riskScore > 50);

    return res.status(200).json({
      success: true,
      data: suspiciousUrls
    });

  } catch (error) {
    console.error('Error getting suspicious URLs:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while retrieving suspicious URLs'
    });
  }
};

/**
 * Submit suspicious URLs to sandbox for analysis
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.submitUrlsToSandbox = async (req, res) => {
  try {
    const { emailId } = req.params;

    if (!emailId) {
      return res.status(400).json({
        success: false,
        message: 'Email ID is required'
      });
    }

    // Find email by ID
    const email = await Email.findById(emailId);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    // Check if Gemini analysis exists
    if (!email.geminiAnalysis || !email.geminiAnalysis.urlAnalysis) {
      return res.status(404).json({
        success: false,
        message: 'No Gemini analysis found for this email'
      });
    }

    // Filter suspicious URLs (risk score > 50)
    const suspiciousUrls = email.geminiAnalysis.urlAnalysis.filter(url => url.riskScore > 50);

    // Submit each URL to sandbox
    const submittedUrls = [];
    for (const urlData of suspiciousUrls) {
      // Check if URL already exists in database
      const existingUrl = await UrlAnalysis.findOne({ url: urlData.url });
      
      if (existingUrl) {
        submittedUrls.push(existingUrl);
      } else {
        // Create new URL analysis record
        const newUrl = await UrlAnalysis.create({
          url: urlData.url,
          email_id: emailId,
          status: 'pending',
          riskScore: urlData.riskScore,
          reasons: urlData.reasons
        });
        
        submittedUrls.push(newUrl);
      }
    }

    return res.status(200).json({
      success: true,
      message: `${submittedUrls.length} URLs submitted to sandbox for analysis`,
      data: submittedUrls
    });

  } catch (error) {
    console.error('Error submitting URLs to sandbox:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while submitting URLs to sandbox'
    });
  }
};
