/**
 * Custom Phishing Email Detection Model
 * 
 * This module provides functions to analyze emails using a machine learning model
 * trained on a Kaggle phishing email dataset instead of relying on Gemini API.
 */

const natural = require('natural');
const { TfIdf } = natural;
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Path to the trained model files
const MODEL_DIR = path.join(__dirname, '../models');
const FEATURE_WEIGHTS_PATH = path.join(MODEL_DIR, 'feature_weights.json');
const VECTORIZER_PATH = path.join(MODEL_DIR, 'vectorizer.json');

// Load the model if it exists, otherwise prepare for training
let model = {
  featureWeights: null,
  vectorizer: null,
  threshold: 0.5,
  isLoaded: false
};

/**
 * Initializes the phishing detection model
 * Loads the model if it exists, otherwise prepares for training
 */
async function initModel() {
  try {
    if (fs.existsSync(FEATURE_WEIGHTS_PATH) && fs.existsSync(VECTORIZER_PATH)) {
      // Load existing model
      model.featureWeights = JSON.parse(fs.readFileSync(FEATURE_WEIGHTS_PATH, 'utf8'));
      model.vectorizer = JSON.parse(fs.readFileSync(VECTORIZER_PATH, 'utf8'));
      model.isLoaded = true;
      console.log('Phishing detection model loaded successfully');
    } else {
      console.log('Model files not found. Model needs to be trained first.');
      model.isLoaded = false;
    }
    return model.isLoaded;
  } catch (error) {
    console.error('Error initializing phishing detection model:', error);
    model.isLoaded = false;
    return false;
  }
}

/**
 * Trains the phishing detection model using a Kaggle dataset
 * 
 * @param {string} datasetPath - Path to the Kaggle dataset
 * @returns {Promise<boolean>} - Whether training was successful
 */
async function trainModel(datasetPath) {
  try {
    console.log(`Training phishing detection model with dataset: ${datasetPath}`);
    
    // Create models directory if it doesn't exist
    if (!fs.existsSync(MODEL_DIR)) {
      fs.mkdirSync(MODEL_DIR, { recursive: true });
    }
    
    // Use Python script for more advanced ML capabilities
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [
        path.join(__dirname, '../scripts/train_phishing_model.py'),
        '--dataset', datasetPath,
        '--output', MODEL_DIR
      ]);
      
      let outputData = '';
      let errorData = '';
      
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
        console.log(`Training output: ${data}`);
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error(`Training error: ${data}`);
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Model training completed successfully');
          // Reload the model
          initModel().then(() => {
            resolve(true);
          });
        } else {
          console.error(`Model training failed with code ${code}: ${errorData}`);
          reject(new Error(`Training failed with code ${code}: ${errorData}`));
        }
      });
    });
  } catch (error) {
    console.error('Error training phishing detection model:', error);
    return false;
  }
}

/**
 * Analyzes an email using the trained model to identify phishing attempts
 * 
 * @param {Object} emailData - The email data to analyze
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.body - Email body (text or HTML)
 * @param {string} emailData.sender - Email sender
 * @param {Array<string>} emailData.urls - URLs extracted from the email
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeEmailWithModel(emailData) {
  if (!model.isLoaded) {
    await initModel();
    if (!model.isLoaded) {
      throw new Error('Phishing detection model is not loaded. Please train the model first.');
    }
  }

  try {
    // Extract features from the email
    const features = extractEmailFeatures(emailData);
    
    // Use JavaScript for simple analysis or call Python for more complex analysis
    const analysisResult = await callPythonAnalyzer(emailData, features);
    
    return analysisResult;
  } catch (error) {
    console.error('Error analyzing email with model:', error);
    throw error;
  }
}

/**
 * Calls the Python analyzer script for more advanced analysis
 * 
 * @param {Object} emailData - The email data
 * @param {Object} features - Extracted features
 * @returns {Promise<Object>} Analysis results
 */
async function callPythonAnalyzer(emailData, features) {
  return new Promise((resolve, reject) => {
    // Create a temporary file with the email data
    const tempDataPath = path.join(MODEL_DIR, 'temp_email_data.json');
    fs.writeFileSync(tempDataPath, JSON.stringify({
      emailData,
      features
    }));
    
    const pythonProcess = spawn('python', [
      path.join(__dirname, '../scripts/analyze_email.py'),
      '--input', tempDataPath,
      '--model', MODEL_DIR
    ]);
    
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`Analysis error: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      // Clean up temp file
      if (fs.existsSync(tempDataPath)) {
        fs.unlinkSync(tempDataPath);
      }
      
      if (code === 0) {
        try {
          const result = JSON.parse(outputData);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse analysis result: ${error.message}`));
        }
      } else {
        reject(new Error(`Analysis failed with code ${code}: ${errorData}`));
      }
    });
  });
}

