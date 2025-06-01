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

    // Initialize the Gemini API with configuration
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Configuration for more consistent results
    const generationConfig = {
      temperature: 0.1,     // Lower temperature for more deterministic results
      topP: 0.9,           // Controls diversity of responses
      topK: 1,             // Limits to most probable tokens
      maxOutputTokens: 2048
    };
    
    // Initialize the model with configuration
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-001',
      generationConfig
    });
    
    console.log('Initialized Gemini model: gemini-2.0-flash-001 with generation config:', generationConfig);
    let prompt = `You are a cybersecurity expert specializing in phishing detection. Analyze this URL carefully:

URL: ${url}

Instructions:
1. First, verify if this is a well-known legitimate website (e.g., google.com, microsoft.com, etc.)
2. Check for these PHISHING indicators:
   - Slight misspellings of popular domains (e.g., go0gle.com, micros0ft.com)
   - Suspicious subdomains (e.g., secure-paypal.com.login.verify.xyz)
   - Unusual TLDs for the brand (e.g., .xyz, .top, .gq for banking sites)
   - URLs with @ symbols or unusual characters
   - IP addresses instead of domain names
   - URLs that don't match the link text
   - Recently registered domains (if known)
   - Lack of HTTPS or invalid SSL certificates
   - Requests for sensitive information
   - Poor grammar/spelling on the page (if available)
   - Mismatched domain and content

3. Only flag as malicious if you find STRONG EVIDENCE of phishing or malicious intent.
4. Be lenient with well-known legitimate websites.

Return your analysis in this exact JSON format:
{
  "analysis": {
    "url": "${url}",
    "isLegitimate": boolean,  // true if confirmed legitimate
    "isSuspicious": boolean,  // true if potential phishing
    "confidence": 0-100,      // confidence in the assessment
    "riskLevel": "none"|"low"|"medium"|"high",
    "findings": [
      {
        "type": "string",  // e.g., "typosquatting", "suspicious_tld"
        "severity": 0-100,
        "details": "string"
      }
    ],
    "explanation": "string",
    "recommendations": ["string"]
  }
}

IMPORTANT: Only return the JSON object, no other text.`;

    // Add additional context if available
    if (networkData) {
      prompt += `\n\nAdditional network data: ${JSON.stringify(networkData)}`;
    }
    
    if (dnsData) {
      prompt += `\n\nAdditional DNS data: ${JSON.stringify(dnsData)}`;
    }

    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse the JSON response
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/s) || 
                       text.match(/\{[\s\S]*\}/s);
      
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      
      const jsonString = jsonMatch[1] || jsonMatch[0];
      const jsonResponse = JSON.parse(jsonString);
      
      // Validate the response structure
      if (!jsonResponse.analysis) {
        throw new Error('Invalid response format: missing analysis object');
      }
      
      const { analysis } = jsonResponse;
      
      // Map the response to the expected format
      const result = {
        isMalicious: analysis.isSuspicious && !analysis.isLegitimate,
        isLegitimate: analysis.isLegitimate === true,
        riskLevel: analysis.riskLevel || 'medium',
        confidence: analysis.confidence || 0,
        findings: Array.isArray(analysis.findings) ? 
          analysis.findings.map(f => ({
            type: f.type || 'unknown',
            message: f.details || 'No details',
            severity: typeof f.severity === 'number' ? f.severity : 50,
            details: f.details || 'No additional details'
          })) : [],
        explanation: analysis.explanation || '',
        recommendations: Array.isArray(analysis.recommendations) ? 
          analysis.recommendations : []
      };
      
      // Calculate overall risk score
      result.overallRiskScore = calculateRiskScore(analysis);
      
      console.log('URL analysis completed:', {
        url,
        isMalicious: result.isMalicious,
        isLegitimate: result.isLegitimate,
        riskLevel: result.riskLevel,
        confidence: result.confidence
      });
      
      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (jsonError) {
      console.error('Error parsing Gemini response as JSON:', jsonError);
      console.log('Raw Gemini response:', text);
      
      // Fallback: Create a generic finding
      const fallbackFindings = [{
        type: 'analysis_error',
        message: 'Analysis could not be completed',
        severity: 10,
        details: jsonError.message || 'Invalid response format from analysis service'
      }];
      
      return res.status(200).json({
        success: true,
        isMalicious: false,
        isLegitimate: true, // Assume legitimate on error to avoid false positives
        riskLevel: 'low',
        confidence: 0,
        findings: fallbackFindings,
        explanation: 'The URL could not be analyzed due to an error.',
        recommendations: ['Proceed with caution', 'Verify the URL manually'],
        overallRiskScore: 10
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

/**
 * Calculate risk score based on analysis results
 * @param {Object} analysis - The analysis object from Gemini
 * @returns {number} Risk score from 0-100
 */
function calculateRiskScore(analysis) {
  // If it's a legitimate site, return low risk
  if (analysis.isLegitimate === true) {
    return Math.min(10, analysis.confidence || 0);
  }
  
  // If we have findings, use them to calculate risk
  if (Array.isArray(analysis.findings) && analysis.findings.length > 0) {
    const totalSeverity = analysis.findings.reduce((sum, finding) => {
      return sum + (finding.severity || 0);
    }, 0);
    
    const avgSeverity = totalSeverity / analysis.findings.length;
    
    // Adjust based on confidence
    const confidenceFactor = (analysis.confidence || 50) / 100;
    return Math.min(100, Math.max(0, Math.round(avgSeverity * confidenceFactor)));
  }
  
  // Default to medium risk if we can't determine
  return 50;
}

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
