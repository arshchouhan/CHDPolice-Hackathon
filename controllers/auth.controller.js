const Admin = require('../models/Admin');
const User = require('../models/Users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const logger = require('../utils/logger');

// Login controller (shared for both Admin and User)
// Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Verify Google token
async function verifyGoogleToken(token) {
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        return ticket.getPayload();
    } catch (error) {
        console.error('Error verifying Google token:', error);
        return null;
    }
}

// Handle Google Sign In
exports.googleSignIn = async (req, res) => {
    try {
        console.log('Google sign-in request received:', {
            method: req.method,
            query: req.query,
            body: req.body
        });
        
        // Handle OAuth redirect flow (GET request)
        if (req.method === 'GET') {
            console.log('Processing Google OAuth redirect');
            
            if (req.query.error) {
                console.error('Google OAuth error:', req.query.error);
                return res.redirect('/login.html?error=' + encodeURIComponent(req.query.error));
            }
            
            if (req.query.code) {
                // This is the OAuth code exchange flow
                // For simplicity in this implementation, we'll redirect to login 
                // with a message to use the direct login flow
                console.log('Google OAuth code received, redirecting to login');
                return res.redirect('/login.html?message=please_use_google_button');
            }
            
            // If we get here without a code or credential, redirect to login
            return res.redirect('/login.html');
        }
        
        // Handle direct sign-in flow (POST request)
        let credential;
        
        if (req.body.credential) {
            // One-tap or popup mode - credential comes directly in request body
            credential = req.body.credential;
        } else {
            console.log('No credential found in request', req.body);
            return res.status(400).json({ message: 'Google credential not found' });
        }

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        if (!payload.email) {
            return res.status(400).json({ message: 'Invalid Google account' });
        }

        const email = payload.email;
        console.log('Successfully verified Google token for:', email);

        // Check if user exists
        let user = await User.findOne({ email });

        // If user doesn't exist, create new user
        if (!user) {
            user = new User({
                username: payload.name,
                email: payload.email,
                password: await bcrypt.hash(Math.random().toString(36), 10), // Random password for Google users
                googleId: payload.sub,
                profilePicture: payload.picture
            });
            await user.save();
        }

        // Create JWT token
        const token = jwt.sign(
            { 
                id: user._id, 
                email: user.email,
                role: user.role || 'user'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Set token in session
        req.session.token = token;
        req.session.userId = user._id;
        req.session.save(err => {
            if (err) {
                logger.error('Error saving session:', err);
                // Continue even if session save fails
            }
        });
        
        // Set secure, httpOnly cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined,
            path: '/'
        });

        // Return success response without token in body (it's in cookie and session)
        const userResponse = {
            id: user._id,
            email: user.email,
            username: user.username,
            role: user.role || 'user',
            profilePicture: user.profilePicture
        };
        
        logger.info(`User ${user.email} logged in successfully`, {
            userId: user._id,
            role: user.role
        });
        
        return res.json({
            success: true,
            user: userResponse
        });

    } catch (error) {
        console.error('Google sign in error:', error);
        return res.status(500).json({ message: 'Server error during Google sign in' });
    }
};

