const Admin = require('../models/Admin');
const User = require('../models/Users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// Helper function to handle Google user authentication and JWT generation
async function handleGoogleUser(payload, res) {
    try {
        const { email, name, sub: googleId, picture } = payload;
        
        // Check if user exists
        let user = await User.findOne({ email });
        const isNewUser = !user;

        // If user doesn't exist, create new user
        if (!user) {
            user = new User({
                username: name || email.split('@')[0],
                email,
                password: await bcrypt.hash(Math.random().toString(36) + Date.now(), 10),
                googleId,
                profilePicture: picture,
                isEmailVerified: true
            });
            await user.save();
        } else if (googleId && !user.googleId) {
            // If user exists but doesn't have googleId, update it
            user.googleId = googleId;
            if (picture) user.profilePicture = picture;
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
            { expiresIn: '7d' } // Longer expiry for better UX
        );

        // Set cookie options
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined
        };

        // Set token in cookie
        res.cookie('token', token, cookieOptions);

        // Return success response
        return res.status(200).json({
            success: true,
            message: isNewUser ? 'User registered successfully' : 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                profilePicture: user.profilePicture,
                role: user.role || 'user',
                isNewUser
            }
        });

    } catch (error) {
        console.error('Error in handleGoogleUser:', error);
        throw error; // Let the calling function handle the error
    }
}

// Login controller (shared for both Admin and User)
// Google OAuth client configuration
const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET
});

// Function to get the appropriate redirect URI based on environment
function getGoogleRedirectUri() {
  const host = process.env.NODE_ENV === 'production' 
    ? 'https://chd-police-hackathon.onrender.com' 
    : 'http://localhost:3000';
  
  return `${host}/api/auth/google/callback`;
}

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
            body: req.body,
            headers: req.headers
        });
        
        // Handle OAuth redirect flow (GET request)
        if (req.method === 'GET') {
            console.log('Processing Google OAuth redirect');
            
            if (req.query.error) {
                console.error('Google OAuth error:', req.query.error);
                return res.redirect('/login?error=' + encodeURIComponent(req.query.error));
            }
            
            if (req.query.code) {
                try {
                    console.log('Exchanging OAuth code for tokens');
                    const { tokens } = await client.getToken({
                        code: req.query.code,
                        redirect_uri: getGoogleRedirectUri()
                    });
                    
                    client.setCredentials(tokens);
                    const ticket = await client.verifyIdToken({
                        idToken: tokens.id_token,
                        audience: process.env.GOOGLE_CLIENT_ID
                    });
                    
                    const payload = ticket.getPayload();
                    if (!payload.email) {
                        throw new Error('No email in Google payload');
                    }
                    
                    // Process the user (similar to the direct flow below)
                    return await handleGoogleUser(payload, res);
                    
                } catch (error) {
                    console.error('Error in OAuth callback:', error);
                    return res.redirect('/login?error=auth_error');
                }
            }
            
            // If we get here without a code or credential, redirect to login
            return res.redirect('/login');
        }
        
        // Handle direct sign-in flow (POST request)
        let credential = req.body.credential || req.body.id_token;
        
        if (!credential) {
            console.log('No Google credential found in request', req.body);
            return res.status(400).json({ 
                success: false,
                message: 'Google credential not found in request',
                receivedData: Object.keys(req.body)
            });
        }

        try {
            // Verify Google token
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            
            const payload = ticket.getPayload();
            if (!payload.email) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid Google account: No email in token'
                });
            }

            console.log('Successfully verified Google token for:', payload.email);
            
            // Process the user and generate JWT
            return await handleGoogleUser(payload, res);
            
        } catch (error) {
            console.error('Error verifying Google token:', error);
            return res.status(401).json({
                success: false,
                message: 'Failed to authenticate with Google',
                error: error.message
            });
        }

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
      console.log('Invalid password for:', { emailOrUsername });
      return res.status(401).json({ message: 'Invalid credentials.' });
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
            cookieOptions.domain = '.email-detection-eight.vercel.app';
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
