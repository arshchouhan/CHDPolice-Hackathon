/**
 * Gemini API Integration for Email Analysis
 * 
 * This module provides functions to analyze emails using Google's Gemini API
 * to identify suspicious URLs and potential phishing attempts.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Hardcoded Gemini API key
const GEMINI_API_KEY = 'AIzaSyDBQAr5Cn3meMcNVtF2Mj7ddGg2Erjz7Zk';

// Log API key usage (masked for security)
console.log('Using Gemini API Key:', '***' + GEMINI_API_KEY.slice(-4));

// Configuration for more consistent results
const generationConfig = {
  temperature: 0.1,     // Lower temperature for more deterministic results
  topP: 0.9,           // Controls diversity of responses
  topK: 1,             // Limits to most probable tokens
  maxOutputTokens: 2048
};

// Initialize the Gemini API with configuration
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash-001',
  generationConfig
});

console.log('Initialized Gemini model: gemini-2.0-flash-001 with generation config:', generationConfig);

/**
 * Analyzes an email using Gemini API to identify suspicious URLs and phishing indicators
 * 
 * @param {Object} emailData - The email data to analyze
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body - Email body (text or HTML)
 * @param {string} emailData.sender - Email sender
 * @param {Array<string>} emailData.urls - URLs extracted from the email
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeEmailWithGemini(emailData) {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API key is not set');
    throw new Error('Gemini API key is not configured');
  }

  try {
    console.log('Starting Gemini analysis with API key:', GEMINI_API_KEY ? '*** Key is set ***' : 'Key is missing!');
    
    // Prepare the prompt for Gemini
    const prompt = createAnalysisPrompt(emailData);
    
    // Generate content using the model
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the response
    return parseGeminiResponse({ candidates: [{ content: { parts: [{ text }] } }] }, emailData);
  } catch (error) {
    console.error('Error in analyzeEmailWithGemini:', error);
    throw error;
  }
}

/**
 * Creates a detailed prompt for Gemini to analyze an email
 * 
 * @param {Object} emailData - The email data
 * @returns {string} Formatted prompt for Gemini
 */
function createAnalysisPrompt(emailData) {
  return `
You are a senior cybersecurity analyst with expertise in email security. Your task is to thoroughly analyze this email for signs of phishing, scams, or other malicious intent.

EMAIL DETAILS:
From: ${emailData.sender}
Subject: ${emailData.subject}
Body:
${emailData.body}

${emailData.headers ? `Email Headers:
${typeof emailData.headers === 'string' ? emailData.headers : JSON.stringify(emailData.headers, null, 2)}
` : ''}

URLs found in email:
${emailData.urls.map((url, index) => `${index + 1}. ${url}`).join('\n')}

ANALYSIS INSTRUCTIONS:
1. Email Header Analysis (be thorough and critical):
   - Complete Email Routing Path Verification: Extract all "Received" headers and analyze the routing path
   - Server Reputation Checking: Check if any servers in the routing path are suspicious or blacklisted
   - Geographic Consistency Validation: Check if the email was routed through suspicious countries
   - Timestamp Sequence Verification: Check if timestamps in headers are in chronological order
   - Look for mismatches between Reply-To, Return-Path, and From headers
   - Check for spoofed sender domains and suspicious HELO/EHLO commands

2. URL Analysis (be thorough and critical):
   - Check for typosquatting (e.g., paypa1.com, micros0ft.com, g00gle.com)
   - Verify if domains are recently registered (check TLDs like .xyz, .top, .gq, .tk, .ml, .ga, .cf)
   - Look for suspicious subdomains (e.g., secure-paypal.com.login.verify.xyz)
   - Check for URL shorteners or redirects
   - Verify if the domain matches the claimed organization
   - Look for IP addresses instead of domain names
   - Check for HTTPS usage and certificate validity

3. Email Content Analysis:
   - Check for urgent or threatening language (e.g., "Your account will be suspended")
   - Look for poor grammar or spelling mistakes
   - Identify requests for sensitive information (passwords, SSN, credit card)
   - Verify if sender email matches the claimed organization
   - Check for generic greetings (e.g., "Dear Customer" instead of your name)
   - Look for mismatched links (text shows one URL but links elsewhere)
   - Check for suspicious attachments or requests to download files

4. Risk Assessment:
   - Assign a risk score (0-100) to each URL based on severity of findings
   - Calculate an overall risk score for the email
   - Be strict with financial institutions, government agencies, and tech companies
   - Consider the context and combination of multiple low-risk indicators

5. Response Format (MUST be valid JSON):
{
  "overallRiskScore": number,  // 0-100
  "isSuspicious": boolean,      // true if likely phishing/scam
  "headerAnalysis": {
    "score": number,  // 0-100
    "details": {
      "routingPath": {
        "score": number,  // 0-100
        "findings": [string],
        "suspicious": boolean
      },
      "serverReputation": {
        "score": number,  // 0-100
        "findings": [string],
        "suspicious": boolean
      },
      "geoConsistency": {
        "score": number,  // 0-100
        "findings": [string],
        "suspicious": boolean
      },
      "timestampSequence": {
        "score": number,  // 0-100
        "findings": [string],
        "suspicious": boolean
      }
    }
  },
  "phishingIndicators": [
    {
      "type": string,          // e.g., "suspicious_url", "urgent_language"
      "severity": "low"|"medium"|"high",
      "details": string,
      "confidence": number    // 0-100
    }
  ],
  "urlAnalysis": [
    {
      "url": string,
      "riskScore": number,    // 0-100
      "isSuspicious": boolean,
      "reasons": [string],
      "confidence": number    // 0-100
    }
  ],
  "summary": string,
  "recommendation": string   // e.g., "Block", "Quarantine", "Safe to deliver"
}

IMPORTANT:
- Be thorough and skeptical in your analysis
- Multiple low-severity indicators can add up to a high risk
- When in doubt, flag as suspicious
- Only return valid JSON with no additional text or markdown formatting
`;
}

