const axios = require('axios');
const dns = require('dns');
const whois = require('whois-json');
const { promisify } = require('util');
const https = require('https');
const Email = require('../models/Email');
const User = require('../models/Users');

// Promisify DNS lookup
const dnsLookup = promisify(dns.lookup);

// Function to extract URLs from HTML content
const extractUrls = (htmlContent) => {
  if (!htmlContent) return [];
  
  // Regular expression to match URLs in HTML content
  // This regex handles URLs in href attributes, src attributes, and plain text
  const urlRegex = /(https?:\/\/[^\s"'<>]+)|(www\.[^\s"'<>]+)/g;
  
  // Extract all matches
  const matches = htmlContent.match(urlRegex) || [];
  
  // Filter out duplicates and normalize URLs
  const uniqueUrls = [...new Set(matches)].map(url => {
    // Add https:// prefix to www. URLs if missing
    if (url.startsWith('www.') && !url.startsWith('http')) {
      return `https://${url}`;
    }
    return url;
  });
  
  return uniqueUrls;
};

// Function to extract domain from URL
const extractDomain = (url) => {
  try {
    if (!url) return null;
    
    // Remove protocol and get domain
    let domain = url.replace(/^(https?:\/\/)?(www\.)?/, '');
    
    // Remove path and query parameters
    domain = domain.split('/')[0];
    
    // Remove port if present
    domain = domain.split(':')[0];
    
    return domain;
  } catch (error) {
    console.error('Error extracting domain:', error);
    return null;
  }
};

// Function to check if a URL is a known URL shortener
const isUrlShortener = (domain) => {
  if (!domain) return false;
  
  const shortenerDomains = [
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 
    'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'tiny.cc',
    'bl.ink', 'shorturl.at', 'rb.gy', 'tr.im', 'x.co'
  ];
  
  return shortenerDomains.includes(domain.toLowerCase());
};

// Function to expand shortened URLs
const expandShortenedUrl = async (url) => {
  try {
    // Make a HEAD request to get the final URL after redirects
    const response = await axios.head(url, {
      maxRedirects: 5,
      timeout: 5000,
      validateStatus: null
    });
    
    // If there's a 'location' header, that's the redirect target
    if (response.headers.location) {
      return response.headers.location;
    }
    
    // If axios followed redirects, the final URL will be in the request URL
    if (response.request && response.request.res && response.request.res.responseUrl) {
      return response.request.res.responseUrl;
    }
    
    return url; // Return original if no redirect found
  } catch (error) {
    console.error(`Error expanding URL ${url}:`, error.message);
    return url; // Return original URL on error
  }
};

// Function to check if a URL redirects to a different domain
const checkUrlRedirect = async (url) => {
  try {
    const originalDomain = extractDomain(url);
    
    // Make a HEAD request to follow redirects
    const response = await axios.head(url, {
      maxRedirects: 5,
      timeout: 5000,
      validateStatus: null
    });
    
    let finalUrl = url;
    
    // If there's a 'location' header, that's the redirect target
    if (response.headers.location) {
      finalUrl = response.headers.location;
    }
    
    // If axios followed redirects, the final URL will be in the request URL
    if (response.request && response.request.res && response.request.res.responseUrl) {
      finalUrl = response.request.res.responseUrl;
    }
    
    const finalDomain = extractDomain(finalUrl);
    
    // Check if the domain has changed
    return {
      originalUrl: url,
      finalUrl: finalUrl,
      redirects: originalDomain !== finalDomain,
      originalDomain,
      finalDomain
    };
  } catch (error) {
    console.error(`Error checking redirect for ${url}:`, error.message);
    return {
      originalUrl: url,
      finalUrl: url,
      redirects: false,
      originalDomain: extractDomain(url),
      finalDomain: extractDomain(url),
      error: error.message
    };
  }
};

// Function to check SSL certificate of a domain
const checkSslCertificate = async (domain) => {
  return new Promise((resolve) => {
    try {
      const options = {
        hostname: domain,
        port: 443,
        method: 'GET',
        path: '/',
        timeout: 5000,
        rejectUnauthorized: false, // We want to check invalid certs too
      };
      
      const req = https.request(options, (res) => {
        const cert = res.socket.getPeerCertificate();
        
        if (Object.keys(cert).length === 0) {
          resolve({
            valid: false,
            error: 'No certificate information available'
          });
          return;
        }
        
        const currentTime = new Date().getTime();
        const validFrom = new Date(cert.valid_from).getTime();
        const validTo = new Date(cert.valid_to).getTime();
        const isValid = currentTime >= validFrom && currentTime <= validTo;
        
        resolve({
          valid: isValid,
          issuer: cert.issuer,
          subject: cert.subject,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysRemaining: Math.floor((validTo - currentTime) / (1000 * 60 * 60 * 24))
        });
      });
      
      req.on('error', (error) => {
        resolve({
          valid: false,
          error: error.message
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({
          valid: false,
          error: 'Request timed out'
        });
      });
      
      req.end();
    } catch (error) {
      resolve({
        valid: false,
        error: error.message
      });
    }
  });
};

// Function to check domain age using WHOIS
const checkDomainAge = async (domain) => {
  try {
    const whoisData = await whois(domain);
    
    if (!whoisData || !whoisData.creationDate) {
      return {
        age: null,
        creationDate: null,
        error: 'No creation date found'
      };
    }
    
    const creationDate = new Date(whoisData.creationDate);
    const currentDate = new Date();
    const ageInDays = Math.floor((currentDate - creationDate) / (1000 * 60 * 60 * 24));
    
    return {
      age: ageInDays,
      creationDate: whoisData.creationDate,
      registrar: whoisData.registrar || 'Unknown'
    };
  } catch (error) {
    console.error(`Error checking domain age for ${domain}:`, error);
    return {
      age: null,
      creationDate: null,
      error: error.message
    };
  }
};

// Function to check domain reputation using VirusTotal API
const checkDomainReputation = async (domain, apiKey) => {
  if (!apiKey) {
    return {
      error: 'VirusTotal API key not provided'
    };
  }
  
  try {
    const response = await axios.get(`https://www.virustotal.com/api/v3/domains/${domain}`, {
      headers: {
        'x-apikey': apiKey
      },
      timeout: 10000
    });
    
    const data = response.data;
    
    // Extract relevant information from VirusTotal response
    return {
      reputation: data.data.attributes.reputation || 0,
      lastAnalysisStats: data.data.attributes.last_analysis_stats || {},
      categories: data.data.attributes.categories || {},
      totalVotes: data.data.attributes.total_votes || {},
      lastAnalysisResults: data.data.attributes.last_analysis_results || {}
    };
  } catch (error) {
    console.error(`Error checking domain reputation for ${domain}:`, error.message);
    return {
      error: error.message
    };
  }
};

// Function to parse email headers for detailed analysis
const parseEmailHeaders = (rawHeaders) => {
  try {
    let headers;
    
    if (typeof rawHeaders === 'string') {
      try {
        headers = JSON.parse(rawHeaders);
      } catch (e) {
        // If it's not valid JSON, assume it's a raw header string
        headers = rawHeaders.split('\n').map(line => {
          const [name, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          return { name, value };
        });
      }
    } else {
      headers = rawHeaders;
    }
    
    if (!Array.isArray(headers)) {
      throw new Error('Headers are not in expected format');
    }
    
    // Extract important headers
    const from = headers.find(h => h.name === 'From')?.value || '';
    const replyTo = headers.find(h => h.name === 'Reply-To')?.value || '';
    const returnPath = headers.find(h => h.name === 'Return-Path')?.value || '';
    const receivedHeaders = headers.filter(h => h.name === 'Received').map(h => h.value);
    const messageId = headers.find(h => h.name === 'Message-ID')?.value || '';
    const authenticationResults = headers.find(h => h.name === 'Authentication-Results')?.value || '';
    const spf = headers.find(h => h.name === 'Received-SPF')?.value || '';
    const dkim = headers.find(h => h.name === 'DKIM-Signature')?.value || '';
    
    // Check for header anomalies
    const anomalies = [];
    
    // Check if Reply-To doesn't match From
    if (replyTo && from && extractDomain(replyTo) !== extractDomain(from)) {
      anomalies.push({
        type: 'reply_to_mismatch',
        description: 'Reply-To domain does not match From domain',
        severity: 'high'
      });
    }
    
    // Check if Return-Path doesn't match From
    if (returnPath && from && extractDomain(returnPath) !== extractDomain(from)) {
      anomalies.push({
        type: 'return_path_mismatch',
        description: 'Return-Path domain does not match From domain',
        severity: 'medium'
      });
    }
    
    return {
      from,
      replyTo,
      returnPath,
      receivedHeaders,
      messageId,
      authenticationResults,
      spf,
      dkim,
      anomalies
    };
  } catch (error) {
    console.error('Error parsing email headers:', error);
    return {
      error: error.message,
      rawHeaders
    };
  }
};

// Main function to analyze an email
exports.analyzeEmail = async (req, res) => {
  try {
    const { emailId } = req.params;
    const userId = req.user.id;
    
    console.log(`Analyzing email ${emailId} for user ${userId}`);
    
    // Get VirusTotal API key from environment variables
    const virusTotalApiKey = process.env.VIRUSTOTAL_API_KEY;
    if (!virusTotalApiKey) {
      console.warn('VirusTotal API key not found in environment variables');
    }
    
    // Find the email in the database
    const email = await Email.findOne({ 
      _id: emailId,
      userId: userId
    });
    
    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }
    
    // Parse email headers
    const headerAnalysis = parseEmailHeaders(email.rawHeaders);
    
    // Extract URLs from email body
    const extractedUrls = extractUrls(email.body);
    
    // Process each URL
    const urlAnalysisPromises = extractedUrls.map(async (url) => {
      const domain = extractDomain(url);
      
      if (!domain) {
        return {
          url,
          error: 'Could not extract domain'
        };
      }
      
      // Check if it's a URL shortener
      const isShortener = isUrlShortener(domain);
      
      // Expand URL if it's a shortener
      let expandedUrl = url;
      let expandedDomain = domain;
      
      if (isShortener) {
        expandedUrl = await expandShortenedUrl(url);
        expandedDomain = extractDomain(expandedUrl);
      }
      
      // Check for redirects
      const redirectInfo = await checkUrlRedirect(url);
      
      // Check SSL certificate
      const sslInfo = await checkSslCertificate(domain);
      
      // Check domain age
      const domainAgeInfo = await checkDomainAge(domain);
      
      // Check domain reputation if API key is available
      let reputationInfo = { error: 'VirusTotal API key not provided' };
      if (virusTotalApiKey) {
        reputationInfo = await checkDomainReputation(domain, virusTotalApiKey);
      }
      
      // Calculate URL risk score
      let urlRiskScore = 0;
      
      // Factors that increase risk score:
      if (isShortener) urlRiskScore += 20;
      if (redirectInfo.redirects) urlRiskScore += 15;
      if (sslInfo.valid === false) urlRiskScore += 25;
      if (domainAgeInfo.age !== null && domainAgeInfo.age < 30) urlRiskScore += 20;
      if (reputationInfo.reputation && reputationInfo.reputation < 0) urlRiskScore += 25;
      if (reputationInfo.lastAnalysisStats && reputationInfo.lastAnalysisStats.malicious > 0) {
        urlRiskScore += reputationInfo.lastAnalysisStats.malicious * 5;
      }
      
      // Return comprehensive URL analysis
      return {
        url,
        domain,
        isUrlShortener: isShortener,
        expandedUrl: isShortener ? expandedUrl : null,
        expandedDomain: isShortener ? expandedDomain : null,
        redirectInfo,
        sslInfo,
        domainAgeInfo,
        reputationInfo,
        riskScore: urlRiskScore,
        riskLevel: urlRiskScore < 20 ? 'Low' : 
                   urlRiskScore < 40 ? 'Medium' : 
                   urlRiskScore < 60 ? 'High' : 'Critical'
      };
    });
    
    // Wait for all URL analyses to complete
    const urlAnalysisResults = await Promise.all(urlAnalysisPromises);
    
    // Calculate overall email risk score based on:
    // 1. Header anomalies
    // 2. URL analysis
    // 3. Existing scores from basic analysis
    
    let headerScore = headerAnalysis.anomalies.reduce((score, anomaly) => {
      if (anomaly.severity === 'high') return score + 25;
      if (anomaly.severity === 'medium') return score + 15;
      return score + 5;
    }, 0);
    
    // Calculate average URL risk score
    const urlScores = urlAnalysisResults.map(result => result.riskScore || 0);
    const avgUrlScore = urlScores.length > 0 
      ? urlScores.reduce((sum, score) => sum + score, 0) / urlScores.length 
      : 0;
    
    // Calculate total risk score
    const totalRiskScore = Math.min(100, Math.round(
      (headerScore * 0.3) +  // 30% weight to header analysis
      (avgUrlScore * 0.4) +  // 40% weight to URL analysis
      (email.scores.total * 0.3)  // 30% weight to existing analysis
    ));
    
    // Determine risk level
    const riskLevel = totalRiskScore < 30 ? 'Low' : 
                      totalRiskScore < 50 ? 'Medium' : 
                      totalRiskScore < 70 ? 'High' : 'Critical';
    
    // Update email with detailed analysis
    email.detailedAnalysis = {
      headerAnalysis,
      urlAnalysis: urlAnalysisResults,
      totalRiskScore,
      riskLevel,
      analyzedAt: new Date()
    };
    
    // Update email scores and risk level
    email.scores.total = totalRiskScore;
    email.phishingRisk = riskLevel;
    
    // Save updated email
    await email.save();
    
    // Return analysis results
    return res.status(200).json({
      success: true,
      message: 'Email analyzed successfully',
      emailId: email._id,
      analysis: {
        headerAnalysis,
        urlAnalysis: urlAnalysisResults,
        totalRiskScore,
        riskLevel
      }
    });
  } catch (error) {
    console.error('Error analyzing email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze email',
      error: error.message
    });
  }
};

// Analyze all emails for a user
exports.analyzeAllEmails = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Analyzing all emails for user ${userId}`);
    
    // Find all emails for the user
    const emails = await Email.find({ userId });
    
    if (emails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No emails found to analyze',
        count: 0
      });
    }
    
    // Start analysis in the background
    res.status(202).json({
      success: true,
      message: `Started analysis of ${emails.length} emails`,
      count: emails.length
    });
    
    // Process emails in batches to avoid overwhelming the system
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < emails.length; i += batchSize) {
      batches.push(emails.slice(i, i + batchSize));
    }
    
    // Process each batch sequentially
    for (const batch of batches) {
      await Promise.all(batch.map(async (email) => {
        try {
          // Use the existing analyze function
          await this.analyzeEmail({
            params: { emailId: email._id },
            user: { id: userId }
          }, {
            status: () => ({ json: () => {} }) // Mock response object
          });
        } catch (error) {
          console.error(`Error analyzing email ${email._id}:`, error);
        }
      }));
    }
    
    console.log(`Completed analysis of ${emails.length} emails for user ${userId}`);
  } catch (error) {
    console.error('Error analyzing all emails:', error);
    // Response already sent, so just log the error
  }
};

// Get analysis results for an email
exports.getAnalysisResults = async (req, res) => {
  try {
    const { emailId } = req.params;
    const userId = req.user.id;
    
    // Find the email in the database
    const email = await Email.findOne({ 
      _id: emailId,
      userId: userId
    });
    
    if (!email) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }
    
    // Check if detailed analysis exists
    if (!email.detailedAnalysis) {
      return res.status(404).json({
        success: false,
        message: 'No detailed analysis found for this email',
        emailId: email._id
      });
    }
    
    // Return analysis results
    return res.status(200).json({
      success: true,
      emailId: email._id,
      analysis: email.detailedAnalysis
    });
  } catch (error) {
    console.error('Error getting analysis results:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get analysis results',
      error: error.message
    });
  }
};
