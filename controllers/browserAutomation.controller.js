/**
 * Browser Automation Controller
 * Handles browser automation requests and results for URL analysis
 */

const mongoose = require('mongoose');
const Email = require('../models/Email');
const { URL } = require('url');

/**
 * Queue a URL for browser automation analysis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.queueUrl = async (req, res) => {
    try {
        const { url, emailId } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, message: 'URL is required' });
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (error) {
            return res.status(400).json({ success: false, message: 'Invalid URL format' });
        }

        // Create URL analysis record in MongoDB
        const urlAnalysis = await mongoose.connection.collection('url_analysis').insertOne({
            url,
            email_id: emailId,
            status: 'pending',
            created_at: new Date(),
            user_id: req.user._id
        });

        return res.status(200).json({
            success: true,
            message: 'URL queued for analysis',
            url_id: urlAnalysis.insertedId
        });
    } catch (error) {
        console.error('Error queueing URL for analysis:', error);
        return res.status(500).json({
            success: false,
            message: 'Error queueing URL for analysis',
            error: error.message
        });
    }
};

/**
 * Get URL analysis status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUrlStatus = async (req, res) => {
    try {
        const { urlId } = req.params;

        if (!urlId) {
            return res.status(400).json({ success: false, message: 'URL ID is required' });
        }

        // Find URL analysis record
        const urlAnalysis = await mongoose.connection.collection('url_analysis').findOne({
            _id: new mongoose.Types.ObjectId(urlId),
            user_id: req.user._id
        });

        if (!urlAnalysis) {
            return res.status(404).json({ success: false, message: 'URL analysis not found' });
        }

        return res.status(200).json({
            success: true,
            url_analysis: urlAnalysis
        });
    } catch (error) {
        console.error('Error getting URL analysis status:', error);
        return res.status(500).json({
            success: false,
            message: 'Error getting URL analysis status',
            error: error.message
        });
    }
};

/**
 * Receive browser automation results
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.receiveResults = async (req, res) => {
    try {
        const result = req.body;

        if (!result || !result.url || !result.url_id) {
            return res.status(400).json({ success: false, message: 'Invalid result data' });
        }

        // Update URL analysis record
        await mongoose.connection.collection('url_analysis').updateOne(
            { _id: new mongoose.Types.ObjectId(result.url_id) },
            {
                $set: {
                    status: 'completed',
                    completed_at: new Date(),
                    analysis_result: result
                }
            }
        );

        // If email_id is provided, update the email record with the analysis results
        if (result.email_id) {
            const email = await Email.findById(result.email_id);
            
            if (email) {
                // Initialize URL analysis array if it doesn't exist
                if (!email.urlAnalysis) {
                    email.urlAnalysis = [];
                }

                // Add or update URL analysis
                const urlIndex = email.urlAnalysis.findIndex(u => u.url === result.url);
                
                const urlAnalysisData = {
                    url: result.url,
                    domain: result.domain,
                    title: result.title,
                    meta_description: result.meta_description,
                    has_login_form: result.has_login_form,
                    has_password_field: result.has_password_field,
                    has_credit_card_form: result.has_credit_card_form,
                    attempted_download: result.attempted_download,
                    suspicious_indicators: result.suspicious_indicators,
                    risk_score: result.risk_score,
                    analyzed_at: new Date(),
                    screenshot_path: result.screenshot_path
                };

                if (urlIndex >= 0) {
                    email.urlAnalysis[urlIndex] = urlAnalysisData;
                } else {
                    email.urlAnalysis.push(urlAnalysisData);
                }

                // Update overall phishing risk based on URL analysis
                const maxUrlRiskScore = Math.max(...email.urlAnalysis.map(u => u.risk_score || 0));
                
                // Determine phishing risk level based on highest URL risk score
                let phishingRisk = 'Low';
                if (maxUrlRiskScore >= 80) {
                    phishingRisk = 'Critical';
                } else if (maxUrlRiskScore >= 60) {
                    phishingRisk = 'High';
                } else if (maxUrlRiskScore >= 40) {
                    phishingRisk = 'Medium';
                }

                email.phishingRisk = phishingRisk;
                email.phishingScore = Math.max(email.phishingScore || 0, maxUrlRiskScore);
                email.lastAnalyzed = new Date();

                await email.save();
            }
        }

        return res.status(200).json({
            success: true,
            message: 'URL analysis result received and processed'
        });
    } catch (error) {
        console.error('Error processing URL analysis result:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing URL analysis result',
            error: error.message
        });
    }
};

/**
 * Analyze URLs from an email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.analyzeEmailUrls = async (req, res) => {
    try {
        const { emailId } = req.params;

        if (!emailId) {
            return res.status(400).json({ success: false, message: 'Email ID is required' });
        }

        // Find email
        const email = await Email.findOne({
            _id: emailId,
            userId: req.user._id
        });

        if (!email) {
            return res.status(404).json({ success: false, message: 'Email not found' });
        }

        // Extract URLs from email content
        const urls = extractUrlsFromEmail(email);

        if (urls.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No URLs found in email',
                urls: []
            });
        }

        // Queue each URL for analysis
        const queuedUrls = [];
        for (const url of urls) {
            // Create URL analysis record
            const urlAnalysis = await mongoose.connection.collection('url_analysis').insertOne({
                url,
                email_id: email._id,
                status: 'pending',
                created_at: new Date(),
                user_id: req.user._id
            });

            queuedUrls.push({
                url,
                url_id: urlAnalysis.insertedId
            });
        }

        // Update email to show analysis in progress
        email.analysisStatus = 'in_progress';
        email.lastAnalysisAttempt = new Date();
        await email.save();

        return res.status(200).json({
            success: true,
            message: `Queued ${queuedUrls.length} URLs for analysis`,
            urls: queuedUrls
        });
    } catch (error) {
        console.error('Error analyzing email URLs:', error);
        return res.status(500).json({
            success: false,
            message: 'Error analyzing email URLs',
            error: error.message
        });
    }
};

/**
 * Extract URLs from email content
 * @param {Object} email - Email document
 * @returns {Array} - Array of URLs
 */
