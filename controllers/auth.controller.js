const Admin = require('../models/Admin');
const User = require('../models/Users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

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
            { id: user._id, email: user.email },
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
            if (origin && origin.includes('vercel.app')) {
                cookieOptions.domain = '.email-detection-eight.vercel.app';
            } else if (origin && origin.includes('render.com')) {
                cookieOptions.domain = '.onrender.com';
            }
        }

        res.cookie('token', token, cookieOptions);
        
        // Set token in localStorage via client-side script that runs automatically after redirect
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Redirecting...</title>
            <script>
            // Store the token in localStorage
            localStorage.setItem('token', '${token}');
            console.log('Token saved to localStorage');
            // Store user role
            localStorage.setItem('userRole', 'user');
            console.log('User role saved to localStorage');
            // Redirect to dashboard using relative URL
            window.location.href = '/index.html';
            </script>
        </head>
        <body>
            <p>Signing you in... Please wait.</p>
        </body>
        </html>
        `;
        
        return res.send(html);

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

    // Special handling for admin@emaildetection.com
    if (emailOrUsername === 'admin@emaildetection.com') {
      console.log('Admin login attempt detected');
      
      // Try to find admin with the specific ID first
      account = await Admin.findOne({ _id: '68286e17b547fe6cfc8df917' });
      
      // If not found by ID, try by email as fallback
      if (!account) {
        console.log('Admin not found by specific ID, trying by email');
        account = await Admin.findOne({ email: 'admin@emaildetection.com' });
      }
      
      if (account) {
        role = 'admin';
      }
    } else {
      // Regular flow for non-admin users
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
    }

    // If no account found
    if (!account) {
      console.log('Account not found:', { emailOrUsername });
      return res.status(404).json({ message: 'Account not found.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      console.log('Invalid password for:', { emailOrUsername });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Create JWT token
    let tokenPayload;
    
    // Special handling for admin token to ensure consistent ID
    if (role === 'admin' && account.email === 'admin@emaildetection.com') {
      console.log('Creating admin token with fixed ID');
      tokenPayload = { 
        id: '68286e17b547fe6cfc8df917', 
        email: account.email, 
        role: 'admin' 
      };
    } else {
      tokenPayload = { id: account._id, email: account.email, role };
    }
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set token in cookie
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    };

    // In production, handle cross-origin cookies
    if (process.env.NODE_ENV === 'production') {
        const origin = req.get('origin');
        console.log('Request origin:', origin);
        
        if (origin && origin.includes('vercel.app')) {
            console.log('Request from Vercel frontend');
        } else if (origin && origin.includes('onrender.com')) {
            console.log('Request from Render frontend');
        }
        
        // Don't set domain for cross-origin cookies
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
exports.logout = (req, res) => {
    try {
        // Clear the token cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: new Date(0)
        };

        // In production, set domain based on request origin
        if (process.env.NODE_ENV === 'production') {
            const origin = req.get('origin');
            if (origin && origin.includes('vercel.app')) {
                cookieOptions.domain = '.email-detection-eight.vercel.app';
            } else if (origin && origin.includes('render.com')) {
                cookieOptions.domain = '.onrender.com';
            }
        }

        res.cookie('token', '', cookieOptions);

        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ message: 'Error logging out' });
    }
};

// Check if user is authenticated
exports.checkAuth = async (req, res) => {
  try {
    console.log('Check auth request:', { 
      cookies: req.cookies, 
      authorization: req.headers.authorization ? 'Present' : 'Not present',
      method: req.method,
      url: req.url
    });
    
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.log('No token provided in cookies or authorization header');
      return res.status(401).json({ 
        authenticated: false, 
        message: 'No token provided',
        redirectTo: '/login.html'
      });
    }

    // Verify token format
    if (typeof token !== 'string' || token.trim() === '') {
      console.warn('Invalid token format received');
      return res.status(401).json({ 
        authenticated: false, 
        message: 'Invalid token format',
        redirectTo: '/login.html'
      });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', { id: decoded.id, email: decoded.email });
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError.message);
      return res.status(401).json({ 
        authenticated: false, 
        message: 'Invalid or expired token',
        error: tokenError.message,
        redirectTo: '/login.html'
      });
    }
    
    // Check if the user is an admin
    let user = null;
    let role = null;
    
    try {
      // Handle specific admin ID case
      if (decoded.id === '68286e17b547fe6cfc8df917') {
        console.log('Found specific admin ID match');
        user = await Admin.findOne({ _id: '68286e17b547fe6cfc8df917' });
        if (user) {
          role = 'admin';
        } else {
          // Try to find by email if ID lookup fails
          user = await Admin.findOne({ email: 'admin@emaildetection.com' });
          if (user) {
            role = 'admin';
            console.log('Found admin by email instead of ID');
          }
        }
      } else {
        // Normal flow for other users
        user = await Admin.findById(decoded.id);
        if (user) {
          role = 'admin';
        } else {
          // If not admin, check if it's a regular user
          user = await User.findById(decoded.id);
          if (user) {
            role = 'user';
          }
        }
      }
    } catch (dbError) {
      console.error('Database error when finding user:', dbError);
      return res.status(500).json({ 
        authenticated: false, 
        message: 'Database error when verifying user',
        redirectTo: '/login.html'
      });
    }

    if (!user) {
      console.warn('User not found for id:', decoded.id);
      
      // Check if we have email in token to try recovery
      if (decoded.email) {
        try {
          // Try to find user by email as fallback
          user = await Admin.findOne({ email: decoded.email });
          if (user) {
            role = 'admin';
            console.log('Recovered admin user by email:', decoded.email);
          } else {
            user = await User.findOne({ email: decoded.email });
            if (user) {
              role = 'user';
              console.log('Recovered regular user by email:', decoded.email);
              
              // Issue a new token with correct ID
              const newToken = jwt.sign(
                { id: user._id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
              );
              
              // Set the new token in cookie
              const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
              };
              
              res.cookie('token', newToken, cookieOptions);
              console.log('New token issued and cookie set for recovered user');
              
              // Update token for response
              token = newToken;
            }
          }
        } catch (recoveryError) {
          console.error('Error during user recovery attempt:', recoveryError);
        }
      }
      
      // If still no user, authentication fails
      if (!user) {
        return res.status(401).json({ 
          authenticated: false, 
          message: 'User account not found',
          redirectTo: '/login.html?error=' + encodeURIComponent('account_not_found')
        });
      }
    }

    // Send back user info including role
    const userData = {
      id: user._id,
      username: user.username || user.name || 'User',
      email: user.email,
      role: role
    };
    
    console.log('User authenticated successfully:', userData.email);
    return res.status(200).json({ 
      authenticated: true, 
      message: 'User is authenticated',
      user: userData,
      token: token // Return the token back to help with localStorage sync
    });
  } catch (error) {
    console.error('Unexpected error in checkAuth:', error);
    return res.status(500).json({ 
      authenticated: false, 
      message: 'Authentication error',
      error: error.message,
      redirectTo: '/login.html'
    });
  }
};
