const { google } = require('googleapis');
const mongoose = require('mongoose');
const User = require('../models/Users');
const Email = require('../models/Email');
const logger = require('../utils/logger');

/**
 * Check if Gmail is connected for the current user
 */
exports.getStatus = async (req, res) => {
    const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
        // Log the status check request
        logger.info(`[${requestId}] getStatus called`, {
            userId: req.user?.id,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        // Check if user is authenticated
        if (!req.user?.id) {
            logger.error(`[${requestId}] Unauthorized: No user in request`);
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED',
                requestId
            });
        }

        // Find the user in the database
        const user = await User.findById(req.user.id).select('gmailConnected gmailEmail');
        if (!user) {
            logger.error(`[${requestId}] User not found`, { userId: req.user.id });
            return res.status(404).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND',
                requestId
            });
        }

        // Return the connection status
        logger.info(`[${requestId}] Gmail status retrieved`, {
            userId: user._id,
            connected: !!user.gmailConnected,
            email: user.gmailEmail
        });

        return res.status(200).json({
            success: true,
            connected: !!user.gmailConnected,
            email: user.gmailEmail || null,
            requestId
        });

    } catch (error) {
        logger.error(`[${requestId}] Error checking Gmail status`, {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        
        return res.status(500).json({
            success: false,
            message: 'Failed to check Gmail status',
            code: 'GMAIL_STATUS_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            requestId
        });
    }
};

// Validate required environment variables
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'JWT_SECRET',
  'MONGODB_URI'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
  logger.error(errorMsg);
  throw new Error(errorMsg);
}

// Create OAuth2 client with proper redirect URI
const getRedirectUri = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://email-detection-api.onrender.com/api/gmail/callback';
  }
  return 'http://localhost:3000/api/gmail/callback';
};

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  getRedirectUri()
);

