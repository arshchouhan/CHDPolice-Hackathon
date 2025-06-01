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

module.exports = {
  analyzeEmailWithGemini,
  extractUrlsFromEmail
};
