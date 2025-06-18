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

// Trust first proxy for secure cookies behind Render
app.set('trust proxy', 1);

// Essential middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration
const isProd = process.env.NODE_ENV === 'production';

// Define allowed origins based on environment
const allowedOrigins = isProd ? [
    'https://chd-police-hackathon.vercel.app',    // Vercel frontend
    'https://chdpolice-hackathon.onrender.com'     // Render backend
] : [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];

// Enhanced logging function
const logRequest = (req, type, details = {}) => {
    if (!req) {
        console.log(`[${new Date().toISOString()}] ${type}:`, details);
        return;
    }

    const logData = {
        method: req.method,
        path: req.path,
        origin: req.get ? req.get('origin') : req.headers?.origin,
        cookies: req.cookies ? 'present' : 'none',
        headers: {}
    };

    // Safely get headers
    if (req.get) {
        logData.headers = {
            'content-type': req.get('content-type'),
            'accept': req.get('accept'),
            'authorization': req.get('authorization') ? 'present' : 'none'
        };
    } else if (req.headers) {
        logData.headers = {
            'content-type': req.headers['content-type'],
            'accept': req.headers.accept,
            'authorization': req.headers.authorization ? 'present' : 'none'
        };
    }

    console.log(`[${new Date().toISOString()}] ${type}:`, {
        ...logData,
        ...details
    });
};

// Log initial configuration
console.log('[CORS Config]', {
    environment: process.env.NODE_ENV,
    allowedOrigins,
    trustProxy: true,
    cookieSecure: isProd
});

const corsOptions = {
    origin: function(origin, callback) {
        // Log CORS request without req object
        console.log('[CORS Request]', {
            origin: origin || 'No origin',
            environment: process.env.NODE_ENV,
            allowedOrigins
        });
        
        // Handle requests with no origin (like Postman or direct access)
        if (!origin) {
            if (process.env.NODE_ENV === 'development') {
                console.log('[Development Mode] Allowing no origin');
                callback(null, true);
                return;
            }
            console.log('[Production Mode] Blocking no origin');
            callback(new Error('Origin required in production'));
            return;
        }
        
        // Check if origin is allowed
        if (allowedOrigins.includes(origin)) {
            console.log('[CORS] Origin Allowed:', origin);
            callback(null, true);
        } else {
            console.log('[CORS] Origin Blocked:', origin);
            callback(new Error(`CORS: Origin ${origin} not allowed`));
        }
    },
    credentials: true,                 // Required for cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept'
    ],
    exposedHeaders: ['Set-Cookie', 'Authorization'],     // Required for cross-origin cookies and auth
    maxAge: 24 * 60 * 60,               // 24 hours in seconds
    optionsSuccessStatus: 204,          // Standard OPTIONS success status
    preflightContinue: false            // Don't pass OPTIONS to routes
};

// Apply CORS middleware early in the chain
// Request logging middleware
app.use((req, res, next) => {
    // Skip logging for OPTIONS requests
    if (req.method !== 'OPTIONS') {
        logRequest(req, 'Incoming request', {
            query: req.query,
            body: req.method !== 'GET' ? req.body : undefined
        });
    }
    next();
});

// Apply CORS configuration
app.use(cors(corsOptions));

// Log all requests in development
if (!isProd) {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.url}`, {
            headers: req.headers,
            secure: req.secure,
            protocol: req.protocol,
            'x-forwarded-proto': req.get('x-forwarded-proto')
        });
        next();
    });
}

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
    const publicPaths = [
        // API endpoints that don't need auth
        { path: '/api/auth/login', method: 'POST' },
        { path: '/api/auth/signup', method: 'POST' },
        { path: '/api/auth/google', method: ['GET', 'POST'] },
        { path: '/health', method: ['GET', 'HEAD'] },
        // Static files and root
        { path: '/', method: ['GET', 'HEAD'] },
        { path: '/login', method: 'GET' },
        { path: '/signup', method: 'GET' }
    ];

    // Check if the request matches any public path
    const isPublicPath = publicPaths.some(route => {
        const pathMatches = req.path === route.path;
        const methodMatches = Array.isArray(route.method) 
            ? route.method.includes(req.method)
            : route.method === req.method;
        return pathMatches && methodMatches;
    });

    // Also allow all static files
    const isStaticFile = (
        req.path.endsWith('.html') ||
        req.path.endsWith('.css') ||
        req.path.endsWith('.js')
    );

    if (isPublicPath || isStaticFile
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
        
        const PORT = process.env.PORT || 5000; // Backend port changed to 5000
        const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

        server = app.listen(PORT, HOST, () => {
            const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
            console.log(`Server running at http://${displayHost}:${PORT}/`);
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