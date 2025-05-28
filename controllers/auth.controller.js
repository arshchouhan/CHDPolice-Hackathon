const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/Users');
const Admin = require('../models/Admin');

// Login controller
exports.login = async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;

        // Input validation
        if (!emailOrUsername || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Please provide both email/username and password'
            });
        }

        // Find user by email or username
        const user = await User.findOne({
            $or: [
                { email: emailOrUsername.toLowerCase() },
                { username: emailOrUsername.toLowerCase() }
            ]
        });

        // Check if user exists
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
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

        // Set HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role || 'user'
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        // Ensure we always return JSON
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Check authentication status
exports.checkAuth = async (req, res) => {
    try {
        // Get token from cookies or Authorization header
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                isAuthenticated: false,
                message: 'No authentication token found'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({
                isAuthenticated: false,
                message: 'User not found'
            });
        }

        // Return user data
        res.status(200).json({
            isAuthenticated: true,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role || 'user'
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                isAuthenticated: false,
                message: 'Invalid token'
            });
        }
        console.error('Auth check error:', error);
        res.status(500).json({
            isAuthenticated: false,
            message: 'Error checking authentication status'
        });
    }
};

// Logout controller
exports.logout = (req, res) => {
    try {
        // Clear the token cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout'
        });
    }
};

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
    console.log('Login attempt received:', {
      body: req.body,
      headers: req.headers,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    // Handle both the old 'email' parameter and the new 'emailOrUsername' parameter
    const emailOrUsername = req.body.emailOrUsername || req.body.email;
    const password = req.body.password;
    
    console.log('Normalized credentials:', { 
      emailOrUsername, 
      passwordProvided: !!password // Just log if password was provided, not the actual password
    });

    if (!emailOrUsername || !password) {
      const error = new Error('Missing credentials');
      error.code = 'MISSING_CREDENTIALS';
      error.details = {
        emailOrUsername: !emailOrUsername ? 'Missing' : 'Provided',
        password: !password ? 'Missing' : 'Provided'
      };
      throw error;
    }

    // Check if the input is an email (contains @ symbol)
    const isEmail = emailOrUsername.includes('@');
    console.log('Input is identified as:', isEmail ? 'email' : 'username');
    let account;
    let role;

    try {
      // Check for admin first
      console.log('Searching for admin with:', isEmail ? 'email' : 'username', emailOrUsername);
      if (isEmail) {
        account = await Admin.findOne({ email: emailOrUsername });
      } else {
        account = await Admin.findOne({ username: emailOrUsername });
      }

      if (account) {
        console.log('Admin account found:', { id: account._id, email: account.email });
        role = 'admin';
      } else {
        // If not admin, check if it's a regular user
        console.log('No admin found, searching for user with:', isEmail ? 'email' : 'username', emailOrUsername);
        if (isEmail) {
          account = await User.findOne({ email: emailOrUsername });
        } else {
          account = await User.findOne({ username: emailOrUsername });
        }
        role = 'user';
      }

      // If no account found
      if (!account) {
        console.log('No account found with:', { emailOrUsername });
        return res.status(404).json({ 
          success: false,
          message: 'Account not found.',
          code: 'ACCOUNT_NOT_FOUND',
          details: process.env.NODE_ENV === 'development' ? `No ${isEmail ? 'email' : 'username'} found: ${emailOrUsername}` : undefined
        });
      }
    } catch (dbError) {
      console.error('Database error during login:', dbError);
      throw new Error('Database error during login');
    }

    // Compare password with detailed logging
    console.log('Comparing password for user:', emailOrUsername);
    console.log('Stored password hash exists:', account.password ? 'Yes' : 'No');
    
    try {
        const isMatch = await bcrypt.compare(password, account.password);
        console.log('Password comparison result:', isMatch);

        if (!isMatch) {
            console.log('Password mismatch for user:', emailOrUsername);
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS',
                details: process.env.NODE_ENV === 'development' ? {
                    message: 'Password comparison failed',
                    userExists: true,
                    hashExists: !!account.password
                } : undefined
            });
        }
    } catch (bcryptError) {
        console.error('Error comparing passwords:', bcryptError);
        return res.status(500).json({
            success: false,
            error: 'Authentication error',
            code: 'AUTH_ERROR',
            details: process.env.NODE_ENV === 'development' ? {
                message: bcryptError.message,
                stack: bcryptError.stack
            } : undefined
        });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: account._id, role },
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
            // Match any Vercel subdomain
            cookieOptions.domain = '.vercel.app';
            // For Vercel, we need to set SameSite=None and Secure=true
            cookieOptions.sameSite = 'none';
            cookieOptions.secure = true;
        } else if (origin && origin.includes('render.com')) {
            cookieOptions.domain = '.onrender.com';
        }
        console.log('Cookie options:', cookieOptions);
    }

    res.cookie('token', token, cookieOptions);
    console.log('Cookie set successfully');

    const response = {
      success: true,
      token: token, // Include the token in the response for the client
      user: {
        id: account._id,
        username: account.username,
        email: account.email,
        role
      }
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

// Logout function
exports.logout = async (req, res) => {
    try {
        // Clear the token cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined,
            path: '/'
        });
        
        // Destroy the session
        if (req.session) {
            req.session.destroy(err => {
                if (err) {
                    logger.error('Error destroying session:', err);
                }
                // Clear the session cookie
                res.clearCookie('connect.sid', {
                    path: '/',
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
                });
                
                logger.info('User logged out successfully', { userId: req.user?.id });
                res.json({ success: true, message: 'Logged out successfully' });
            });
        } else {
            res.json({ success: true, message: 'Logged out successfully' });
        }
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Logout failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Check if user is authenticated
exports.checkAuth = async (req, res) => {
  try {
    console.log('Check auth request:', { 
      cookies: req.cookies, 
      authorization: req.headers.authorization,
      method: req.method,
      url: req.url
    });
    
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.log('No token provided in cookies or authorization header');
      return res.status(401).json({ authenticated: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', { id: decoded.id, role: decoded.role });
    
    // Check if the user is an admin
    let user = await Admin.findById(decoded.id);
    let role = 'admin';

    // If not admin, check if it's a regular user
    if (!user) {
      user = await User.findById(decoded.id);
      role = 'user';
    }

    if (!user) {
      console.log('User not found for id:', decoded.id);
      return res.status(404).json({ authenticated: false, message: 'User not found' });
    }

    // Send back user info including role
    const userData = {
      id: user._id,
      username: user.username || user.name || 'User',
      email: user.email,
      role: role
    };
    
    console.log('User authenticated:', userData);
    return res.status(200).json({ 
      authenticated: true, 
      message: 'User is authenticated',
      user: userData,
      token: token // Return the token back to help with localStorage sync
    });
  } catch (error) {
    console.error('Error in checkAuth:', error);
    return res.status(401).json({ authenticated: false, message: 'Failed to authenticate token', error: error.message });
  }
};
