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
    // Get redirect URI from query parameters if provided
    const redirectUriFromQuery = req.query.redirect_uri;
    const platform = req.query.platform;
    
    console.log('OAuth2 Configuration Check:');
    console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Platform from query:', platform);
    console.log('Redirect URI from query:', redirectUriFromQuery);
    console.log('Default Redirect URI:', getRedirectUri());
    
    // Use the redirect URI from query if provided, otherwise fall back to default
    const finalRedirectUri = redirectUriFromQuery || getRedirectUri();
    console.log('Final Redirect URI to be used:', finalRedirectUri);
    
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
    
    // Create a new OAuth client with the redirect URI from the query
    const currentOAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      finalRedirectUri
    );
    
    // Store the redirect URI in the state parameter along with the user ID
    // Format: userId|redirectUri
    const stateParam = `${req.user.id}|${finalRedirectUri}`;
    
    const authUrl = currentOAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force to get refresh token
      state: stateParam, // Pass user ID and redirect URI as state parameter
      include_granted_scopes: true, // Enable incremental authorization
      redirect_uri: finalRedirectUri // Explicitly set redirect URI
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
  
  // Get the frontend URL from environment variable or default based on environment
  const getFrontendUrl = () => {
    if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
    if (process.env.NODE_ENV === 'production') {
      return 'https://chd-police-hackathon.vercel.app';
    }
    return 'http://localhost:3000';
  };
  
  const frontendUrl = getFrontendUrl();
  
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
            <p><a href="${frontendUrl}/index.html">Return to application</a></p>
            <script>
              // Store error in localStorage for the frontend to display
              localStorage.setItem('gmailAuthError', JSON.stringify({
                error: '${error}',
                description: '${req.query.error_description || 'No description provided'}'
              }));
              // Redirect after 3 seconds
              setTimeout(() => {
                window.location.href = '${frontendUrl}/index.html?auth_error=true';
              }, 3000);
            </script>
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
            <p><a href="${frontendUrl}/index.html">Return to application</a></p>
            <script>
              localStorage.setItem('gmailAuthError', JSON.stringify({
                error: 'Missing Code',
                description: 'Authorization code is missing from the callback'
              }));
              setTimeout(() => {
                window.location.href = '${frontendUrl}/index.html?auth_error=true';
              }, 3000);
            </script>
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
            <p><a href="${frontendUrl}/index.html">Return to application</a></p>
            <script>
              localStorage.setItem('gmailAuthError', JSON.stringify({
                error: 'Missing State',
                description: 'State parameter is missing from the callback'
              }));
              setTimeout(() => {
                window.location.href = '${frontendUrl}/index.html?auth_error=true';
              }, 3000);
            </script>
          </body>
        </html>
      `);
    }
    
    // Parse state parameter which now contains userId|redirectUri
    console.log('Received state parameter:', state);
    
    let userId, callbackRedirectUri;
    try {
      if (state.includes('|')) {
        // New format with redirect URI
        [userId, callbackRedirectUri] = state.split('|');
        console.log('Parsed from state - User ID:', userId);
        console.log('Parsed from state - Redirect URI:', callbackRedirectUri);
      } else {
        // Old format, just user ID
        userId = state;
        callbackRedirectUri = getRedirectUri();
        console.log('Using old state format - User ID:', userId);
        console.log('Using default redirect URI:', callbackRedirectUri);
      }
      
      if (!userId || userId.length < 5) {
        throw new Error('Invalid user ID in state parameter');
      }
    } catch (stateError) {
      console.error('Error parsing state parameter:', stateError);
      return res.send(`
        <html>
          <body>
            <h1>Authentication Error</h1>
            <p>Error: Invalid state parameter format</p>
            <p><a href="${frontendUrl}/index.html">Return to application</a></p>
            <script>
              localStorage.setItem('gmailAuthError', JSON.stringify({
                error: 'Invalid State',
                description: 'Could not parse the state parameter correctly'
              }));
              setTimeout(() => {
                window.location.href = '${frontendUrl}/index.html?auth_error=true';
              }, 3000);
            </script>
          </body>
        </html>
      `);
    }
    
    // Find user by ID (from state parameter)
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
      return res.send(`
        <html>
          <body>
            <h1>Authentication Error</h1>
            <p>Error: User not found</p>
            <p><a href="${frontendUrl}/index.html">Return to application</a></p>
            <script>
              localStorage.setItem('gmailAuthError', JSON.stringify({
                error: 'User Not Found',
                description: 'The user associated with this authentication request could not be found'
              }));
              setTimeout(() => {
                window.location.href = '${frontendUrl}/index.html?auth_error=true';
              }, 3000);
            </script>
          </body>
        </html>
      `);
    }
    
    console.log('User found:', user.email || user._id);
    console.log('Exchanging code for tokens...');
    
    try {
      // Verify OAuth configuration
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('Missing OAuth credentials in environment variables');
        throw new Error('Server configuration error: Missing OAuth credentials');
      }
      
      // Use the redirect URI that was parsed from the state parameter
      console.log('Using redirect URI for token exchange:', callbackRedirectUri);
      
      // Create a new OAuth client with the same redirect URI used in the initial request
      const tokenExchangeClient = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        callbackRedirectUri
      );
      
      // Log detailed information for debugging
      console.log('Token exchange configuration:');
      console.log('- Client ID exists:', !!process.env.GOOGLE_CLIENT_ID);
      console.log('- Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);
      console.log('- Redirect URI:', callbackRedirectUri);
      console.log('- Authorization code length:', code.length);
      
      // Exchange code for tokens with explicit redirect URI
      let tokens;
      try {
        const tokenResponse = await tokenExchangeClient.getToken({
          code: code,
          redirect_uri: callbackRedirectUri
        });
        tokens = tokenResponse.tokens;
      } catch (tokenExchangeError) {
        console.error('Token exchange error details:', tokenExchangeError);
        throw new Error(`Failed to exchange authorization code: ${tokenExchangeError.message}`);
      }
      
      // Verify we received the necessary tokens
      if (!tokens || !tokens.access_token) {
        console.error('No access token received from Google');
        throw new Error('Authentication failed: No access token received');
      }
      
      // Log token status without showing actual tokens
      console.log('Tokens received:', {
        access_token: tokens.access_token ? 'Present' : 'Missing',
        refresh_token: tokens.refresh_token ? 'Present' : 'Missing',
        expiry_date: tokens.expiry_date ? 'Present' : 'Missing'
      });
      
      // Update user with tokens
      try {
        await User.findByIdAndUpdate(userId, {
          gmail_access_token: tokens.access_token,
          gmail_refresh_token: tokens.refresh_token,
          gmail_token_expiry: new Date(Date.now() + (tokens.expiry_date || 3600000)), // Default 1hr if missing
          gmail_connected: true,
          last_email_sync: null
        });
        console.log('User updated with Gmail tokens');
      } catch (dbError) {
        console.error('Database error updating user:', dbError);
        throw new Error(`Failed to update user with tokens: ${dbError.message}`);
      }
      
      // Return HTML response with success message
      return res.send(`
        <html>
          <body>
            <h1>Gmail Connected Successfully</h1>
            <p>Your Gmail account has been successfully connected to the application.</p>
            <p><a href="${frontendUrl}/index.html?connected=true">Return to application</a></p>
            <script>
              // Store success status in localStorage
              localStorage.setItem('gmailConnected', 'true');
              
              // Auto-redirect after 3 seconds
              setTimeout(function() {
                window.location.href = '${frontendUrl}/index.html?connected=true';
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
    console.log('Fetching emails for user...');
    // Check if req.user exists before accessing its properties
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user.gmail_connected) {
      console.log('Gmail not connected for user:', userId);
      return res.status(400).json({ message: 'Gmail not connected' });
    }
    
    console.log('Gmail connected, access token present:', !!user.gmail_access_token);
    console.log('Gmail connected, refresh token present:', !!user.gmail_refresh_token);
    
    // Create a new OAuth client for this request
    const emailClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      getRedirectUri()
    );
    
    // Set up auth client with user's tokens
    emailClient.setCredentials({
      access_token: user.gmail_access_token,
      refresh_token: user.gmail_refresh_token
    });
    
    // Check if token is expired and refresh if needed
    try {
      if (user.gmail_token_expiry && new Date(user.gmail_token_expiry) < new Date()) {
        console.log('Token expired, refreshing...');
        const { credentials } = await emailClient.refreshAccessToken();
        
        console.log('Token refreshed successfully');
        
        // Update user with new tokens
        user.gmail_access_token = credentials.access_token;
        if (credentials.refresh_token) {
          user.gmail_refresh_token = credentials.refresh_token;
        }
        user.gmail_token_expiry = new Date(Date.now() + (credentials.expiry_date || 3600000));
        await user.save();
        
        // Update client credentials with refreshed tokens
        emailClient.setCredentials({
          access_token: credentials.access_token,
          refresh_token: user.gmail_refresh_token
        });
      }
    } catch (refreshError) {
      console.error('Error refreshing token:', refreshError);
      // If refresh fails, mark Gmail as disconnected
      user.gmail_connected = false;
      await user.save();
      return res.status(401).json({ 
        message: 'Gmail authentication expired', 
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
      
      // Return the processed emails
      return res.status(200).json({
        success: true,
        emails: processedEmails,
        connected: true
      });
      console.log(`Updated last sync time for user: ${userId}`);
    } catch (apiError) {
      console.error('Error fetching emails from Gmail API:', apiError);
      return res.status(500).json({ 
        message: 'Error fetching emails', 
        error: apiError.message,
        details: apiError.response?.data || 'No additional details'
      });
    }
    
    // Return the processed emails
    res.status(200).json({ 
      success: true, 
      message: `${processedEmails.length} emails processed`,
      emails: processedEmails,
      connected: true
    });
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

// Get Gmail connection status
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Checking Gmail connection status for user:', userId);
    
    // Check if user exists
    const user = await User.findById(userId, 'gmail_connected gmail_tokens');
    if (!user) {
      console.error('User not found for Gmail status check:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if Gmail is connected
    const isConnected = user.gmail_connected;
    
    console.log('Gmail connection status for user:', userId, isConnected ? 'Connected' : 'Not connected');
    
    res.status(200).json({
      success: true,
      connected: isConnected
    });
  } catch (error) {
    console.error('Error checking Gmail status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check Gmail connection status',
      error: error.message
    });
  }
};

// Get Gmail profile information
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching Gmail profile for user:', userId);
    
    // Check if user exists
    const user = await User.findById(userId, 'gmail_connected gmail_tokens email');
    if (!user) {
      console.error('User not found for Gmail profile fetch:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if Gmail is connected
    if (!user.gmail_connected) {
      console.error('Gmail not connected for user:', userId);
      return res.status(400).json({ message: 'Gmail not connected' });
    }
    
    // Return user profile information
    res.status(200).json({
      success: true,
      user: {
        email: user.email,
        connected: true
      }
    });
  } catch (error) {
    console.error('Error fetching Gmail profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Gmail profile',
      error: error.message
    });
  }
};

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

// Scan emails for phishing threats
exports.scanEmails = async (req, res) => {
  try {
    console.log('Scanning emails for phishing threats...');
    const userId = req.user.id;
    
    // Check if user exists and Gmail is connected
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for email scanning:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.gmail_connected) {
      console.error('Gmail not connected for user:', userId);
      return res.status(400).json({ 
        success: false,
        message: 'Gmail not connected. Please connect your Gmail account first.' 
      });
    }
    
    // Create OAuth client for this user
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      getRedirectUri()
    );
    
    // Set credentials
    oauth2Client.setCredentials({
      access_token: user.gmail_access_token,
      refresh_token: user.gmail_refresh_token,
      expiry_date: user.gmail_token_expiry
    });
    
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
          message_id: message.id,
          user: userId
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
    return res.status(500).json({
      success: false,
      message: 'Failed to scan emails',
      error: error.message
    });
  }
};