exports.login = async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    
    // Handle both the old 'email' parameter and the new 'emailOrUsername' parameter
    // This makes the API backwards compatible with existing clients
    const emailOrUsername = req.body.emailOrUsername || req.body.email;
    const password = req.body.password;
    
    console.log('Normalized credentials:', { emailOrUsername, password: '****' });

    if (!emailOrUsername || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ message: 'Username/Email and password are required.' });
    }

    // Check if the input is an email (contains @ symbol)
    const isEmail = emailOrUsername.includes('@');
    console.log('Input is identified as:', isEmail ? 'email' : 'username');
    let account;
    let role;

    // Check for admin first
    if (isEmail) {
      account = await Admin.findOne({ email: emailOrUsername });
    } else {
      account = await Admin.findOne({ username: emailOrUsername });
    }

    if (account) {
      role = 'admin';
    } else {
      // If not admin, check if it's a regular user
      if (isEmail) {
        account = await User.findOne({ email: emailOrUsername });
      } else {
        account = await User.findOne({ username: emailOrUsername });
      }
      role = 'user';
    }

    // If no account found
    if (!account) {
      console.log('Account not found:', { emailOrUsername });
      return res.status(404).json({ message: 'Account not found.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, account.password);

    if (!isMatch) {
        console.log('Password mismatch for:', emailOrUsername);
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials',
            code: 'INVALID_CREDENTIALS'
        });
    }

    // Create JWT token with user details
    const token = jwt.sign(
      { 
        userId: account._id, 
        email: account.email,
        role: role,
        sessionId: req.sessionID
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Longer expiration for better UX
    );

    // Configure cookie options
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? getCookieDomain() : undefined
    };

    // Set token in both cookie and session
    res.cookie('token', token, cookieOptions);
    
    // Store user info in session
    req.session.user = {
        id: account._id,
        email: account.email,
        username: account.username,
        role: role,
        lastActive: new Date()
    };
    req.session.token = token;

    // Save session to ensure it's stored
    await new Promise((resolve, reject) => {
        req.session.save(err => {
            if (err) {
                console.error('Error saving session:', err);
                return reject(err);
            }
            console.log('Session saved for user:', account._id);
            resolve();
        });
    });

    // Prepare user data for response
    const userData = {
        id: account._id,
        username: account.username,
        email: account.email,
        role: role
    };

    const response = {
        success: true,
        token: token, // For client-side storage if needed
        user: userData,
        sessionId: req.sessionID
    };
    console.log('Sending response:', response);
    return res.status(200).json(response);

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.signup = async (req, res) => {
  try {
    console.log('Signup attempt:', { username: req.body.username, email: req.body.email });
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    // Check if the user already exists
    let existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already taken.' });
    }

    existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    // Create new user
    const newUser = new User({ username, email, password });
    await newUser.save();
    console.log('New user created:', { id: newUser._id, username, email });

    // Automatically log the user in by creating a token
    const token = jwt.sign(
      { id: newUser._id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set token in cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    };

    // In production, set domain based on request origin
    if (process.env.NODE_ENV === 'production') {
      const origin = req.get('origin');
      console.log('Request origin:', origin);
      if (origin && origin.includes('vercel.app')) {
        cookieOptions.domain = '.email-detection-eight.vercel.app';
      } else if (origin && origin.includes('render.com')) {
        cookieOptions.domain = '.onrender.com';
      }
    }

    res.cookie('token', token, cookieOptions);
    console.log('Cookie set on signup');

    // Return success with token
    return res.status(201).json({ 
      success: true,
      message: 'User registered successfully.',
      token: token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: 'user'
      }
    });

  } catch (error) {
    console.error('Signup error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// Helper function to get cookie domain based on environment
function getCookieDomain() {
    if (process.env.NODE_ENV !== 'production') return undefined;
    
    // Handle Vercel preview URLs
    if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
        return `.${process.env.VERCEL_URL}`;
    }
    
    // Handle production domain
    if (process.env.PRODUCTION_DOMAIN) {
        return `.${process.env.PRODUCTION_DOMAIN}`;
    }
    
    // Fallback for Render
    if (process.env.RENDER) {
        return '.onrender.com';
    }
    
    return undefined;
}

// Logout controller
exports.logout = async (req, res) => {
    try {
        const userId = req.user?.id || 'unknown';
        console.log(`[${req.requestId}] Logout request received for user:`, userId);
        
        // Clear the token cookie with proper domain
        const cookieOptions = {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? getCookieDomain() : undefined
        };
        
        // Clear token cookie
        res.clearCookie('token', cookieOptions);
        
        // Clear session cookie
        res.clearCookie('connect.sid', {
            ...cookieOptions,
            path: '/'
        });
        
        // Clear any other auth-related cookies
        res.clearCookie('sessionId', cookieOptions);
        
        // Destroy the session
        if (req.session) {
            await new Promise((resolve) => {
                req.session.destroy(err => {
                    if (err) {
                        console.error(`[${req.requestId}] Error destroying session:`, err);
                    } else {
                        console.log(`[${req.requestId}] Session destroyed for user:`, userId);
                    }
                    resolve();
                });
            });
        }
        
        // For API requests, return JSON response
        if (req.path.startsWith('/api/')) {
            return res.json({ 
                success: true, 
                message: 'Logged out successfully' 
            });
        }
        
        // For HTML requests, redirect to login
        return res.redirect('/login');
        
    } catch (error) {
        console.error(`[${req.requestId}] Logout error:`, error);
        
        // For API requests, return error JSON
        if (req.path.startsWith('/api/')) {
            return res.status(500).json({ 
                success: false, 
                message: 'Logout failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
        
        // For HTML requests, still try to redirect to login
        return res.redirect('/login');
    }
};

// Check if user is authenticated
exports.checkAuth = async (req, res) => {
    const requestId = req.requestId || `req_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
        console.log(`[${requestId}] Check auth request:`, { 
            path: req.path,
            method: req.method,
            hasSession: !!req.session,
            sessionId: req.sessionID,
            hasToken: !!(req.cookies.token || req.headers.authorization)
        });
        
        // Get token from cookies, authorization header, or session
        const token = req.cookies?.token || 
                    (req.headers.authorization && req.headers.authorization.split(' ')[1]) ||
                    req.session?.token;

        if (!token) {
            console.log(`[${requestId}] No authentication token found`);
            return res.status(401).json({ 
                authenticated: false, 
                message: 'No authentication token provided',
                code: 'AUTH_TOKEN_MISSING'
            });
        }

        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log(`[${requestId}] Token verified:`, { 
                userId: decoded.userId, 
                role: decoded.role,
                sessionId: decoded.sessionId
            });
        } catch (error) {
            console.error(`[${requestId}] Token verification failed:`, error.message);
            return res.status(401).json({
                authenticated: false,
                message: 'Invalid or expired token',
                code: 'INVALID_TOKEN',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

        // Check if session ID matches (if present in token)
        if (decoded.sessionId && req.sessionID && decoded.sessionId !== req.sessionID) {
            console.warn(`[${requestId}] Session ID mismatch:`, {
                tokenSessionId: decoded.sessionId,
                currentSessionId: req.sessionID
            });
            // Don't fail here, just log the mismatch as it might be a false positive
        }

        // Find user in database
        let user;
        let role = 'user';
        
        // Try to find user in both Admin and User collections
        user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            user = await Admin.findById(decoded.userId).select('-password');
            if (user) role = 'admin';
        }

        if (!user) {
            console.error(`[${requestId}] User not found for ID:`, decoded.userId);
            return res.status(404).json({
                authenticated: false,
                message: 'User account not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Check if user is active
        if (user.status !== 'active') {
            console.warn(`[${requestId}] User account is not active:`, user._id);
            return res.status(403).json({
                authenticated: false,
                message: 'User account is not active',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        // Update session last active time
        if (req.session) {
            req.session.lastActive = new Date();
            await new Promise((resolve) => {
                req.session.save(err => {
                    if (err) {
                        console.error(`[${requestId}] Error updating session:`, err);
                    }
                    resolve();
                });
            });
        }

        // Prepare user data for response
        const userData = {
            id: user._id,
            username: user.username || user.name || 'User',
            email: user.email,
            role: role,
            lastActive: user.lastActive
        };
        
        console.log(`[${requestId}] Authentication successful for user:`, userData.email);
        
        // Return success response with user data
        return res.status(200).json({
            authenticated: true,
            message: 'Authentication successful',
            user: userData,
            sessionId: req.sessionID,
            token: token // Return the token for client-side storage
        });
        
    } catch (error) {
        console.error(`[${requestId}] Authentication check error:`, error);
        
        // Clear invalid token from cookies
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? getCookieDomain() : undefined
        });
        
        return res.status(500).json({
            authenticated: false,
            message: 'Authentication check failed',
            code: 'AUTH_CHECK_FAILED',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
