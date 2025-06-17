const { google } = require('googleapis');
const mongoose = require('mongoose');
const User = require('../models/Users');
const Email = require('../models/Email');
const logger = require('../utils/logger');

// Create OAuth2 client with proper redirect URI
const getRedirectUri = () => {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.PRODUCTION_URL || 'https://email-detection-api.onrender.com'
    : process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/gmail/callback`;
};

// Create a function to get a fresh OAuth2 client
const getOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
};

// Initialize default OAuth2 client
const oauth2Client = getOAuth2Client();

// Validate OAuth configuration
const validateOAuthConfig = () => {
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

// Generate Gmail OAuth URL
exports.getAuthUrl = (req, res) => {
  try {
    validateOAuthConfig();

    if (!req.user || !req.user.id) {
      logger.error('User not authenticated for Gmail auth');
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
    const state = req.user.id; // Just use user ID as state
    
    // Log the OAuth configuration for debugging
    logger.info('OAuth Configuration:', {
      clientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
      redirectUri: process.env.REDIRECT_URI,
      state: state
    });

    // Get a fresh OAuth2 client for this request
    const client = getOAuth2Client();
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state, // Just the user ID
      include_granted_scopes: true
    });

    logger.info(`Generated Gmail auth URL for user ${req.user.id}`);
    res.json({ 
      success: true,
      authUrl,
      redirectUri: process.env.REDIRECT_URI
    });

  } catch (error) {
    logger.error('Error generating auth URL:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate authentication URL',
      error: error.message
    });
  }
};

// Handle OAuth callback
exports.handleCallback = async (req, res) => {
  try {
    validateOAuthConfig();

    const { code, state } = req.query;
    
    if (!code || !state) {
      logger.error('Missing code or state in callback');
      return res.status(400).json({
        success: false,
        message: 'Invalid callback parameters',
        error: 'Missing required parameters'
      });
    }

    // Get user ID from state parameter
    const userId = state;
    const user = await User.findById(userId);

    if (!user) {
      logger.error(`User not found for ID: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found',
        error: 'Invalid user ID'
      });
    }

    // Get a fresh OAuth2 client for this request
    const client = getOAuth2Client();

    try {
      // Exchange code for tokens with proper redirect URI
      const { tokens } = await client.getToken({
        code,
        redirect_uri: getRedirectUri()
      });
      logger.info('Successfully obtained tokens');
      
      // Validate token response
      if (!tokens || !tokens.access_token) {
        throw new Error('Invalid token response from Google');
      }

      // Update user with new tokens
      user.gmail_access_token = tokens.access_token;
      user.gmail_refresh_token = tokens.refresh_token || user.gmail_refresh_token;
      user.gmail_token_expiry = new Date(Date.now() + (tokens.expiry_date || 3600000));
      user.gmail_connected = true;

      await user.save();
      logger.info(`Updated tokens for user: ${userId}`);

      // Redirect to success page
      const redirectUrl = process.env.NODE_ENV === 'production'
        ? `${process.env.PRODUCTION_URL || 'https://email-detection-api.onrender.com'}/gmail-success`
        : 'http://localhost:3000/gmail-success';

      return res.redirect(redirectUrl);

    } catch (tokenError) {
      logger.error('Error exchanging code for tokens:', tokenError);
      
      // Clear any existing tokens on error
      user.gmail_connected = false;
      user.gmail_access_token = null;
      user.gmail_refresh_token = null;
      user.gmail_token_expiry = null;
      await user.save();

      const errorUrl = process.env.NODE_ENV === 'production'
        ? `${process.env.PRODUCTION_URL || 'https://email-detection-api.onrender.com'}/gmail-error`
        : 'http://localhost:3000/gmail-error';

      return res.redirect(`${errorUrl}?error=token_exchange_failed`);
    }

  } catch (error) {
    logger.error('Error in OAuth callback:', error);
    const errorUrl = process.env.NODE_ENV === 'production'
      ? `${process.env.PRODUCTION_URL || 'https://email-detection-api.onrender.com'}/gmail-error`
      : 'http://localhost:3000/gmail-error';

    return res.redirect(`${errorUrl}?error=server_error`);
  }
};