// Generate Gmail OAuth URL
exports.getAuthUrl = (req, res) => {
  const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Log the incoming request details for debugging
    logger.info(`[${requestId}] getAuthUrl called`, { 
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    // Check if user is authenticated
    if (!req.user?.id) {
      const errorMsg = 'User not authenticated for Gmail auth';
      logger.error(`[${requestId}] ${errorMsg}`, { 
        headers: req.headers,
        session: req.session
      });
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        requestId
      });
    }

    // Validate required environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      const errorMsg = 'Missing Google OAuth configuration';
      logger.error(`[${requestId}] ${errorMsg}`, {
        clientId: !!process.env.GOOGLE_CLIENT_ID,
        clientSecret: !!process.env.GOOGLE_CLIENT_SECRET
      });
      return res.status(500).json({
        success: false,
        message: 'Server configuration error',
        code: 'SERVER_ERROR',
        requestId
      });
    }

    const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
    const state = req.user.id;
    
    // Log the OAuth configuration for debugging
    logger.info(`[${requestId}] OAuth Configuration`, {
      clientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
      redirectUri: getRedirectUri(),
      state: state,
      nodeEnv: process.env.NODE_ENV
    });

    // Generate the OAuth URL
    let authUrl;
    try {
      authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: state,
        include_granted_scopes: true
      });
      
      logger.info(`[${requestId}] Successfully generated auth URL for user ${req.user.id}`);
      logger.debug(`[${requestId}] Auth URL:`, authUrl);
      return res.json({ success: true, authUrl, redirectUri: getRedirectUri() });
      
    } catch (generateError) {
      logger.error(`[${requestId}] Error generating auth URL`, { 
        error: generateError.message,
        stack: generateError.stack 
      });
      throw new Error(`Failed to generate OAuth URL: ${generateError.message}`);
    }
    
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
  console.log('OAuth callback received with query params:', req.query);
  
  const { code, state: userId, error } = req.query;

  if (error) {
    console.error('OAuth error:', error);
    return res.redirect(`/dashboard?oauth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    console.error('No authorization code received');
    return res.redirect('/dashboard?oauth_error=no_code');
  }

  if (!userId) {
    console.error('No user ID in state parameter');
    return res.redirect('/dashboard?oauth_error=invalid_state');
  }

  try {
    console.log('Exchanging authorization code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Tokens received, updating user record...');
    
    oauth2Client.setCredentials(tokens);

    const updateData = {
      gmailAccessToken: tokens.access_token,
      gmailTokenExpiry: tokens.expiry_date,
      gmailConnected: true,
      lastGmailSync: new Date()
    };
    
    // Only update refresh token if we got one (won't be present on subsequent authorizations)
    if (tokens.refresh_token) {
      updateData.gmailRefreshToken = tokens.refresh_token;
    }

    await User.findByIdAndUpdate(userId, updateData);

    console.log(`Successfully connected Gmail for user ${userId}`);
    res.redirect('/dashboard?gmail_connected=true');

  } catch (error) {
    console.error('Error in OAuth callback:', error);
    const errorMessage = error.message || 'Unknown error during OAuth callback';
    res.redirect(`/dashboard?oauth_error=${encodeURIComponent(errorMessage)}`);
  }
};


// Handle OAuth callback
exports.handleCallback = async (req, res) => {
  console.log('OAuth callback received with query params:', req.query);
  console.log('Request URL:', req.originalUrl);
  console.log('Request method:', req.method);
  
  // Get the frontend URL from environment variable or default based on environment
  const getFrontendUrl = () => {
    // Check if a specific URL is provided in the query parameters
    const referer = req.headers.referer || '';
    
    // If the referer contains vercel.app, use that as the frontend URL
    if (referer.includes('vercel.app')) {
      const vercelUrl = new URL(referer).origin;
      console.log('Using Vercel URL from referer:', vercelUrl);
      return vercelUrl;
    }
    
    // If FRONTEND_URL is set in environment variables, use that
    if (process.env.FRONTEND_URL) {
      console.log('Using FRONTEND_URL from env:', process.env.FRONTEND_URL);
      return process.env.FRONTEND_URL;
    }
    
    // Always prefer the Vercel URL for production-like environments
    // This ensures callbacks go to the Vercel deployment
    const vercelUrl = 'https://chd-police-hackathon.vercel.app';
    console.log('Using default Vercel URL:', vercelUrl);
    return vercelUrl;
  };
  
  const frontendUrl = getFrontendUrl();
  console.log('Frontend URL for callback:', frontendUrl);
  
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
      
      // Get user data to pass back to frontend
      let userData = null;
      try {
        const user = await User.findById(userId).select('username email _id');
        if (user) {
          userData = {
            id: user._id,
            email: user.email,
            username: user.username
          };
        }
      } catch (userError) {
        console.error('Error fetching user data:', userError);
      }

      // Generate a new JWT token for the user to maintain session
      let newToken = '';
      try {
        if (userData) {
          newToken = jwt.sign(
            { id: userData.id },
            process.env.JWT_SECRET || 'default_jwt_secret',
            { expiresIn: '24h' }
          );
          console.log('Generated new JWT token for user');
        }
      } catch (tokenError) {
        console.error('Error generating JWT token:', tokenError);
      }

      // Return HTML response with success message and improved redirection
      return res.send(`
        <html>
          <head>
            <title>Gmail Connected Successfully</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f5f5f5; }
              .container { background-color: white; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #4285F4; }
              .success-icon { font-size: 64px; color: #34A853; margin-bottom: 20px; }
              .btn { display: inline-block; background-color: #4285F4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
              .btn:hover { background-color: #3367D6; }
              .redirect-text { margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">✓</div>
              <h1>Gmail Connected Successfully</h1>
              <p>Your Gmail account has been successfully connected to the application.</p>
              <p>You will now be able to scan and analyze your emails for security threats.</p>
              <a href="${frontendUrl}/index.html?connected=true&redirect=dashboard" class="btn" id="dashboardBtn">Return to Dashboard</a>
              <p class="redirect-text">Redirecting automatically in <span id="countdown">3</span> seconds...</p>
            </div>
            
            <script>
              // Ensure we're running in a browser context
              try {
                // Store success status and authentication data in localStorage
                localStorage.setItem('gmailConnected', 'true');
                localStorage.setItem('gmailConnectTime', Date.now());
                
                // Store user data and token if available
                ${userData ? `localStorage.setItem('userData', '${JSON.stringify(userData)}');` : ''}
                ${newToken ? `localStorage.setItem('token', '${newToken}');` : ''}
                
                // Countdown timer
                let seconds = 3;
                const countdownElement = document.getElementById('countdown');
                const countdownInterval = setInterval(() => {
                  seconds--;
                  countdownElement.textContent = seconds;
                  if (seconds <= 0) {
                    clearInterval(countdownInterval);
                  }
                }, 1000);
                
                // Set up dashboard button click handler
                document.getElementById('dashboardBtn').addEventListener('click', function(e) {
                  e.preventDefault();
                  redirectToDashboard();
                });
              } catch (e) {
                console.error('Error setting localStorage:', e);
              }
              
              // Function to handle redirection
              function redirectToDashboard() {
                try {
                  console.log('Redirecting to dashboard...');
                  // Force the redirect with replace() instead of href assignment
                  window.location.replace('${frontendUrl}/index.html?connected=true&redirect=dashboard&token=${encodeURIComponent(newToken)}');
                } catch (e) {
                  console.error('Redirect error:', e);
                  // Fallback redirect method
                  document.location.href = '${frontendUrl}/index.html?connected=true&redirect=dashboard&token=${encodeURIComponent(newToken)}';
                }
              }
              
              // Auto-redirect after 3 seconds
              setTimeout(redirectToDashboard, 3000);
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
  if (score < 60) return 'Medium';
  if (score < 90) return 'High';
  return 'Critical';
}

/**
 * Get Gmail connection status and email statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
exports.getStatus = async (req, res) => {
  let user;
  let session;
  const startTime = Date.now();
  const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log request start
  logger.info(`[${requestId}] Gmail status check started`, {
    userId: req.user?.id,
    params: req.params,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Start a session for atomic operations
    session = await mongoose.startSession();
    await session.startTransaction();
    
    const userId = req.params.userId || req.user?.id;
    
    if (!userId) {
      const error = new Error('User ID is required');
      error.code = 'MISSING_USER_ID';
      error.status = 400;
      throw error;
    }

    // Check if user exists with enhanced logging
    logger.debug(`[${requestId}] Fetching user with ID: ${userId}`);
    user = await User.findById(userId).session(session).lean();
    
    if (!user) {
      const error = new Error(`User not found with ID: ${userId}`);
      error.code = 'USER_NOT_FOUND';
      error.status = 404;
      throw error;
    }
    
    logger.debug(`[${requestId}] User found: ${user.email || user._id}`, {
      gmailConnected: !!user.gmail_connected,
      hasAccessToken: !!user.gmail_access_token
    });

    // Check if Gmail is connected
    if (!user.gmail_connected || !user.gmail_access_token) {
      logger.info(`[${requestId}] Gmail not connected for user: ${userId}`);
      
      try {
        const emailCount = await Email.countDocuments({ user: user._id }).session(session);
        
        await session.commitTransaction();
        
        const response = {
          success: true,
          connected: false,
          message: 'Gmail not connected',
          lastSync: user.last_email_sync,
          emailCount,
          requestId,
          responseTime: Date.now() - startTime
        };
        
        logger.info(`[${requestId}] Gmail status check completed`, {
          status: 'success',
          connected: false,
          responseTime: response.responseTime
        });
        
        return res.status(200).json(response);
      } catch (countError) {
        await session.abortTransaction();
        logger.error(`[${requestId}] Error counting emails:`, countError);
        throw countError;
      } finally {
        await session.endSession();
      }
    }

    // Try to get profile to verify token is still valid
    try {
      // Configure OAuth client with current credentials
      oauth2Client.setCredentials({
        access_token: user.gmail_access_token,
        refresh_token: user.gmail_refresh_token,
        expiry_date: user.gmail_token_expiry?.getTime()
      });
      
      // Check if token is expired
      const isTokenExpired = user.gmail_token_expiry && user.gmail_token_expiry < new Date();
      
      // If token is expired and we have a refresh token, try to refresh it
      if (isTokenExpired && user.gmail_refresh_token) {
        try {
          logger.info(`Token expired for user ${userId}, attempting to refresh...`);
          const { credentials } = await oauth2Client.refreshAccessToken();
          
          // Update user with new tokens
          await User.findByIdAndUpdate(userId, {
            gmail_access_token: credentials.access_token,
            gmail_token_expiry: new Date(credentials.expiry_date),
            ...(credentials.refresh_token && { gmail_refresh_token: credentials.refresh_token })
          });
          
          logger.info(`Successfully refreshed token for user: ${userId}`);
          
          // Update local user object with new token info
          user.gmail_access_token = credentials.access_token;
          user.gmail_token_expiry = new Date(credentials.expiry_date);
          if (credentials.refresh_token) {
            user.gmail_refresh_token = credentials.refresh_token;
          }
        } catch (refreshError) {
          logger.error(`Failed to refresh token for user ${userId}:`, refreshError);
          
          // If refresh fails, disconnect Gmail
          await User.findByIdAndUpdate(userId, {
            gmail_connected: false,
            gmail_access_token: undefined,
            gmail_refresh_token: undefined,
            gmail_token_expiry: undefined
          });
          
          return res.status(200).json({
            success: true,
            connected: false,
            message: 'Gmail session expired. Please reconnect your account.',
            code: 'TOKEN_REFRESH_FAILED',
            lastSync: user.last_email_sync,
            emailCount: await Email.countDocuments({ userId: user._id })
          });
        }
      }
      
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Get profile to verify token
      const profile = await gmail.users.getProfile({
        userId: 'me',
        fields: 'emailAddress'
      }).catch(profileError => {
        logger.error(`Failed to get Gmail profile for user ${userId}:`, profileError);
        throw new Error('Failed to fetch Gmail profile');
      });

      // Get unread count
      const unread = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 1
      }).catch(unreadError => {
        logger.warn(`Failed to get unread count for user ${userId}:`, unreadError);
        return { data: { resultSizeEstimate: 0 } }; // Default to 0 if we can't get unread count
      });

      // Get total email count
      const allEmails = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1
      }).catch(emailError => {
        logger.warn(`Failed to get total email count for user ${userId}:`, emailError);
        return { data: { resultSizeEstimate: 0 } }; // Default to 0 if we can't get total count
      });

      logger.info(`Successfully verified Gmail connection for user: ${userId}`);
      
      return res.status(200).json({
        success: true,
        connected: true,
        email: profile.data.emailAddress,
        messagesTotal: allEmails.data.resultSizeEstimate || 0,
        unreadCount: unread.data.resultSizeEstimate || 0,
        lastSync: user.last_email_sync,
        emailCount: await Email.countDocuments({ userId: user._id }),
        tokenExpiry: user.gmail_token_expiry?.toISOString(),
        tokenExpired: false
      });
      
    } catch (error) {
      logger.error(`Error verifying Gmail token for user ${userId}:`, error);
      
      // If token is invalid or expired, update user status
      if (error.code === 401 || error.message.includes('Invalid Credentials')) {
        logger.warn(`Invalid or expired token for user: ${userId}`);
        
        await User.findByIdAndUpdate(userId, {
          gmail_connected: false,
          gmail_access_token: undefined,
          gmail_refresh_token: undefined,
          gmail_token_expiry: undefined
        });
        
        return res.status(200).json({
          success: true,
          connected: false,
          message: 'Gmail session expired. Please reconnect your account.',
          code: 'TOKEN_EXPIRED',
          lastSync: user.last_email_sync,
          emailCount: await Email.countDocuments({ userId: user._id })
        });
      }
      
      // Handle MongoDB errors
      if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        await session.abortTransaction();
        return res.status(503).json({
          success: false,
          message: 'Database service unavailable',
          code: 'DATABASE_ERROR',
          retryable: true,
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          errors: error.errors
        });
      }
      
      // Default error response
      await session.abortTransaction();
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred while checking Gmail status',
        code: 'INTERNAL_SERVER_ERROR',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        retryable: false
      });
    }
  } catch (error) {
    const errorId = `err_${Math.random().toString(36).substr(2, 9)}`;
    const errorResponse = {
      success: false,
      message: error.message || 'An unexpected error occurred',
      code: error.code || 'INTERNAL_ERROR',
      requestId,
      errorId,
      timestamp: new Date().toISOString()
    };
    
    // Log the error with context
    logger.error(`[${requestId}] Error in getStatus (${errorId}):`, {
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack,
        name: error.name
      },
      userId: user?._id,
      responseTime: Date.now() - startTime
    });
    
    // Set appropriate status code
    let statusCode = 500;
    
    switch (error.code) {
      case 'MISSING_USER_ID':
      case 'VALIDATION_ERROR':
        statusCode = 400;
        break;
      case 'USER_NOT_FOUND':
        statusCode = 404;
        break;
      case 'SERVICE_UNAVAILABLE':
      case 'DATABASE_ERROR':
        statusCode = 503;
        errorResponse.retryable = true;
        break;
      case 'TOKEN_EXPIRED':
      case 'TOKEN_REFRESH_FAILED':
        statusCode = 401;
        errorResponse.retryable = true;
        break;
      default:
        if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          statusCode = 503;
          errorResponse.code = 'SERVICE_UNAVAILABLE';
          errorResponse.retryable = true;
        } else if (error.status) {
          statusCode = error.status;
        }
    }
    
    // Clean up sensitive information in production
    if (process.env.NODE_ENV !== 'development') {
      delete errorResponse.error;
    }
    
    // Send error response
    return res.status(statusCode).json(errorResponse);
  } finally {
    try {
      // Always end the session in the finally block
      if (session) {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        await session.endSession();
      }
    } catch (sessionError) {
      logger.error(`[${requestId}] Error cleaning up session:`, sessionError);
    }
    
    // Log request completion
    logger.info(`[${requestId}] Request completed`, {
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
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
    try {
      // Always end the session in the finally block
      if (session) {
        await session.endSession();
      }
    } catch (sessionError) {
      logger.error('Error ending session:', sessionError);
    }
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
