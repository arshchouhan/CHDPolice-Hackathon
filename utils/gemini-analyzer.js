/**
 * Gemini API Integration for Email Analysis
 * 
 * This module provides functions to analyze emails using Google's Gemini API
 * to identify suspicious URLs and potential phishing attempts.
 */

const axios = require('axios');
require('dotenv').config();

// Get Gemini API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent';

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
    console.error('Gemini API key not found. Using local analysis instead.');
    return performLocalAnalysis(emailData);
  }

  try {
    // Prepare the prompt for Gemini
    const prompt = createAnalysisPrompt(emailData);
    
    console.log('Sending request to Gemini API...');
    console.log(`API URL: ${GEMINI_API_URL}`);
    console.log('API Key exists:', !!GEMINI_API_KEY);
    
    // Call Gemini API with timeout and better error handling
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('Gemini API response received');
    
    // Parse the response
    const analysisResult = parseGeminiResponse(response.data, emailData);
    return analysisResult;

  } catch (error) {
    console.error('Error analyzing email with Gemini:', error);
    console.error('Error details:', error.response ? error.response.data : 'No response data');
    console.error('Status code:', error.response ? error.response.status : 'No status code');
    
    // Fall back to local analysis
    console.log('Falling back to local analysis...');
    return performLocalAnalysis(emailData);
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
You are a cybersecurity expert specializing in email phishing detection. Analyze this email for phishing indicators and suspicious URLs.

EMAIL DETAILS:
From: ${emailData.sender}
Subject: ${emailData.subject}
Body:
${emailData.body}

URLs found in email:
${emailData.urls.map((url, index) => `${index + 1}. ${url}`).join('\n')}

ANALYSIS INSTRUCTIONS:
1. Identify any suspicious URLs based on:
   - Domain age, reputation, or unusual TLDs (.xyz, .tk, etc.)
   - Misspellings or lookalike domains (e.g., paypa1.com vs paypal.com)
   - Unusual subdomains or path structures
   - URL shorteners or redirects

2. Analyze the email content for phishing indicators:
   - Urgency or threatening language
   - Grammar/spelling errors
   - Requests for personal information
   - Mismatched sender domains
   - Generic greetings

3. Assign a risk score (0-100) to each URL and the overall email

4. Format your response as JSON with the following structure:
{
  "overallRiskScore": number,
  "phishingIndicators": [string],
  "urlAnalysis": [
    {
      "url": string,
      "riskScore": number,
      "reasons": [string]
    }
  ],
  "summary": string
}

Provide ONLY the JSON response with no additional text.
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
    
    // Find the JSON part in the response (Gemini might include additional text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Gemini response');
    }
    
    // Parse the JSON
    const analysisResult = JSON.parse(jsonMatch[0]);
    
    // Add original email data for reference
    analysisResult.originalEmail = {
      subject: emailData.subject,
      sender: emailData.sender,
      urlCount: emailData.urls.length
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

/**
 * Performs a local analysis of the email when Gemini API is unavailable
 * 
 * @param {Object} emailData - The email data to analyze
 * @returns {Object} Analysis results
 */
function performLocalAnalysis(emailData) {
  console.log('Performing local email analysis...');
  
  // Basic risk indicators
  const suspiciousTerms = [
    'urgent', 'password', 'account', 'verify', 'bank', 'click', 'confirm',
    'update', 'security', 'suspicious', 'unusual', 'login', 'access',
    'important', 'attention', 'immediately', 'required', 'action needed'
  ];
  
  // Count suspicious terms in subject and body
  const lowerSubject = emailData.subject.toLowerCase();
  const lowerBody = emailData.body.toLowerCase();
  
  let termCount = 0;
  const foundTerms = [];
  
  suspiciousTerms.forEach(term => {
    if (lowerSubject.includes(term) || lowerBody.includes(term)) {
      termCount++;
      foundTerms.push(term);
    }
  });
  
  // Calculate basic risk score based on suspicious terms
  const termScore = Math.min(100, (termCount / suspiciousTerms.length) * 100);
  
  // Analyze URLs
  const urlAnalysis = emailData.urls.map(url => {
    // Basic URL risk assessment
    let urlRisk = 0;
    const reasons = [];
    
    // Check for suspicious TLDs
    const suspiciousTlds = ['.xyz', '.tk', '.top', '.club', '.online', '.site'];
    if (suspiciousTlds.some(tld => url.endsWith(tld))) {
      urlRisk += 20;
      reasons.push('Suspicious top-level domain');
    }
    
    // Check for numeric domains
    if (/https?:\/\/\d+\.\d+\.\d+\.\d+/.test(url)) {
      urlRisk += 15;
      reasons.push('IP address used in URL instead of domain name');
    }
    
    // Check for long URLs (potential obfuscation)
    if (url.length > 100) {
      urlRisk += 10;
      reasons.push('Unusually long URL');
    }
    
    // Check for URL shorteners
    const shorteners = ['bit.ly', 'tinyurl', 'goo.gl', 't.co', 'is.gd', 'cli.gs', 'ow.ly'];
    if (shorteners.some(shortener => url.includes(shortener))) {
      urlRisk += 25;
      reasons.push('URL shortener detected');
    }
    
    return {
      url,
      riskScore: Math.min(100, urlRisk),
      reasons: reasons.length > 0 ? reasons : ['No obvious risk indicators']
    };
  });
  
  // Calculate overall risk (weighted average: 40% terms, 60% URLs)
  const urlRiskAvg = urlAnalysis.length > 0 
    ? urlAnalysis.reduce((sum, url) => sum + url.riskScore, 0) / urlAnalysis.length 
    : 0;
  
  const overallRiskScore = Math.round((termScore * 0.4) + (urlRiskAvg * 0.6));
  
  return {
    overallRiskScore,
    phishingIndicators: foundTerms.length > 0 
      ? foundTerms.map(term => `Contains suspicious term: ${term}`) 
      : ['No obvious phishing indicators'],
    urlAnalysis,
    summary: `Local analysis detected ${urlAnalysis.length} URLs and ${foundTerms.length} suspicious terms.`,
    analysisMethod: 'local' // Indicate this was analyzed locally, not with Gemini
  };
}

module.exports = {
  analyzeEmailWithGemini,
  extractUrlsFromEmail
};
