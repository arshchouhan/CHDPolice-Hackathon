/**
 * Gemini API Integration for Email Analysis
 * 
 * This module provides functions to analyze emails using Google's Gemini API
 * to identify suspicious URLs and potential phishing attempts.
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Get Gemini API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize the Google Generative AI client
let genAI;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('Gemini API client initialized with key');
} else {
  console.error('GEMINI_API_KEY not found in environment variables');
}

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
  if (!GEMINI_API_KEY || !genAI) {
    console.error('Gemini API key not found or client not initialized. Using local analysis instead.');
    return performLocalAnalysis(emailData);
  }

  try {
    // Prepare the prompt for Gemini
    const prompt = createAnalysisPrompt(emailData);
    
    console.log('Initializing Gemini model...');
    // Get the gemini-pro model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    console.log('Sending request to Gemini API...');
    // Generate content using the official client library with fixed parameters for consistency
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.0,  // Set to 0 for maximum determinism
        topK: 1,           // Most likely token only
        topP: 1.0,         // No sampling
        maxOutputTokens: 1024 // Reduced token count for simpler responses
      }
    });
    
    console.log('Gemini API response received');
    const response = result.response;
    
    // Get the text from the response
    const responseText = response.text();
    console.log('Response text length:', responseText.length);
    
    // Parse the response text to extract JSON
    const analysisResult = parseGeminiResponseText(responseText, emailData);
    return analysisResult;

  } catch (error) {
    console.error('Error analyzing email with Gemini:', error);
    console.error('Error message:', error.message);
    
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
You are a cybersecurity expert specializing in email phishing detection. Provide a simple analysis of this email.

EMAIL DETAILS:
From: ${emailData.sender}
Subject: ${emailData.subject}
Body:
${emailData.body}

URLs found in email:
${emailData.urls.map((url, index) => `${index + 1}. ${url}`).join('\n')}

ANALYSIS INSTRUCTIONS:
1. Perform a basic check for suspicious URLs based only on:
   - Unusual TLDs (.xyz, .tk, etc.)
   - URL shorteners or redirects
   - IP addresses instead of domain names

2. Check the email content only for:
   - Urgency language
   - Requests for personal information
   - Generic greetings

3. Assign a simple risk score (0-100) to the overall email

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

Provide ONLY the JSON response with no additional text. Keep your analysis simple and consistent.
`;
}

/**
 * Parses the Gemini API response text and extracts the analysis results
 * 
 * @param {string} responseText - The text response from Gemini API
 * @param {Object} emailData - The original email data
 * @returns {Object} Parsed analysis results
 */
function parseGeminiResponseText(responseText, emailData) {
  try {
    console.log('Parsing Gemini response text...');
    
    // Find the JSON part in the response (Gemini might include additional text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Could not extract JSON from Gemini response');
      console.log('Response text sample:', responseText.substring(0, 200));
      throw new Error('Could not extract JSON from Gemini response');
    }
    
    // Parse the JSON
    const jsonText = jsonMatch[0];
    console.log('Extracted JSON text length:', jsonText.length);
    
    const analysisResult = JSON.parse(jsonText);
    
    // Add original email data for reference
    analysisResult.originalEmail = {
      subject: emailData.subject,
      sender: emailData.sender,
      urlCount: emailData.urls.length
    };
    
    // Add analysis method
    analysisResult.analysisMethod = 'gemini';
    
    return analysisResult;
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    throw new Error('Failed to parse Gemini analysis results: ' + error.message);
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use parseGeminiResponseText instead
 */
function parseGeminiResponse(response, emailData) {
  try {
    // Extract the text from the response
    const responseText = response.candidates[0].content.parts[0].text;
    return parseGeminiResponseText(responseText, emailData);
  } catch (error) {
    console.error('Error in legacy parseGeminiResponse:', error);
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
  console.log('Performing simplified local email analysis...');
  
  // Reduced list of suspicious terms for simplicity
  const suspiciousTerms = [
    'urgent', 'password', 'verify', 'bank', 'confirm',
    'security', 'login', 'immediately', 'required'
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
  
  // Simplified risk score calculation
  const termScore = Math.min(100, (termCount / suspiciousTerms.length) * 100);
  
  // Analyze URLs with simplified checks
  const urlAnalysis = emailData.urls.map(url => {
    // Basic URL risk assessment
    let urlRisk = 0;
    const reasons = [];
    
    // Check for suspicious TLDs - simplified list
    const suspiciousTlds = ['.xyz', '.tk', '.top'];
    if (suspiciousTlds.some(tld => url.endsWith(tld))) {
      urlRisk += 30;
      reasons.push('Suspicious domain');
    }
    
    // Check for numeric domains
    if (/https?:\/\/\d+\.\d+\.\d+\.\d+/.test(url)) {
      urlRisk += 30;
      reasons.push('IP address used instead of domain name');
    }
    
    // Check for URL shorteners - simplified list
    const shorteners = ['bit.ly', 'tinyurl', 'goo.gl'];
    if (shorteners.some(shortener => url.includes(shortener))) {
      urlRisk += 30;
      reasons.push('URL shortener detected');
    }
    
    return {
      url,
      riskScore: Math.min(100, urlRisk),
      reasons: reasons.length > 0 ? reasons : ['No obvious risk indicators']
    };
  });
  
  // Simplified risk calculation - equal weighting
  const urlRiskAvg = urlAnalysis.length > 0 
    ? urlAnalysis.reduce((sum, url) => sum + url.riskScore, 0) / urlAnalysis.length 
    : 0;
  
  const overallRiskScore = Math.round((termScore * 0.5) + (urlRiskAvg * 0.5));
  
  return {
    overallRiskScore,
    phishingIndicators: foundTerms.length > 0 
      ? foundTerms.map(term => `Contains term: ${term}`) 
      : ['No obvious phishing indicators'],
    urlAnalysis,
    summary: `Simple analysis found ${urlAnalysis.length} URLs and ${foundTerms.length} suspicious terms.`,
    analysisMethod: 'local'
  };
}

// Export functions for CommonJS environments
module.exports = {
  analyzeEmailWithGemini,
  extractUrlsFromEmail,
  performLocalAnalysis
};

// Make functions available in the global scope for browser environments
if (typeof window !== 'undefined') {
  window.analyzeEmailWithGemini = analyzeEmailWithGemini;
  window.extractUrlsFromEmail = extractUrlsFromEmail;
  window.performLocalAnalysis = performLocalAnalysis;
}