/**
 * Parses the Gemini API response and extracts the analysis results
 * 
 * @param {Object} response - The Gemini API response
 * @param {Object} emailData - The original email data
 * @returns {Object} Parsed analysis results
 */
function parseGeminiResponse(response, emailData) {
  try {
    // Extract the text from the response
    const responseText = response.candidates[0].content.parts[0].text;
    
    // Clean and extract JSON (handle markdown code blocks or other formatting)
    let jsonString = responseText.trim();
    
    // Remove markdown code blocks if present
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\n|```$/g, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\n|```$/g, '');
    }
    
    // Parse the JSON
    const analysisResult = JSON.parse(jsonString);
    
    // Ensure required fields exist with defaults
    analysisResult.overallRiskScore = analysisResult.overallRiskScore || 0;
    analysisResult.isSuspicious = analysisResult.isSuspicious || false;
    analysisResult.phishingIndicators = analysisResult.phishingIndicators || [];
    analysisResult.urlAnalysis = analysisResult.urlAnalysis || [];
    
    // Process URL analysis to ensure consistent structure
    if (Array.isArray(analysisResult.urlAnalysis)) {
      analysisResult.urlAnalysis = analysisResult.urlAnalysis.map(urlInfo => ({
        url: urlInfo.url || '',
        riskScore: urlInfo.riskScore || 0,
        isSuspicious: urlInfo.isSuspicious || false,
        reasons: Array.isArray(urlInfo.reasons) ? urlInfo.reasons : [],
        confidence: typeof urlInfo.confidence === 'number' ? urlInfo.confidence : 80
      }));
    }
    
    // Add original email data for reference (without the full body for privacy)
    analysisResult.originalEmail = {
      subject: emailData.subject,
      sender: emailData.sender,
      urlCount: emailData.urls.length,
      hasBody: !!emailData.body
    };
    
    return analysisResult;
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    throw new Error('Failed to parse Gemini analysis results');
  }
}

/**
 * Extracts URLs from email content
 * 
 * @param {string} emailContent - The email content (text or HTML)
 * @returns {Array<string>} Array of URLs found in the email
 */
function extractUrlsFromEmail(emailContent) {
  // URL regex pattern
  const urlPattern = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  
  // Extract URLs
  const urls = emailContent.match(urlPattern) || [];
  
  // Return unique URLs
  return [...new Set(urls)];
}

module.exports = {
  analyzeEmailWithGemini,
  extractUrlsFromEmail
};