/**
 * Performs a simple JavaScript-based analysis when Python is not available
 * 
 * @param {Object} emailData - The email data
 * @param {Object} features - Extracted features
 * @returns {Object} Analysis results
 */
function performJsAnalysis(emailData, features) {
  // Simple scoring based on extracted features
  let overallRiskScore = 0;
  const phishingIndicators = [];
  const urlAnalysis = [];
  
  // Check for common phishing indicators in subject
  if (features.subjectHasUrgency) {
    overallRiskScore += 15;
    phishingIndicators.push('Subject contains urgent language');
  }
  
  if (features.subjectHasFinancial) {
    overallRiskScore += 10;
    phishingIndicators.push('Subject contains financial terms');
  }
  
  // Check for phishing indicators in body
  if (features.bodyHasPersonalInfoRequest) {
    overallRiskScore += 25;
    phishingIndicators.push('Email requests personal information');
  }
  
  if (features.bodyHasMisspellings) {
    overallRiskScore += 15;
    phishingIndicators.push('Email contains misspellings or grammar errors');
  }
  
  if (features.bodyHasUrgency) {
    overallRiskScore += 15;
    phishingIndicators.push('Email contains urgent or threatening language');
  }
  
  // Analyze URLs
  emailData.urls.forEach(url => {
    const urlRisk = analyzeUrl(url);
    urlAnalysis.push(urlRisk);
    overallRiskScore += urlRisk.riskScore * 0.2; // Weight URL risk at 20% of its score
  });
  
  // Cap the overall risk score at 100
  overallRiskScore = Math.min(Math.round(overallRiskScore), 100);
  
  return {
    overallRiskScore,
    phishingIndicators,
    urlAnalysis,
    summary: generateSummary(overallRiskScore, phishingIndicators, urlAnalysis),
    originalEmail: {
      subject: emailData.subject,
      sender: emailData.sender,
      urlCount: emailData.urls.length
    }
  };
}

/**
 * Extracts features from an email for analysis
 * 
 * @param {Object} emailData - The email data
 * @returns {Object} Extracted features
 */
function extractEmailFeatures(emailData) {
  const { subject, body, sender, urls } = emailData;
  
  // Convert HTML to text if needed
  const textBody = body.replace(/<[^>]*>/g, ' ');
  
  // Feature extraction
  const features = {
    // Sender features
    senderDomain: sender.split('@')[1] || '',
    senderHasNumbers: /\d/.test(sender.split('@')[0]),
    
    // Subject features
    subjectLength: subject.length,
    subjectHasUrgency: /urgent|immediate|alert|warning|attention|important/i.test(subject),
    subjectHasFinancial: /account|bank|credit|payment|paypal|transaction|financial|money/i.test(subject),
    
    // Body features
    bodyLength: textBody.length,
    bodyHasPersonalInfoRequest: /password|credit card|social security|ssn|bank account|login|credentials/i.test(textBody),
    bodyHasMisspellings: detectMisspellings(textBody),
    bodyHasUrgency: /urgent|immediate|alert|warning|attention|act now|limited time|expire|deadline/i.test(textBody),
    
    // URL features
    urlCount: urls.length,
    urlsHaveIP: urls.some(url => /https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)),
    urlsHaveUncommonTLD: urls.some(url => {
      const domain = new URL(url).hostname;
      const tld = domain.split('.').pop();
      return ['xyz', 'tk', 'ml', 'ga', 'cf', 'gq', 'top', 'club'].includes(tld);
    }),
    urlsHaveSubdomains: urls.some(url => {
      const domain = new URL(url).hostname;
      return domain.split('.').length > 2;
    })
  };
  
  return features;
}

/**
 * Simple function to detect potential misspellings
 * In a real implementation, you would use a proper spell checker
 * 
 * @param {string} text - Text to check for misspellings
 * @returns {boolean} Whether misspellings were detected
 */
