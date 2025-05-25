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
/**
 * Analyze a URL using Gemini AI
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.analyzeUrl = async (req, res) => {
  try {
    const { url, networkData, dnsData } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    // Initialize the Gemini API
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Prepare the prompt for URL analysis
    let prompt = `Analyze this URL for security threats: ${url}\n\n`;
    
    // Add network data if available
    if (networkData) {
      prompt += `Network traffic data: ${JSON.stringify(networkData)}\n\n`;
    }
    
    // Add DNS data if available
    if (dnsData) {
      prompt += `DNS analysis data: ${JSON.stringify(dnsData)}\n\n`;
    }
    
    prompt += `Please provide a detailed security analysis of this URL. Include the following:\n
1. Is this URL suspicious or malicious?\n
2. What is the risk level (low, medium, high)?\n
3. What specific threats or indicators of compromise are present?\n
4. Return the analysis in JSON format with the following structure:\n{
  "isMalicious": boolean,\n  "riskLevel": "low"|"medium"|"high",\n  "findings": [\n    {\n      "type": string,\n      "message": string,\n      "severity": number (0-100),\n      "details": string\n    }\n  ]\n}`;

    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse the JSON response
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                       text.match(/```\n([\s\S]*?)\n```/) || 
                       text.match(/{[\s\S]*}/);
      
      let jsonResponse;
      if (jsonMatch) {
        // If JSON is in a code block, extract it
        jsonResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        // Try to parse the whole response as JSON
        jsonResponse = JSON.parse(text);
      }
      
      // Format the findings to match our expected structure
      const formattedFindings = jsonResponse.findings.map(finding => ({
        type: finding.type || 'unknown',
        message: finding.message || 'Unknown issue detected',
        severity: finding.severity || 50,
        details: finding.details || ''
      }));
      
      // Calculate overall risk score based on findings
      const overallRiskScore = Math.min(
        100,
        formattedFindings.reduce((score, finding) => score + finding.severity, 0) / formattedFindings.length
      );
      
      return res.status(200).json({
        success: true,
        isMalicious: jsonResponse.isMalicious,
        riskLevel: jsonResponse.riskLevel,
        findings: formattedFindings,
        overallRiskScore
      });
    } catch (jsonError) {
      console.error('Error parsing Gemini response as JSON:', jsonError);
      console.log('Raw Gemini response:', text);
      
      // Fallback: Create a generic finding
      const fallbackFindings = [{
        type: 'gemini_analysis',
        message: 'URL analysis completed but response format was unexpected',
        severity: 50,
        details: text.substring(0, 500) // Include part of the raw response
      }];
      
      return res.status(200).json({
        success: true,
        isMalicious: text.toLowerCase().includes('malicious') || text.toLowerCase().includes('suspicious'),
        riskLevel: 'medium',
        findings: fallbackFindings,
        overallRiskScore: 50
      });
    }
  } catch (error) {
    console.error('Error analyzing URL with Gemini:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during URL analysis'
    });
  }
};

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
