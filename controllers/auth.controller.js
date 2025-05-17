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
        const { credential } = req.body;

        if (!credential) {
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

        // Set token in cookie and redirect
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            domain: '.email-detection-eight.vercel.app'
        });

        return res.redirect('https://email-detection-eight.vercel.app/dashboard');

    } catch (error) {
        console.error('Google sign in error:', error);
        return res.status(500).json({ message: 'Server error during Google sign in' });
    }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Check if the user is an admin
    let account = await Admin.findOne({ email });
    let role = 'admin';

    // If not admin, check if it's a regular user
    if (!account) {
      account = await User.findOne({ email });
      role = 'user';
    }

    // If no account found
    if (!account) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: account._id, role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: '.email-detection-eight.vercel.app'
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: account._id,
        username: account.username,
        email: account.email,
        role
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.signup = async (req, res) => {
  try {
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

    return res.status(201).json({ message: 'User registered successfully.' });

  } catch (error) {
    console.error('Signup error:', error.message);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// Logout function
exports.logout = (req, res) => {
    try {
        // Clear the token cookie
        res.cookie('token', '', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            domain: '.email-detection-eight.vercel.app',
            expires: new Date(0)
        });

        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ message: 'Error logging out' });
    }
};