function detectMisspellings(text) {
  // This is a simplified approach - in production you'd use a proper dictionary
  const commonMisspellings = [
    'verifcation', 'verfiy', 'accaunt', 'acount', 'informtion', 'infromation',
    'securty', 'securiti', 'verfy', 'immediatly', 'urjent', 'urgant'
  ];
  
  return commonMisspellings.some(word => text.toLowerCase().includes(word));
}

/**
 * Analyzes a URL for phishing indicators
 * 
 * @param {string} url - URL to analyze
 * @returns {Object} URL risk analysis
 */
function analyzeUrl(url) {
  let riskScore = 0;
  const reasons = [];
  
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    
    // Check for IP address in domain
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
      riskScore += 25;
      reasons.push('URL uses IP address instead of domain name');
    }
    
    // Check for uncommon TLDs
    const tld = domain.split('.').pop();
    if (['xyz', 'tk', 'ml', 'ga', 'cf', 'gq', 'top', 'club'].includes(tld)) {
      riskScore += 15;
      reasons.push(`URL uses uncommon TLD (.${tld})`);
    }
    
    // Check for excessive subdomains
    const subdomainCount = domain.split('.').length - 2;
    if (subdomainCount > 2) {
      riskScore += 10;
      reasons.push(`URL has ${subdomainCount} subdomains`);
    }
    
    // Check for suspicious keywords in URL
    if (/secure|login|account|update|verify|password|bank|paypal|ebay|amazon/i.test(parsedUrl.pathname)) {
      riskScore += 15;
      reasons.push('URL contains sensitive keywords');
    }
    
    // Check for URL shorteners
    if (/bit\.ly|tinyurl\.com|goo\.gl|t\.co|is\.gd|cli\.gs|ow\.ly|buff\.ly/i.test(domain)) {
      riskScore += 20;
      reasons.push('URL uses a URL shortening service');
    }
    
    // Check for deceptive domains (simplified)
    const popularDomains = ['paypal.com', 'google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'facebook.com'];
    for (const popularDomain of popularDomains) {
      if (domain.includes(popularDomain.split('.')[0]) && domain !== popularDomain) {
        riskScore += 30;
        reasons.push(`URL may be impersonating ${popularDomain}`);
        break;
      }
    }
    
    // Cap the risk score at 100
    riskScore = Math.min(Math.round(riskScore), 100);
    
    // If no specific issues found but URL isn't a common domain, assign a base risk
    if (reasons.length === 0) {
      // List of common legitimate domains
      const commonDomains = ['google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'facebook.com', 
                            'github.com', 'linkedin.com', 'twitter.com', 'instagram.com', 'youtube.com'];
      
      if (!commonDomains.some(d => domain.endsWith(d))) {
        riskScore = 10;
        reasons.push('URL is not from a commonly recognized domain');
      }
    }
    
  } catch (error) {
    riskScore = 50;
    reasons.push('Invalid or malformed URL');
  }
  
  return {
    url,
    riskScore,
    reasons
  };
}

/**
 * Generates a summary based on the analysis results
 * 
 * @param {number} overallRiskScore - Overall risk score
 * @param {Array<string>} phishingIndicators - Detected phishing indicators
 * @param {Array<Object>} urlAnalysis - URL analysis results
 * @returns {string} Summary of the analysis
 */
function generateSummary(overallRiskScore, phishingIndicators, urlAnalysis) {
  let riskLevel;
  if (overallRiskScore < 30) {
    riskLevel = 'Low';
  } else if (overallRiskScore < 70) {
    riskLevel = 'Medium';
  } else {
    riskLevel = 'High';
  }
  
  let summary = `This email has a ${riskLevel.toLowerCase()} risk score of ${overallRiskScore}/100. `;
  
  if (phishingIndicators.length > 0) {
    summary += `Key concerns include: ${phishingIndicators.slice(0, 3).join(', ')}. `;
  }
  
  const highRiskUrls = urlAnalysis.filter(u => u.riskScore > 50);
  if (highRiskUrls.length > 0) {
    summary += `${highRiskUrls.length} high-risk URLs were identified. `;
  }
  
  if (riskLevel === 'High') {
    summary += 'Recommend treating this email with extreme caution.';
  } else if (riskLevel === 'Medium') {
    summary += 'Exercise caution when interacting with this email.';
  } else {
    summary += 'This email appears to be legitimate, but always verify sensitive requests.';
  }
  
  return summary;
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
  initModel,
  trainModel,
  analyzeEmailWithModel,
  extractUrlsFromEmail
};