// Fetch emails from Gmail
exports.fetchEmails = async (req, res) => {
  try {
    console.log('Fetching emails for user...');
    // Check if req.user exists before accessing its properties
    if (!req.user) {
      console.error('Authentication required - no user object found');
      return res.status(401).json({ 
        message: 'Authentication required',
        action: 'login'
      });
    }
    
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user || !user.gmail_connected) {
      console.log('Gmail not connected for user:', userId);
      return res.status(400).json({ 
        message: 'Gmail not connected', 
        action: 'reconnect_required',
        error: 'Gmail connection not found'
      });
    }
    
    console.log('Gmail connected, access token present:', !!user.gmail_access_token);
    console.log('Gmail connected, refresh token present:', !!user.gmail_refresh_token);
    
    // Create a new OAuth client for this request
    const emailClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      getRedirectUri()
    );

    // Validate required environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Missing required Google OAuth credentials');
      return res.status(500).json({
        message: 'Server configuration error',
        error: 'Missing OAuth credentials',
        action: 'contact_admin'
      });
    }
    
    // Check if we have valid tokens before proceeding
    if (!user.gmail_access_token || !user.gmail_refresh_token) {
      console.error('Missing Gmail tokens for user:', userId);
      user.gmail_connected = false;
      await user.save();
      return res.status(401).json({ 
        message: 'Gmail authentication missing or incomplete', 
        error: 'Missing required tokens',
        action: 'reconnect'
      });
    }
    
    // Set up auth client with user's tokens
    emailClient.setCredentials({
      access_token: user.gmail_access_token,
      refresh_token: user.gmail_refresh_token
    });
    
    // Check if token is expired and refresh if needed
    try {
      // Always try to refresh if token is expired or about to expire (within 5 minutes)
      const tokenExpiryTime = user.gmail_token_expiry ? new Date(user.gmail_token_expiry) : new Date(0);
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      
      // Log token status for debugging
      console.log(`Token status for user ${userId}:`);
      console.log(`Current time: ${new Date().toISOString()}`);
      console.log(`Token expiry: ${tokenExpiryTime.toISOString()}`);
      console.log(`Token needs refresh: ${tokenExpiryTime < fiveMinutesFromNow}`);
      
      if (!user.gmail_token_expiry || tokenExpiryTime < fiveMinutesFromNow) {
        console.log(`Initiating token refresh for user ${userId}...`);
        
        // Add retry mechanism for token refresh
        let retryCount = 0;
        const maxRetries = 3;
        let lastError = null;
        
        try {
          while (retryCount < maxRetries) {
            try {
              const { credentials } = await emailClient.refreshAccessToken();
              console.log(`Token refresh attempt ${retryCount + 1} successful`);
              console.log('Token refreshed successfully');
              
              // Update user with new tokens
              user.gmail_access_token = credentials.access_token;
              if (credentials.refresh_token) {
                user.gmail_refresh_token = credentials.refresh_token;
              }
              
              // Calculate expiry time from the response or default to 1 hour
              const expiresIn = credentials.expiry_date ? 
                (credentials.expiry_date - Date.now()) : 
                (credentials.expires_in ? credentials.expires_in * 1000 : 3600000);
              
              user.gmail_token_expiry = new Date(Date.now() + expiresIn);
              await user.save();
              
              // Update client credentials with refreshed tokens
              emailClient.setCredentials({
                access_token: credentials.access_token,
                refresh_token: user.gmail_refresh_token
              });
              break; // Success, exit retry loop
            } catch (refreshAttemptError) {
              lastError = refreshAttemptError;
              retryCount++;
              if (retryCount < maxRetries) {
                console.log(`Token refresh attempt ${retryCount} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
              }
            }
          }
          
          if (retryCount === maxRetries) {
            throw lastError; // All retries failed
          }
        } catch (innerRefreshError) {
          // Log the full error object for debugging
          console.error('Token refresh failed with error:', JSON.stringify(innerRefreshError, null, 2));
          
          // Check for invalid_grant error which means token is permanently invalid
          if (innerRefreshError.response && innerRefreshError.response.data && 
              innerRefreshError.response.data.error === 'invalid_grant') {
            console.log('Invalid grant error detected - token is permanently invalid');
            
            // Clear token data and mark as disconnected
            user.gmail_connected = false;
            user.gmail_access_token = null;
            user.gmail_refresh_token = null;
            user.gmail_token_expiry = null;
            await user.save();
            
            return res.status(401).json({
              message: 'Gmail authorization has been revoked or is invalid',
              error: 'invalid_grant',
              action: 'reconnect_required'
            });
          }
          
          // Handle the error here instead of propagating
          console.error('Token refresh error details:', innerRefreshError.message);
          user.gmail_connected = false;
          await user.save();
          
          return res.status(401).json({ 
            message: 'Failed to refresh Gmail authentication', 
            error: innerRefreshError.message || 'Token refresh failed',
            action: 'reconnect_required'
          });
        }
      }
    } catch (refreshError) {
      console.error('Error in token refresh process:', refreshError);
      // If refresh fails, mark Gmail as disconnected
      user.gmail_connected = false;
      await user.save();
      return res.status(401).json({ 
        message: 'Gmail authentication expired or invalid', 
        error: refreshError.message,
        action: 'reconnect'
      });
    }
    
    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: emailClient });
    
    try {
      console.log('Fetching message list from Gmail...');
      // Get list of messages (limit to 10 for testing)
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 10
      });
      
      const messages = response.data.messages || [];
      console.log(`Found ${messages.length} messages`);
      
      const processedEmails = [];
      
      // Process each message
      for (const message of messages) {
        try {
          console.log(`Processing message ID: ${message.id}`);
          // Check if email already exists in our database
          const existingEmail = await Email.findOne({ messageId: message.id });
          if (existingEmail) {
            console.log(`Message ${message.id} already exists in database`);
            processedEmails.push(existingEmail);
            continue;
          }
          
          // Get full message details
          console.log(`Fetching full message for ID: ${message.id}`);
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });
          
          // Extract email data
          const emailData = extractEmailData(fullMessage.data);
          console.log(`Extracted data from message: ${emailData.subject}`);
          
          // Analyze email for phishing
          const scores = analyzeEmail(emailData);
          console.log(`Analyzed message, phishing score: ${scores.total}`);
          
          // Create new email record
          const newEmail = new Email({
            userId: userId,
            messageId: message.id,
            from: emailData.from,
            to: emailData.to,
            subject: emailData.subject,
            date: emailData.date,
            body: emailData.body,
            scores: scores,
            phishingRisk: calculateRiskLevel(scores.total),
            flagged: scores.total > 50, // Flag if score is above 50
            rawHeaders: emailData.rawHeaders,
            attachmentInfo: emailData.attachments,
            urls: emailData.urls
          });
          
          await newEmail.save();
          console.log(`Saved new email to database: ${message.id}`);
          processedEmails.push(newEmail);
        } catch (messageError) {
          console.error(`Error processing message ${message.id}:`, messageError);
          // Continue with next message instead of failing the entire batch
          continue;
        }
      }
      
      // Update last sync time even if some messages failed
      user.last_email_sync = new Date();
      await user.save();
      
      console.log(`Updated last sync time for user: ${userId}`);
      
      // Return the processed emails
      return res.status(200).json({
        success: true,
        message: `${processedEmails.length} emails processed`,
        emails: processedEmails,
        emailCount: processedEmails.length,
        connected: true
      });
    } catch (apiError) {
      console.error('Error fetching emails from Gmail API:', apiError);
      return res.status(500).json({ 
        message: 'Error fetching emails', 
        error: apiError.message,
        details: apiError.response?.data || 'No additional details'
      });
    }
  } catch (error) {
    console.error('Error fetching emails:', error);
    
    // Check if it's an authentication error
    if (error.message && (error.message.includes('auth') || error.message.includes('token') || error.message.includes('credentials'))) {
      // Mark user as disconnected
      if (req.user && req.user.id) {
        try {
          const user = await User.findById(req.user.id);
          if (user) {
            user.gmail_connected = false;
            await user.save();
            console.log('Marked user as disconnected due to auth error');
          }
        } catch (dbError) {
          console.error('Error updating user connection status:', dbError);
        }
      }
      
      return res.status(401).json({ 
        message: 'Gmail authentication failed', 
        error: error.message,
        connected: false,
        action: 'reconnect'
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to fetch emails', 
      error: error.message,
      connected: false
    });
  }
};

// Helper function to extract email data
function extractEmailData(message) {
  const headers = message.payload.headers;
  const parts = message.payload.parts || [];
  
  // Extract headers
  const from = headers.find(h => h.name === 'From')?.value || '';
  const to = headers.find(h => h.name === 'To')?.value || '';
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  const date = headers.find(h => h.name === 'Date')?.value || '';
  
  // Extract body
  let body = '';
  
  // Function to extract body parts recursively
  function extractBodyParts(part) {
    if (part.mimeType === 'text/plain' && part.body.data) {
      body += Buffer.from(part.body.data, 'base64').toString('utf8');
    } else if (part.parts && part.parts.length) {
      part.parts.forEach(extractBodyParts);
    }
  }
  
  // Process message parts
  if (parts.length) {
    parts.forEach(extractBodyParts);
  } else if (message.payload.body && message.payload.body.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf8');
  }
  
  // Extract attachments
  const attachments = [];
  
  function extractAttachments(part) {
    if (part.filename && part.filename.length > 0) {
      attachments.push({
        name: part.filename,
        contentType: part.mimeType,
        size: part.body.size || 0
      });
    }
    
    if (part.parts && part.parts.length) {
      part.parts.forEach(extractAttachments);
    }
  }
  
  if (parts.length) {
    parts.forEach(extractAttachments);
  }
  
  // Extract URLs from body
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = body.match(urlRegex) || [];
  
  return {
    from,
    to,
    subject,
    date: new Date(date),
    body,
    rawHeaders: JSON.stringify(headers),
    attachments,
    urls: urls.map(url => ({ url, suspicious: false }))
  };
}

// Helper function to analyze email for phishing indicators
function analyzeEmail(emailData) {
  // Initialize scores
  const scores = {
    header: 0,
    text: 0,
    metadata: 0,
    attachments: 0,
    total: 0,
    headerDetails: {
      routingPath: { score: 0, findings: [], suspicious: false },
      serverReputation: { score: 0, findings: [], suspicious: false },
      geoConsistency: { score: 0, findings: [], suspicious: false },
      timestampSequence: { score: 0, findings: [], suspicious: false }
    }
  };
  
  // Advanced Header Analysis
  if (emailData.rawHeaders) {
    const headerAnalysisResults = analyzeEmailHeaders(emailData.rawHeaders, emailData.from);
    
    // Update header score based on the comprehensive analysis
    scores.header = headerAnalysisResults.totalScore;
    scores.headerDetails = headerAnalysisResults.details;
  }
  
  // Helper function for advanced header analysis
  function analyzeEmailHeaders(rawHeaders, fromAddress) {
    // Parse headers if they're in string format
    let parsedHeaders;
    try {
      if (typeof rawHeaders === 'string') {
        try {
          parsedHeaders = JSON.parse(rawHeaders);
        } catch (e) {
          // If not valid JSON, assume it's a raw header string
          parsedHeaders = rawHeaders.split('\n').map(line => {
            const [name, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim();
            return { name, value };
          });
        }
      } else {
        parsedHeaders = rawHeaders;
      }
    } catch (error) {
      console.error('Error parsing email headers:', error);
      return { totalScore: 0, details: {} };
    }
    
    // Initialize analysis results
    const results = {
      totalScore: 0,
      details: {
        routingPath: { score: 0, findings: [], suspicious: false },
        serverReputation: { score: 0, findings: [], suspicious: false },
        geoConsistency: { score: 0, findings: [], suspicious: false },
        timestampSequence: { score: 0, findings: [], suspicious: false }
      }
    };
    
    // 1. Complete Email Routing Path Verification
    try {
      const receivedHeaders = Array.isArray(parsedHeaders) 
        ? parsedHeaders.filter(h => h.name === 'Received').map(h => h.value)
        : [];
      
      if (receivedHeaders.length === 0) {
        results.details.routingPath.findings.push('No Received headers found - highly suspicious');
        results.details.routingPath.score += 25;
        results.details.routingPath.suspicious = true;
      } else {
        // Extract domain from sender
        const senderDomain = fromAddress ? extractDomain(fromAddress) : null;
        
        // Check if routing path includes servers from the sender's domain
        let foundSenderDomain = false;
        const routingServers = [];
        
        receivedHeaders.forEach(header => {
          // Extract server info from received header
          const fromMatch = header.match(/from\s+([^\s]+)/);
          const byMatch = header.match(/by\s+([^\s]+)/);
          
          if (fromMatch && fromMatch[1]) {
            routingServers.push(fromMatch[1]);
            if (senderDomain && fromMatch[1].includes(senderDomain)) {
              foundSenderDomain = true;
            }
          }
          
          if (byMatch && byMatch[1]) {
            routingServers.push(byMatch[1]);
            if (senderDomain && byMatch[1].includes(senderDomain)) {
              foundSenderDomain = true;
            }
          }
        });
        
        results.details.routingPath.findings.push(`Routing path: ${routingServers.join(' → ')}`);
        
        // Check if sender domain appears in routing path
        if (senderDomain && !foundSenderDomain) {
          results.details.routingPath.findings.push(`Sender domain ${senderDomain} not found in routing path`);
          results.details.routingPath.score += 20;
          results.details.routingPath.suspicious = true;
        }
        
        // Check for suspicious routing patterns
        const suspiciousPatterns = [
          { pattern: /unknown/i, score: 15, message: 'Unknown server in routing path' },
          { pattern: /helo/i, score: 10, message: 'HELO command with suspicious domain' }
        ];
        
        suspiciousPatterns.forEach(({ pattern, score, message }) => {
          receivedHeaders.forEach(header => {
            if (pattern.test(header)) {
              results.details.routingPath.findings.push(message);
              results.details.routingPath.score += score;
              results.details.routingPath.suspicious = true;
            }
          });
        });
      }
    } catch (error) {
      console.error('Error in routing path analysis:', error);
    }
    
    // 2. Server Reputation Checking
    try {
      // This would typically use an external API or database
      // For demonstration, we'll check against a small list of known bad domains/IPs
      const knownBadServers = [
        '185.122.58.14', 'spamdomain.com', '58.64.100.42',
        'mail.suspiciousdomain.com', 'relay.sketchy.net'
      ];
      
      // Extract all server names and IPs from headers
      const serverMatches = [];
      if (Array.isArray(parsedHeaders)) {
        parsedHeaders.forEach(header => {
          if (typeof header.value === 'string') {
            // Match IP addresses
            const ipMatches = header.value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
            if (ipMatches) serverMatches.push(...ipMatches);
            
            // Match domain names
            const domainMatches = header.value.match(/\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g);
            if (domainMatches) serverMatches.push(...domainMatches);
          }
        });
      }
      
      // Check against known bad servers
      const foundBadServers = serverMatches.filter(server => 
        knownBadServers.some(badServer => server.includes(badServer))
      );
      
      if (foundBadServers.length > 0) {
        results.details.serverReputation.findings.push(
          `Found ${foundBadServers.length} suspicious servers: ${foundBadServers.join(', ')}`
        );
        results.details.serverReputation.score += 25 * foundBadServers.length;
        results.details.serverReputation.suspicious = true;
      }
    } catch (error) {
      console.error('Error in server reputation analysis:', error);
    }
    
    // 3. Geographic Consistency Validation
    // In a real implementation, this would use a geolocation API
    // For demonstration, we'll simulate with some basic checks
    try {
      // Extract country codes from headers (simulated)
      const countryCodesInPath = [];
      const senderCountry = extractSenderCountry(fromAddress);
      
      // Simulate finding country codes in the headers
      if (Array.isArray(parsedHeaders)) {
        parsedHeaders.forEach(header => {
          if (typeof header.value === 'string') {
            // This is a simplified simulation - in reality would use IP geolocation
            if (header.value.includes('185.122.58')) countryCodesInPath.push('RU');
            if (header.value.includes('58.64.100')) countryCodesInPath.push('CN');
            if (header.value.includes('google.com')) countryCodesInPath.push('US');
          }
        });
      }
      
      // Check for geographic inconsistencies
      if (senderCountry && countryCodesInPath.length > 0) {
        const suspiciousCountries = ['RU', 'CN', 'NG', 'KP']; // Example list
        const foundSuspiciousCountries = countryCodesInPath.filter(cc => 
          suspiciousCountries.includes(cc) && cc !== senderCountry
        );
        
        if (foundSuspiciousCountries.length > 0) {
          results.details.geoConsistency.findings.push(
            `Email routed through suspicious countries: ${foundSuspiciousCountries.join(', ')}`
          );
          results.details.geoConsistency.score += 15 * foundSuspiciousCountries.length;
          results.details.geoConsistency.suspicious = true;
        }
      }
    } catch (error) {
      console.error('Error in geographic consistency analysis:', error);
    }
    
    // 4. Timestamp Sequence Verification
    try {
      const receivedHeaders = Array.isArray(parsedHeaders) 
        ? parsedHeaders.filter(h => h.name === 'Received').map(h => h.value)
        : [];
      
      if (receivedHeaders.length > 1) {
        const timestamps = [];
        
        receivedHeaders.forEach(header => {
          // Extract timestamp from received header
          const dateMatch = header.match(/;\s*([^;\n]+)$/);
          if (dateMatch && dateMatch[1]) {
            try {
              const timestamp = new Date(dateMatch[1].trim());
              if (!isNaN(timestamp)) {
                timestamps.push(timestamp);
              }
            } catch (e) {
              // Invalid date format
            }
          }
        });
        
        // Check if timestamps are in reverse chronological order (newest first)
        let outOfSequence = false;
        for (let i = 0; i < timestamps.length - 1; i++) {
          if (timestamps[i] < timestamps[i + 1]) {
            outOfSequence = true;
            break;
          }
        }
        
        if (outOfSequence) {
          results.details.timestampSequence.findings.push('Email timestamps are out of sequence - possible header forgery');
          results.details.timestampSequence.score += 30;
          results.details.timestampSequence.suspicious = true;
        }
        
        // Check for unreasonable time gaps
        if (timestamps.length >= 2) {
          const firstTime = timestamps[timestamps.length - 1]; // Oldest
          const lastTime = timestamps[0]; // Newest
          const timeDiff = lastTime - firstTime;
          
          // Flag if delivery took more than 24 hours
          if (timeDiff > 24 * 60 * 60 * 1000) {
            results.details.timestampSequence.findings.push(
              `Unusually long delivery time: ${Math.round(timeDiff / (60 * 60 * 1000))} hours`
            );
            results.details.timestampSequence.score += 10;
            results.details.timestampSequence.suspicious = true;
          }
          
          // Flag if timestamps are in the future
          const now = new Date();
          if (timestamps.some(ts => ts > now)) {
            results.details.timestampSequence.findings.push('Found timestamps in the future - likely forged');
            results.details.timestampSequence.score += 25;
            results.details.timestampSequence.suspicious = true;
          }
        }
      }
    } catch (error) {
      console.error('Error in timestamp sequence analysis:', error);
    }
    
    // Calculate total header score
    results.totalScore = [
      results.details.routingPath.score,
      results.details.serverReputation.score,
      results.details.geoConsistency.score,
      results.details.timestampSequence.score
    ].reduce((sum, score) => sum + score, 0);
    
    // Cap the score at 100
    results.totalScore = Math.min(results.totalScore, 100);
    
    return results;
  }
  
  // Helper function to extract domain from email address
  function extractDomain(email) {
    try {
      const match = email.match(/@([^@]+)$/);
      return match ? match[1].toLowerCase() : null;
    } catch (e) {
      return null;
    }
  }
  
  // Helper function to extract country from email address (simplified simulation)
  function extractSenderCountry(email) {
    if (!email) return null;
    
    const domain = extractDomain(email);
    if (!domain) return null;
    
    // Simplified mapping - in reality would use a proper database
    const tldCountryMap = {
      'com': 'US', // Default for .com
      'uk': 'GB',
      'ca': 'CA',
      'au': 'AU',
      'de': 'DE',
      'fr': 'FR',
      'ru': 'RU',
      'cn': 'CN',
      'jp': 'JP',
      'in': 'IN'
    };
    
    // Check for country-specific domains
    const tld = domain.split('.').pop().toLowerCase();
    return tldCountryMap[tld] || null;
  }
  
  // Text analysis
  const lowerBody = emailData.body.toLowerCase();
  
  // Check for urgent language
  if (lowerBody.includes('urgent') || lowerBody.includes('immediately')) {
    scores.text += 10;
  }
  
  // Check for financial terms
  if (lowerBody.includes('bank') || lowerBody.includes('account') || 
      lowerBody.includes('credit card') || lowerBody.includes('payment')) {
    scores.text += 15;
  }
  
  // Check for action requests
  if (lowerBody.includes('click here') || lowerBody.includes('login now') || 
      lowerBody.includes('verify your') || lowerBody.includes('update your')) {
    scores.text += 20;
  }
  
  // Metadata analysis
  if (emailData.subject.toLowerCase().includes('urgent') || 
      emailData.subject.toLowerCase().includes('alert') ||
      emailData.subject.toLowerCase().includes('verify')) {
    scores.metadata += 15;
  }
  
  // Attachment analysis
  emailData.attachments.forEach(attachment => {
    if (attachment.name.endsWith('.exe') || attachment.name.endsWith('.zip') || 
        attachment.name.endsWith('.bat') || attachment.name.endsWith('.js')) {
      scores.attachments += 25;
    }
  });
  
  // Calculate total score
  scores.total = scores.header + scores.text + scores.metadata + scores.attachments;
  
  return scores;
}

// Helper function to calculate risk level based on score
function calculateRiskLevel(score) {
  if (score < 30) return 'Low';
  if (score < 60) return 'Medium';
  if (score < 90) return 'High';
  return 'Critical';
}

// Get Gmail connection status
exports.getStatus = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    
    if (!userId) {
      logger.warn('Missing userId parameter in getStatus');
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'MISSING_USER_ID'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`User not found with ID: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if Gmail is connected
    if (!user.gmail_connected || !user.gmail_access_token) {
      logger.info(`Gmail not connected for user: ${userId}`);
      return res.status(200).json({
        success: true,
        connected: false,
        message: 'Gmail not connected',
        lastSync: user.last_email_sync,
        emailCount: await Email.countDocuments({ userId: user._id })
      });
    }

    // Try to get profile to verify token is still valid
    try {
      oauth2Client.setCredentials({
        access_token: user.gmail_access_token,
        refresh_token: user.gmail_refresh_token,
        expiry_date: user.gmail_token_expiry?.getTime()
      });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Get profile to verify token
      const profile = await gmail.users.getProfile({
        userId: 'me'
      });

      // Get unread count
      const unread = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 1
      });

      // Get total email count
      const allEmails = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1
      });

      logger.info(`Successfully verified Gmail connection for user: ${userId}`);
      
      return res.status(200).json({
        success: true,
        connected: true,
        email: profile.data.emailAddress,
        messagesTotal: allEmails.data.resultSizeEstimate,
        unreadCount: unread.data.resultSizeEstimate,
        lastSync: user.last_email_sync,
        emailCount: await Email.countDocuments({ userId: user._id }),
        tokenExpiry: user.gmail_token_expiry ? user.gmail_token_expiry.toISOString() : null,
        tokenExpired: user.gmail_token_expiry ? user.gmail_token_expiry < new Date() : true
      });
      
    } catch (error) {
      logger.error(`Error verifying Gmail token for user ${userId}:`, error);
      
      // If token is invalid, update user status
      if (error.code === 401) {
        user.gmail_connected = false;
        user.gmail_access_token = undefined;
        user.gmail_refresh_token = undefined;
        user.gmail_token_expiry = undefined;
        await user.save();
        
        return res.status(200).json({
          success: true,
          connected: false,
          message: 'Gmail token expired or revoked',
          code: 'TOKEN_EXPIRED',
          lastSync: user.last_email_sync,
          emailCount: await Email.countDocuments({ userId: user._id })
        });
      }
      
      throw error;
    }
    
  } catch (error) {
    logger.error('Error in getStatus:', error);
    
    // Handle specific error cases
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        success: false,
        message: 'Unable to connect to Gmail service',
        code: 'SERVICE_UNAVAILABLE'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to check Gmail status',
      code: 'INTERNAL_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Disconnect Gmail account
exports.disconnectGmail = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const userId = req.user.id;
    logger.info(`Disconnecting Gmail for user: ${userId}`);

    // Find the user and clear their Gmail credentials
    const user = await User.findById(userId).session(session);
    if (!user) {
      logger.error(`User not found: ${userId}`);
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Clear Gmail credentials
    user.gmail_access_token = undefined;
    user.gmail_refresh_token = undefined;
    user.gmail_token_expiry = undefined;
    user.gmail_connected = false;
    user.last_email_sync = undefined;

    await user.save({ session });
    await session.commitTransaction();
    
    logger.info(`Successfully disconnected Gmail for user: ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Gmail account disconnected successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('Error disconnecting Gmail:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Gmail account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: 'DISCONNECT_FAILED'
    });
  } finally {
    session.endSession();
  }
};

// Scan emails for phishing threats with admin support
exports.scanEmails = async (req, res) => {
  let session;
  
  try {
    console.log('Scan request received. Headers:', req.headers);
    console.log('Request params:', req.params);
    console.log('Request user:', req.user);
    
    // Start a new session and transaction
    session = await mongoose.startSession();
    await session.startTransaction();
    
    // Get user ID from params or authenticated user
    const userId = req.params.userId || (req.user && req.user.id);
    const isAdminRequest = req.user && req.user.role === 'admin' && req.params.userId;
    
    console.log('Resolved userId:', userId);
    console.log('Is admin request:', isAdminRequest);
    
    if (!userId) {
      const errorMsg = 'User ID is required. User not properly authenticated or missing userId parameter';
      logger.warn(errorMsg);
      
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      
      return res.status(400).json({
        success: false,
        message: errorMsg,
        code: 'MISSING_USER_ID',
        debug: {
          hasParamsUserId: !!req.params.userId,
          hasUserInRequest: !!req.user,
          requestMethod: req.method,
          requestUrl: req.originalUrl
        }
      });
    }
    
    // Check if user exists
    const user = await User.findById(userId).session(session);
    if (!user) {
      logger.warn(`User not found with ID: ${userId}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if Gmail is connected
    if (!user.gmail_connected || !user.gmail_access_token) {
      logger.info(`Gmail not connected for user: ${userId}`);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Gmail not connected. Please connect your Gmail account first.',
        code: 'GMAIL_NOT_CONNECTED',
        debug: {
          gmail_connected: user.gmail_connected,
          has_access_token: !!user.gmail_access_token,
          has_refresh_token: !!user.gmail_refresh_token,
          token_expiry: user.gmail_token_expiry
        }
      });
    }
    
    // Create OAuth2 client
    const oauth2Client = getOAuth2Client();
    
    // Set credentials with error handling
    try {
      if (!user.gmail_access_token || !user.gmail_refresh_token) {
        throw new Error('Missing Gmail tokens');
      }

      oauth2Client.setCredentials({
        access_token: user.gmail_access_token,
        refresh_token: user.gmail_refresh_token,
        expiry_date: user.gmail_token_expiry
      });

      // Set up token refresh handler
      oauth2Client.on('tokens', async (tokens) => {
        logger.info('Refreshing Gmail tokens');
        if (tokens.access_token) {
          user.gmail_access_token = tokens.access_token;
        }
        if (tokens.refresh_token) {
          user.gmail_refresh_token = tokens.refresh_token;
        }
        user.gmail_token_expiry = tokens.expiry_date;
        await user.save();
        logger.info('Gmail tokens refreshed and saved');
      });
    } catch (authError) {
      logger.error('Gmail auth error:', authError);
      user.gmail_connected = false;
      await user.save();
      throw new Error('Gmail authentication failed');
    }
    
    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Get list of messages (limit to 10 most recent for performance)
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'newer_than:1d' // Only get emails from the last day
    });
    
    const messages = response.data.messages || [];
    console.log(`Found ${messages.length} recent messages to scan`);
    
    if (messages.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No new emails found to scan',
        emails: []
      });
    }
    
    // Process each message
    const processedEmails = [];
    
    for (const message of messages) {
      try {
        // Check if this email has already been analyzed
        const existingEmail = await Email.findOne({ 
          messageId: message.id,  // Changed from message_id to messageId to match schema
          userId: userId         // Changed from user to userId to match schema
        });
        
        if (existingEmail) {
          console.log(`Email ${message.id} already analyzed, skipping`);
          processedEmails.push(existingEmail);
          continue;
        }
        
        // Get full message details
        const messageDetails = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });
        
        // Extract email data
        const emailData = extractEmailData(messageDetails.data);
        
        // Analyze for phishing indicators
        const scores = analyzeEmail(emailData);
        
        // Calculate risk level
        const phishingRisk = calculateRiskLevel(scores.total);
        
        // Create new email record
        const newEmail = new Email({
          user: userId,
          message_id: message.id,
          from: emailData.from,
          to: emailData.to,
          subject: emailData.subject,
          date: emailData.date,
          body: emailData.body.substring(0, 5000), // Limit body size
          scores: scores,
          phishingRisk: phishingRisk,
          rawHeaders: emailData.rawHeaders,
          attachmentInfo: emailData.attachments,
          urls: emailData.urls
        });
        
        await newEmail.save();
        console.log(`Saved new email to database: ${message.id}`);
        processedEmails.push(newEmail);
      } catch (messageError) {
        console.error(`Error processing message ${message.id}:`, messageError);
        // Continue with next message instead of failing the entire batch
      }
    }
    
    // Update last sync time
    user.last_email_sync = new Date();
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Emails scanned successfully',
      count: processedEmails.length,
      emails: processedEmails
    });
  } catch (error) {
    console.error('Error scanning emails:', error);
    
    // Only try to abort transaction if session exists
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error('Error aborting transaction:', abortError);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to scan emails',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      code: 'SCAN_ERROR'
    });
  } finally {
    // Always end the session
    if (session) {
      try {
        await session.endSession();
      } catch (endSessionError) {
        console.error('Error ending session:', endSessionError);
      }
    }
  }
};
