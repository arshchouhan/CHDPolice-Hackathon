/**
 * Simplified Phishing Email Detection Model
 * 
 * This is a simplified version of the phishing detection model that doesn't
 * rely on external Python dependencies, making it more deployment-friendly.
 */

const fs = require('fs');
const path = require('path');

// Simple model that uses basic heuristics instead of machine learning
const phishingModel = {
  /**
   * Initializes the phishing detection model
   * Always returns true since this is a simplified version
   */
  initModel: async function() {
    console.log('Initializing simplified phishing detection model');
    return true;
  },

  /**
   * Mock training function that always succeeds
   * In a real implementation, this would train a machine learning model
   */
  trainModel: async function(datasetPath) {
    console.log(`Mock training with dataset: ${datasetPath}`);
    return true;
  },

  /**
   * Analyzes an email using basic heuristics to identify phishing attempts
   * 
   * @param {Object} emailData - The email data to analyze
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.body - Email body (text or HTML)
   * @param {string} emailData.sender - Email sender
   * @param {Array<string>} emailData.urls - URLs extracted from the email
   * @returns {Promise<Object>} Analysis results
   */
  analyzeEmailWithModel: async function(emailData) {
    try {
      // Extract features from the email
      const features = this.extractEmailFeatures(emailData);
      
      // Analyze URLs
      const urlAnalysis = emailData.urls.map(url => this.analyzeUrl(url));
      
      // Calculate overall risk score based on features and URL analysis
      let overallRiskScore = 0;
      const phishingIndicators = [];
      
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
      
      // Add URL risk to overall score
      const highRiskUrls = urlAnalysis.filter(u => u.riskScore > 50);
      if (highRiskUrls.length > 0) {
        overallRiskScore += 20;
        phishingIndicators.push(`Email contains ${highRiskUrls.length} suspicious URLs`);
      }
      
      // Cap the overall risk score at 100
      overallRiskScore = Math.min(Math.round(overallRiskScore), 100);
      
      // Generate summary
      const summary = this.generateSummary(overallRiskScore, phishingIndicators, urlAnalysis);
      
      return {
        overallRiskScore,
        phishingIndicators,
        urlAnalysis,
        summary,
        originalEmail: {
          subject: emailData.subject,
          sender: emailData.sender,
          urlCount: emailData.urls.length
        }
      };
    } catch (error) {
      console.error('Error analyzing email with model:', error);
      throw error;
    }
  },

  /**
   * Extracts features from an email for analysis
   * 
   * @param {Object} emailData - The email data
   * @returns {Object} Extracted features
   */
  extractEmailFeatures: function(emailData) {
    const { subject, body, sender } = emailData;
    
    // Convert HTML to text if needed
    const textBody = body.replace(/<[^>]*>/g, ' ');
    
    // Feature extraction
    return {
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
      bodyHasMisspellings: this.detectMisspellings(textBody),
      bodyHasUrgency: /urgent|immediate|alert|warning|attention|act now|limited time|expire|deadline/i.test(textBody)
    };
  },

  /**
   * Simple function to detect potential misspellings
   * 
   * @param {string} text - Text to check for misspellings
   * @returns {boolean} Whether misspellings were detected
   */
  detectMisspellings: function(text) {
    // This is a simplified approach - in production you'd use a proper dictionary
    const commonMisspellings = [
      'verifcation', 'verfiy', 'accaunt', 'acount', 'informtion', 'infromation',
      'securty', 'securiti', 'verfy', 'immediatly', 'urjent', 'urgant'
    ];
    
    return commonMisspellings.some(word => text.toLowerCase().includes(word));
  },

  /**
   * Analyzes a URL for phishing indicators
   * 
   * @param {string} url - URL to analyze
   * @returns {Object} URL risk analysis
   */
  analyzeUrl: function(url) {
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
  },

  /**
   * Generates a summary based on the analysis results
   * 
   * @param {number} overallRiskScore - Overall risk score
   * @param {Array<string>} phishingIndicators - Detected phishing indicators
   * @param {Array<Object>} urlAnalysis - URL analysis results
   * @returns {string} Summary of the analysis
   */
  generateSummary: function(overallRiskScore, phishingIndicators, urlAnalysis) {
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
  },

  /**
   * Extracts URLs from email content
   * 
   * @param {string} emailContent - The email content (text or HTML)
   * @returns {Array<string>} Array of URLs found in the email
   */
  extractUrlsFromEmail: function(emailContent) {
    // URL regex pattern
    const urlPattern = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    
    // Extract URLs
    const urls = emailContent.match(urlPattern) || [];
    
    // Return unique URLs
    return [...new Set(urls)];
  }
};

module.exports = phishingModel;
