const Admin = require('../models/Admin');
const User = require('../models/Users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const getCookieConfig = require('../utils/cookieConfig');

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Token generation utility with consistent payload structure
const generateToken = (user, role) => {
    return jwt.sign(
        { 
            id: user._id, 
            email: user.email, 
            role: role,
            iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// Set authentication cookies utility
const setAuthCookies = (res, token, cookieConfig) => {
    // Ensure secure cookie settings
    const secureConfig = {
        ...cookieConfig,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    };

    // Set auth token cookie
    res.cookie('token', token, secureConfig);
    
    // Set session indicator cookie (non-httpOnly for client-side checks)
    const sessionCookie = {
        ...secureConfig,
        httpOnly: false
    };
    res.cookie('sessionActive', 'true', sessionCookie);

    // Set Authorization header for API clients
    res.setHeader('Authorization', `Bearer ${token}`);
};

// Clear authentication cookies utility
const clearAuthCookies = (res, cookieConfig) => {
    const cookieOptions = {
        ...cookieConfig,
        expires: new Date(0),
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    };
    delete cookieOptions.maxAge;

    ['token', 'sessionActive'].forEach(cookieName => {
        // Clear with domain
        res.clearCookie(cookieName, { ...cookieOptions, path: '/' });
        // Clear without domain for local development
        if (process.env.NODE_ENV !== 'production') {
            const localOptions = { ...cookieOptions };
            delete localOptions.domain;
            res.clearCookie(cookieName, { ...localOptions, path: '/' });
        }
    });

    // Clear Authorization header
    res.setHeader('Authorization', '');
};

// Login controller
exports.login = async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;
        
        if (!emailOrUsername || !password) {
            return res.status(400).json({ message: 'Email/username and password are required' });
        }

        const isEmail = emailOrUsername.includes('@');
        let account;
        let role;

        // Check for admin account first
        if (emailOrUsername === 'admin@emaildetection.com') {
            account = await Admin.findOne({ _id: '68286e17b547fe6cfc8df917' }) ||
                     await Admin.findOne({ email: 'admin@emaildetection.com' });
            role = 'admin';
        } else {
            // Check admin collection
            account = await Admin.findOne(
                isEmail ? { email: emailOrUsername } : { username: emailOrUsername }
            );
            if (account) {
                role = 'admin';
            } else {
                // Check user collection
                account = await User.findOne(
                    isEmail ? { email: emailOrUsername } : { username: emailOrUsername }
                );
                role = 'user';
            }
        }

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        const isValidPassword = await bcrypt.compare(password, account.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(account, role);
        const cookieConfig = getCookieConfig(req);
        setAuthCookies(res, token, cookieConfig);

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
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

// Signup controller
exports.signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check existing user
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(409).json({
                message: existingUser.email === email ? 
                    'Email already registered' : 'Username already taken'
            });
        }

        const newUser = new User({ username, email, password });
        await newUser.save();

        const token = generateToken(newUser, 'user');
        const cookieConfig = getCookieConfig(req);
        setAuthCookies(res, token, cookieConfig);

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: 'user'
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during signup'
        });
    }
};

// Google Sign In controller
exports.googleSignIn = async (req, res) => {
    try {
        const { credential } = req.body;
        
        if (!credential) {
            return res.status(400).json({ message: 'Google credential required' });
        }

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const { email, name, picture, sub: googleId } = ticket.getPayload();

        let user = await User.findOne({ email });
        if (!user) {
            user = new User({
                username: name,
                email,
                password: await bcrypt.hash(Math.random().toString(36), 10),
                googleId,
                profilePicture: picture
            });
            await user.save();
        }

        const token = generateToken(user, 'user');
        const cookieConfig = getCookieConfig(req);
        setAuthCookies(res, token, cookieConfig);

        // Return HTML with client-side storage and redirect
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Redirecting...</title>
                <script>
                    localStorage.setItem('token', '${token}');
                    localStorage.setItem('userRole', 'user');
                    window.location.replace('/index.html');
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
        return res.status(500).json({
            success: false,
            message: 'Server error during Google sign in'
        });
    }
};

// Logout controller
exports.logout = async (req, res) => {
    try {
        const cookieConfig = getCookieConfig(req);
        clearAuthCookies(res, cookieConfig);

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully',
            clearLocalStorage: true
        });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error during logout'
        });
    }
};

// Check Authentication controller
exports.checkAuth = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                authenticated: false,
                message: 'No token provided',
                redirectTo: '/login.html'
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (tokenError) {
            const cookieConfig = getCookieConfig(req);
            clearAuthCookies(res, cookieConfig);
            
            return res.status(401).json({
                authenticated: false,
                message: 'Session expired',
                redirectTo: '/login.html?error=session_expired'
            });
        }

        // Find user and handle role-specific logic
        let user;
        let role = decoded.role;

        if (decoded.id === '68286e17b547fe6cfc8df917' || decoded.email === 'admin@emaildetection.com') {
            user = await Admin.findOne({
                $or: [{ _id: '68286e17b547fe6cfc8df917' }, { email: 'admin@emaildetection.com' }]
            });
            role = 'admin';
        } else {
            user = role === 'admin' ?
                await Admin.findById(decoded.id) :
                await User.findById(decoded.id);
        }

        if (!user) {
            const cookieConfig = getCookieConfig(req);
            clearAuthCookies(res, cookieConfig);
            
            return res.status(401).json({
                authenticated: false,
                message: 'User not found',
                redirectTo: '/login.html?error=user_not_found'
            });
        }

        // Check token expiration and refresh if needed
        const timeToExpire = decoded.exp - Math.floor(Date.now() / 1000);
        if (timeToExpire < 3600) { // Less than 1 hour
            const newToken = generateToken(user, role);
            const cookieConfig = getCookieConfig(req);
            setAuthCookies(res, newToken, cookieConfig);
        }

        return res.status(200).json({
            authenticated: true,
            user: {
                id: user._id,
                username: user.username || user.name,
                email: user.email,
                role
            },
            token: timeToExpire < 3600 ? newToken : token
        });
    } catch (error) {
        console.error('Check auth error:', error);
        return res.status(500).json({
            authenticated: false,
            message: 'Server error during authentication check',
            redirectTo: '/login.html'
        });
    }
};
