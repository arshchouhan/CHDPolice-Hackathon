const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import models
const Admin = require('./models/Admin');
const User = require('./models/Users');

// Import routes
const userRoutes = require('./routes/user.route');
const adminRoutes = require('./routes/admin.route');
const authRoutes = require('./routes/auth.route');
const gmailRoutes = require('./routes/gmail.route');
const emailAnalysisRoutes = require('./routes/emailAnalysis.route');
const geminiAnalysisRoutes = require('./routes/geminiAnalysis.route');
const ipAnalysisRoutes = require('./routes/ipAnalysis.route');
const ipGeolocationRoutes = require('./routes/ipGeolocation.route');
const attachmentAnalysisRoutes = require('./routes/attachmentAnalysis.route');

// Import middleware
const requireAdmin = require('./middlewares/requireAdmin');

// Initialize Express app
const app = express();

// Detect deployment platform
const isRender = process.env.RENDER || process.env.IS_RENDER || false;

// Set NODE_ENV if not already set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = isRender ? 'production' : 'development';
}

// Essential middleware
app.use(express.json());
app.use(cookieParser());

// CORS Configuration
const corsOptions = {
    origin: function(origin, callback) {
        const allowedOrigins = [
            'https://chdpolice-hackathon.onrender.com',
            'https://chd-police-hackathon.vercel.app',
            'http://localhost:3000',
            'http://localhost:5000'
        ];
        
        // Log request details for debugging
        console.log('CORS Request Details:', {
            origin: origin || 'No origin (direct access)',
            referer: this.req?.headers?.referer,
            host: this.req?.headers?.host,
            secure: this.req?.secure,
            protocol: this.req?.protocol
        });
        
        // Development mode - allow all origins
        if (process.env.NODE_ENV !== 'production') {
            callback(null, true);
            return;
        }
        
        // Production mode - strict origin checking
        if (!origin) {
            // Allow requests with no origin (like mobile apps or curl requests)
            callback(null, true);
            return;
        }
        
        // Check against allowed origins
        if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
            callback(null, true);
            return;
        }
        
        // Check if origin matches host (same-origin)
        const host = this.req?.headers?.host;
        if (host && origin.includes(host)) {
            callback(null, true);
            return;
        }
        
        // Block other origins
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
    exposedHeaders: ['Set-Cookie', 'Authorization'],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 204,
    preflightContinue: false
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
    console.log('Incoming request:', {
        method: req.method,
        path: req.path,
        origin: req.headers.origin,
        cookies: req.headers.cookie ? 'present' : 'absent'
    });
    next();
});

// Authentication middleware
const authenticateUser = (req, res, next) => {
    // Skip auth for public routes and static files
    // Skip auth for public routes and static files
    if (
        req.path === '/' ||
        req.path === '/login' ||
        req.path === '/signup' ||
        req.path.startsWith('/auth/') ||
        req.path === '/health' ||
        req.path.endsWith('.html') ||
        req.path.endsWith('.css') ||
        req.path.endsWith('.js') ||
        // Allow health checks without auth
        (req.path === '/' && req.method === 'HEAD')
    ) {
        console.log('Skipping auth for public path:', req.path);
        return next();
    }

    let token = null;

    // Check Authorization header
    if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } 
    // Check cookies
    else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return req.path.startsWith('/api/') 
            ? res.status(401).json({ message: 'Authentication required', redirectTo: '/login.html' })
            : res.redirect('/login.html');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        // Token refresh logic
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn < 3600) {
            const newToken = jwt.sign(
                { id: decoded.id, email: decoded.email, role: decoded.role },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            const cookieOptions = {
                httpOnly: true,
                secure: true, // Always use secure in production
                sameSite: 'none', // Required for cross-origin
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                domain: '.onrender.com' // Allow sharing between subdomains
            };
            
            console.log('Setting cookie with options:', cookieOptions);
            res.cookie('token', newToken, cookieOptions);
        }

        next();
    } catch (err) {
        console.error('Token verification error:', err);
        return req.path.startsWith('/api/')
            ? res.status(401).json({ message: 'Invalid or expired token', redirectTo: '/login.html' })
            : res.redirect('/login.html');
    }
};

// API Routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes); // Backward compatibility