function extractUrlsFromEmail(email) {
    const urls = new Set();
    
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
    
    // Extract URLs from HTML content
    if (email.html) {
        const htmlMatches = email.html.match(urlRegex) || [];
        htmlMatches.forEach(url => urls.add(url));
    }
    
    // Extract URLs from text content
    if (email.textPlain) {
        const textMatches = email.textPlain.match(urlRegex) || [];
        textMatches.forEach(url => urls.add(url));
    }
    
    // Extract URLs from subject
    if (email.subject) {
        const subjectMatches = email.subject.match(urlRegex) || [];
        subjectMatches.forEach(url => urls.add(url));
    }
    
    return Array.from(urls);
}

/**
 * Get screenshot for a URL analysis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getScreenshot = async (req, res) => {
    try {
        const { urlId } = req.params;

        if (!urlId) {
            return res.status(400).json({ success: false, message: 'URL ID is required' });
        }

        // Find URL analysis record
        const urlAnalysis = await mongoose.connection.collection('url_analysis').findOne({
            _id: new mongoose.Types.ObjectId(urlId),
            user_id: req.user._id
        });

        if (!urlAnalysis || !urlAnalysis.analysis_result || !urlAnalysis.analysis_result.screenshot_path) {
            return res.status(404).json({ success: false, message: 'Screenshot not found' });
        }

        // Return screenshot path
        return res.status(200).json({
            success: true,
            screenshot_path: urlAnalysis.analysis_result.screenshot_path
        });
    } catch (error) {
        console.error('Error getting URL screenshot:', error);
        return res.status(500).json({
            success: false,
            message: 'Error getting URL screenshot',
            error: error.message
        });
    }
};
