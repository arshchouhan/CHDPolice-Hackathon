const { google } = require('googleapis');
const User = require('../models/Users');
const Email = require('../models/Email');

// Configure OAuth2 client
// Determine the appropriate redirect URI based on environment
const getRedirectUri = () => {
  // Use environment variable if set
  if (process.env.REDIRECT_URI) {
    return process.env.REDIRECT_URI;
  }
  
  // Default to production URL if not in development
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction 
    ? 'https://email-detection-api.onrender.com/api/gmail/callback'
    : 'http://localhost:3000/api/gmail/callback';
};

const redirectUri = getRedirectUri();
console.log('Using redirect URI:', redirectUri);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

// Generate Gmail OAuth URL
exports.getAuthUrl = (req, res) => {
  try {
    // Log environment variables (without exposing secrets)
    console.log('OAuth2 Configuration Check:');
    console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
    console.log('REDIRECT_URI:', process.env.REDIRECT_URI);
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.REDIRECT_URI) {
      console.error('Missing required OAuth2 environment variables');
      return res.status(500).json({ 
        message: 'OAuth configuration error', 
        details: 'Missing required environment variables for Google OAuth2' 
      });
    }
    
    const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force to get refresh token
      state: req.user.id, // Pass user ID as state parameter
      include_granted_scopes: true // Enable incremental authorization
    });
    
    console.log('Generated Auth URL:', authUrl);
    
    res.status(200).json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ 
      message: 'Failed to generate authentication URL',
      error: error.message
    });
  }
};

// Handle OAuth callback
exports.handleCallback = async (req, res) => {
  try {
    console.log('OAuth callback received:', req.query);
    const { code, state, error } = req.query;
    
    // Helper function to get the base URL
    const getBaseUrl = () => {
      const isProduction = process.env.NODE_ENV === 'production';
      return isProduction 
        ? 'https://email-detection-api.onrender.com'
        : 'http://localhost:3000';
    };
    
    // Check for OAuth error response
    if (error) {
      console.error('OAuth error returned:', error, req.query.error_description);
      return res.redirect(`${getBaseUrl()}/dashboard?error=${encodeURIComponent(error)}&description=${encodeURIComponent(req.query.error_description || '')}`);
    }
    
    // Validate required parameters
    if (!code) {
      console.error('Authorization code is missing');
      return res.redirect(`${getBaseUrl()}/dashboard?error=missing_code`);
    }
    
    if (!state) {
      console.error('State parameter is missing');
      return res.redirect(`${getBaseUrl()}/dashboard?error=missing_state`);
    }
    
    const userId = state;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
      return res.redirect(`${getBaseUrl()}/dashboard?error=invalid_user`);
    }
    
    console.log('Exchanging code for tokens...');
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('Tokens received:', {
      access_token: tokens.access_token ? 'Present' : 'Missing',
      refresh_token: tokens.refresh_token ? 'Present' : 'Missing',
      expiry_date: tokens.expiry_date
    });
    
    // Update user with tokens
    await User.findByIdAndUpdate(userId, {
      gmail_access_token: tokens.access_token,
      gmail_refresh_token: tokens.refresh_token,
      gmail_token_expiry: new Date(Date.now() + (tokens.expiry_date || 3600000)), // Default 1hr if missing
      gmail_connected: true,
      last_email_sync: null
    });
    
    console.log('User updated with Gmail tokens');
    
    // Determine the appropriate redirect URL
    const getRedirectUrl = () => {
      const isProduction = process.env.NODE_ENV === 'production';
      const baseUrl = isProduction 
        ? 'https://email-detection-api.onrender.com'
        : 'http://localhost:3000';
      return `${baseUrl}/dashboard?connected=true`;
    };
    
    // Redirect to user dashboard
    res.redirect(getRedirectUrl());
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Determine the appropriate error redirect URL
    const getErrorRedirectUrl = () => {
      const isProduction = process.env.NODE_ENV === 'production';
      const baseUrl = isProduction 
        ? 'https://email-detection-api.onrender.com'
        : 'http://localhost:3000';
      return `${baseUrl}/dashboard?error=auth_error&message=${encodeURIComponent(error.message)}`;
    };
    
    res.redirect(getErrorRedirectUrl());
  }
};

// Fetch emails from Gmail
exports.fetchEmails = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user.gmail_connected) {
      return res.status(400).json({ message: 'Gmail not connected' });
    }
    
    // Set up auth client with user's tokens
    oauth2Client.setCredentials({
      access_token: user.gmail_access_token,
      refresh_token: user.gmail_refresh_token
    });
    
    // Check if token is expired and refresh if needed
    if (user.gmail_token_expiry && new Date(user.gmail_token_expiry) < new Date()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update user with new tokens
      user.gmail_access_token = credentials.access_token;
      if (credentials.refresh_token) {
        user.gmail_refresh_token = credentials.refresh_token;
      }
      user.gmail_token_expiry = new Date(Date.now() + credentials.expiry_date);
      await user.save();
    }
    
    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Get list of messages (limit to 10 for testing)
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10
    });
    
    const messages = response.data.messages || [];
    const processedEmails = [];
    
    // Process each message
    for (const message of messages) {
      // Check if email already exists in our database
      const existingEmail = await Email.findOne({ messageId: message.id });
      if (existingEmail) {
        processedEmails.push(existingEmail);
        continue;
      }
      
      // Get full message details
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      });
      
      // Extract email data
      const emailData = extractEmailData(fullMessage.data);
      
      // Analyze email for phishing
      const scores = analyzeEmail(emailData);
      
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
      processedEmails.push(newEmail);
    }
    
    // Update last sync time
    user.last_email_sync = new Date();
    await user.save();
    
    res.status(200).json({ 
      success: true, 
      message: `${processedEmails.length} emails processed`,
      emails: processedEmails
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ message: 'Failed to fetch emails' });
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
    total: 0
  };
  
  // Header analysis
  if (emailData.from.includes('noreply') || emailData.from.includes('no-reply')) {
    scores.header += 5;
  }
  
  if (emailData.from.includes('security') || emailData.from.includes('account')) {
    scores.header += 10;
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
  if (score < 50) return 'Medium';
  if (score < 80) return 'High';
  return 'Critical';
}

// Disconnect Gmail
exports.disconnectGmail = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Disconnecting Gmail for user:', userId);
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for Gmail disconnection:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user to remove Gmail connection
    const updatedUser = await User.findByIdAndUpdate(userId, {
      gmail_access_token: null,
      gmail_refresh_token: null,
      gmail_token_expiry: null,
      gmail_connected: false
    }, { new: true });
    
    console.log('Gmail disconnected successfully for user:', userId);
    
    res.status(200).json({ 
      success: true,
      message: 'Gmail disconnected successfully',
      gmailConnected: false
    });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to disconnect Gmail',
      error: error.message 
    });
  }
};