// Protected API Routes
app.use('/api/users', authenticateUser, userRoutes);
app.use('/api/admin', authenticateUser, requireAdmin, adminRoutes);
app.use('/api/gmail', authenticateUser, gmailRoutes);
app.use('/api/email-analysis', authenticateUser, emailAnalysisRoutes);
app.use('/api/gemini', authenticateUser, geminiAnalysisRoutes);
app.use('/api/ip-analysis', authenticateUser, ipAnalysisRoutes);
app.use('/api/ip-geolocation', authenticateUser, ipGeolocationRoutes);
app.use('/api/attachment', authenticateUser, attachmentAnalysisRoutes);

// Special Gmail OAuth callback route (no auth required)
const gmailController = require('./controllers/gmail.controller');
app.get('/api/gmail/callback', async (req, res) => {
    try {
        await gmailController.handleCallback(req, res);
    } catch (error) {
        console.error('Error in Gmail callback:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during OAuth callback'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    const healthcheck = {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now(),
        environment: process.env.NODE_ENV,
        mongo: {
            status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            readyState: mongoose.connection.readyState
        }
    };
    res.status(healthcheck.mongo.readyState === 1 ? 200 : 503).json(healthcheck);
});

// Static file serving
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    lastModified: true,
    index: false
}));

// API root route with version info
app.get('/', (req, res) => {
    res.json({
        name: 'Email Detection API',
        version: '1.0.0',
        status: 'online',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        endpoints: {
            api: '/api',
            auth: '/auth',
            health: '/health',
            docs: '/api/docs'
        }
    });
});

// HTML routes
const htmlRoutes = [
    { path: '/dashboard', file: 'index.html' },
    { path: '/admin', file: 'admin-dashboard.html' },
    { path: '/login', file: 'login.html' },
    { path: '/signup', file: 'signup.html' }
];

htmlRoutes.forEach(route => {
    app.get(route.path, (req, res) => {
        console.log(`Serving ${route.file} for path ${route.path}`);
        res.sendFile(path.join(__dirname, 'public', route.file));
    });
    // Also handle .html extension
    app.get(`${route.path}.html`, (req, res) => {
        console.log(`Serving ${route.file} for path ${route.path}.html`);
        res.sendFile(path.join(__dirname, 'public', route.file));
    });
});

// 404 handler
app.use((req, res) => {
    if (req.method === 'GET' && !req.path.includes('.')) {
        res.redirect('/login.html');
    } else {
        res.status(404).json({ message: 'Not found' });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
    });
});

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 60000,
            socketTimeoutMS: 120000,
            connectTimeoutMS: 60000,
            heartbeatFrequencyMS: 20000,
            maxPoolSize: 10,
            minPoolSize: 2,
            retryWrites: true,
            w: 'majority',
            wtimeoutMS: 30000
        });
        console.log('MongoDB connected successfully');
        return true;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        if (!isRender) process.exit(1);
        return false;
    }
};

// Server initialization
let server;

const startServer = async () => {
    try {
        await connectDB();
        
        const PORT = process.env.PORT || 3000;
        const HOST = '0.0.0.0';

        server = app.listen(PORT, HOST, () => {
            console.log(`Server running at http://${HOST}:${PORT}/`);
            console.log('Environment:', process.env.NODE_ENV);
            if (isRender) console.log('Running on Render platform');
        });

        return server;
    } catch (error) {
        console.error('Failed to start server:', error);
        throw error;
    }
};

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`${signal} received, initiating graceful shutdown...`);
    
    if (!server) {
        console.log('No server instance found, exiting...');
        process.exit(0);
    }
    
    server.close(() => {
        console.log('Server closed');
        if (!isRender && mongoose.connection.readyState === 1) {
            mongoose.disconnect()
                .then(() => {
                    console.log('MongoDB disconnected');
                    process.exit(0);
                })
                .catch(err => {
                    console.error('Error during shutdown:', err);
                    process.exit(1);
                });
        } else if (isRender) {
            console.log('Running on Render - keeping MongoDB connection alive');
        }
    });

    if (!isRender) {
        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000).unref();
    }
};

// Process event handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (!isRender) process.exit(1);
});

// Start server
startServer()
    .then(() => console.log('Server initialization complete'))
    .catch(error => {
        console.error('Server initialization failed:', error);
        process.exit(1);
    });

// Export app for testing
module.exports = app;