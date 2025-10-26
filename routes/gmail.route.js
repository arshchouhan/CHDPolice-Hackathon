import { Router } from 'express';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { requireAuth } from '../middlewares/auth.js';
import config from '../config/config.js';
const { 
  jwtSecret: JWT_SECRET, 
  googleClientId: GOOGLE_CLIENT_ID, 
  googleClientSecret: GOOGLE_CLIENT_SECRET,
  frontendUrl: BASE_URL
} = config;

const router = Router();

// Initialize OAuth2 client
const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${BASE_URL}/api/gmail/oauth2callback`
);

/**
 * @route   GET /api/gmail/auth
 * @desc    Generate Google OAuth URL and redirect to it
 * @access  Private
 */
router.get('/auth', requireAuth, (req, res) => {
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      prompt: 'consent',
      state: req.user.id // Include user ID in state for verification
    });

    res.json({ success: true, url });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ success: false, message: 'Error generating authentication URL' });
  }
});

/**
 * @route   GET /api/gmail/oauth2callback
 * @desc    OAuth2 callback handler
 * @access  Public
 */
router.get('/oauth2callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query;
    
    if (!code || !userId) {
      return res.status(400).send('Missing required parameters');
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email from Google
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2'
    });
    
    const { data: { email } } = await oauth2.userinfo.get();

    // Update user in database
    await User.findByIdAndUpdate(userId, {
      gmail_connected: true,
      gmail_email: email,
      gmail_tokens: tokens,
      last_email_sync: new Date()
    });

    // Redirect to frontend with success status
    res.redirect(`${BASE_URL}/dashboard?gmail_connected=true`);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.redirect(`${BASE_URL}/dashboard?gmail_connected=false&error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * @route   GET /api/gmail/emails
 * @desc    Get user's emails from Gmail
 * @access  Private
 */
router.get('/emails', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || !user.gmail_tokens) {
      return res.status(400).json({
        success: false,
        message: 'Gmail not connected. Please connect your Gmail account first.'
      });
    }

    // Set credentials from stored tokens
    oauth2Client.setCredentials(user.gmail_tokens);
    
    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Fetch emails (simplified example - fetches last 10 emails)
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'in:inbox'
    });

    const messages = response.data.messages || [];
    
    // Get full message details for each email
    const emails = await Promise.all(
      messages.map(async (message) => {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });
        return email.data;
      })
    );

    // Update last sync time
    await User.findByIdAndUpdate(req.user.id, {
      last_email_sync: new Date()
    });

    res.json({ success: true, emails });
  } catch (error) {
    console.error('Error fetching emails:', error);
    
    // Handle token expiration
    if (error.message.includes('invalid_grant') || error.message.includes('Token has been expired or revoked')) {
      await User.findByIdAndUpdate(req.user.id, {
        gmail_connected: false,
        gmail_tokens: null
      });
      
      return res.status(401).json({
        success: false,
        message: 'Gmail session expired. Please reconnect your account.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emails',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/gmail/status
 * @desc    Get Gmail connection status
 * @access  Private
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id, 'gmail_connected last_email_sync gmail_email');
    
    res.json({
      success: true,
      gmail_connected: user.gmail_connected || false,
      last_sync: user.last_email_sync,
      email: user.gmail_email
    });
  } catch (error) {
    console.error('Error checking Gmail status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check Gmail status'
    });
  }
});

/**
 * @route   POST /api/gmail/disconnect
 * @desc    Disconnect Gmail account
 * @access  Private
 */
router.post('/disconnect', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      gmail_connected: false,
      gmail_tokens: null,
      gmail_email: null
    });
    
    res.json({
      success: true,
      message: 'Gmail account disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Gmail account'
    });
  }
});

export default router;
