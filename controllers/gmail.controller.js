const { google } = require('googleapis');
const User = require('../models/Users');
const Email = require('../models/Email');

// Configure OAuth2 client with dynamic redirect URI based on environment
const getRedirectUri = () => {
  // Check if we're in production or development
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isProd) {
    // Use the production URL from environment variable or default to Render domain
    return process.env.PROD_REDIRECT_URI || 'https://email-detection-api.onrender.com/api/gmail/callback';
  } else {
    // Use the development URL
    return process.env.DEV_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback';
  }
};

// Create OAuth client with dynamic redirect URI
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  getRedirectUri()
);

// Generate Gmail OAuth URL
exports.getAuthUrl = (req, res) => {
  try {
    // Log environment variables and configuration (without exposing secrets)
    console.log('OAuth2 Configuration Check:');
    console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Current Redirect URI:', getRedirectUri());
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Missing required OAuth2 environment variables');
      return res.status(500).json({ 
        message: 'OAuth configuration error', 
        details: 'Missing required environment variables for Google OAuth2',
        missingVars: {
          clientId: !process.env.GOOGLE_CLIENT_ID,
          clientSecret: !process.env.GOOGLE_CLIENT_SECRET
        }
      });
    }
    
    // Check if user exists and is authenticated
    if (!req.user || !req.user.id) {
      console.error('User not authenticated or missing ID');
      return res.status(401).json({
        message: 'Authentication required',
        details: 'You must be logged in to connect Gmail'
      });
    }
    
    const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
    
    // Get the exact redirect URI we want to use
    const redirectUri = process.env.PROD_REDIRECT_URI || 'https://email-detection-api.onrender.com/api/gmail/callback';
    console.log('Using redirect URI for auth URL generation:', redirectUri);
    
    // Create a new OAuth client with the explicit redirect URI
    const currentOAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    
    // Generate the authorization URL with explicit parameters
    const authUrl = currentOAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force to get refresh token
      state: req.user.id, // Pass user ID as state parameter
      include_granted_scopes: true, // Enable incremental authorization
      redirect_uri: redirectUri // Explicitly include the redirect URI
    });
    
    console.log('Generated Auth URL:', authUrl);
    console.log('User ID in state:', req.user.id);
    
    res.status(200).json({ 
      authUrl,
      redirectUri: getRedirectUri(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ 
      message: 'Failed to generate authentication URL',
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

// Handle OAuth callback
exports.handleCallback = async (req, res) => {
  console.log('OAuth callback received with query params:', req.query);
  console.log('Request URL:', req.originalUrl);
  console.log('Request method:', req.method);
  
  try {
    const { code, state, error } = req.query;
    
    // Check for OAuth error response
    if (error) {
      console.error('OAuth error returned:', error, req.query.error_description);
      return res.send(`
        <html>
          <body>
            <h1>Authentication Error</h1>
            <p>Error: ${error}</p>
            <p>Description: ${req.query.error_description || 'No description provided'}</p>
            <p><a href="/admin.html">Return to application</a></p>
          </body>
        </html>
      `);
    }
    
    // Validate required parameters
    if (!code) {
      console.error('Authorization code is missing');
      return res.send(`
        <html>
          <body>
            <h1>Authentication Error</h1>
            <p>Error: Authorization code is missing</p>
            <p><a href="/admin.html">Return to application</a></p>
          </body>
        </html>
      `);
    }
    
    if (!state) {
      console.error('State parameter is missing');
      return res.send(`
        <html>
          <body>
            <h1>Authentication Error</h1>
            <p>Error: State parameter is missing</p>
            <p><a href="/admin.html">Return to application</a></p>
          </body>
        </html>
      `);
    }
    
    const userId = state;
    console.log('User ID from state:', userId);
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
      return res.send(`
        <html>
          <body>
            <h1>Authentication Error</h1>
            <p>Error: User not found</p>
            <p><a href="/admin.html">Return to application</a></p>
          </body>
        </html>
      `);
    }
    
    console.log('User found:', user.email || user._id);
    console.log('Exchanging code for tokens...');
    
    try {
      // Get the redirect URI that was used for the initial request
      const redirectUri = process.env.PROD_REDIRECT_URI || 'https://email-detection-api.onrender.com/api/gmail/callback';
      console.log('Using redirect URI for token exchange:', redirectUri);
      console.log('Authorization code (first 10 chars):', code.substring(0, 10) + '...');
      console.log('Environment variables:', {
        NODE_ENV: process.env.NODE_ENV,
        GOOGLE_CLIENT_ID_exists: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET_exists: !!process.env.GOOGLE_CLIENT_SECRET,
        PROD_REDIRECT_URI: process.env.PROD_REDIRECT_URI,
        FRONTEND_URL: process.env.FRONTEND_URL
      });
      
      // Create a new OAuth client for this specific exchange to ensure correct parameters
      const tokenExchangeClient = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      
      console.log('Attempting to exchange code for tokens...');
      
      // Exchange code for tokens with explicit redirect URI
      const { tokens } = await tokenExchangeClient.getToken(code);
      
      console.log('Token exchange successful!');
      
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
      
      // Return HTML response instead of redirect
      return res.send(`
        <html>
          <body>
            <h1>Gmail Connected Successfully</h1>
            <p>Your Gmail account has been successfully connected to the application.</p>
            <p><a href="/admin.html?connected=true">Return to application</a></p>
            <script>
              // Auto-redirect after 3 seconds
              setTimeout(function() {
                window.location.href = '/admin.html?connected=true';
              }, 3000);
            </script>
          </body>
        </html>
      `);
    } catch (tokenError) {
      console.error('Error exchanging code for tokens:', tokenError);
      return res.send(`
        <html>
          <body>
            <h1>Authentication Error</h1>
            <p>Error exchanging code for tokens: ${tokenError.message}</p>
            <pre>${tokenError.stack}</pre>
            <p><a href="/admin.html">Return to application</a></p>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.send(`
      <html>
        <body>
          <h1>Authentication Error</h1>
          <p>Error: ${error.message}</p>
          <pre>${error.stack}</pre>
          <p><a href="/admin.html">Return to application</a></p>
        </body>
      </html>
    `);
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
