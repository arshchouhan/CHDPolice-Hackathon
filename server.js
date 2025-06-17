const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const Admin = require('./models/Admin');
const User = require('./models/Users');
require('dotenv').config();

// Detect deployment platform
const isRender = process.env.RENDER || process.env.IS_RENDER || false;
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV || false;

// Set NODE_ENV if not already set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = isRender || isVercel ? 'production' : 'development';
}

// Set platform-specific environment variables
if (isRender) {
    process.env.RENDER = 'true';
    console.log('Running on Render platform');
} else if (isVercel) {
    process.env.VERCEL = 'true';
    console.log('Running on Vercel platform');
} else {
    console.log('Running on local/other platform');
}

const app = express();

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

// Essential middleware
app.use(express.json());
app.use(cookieParser());

// API root route
app.get('/', (req, res) => {
    res.json({
        message: 'Email Detection API Server',
        status: 'online',
        version: '1.0.0',
        documentation: '/api/docs',
        health: '/health'
    });
});

// Consolidated CORS configuration
const corsOptions = {
    origin: function(origin, callback) {
        const allowedOrigins = [
            'https://chdpolice-hackathon.onrender.com',
            'https://chd-police-hackathon.vercel.app',
            'https://chd-police-hackathon-lqqap4n5b-arsh-chauhans-projects-1f436a49.vercel.app',
            'http://localhost:3000',
            'http://localhost:5000'
        ];
        
        console.log('Request origin:', origin || 'No origin (direct access)');
        
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Origin', 
        'Accept',
        'X-Requested-With',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Credentials'
    ],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400
};

// Apply CORS configuration
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Authentication middleware
const authenticateUser = (req, res, next) => {
    // Skip auth for static files and public routes
    if (
        req.path === '/' ||
        req.path === '/login' ||
        req.path === '/signup' ||
        req.path.startsWith('/auth/') ||
        req.path.endsWith('.html') ||
        req.path.endsWith('.ico') ||
        req.path.endsWith('.css') ||
        req.path.endsWith('.js')
    ) {
        return next();
    }
    
    console.log('Auth check for:', req.path, {
        cookies: req.cookies ? 'present' : 'absent',
        authorization: req.headers.authorization ? 'present' : 'absent'
    });
    
    // Try to get token from multiple sources
    let token = null;
    
    // Check Authorization header first
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
        console.log('Found token in Authorization header');
    } 
    // Then check cookies
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
        console.log('Found token in cookies');
    }
    
    if (!token) {
        console.log('No token found in request');
        // For API requests, return 401
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ 
                message: 'Authentication required',
                redirectTo: '/login.html'
            });
        }
        // For other requests, redirect to login
        return res.redirect('/login.html');
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        
        // Refresh token if it's close to expiring (within 1 hour)
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn < 3600) { // Less than 1 hour left
            console.log('Token close to expiry, refreshing...');
            const newToken = jwt.sign(
                { id: decoded.id, email: decoded.email, role: decoded.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            // Set new token in cookie with appropriate options
            res.cookie('token', newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });
        }
        
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        // For API requests, return 401
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ 
                message: 'Invalid or expired token',
                redirectTo: '/login.html'
            });
        }
        // For other requests, redirect to login
        return res.redirect('/login.html');
    }
};

// Register authentication routes (no auth required)
app.use('/api/auth', authRoutes);
// Also register auth routes at /auth for backward compatibility
app.use('/auth', authRoutes);



// Register API routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/email-analysis', emailAnalysisRoutes);
app.use('/api/gemini', geminiAnalysisRoutes);
app.use('/api/ip-analysis', ipAnalysisRoutes);

// Health check endpoint for Render deployment
app.get('/health', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
        mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };
    try {
        res.status(200).json(healthcheck);
    } catch (error) {
        healthcheck.message = error;
        res.status(503).json(healthcheck);
    }
});

// Apply authentication middleware to protected API routes
app.use('/api/users', authenticateUser, userRoutes);
app.use('/api/admin', authenticateUser, adminRoutes);
app.use('/api/gemini', authenticateUser, geminiAnalysisRoutes);
app.use('/api/ip-analysis', authenticateUser, ipAnalysisRoutes);
app.use('/api/ip-geolocation', authenticateUser, ipGeolocationRoutes);
app.use('/api/attachment', authenticateUser, attachmentAnalysisRoutes);

// Special handling for Gmail routes
const gmailController = require('./controllers/gmail.controller');

// First register the callback route without authentication
app.get('/api/gmail/callback', async (req, res) => {
    try {
        console.log('OAuth callback received:', {
            query: req.query,
            headers: {
                referer: req.headers.referer,
                origin: req.headers.origin
            }
        });
        await gmailController.handleCallback(req, res);
    } catch (error) {
        console.error('Error in Gmail callback route:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during OAuth callback',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Then register the rest of Gmail routes with authentication
app.use('/api/gmail', authenticateUser, gmailRoutes);

// Register email analysis routes with authentication
app.use('/api/email-analysis', authenticateUser, emailAnalysisRoutes);

// Serve utility files
app.use('/utils', express.static(path.join(__dirname, 'utils')));

// Add specific routes for HTML pages
app.get('/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Then serve static files (after API routes)
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0, // Cache for 1 day in production
    etag: true,
    lastModified: true,
    index: false // Disable automatic serving of index.html
}));

// Handle 404s
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.includes('.')) {
        res.redirect('/login.html');
    } else {
        res.status(404).json({ message: 'Not found' });
    }
});

// Connect to MongoDB with improved error handling
const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        // Check for MONGODB_URI first, then fall back to MONGO_URI for backward compatibility
        const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
        
        // Log which environment variable is being used
        if (process.env.MONGODB_URI) {
            console.log('Using MONGODB_URI from environment variables');
        } else if (process.env.MONGO_URI) {
            console.log('Using MONGO_URI from environment variables (deprecated)');
        }
        
        if (!mongoURI) {
            const envVars = Object.keys(process.env);
            console.error('Available environment variables:', envVars.join(', '));
            
            const errorMsg = 'MongoDB connection string not found. Please set MONGODB_URI environment variable.';
            console.error(errorMsg);
            
            // In production, continue without exiting but log the error
            if (process.env.NODE_ENV === 'production') {
                console.error('WARNING: Running without MongoDB connection. Some features will be unavailable.');
                return false;
            } else {
                throw new Error(errorMsg);
            }
        }
        
        // Log a masked version of the URI for security
        const maskedURI = mongoURI.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://****:****@');
        console.log('MongoDB URI:', maskedURI);
        
        const options = {
            serverSelectionTimeoutMS: 60000, // Increased timeout for Render
            socketTimeoutMS: 120000, // Increased timeout for Render
            family: 4, // Force to use IPv4
            connectTimeoutMS: 60000,
            heartbeatFrequencyMS: 20000,
            maxPoolSize: 10,
            minPoolSize: 2,
            retryWrites: true,
            w: 'majority', // Ensure writes are acknowledged by majority
            wtimeoutMS: 30000 // 30 second timeout for write operations
        };

        await mongoose.connect(mongoURI, options);
        console.log('✅ MongoDB connected successfully');
        
        // Set up connection event handlers
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            // Don't exit in production, try to recover
            if (process.env.NODE_ENV !== 'production') {
                console.error('MongoDB error in development mode, exiting...');
                process.exit(1);
            }
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected, attempting to reconnect...');
            setTimeout(() => connectWithRetry(0), 5000);
        });
        
        mongoose.connection.on('connected', () => {
            console.log('MongoDB reconnected successfully');
        });
        
        return true;
    } catch (err) {
        console.error('MongoDB connection error:', err);
        
        // In production, log the error but allow the server to start
        if (process.env.NODE_ENV === 'production') {
            console.error('WARNING: Starting server without MongoDB connection. Some features will be unavailable.');
            return false;
        }
        
        throw err;
    }
};

// Retry connection with exponential backoff and Render-specific handling
const connectWithRetry = (retryCount = 0) => {
    const maxRetryDelay = process.env.RENDER ? 60000 : 30000; // 60s max delay on Render, 30s elsewhere
    const initialDelay = process.env.RENDER ? 10000 : 0; // 10s initial delay on Render
    
    const attemptConnection = () => {
        connectDB().catch(err => {
            const retryDelay = Math.min(Math.pow(2, retryCount) * 1000, maxRetryDelay);
            console.log(`Failed to connect to MongoDB, retrying in ${retryDelay/1000} seconds... (attempt ${retryCount + 1})`);
            console.error('Connection error:', err.message);
            setTimeout(() => connectWithRetry(retryCount + 1), retryDelay);
        });
    };
    
    if (retryCount === 0 && initialDelay > 0) {
        console.log(`Adding initial delay of ${initialDelay/1000}s before MongoDB connection attempt...`);
        setTimeout(attemptConnection, initialDelay);
    } else {
        attemptConnection();
    }
};

connectWithRetry();

// Enhanced health check endpoint for Render with detailed diagnostics
app.get('/health', async (req, res) => {
    // Check MongoDB connection
    const mongoStatus = {
        readyState: mongoose.connection.readyState,
        status: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
    };
    
    // Check environment variables (without exposing sensitive values)
    const envVars = {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        PORT: process.env.PORT || 'not set',
        MONGO_URI: process.env.MONGO_URI ? 'set' : 'not set',
        JWT_SECRET: process.env.JWT_SECRET ? 'set' : 'not set',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'set' : 'not set',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'set' : 'not set',
        PROD_REDIRECT_URI: process.env.PROD_REDIRECT_URI || 'not set'
    };
    
    // Check platform detection
    const platform = {
        isRender: !!process.env.RENDER,
        isVercel: !!process.env.VERCEL,
        hostname: req.hostname,
        originalUrl: req.originalUrl
    };
    
    // Check file system access
    let fileSystemStatus = 'unknown';
    try {
        const publicDir = path.join(__dirname, 'public');
        const files = require('fs').readdirSync(publicDir);
        fileSystemStatus = {
            status: 'ok',
            publicDir,
            fileCount: files.length,
            hasIndexHtml: files.includes('index.html'),
            hasLoginHtml: files.includes('login.html')
        };
    } catch (err) {
        fileSystemStatus = {
            status: 'error',
            error: err.message
        };
    }
    
    // Always return 200 to prevent Render from restarting the server unnecessarily
    return res.status(200).json({
        status: mongoStatus.readyState === 1 ? 'ok' : 'warning',
        message: mongoStatus.readyState === 1 ? 'Server is healthy' : 'Server is running with warnings',
        timestamp: new Date().toISOString(),
        mongo: mongoStatus,
        environment: envVars,
        platform,
        fileSystem: fileSystemStatus,
        uptime: process.uptime() + ' seconds'
    });
});


app.get('/signup', (req, res) => {
    console.log('Serving signup page');
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/signup.html', (req, res) => {
    console.log('Serving signup.html');
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/dashboard', (req, res) => {
    console.log('Serving dashboard page');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', (req, res) => {
    console.log('Serving index.html');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    console.log('Serving admin page');
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/admin-dashboard.html', (req, res) => {
    console.log('Serving admin-dashboard.html');
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Handle 404 for unknown API routes
app.use((req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});



// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
    });
});

// Server start - Always listen on 0.0.0.0 for Render compatibility
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0'; // Always use 0.0.0.0 for Render

const startServer = () => {
    try {
        // Log deployment information
        console.log('Starting server with the following configuration:');
        console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`- Port: ${PORT}`);
        console.log(`- Host: ${HOST}`);
        console.log(`- Platform: ${process.env.RENDER ? 'Render' : process.env.VERCEL ? 'Vercel' : 'Local/Other'}`);
        
        // Create HTTP server
        const server = app.listen(PORT, HOST, () => {
            console.log(`✅ Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
            
            // Log important URLs
            if (process.env.NODE_ENV === 'production') {
                if (process.env.RENDER) {
                    console.log('Render deployment URL: https://chdpolice-hackathon.onrender.com');
                } else if (process.env.VERCEL) {
                    console.log('Vercel deployment URL: https://chd-police-hackathon.vercel.app');
                }
            } else {
                console.log('Local development URL: http://localhost:3000');
            }
        });
        
        // Handle server errors
        server.on('error', (error) => {
            console.error('Server error:', error);
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use. Trying again in 10 seconds...`);
                setTimeout(startServer, 10000);
            }
        });
        
        // Set up graceful shutdown handler
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received, initiating graceful shutdown...');
            try {
                // First close the server to stop accepting new connections
                await new Promise((resolve) => {
                    server.close(() => {
                        console.log('Server closed');
                        resolve();
                    });
                });

                // On Render, we don't close MongoDB connections or exit the process
                // This allows Render to manage container lifecycle and handle reconnections
                if (process.env.RENDER) {
                    console.log('Running on Render - skipping MongoDB disconnect and process exit');
                    return;
                }

                // For non-Render environments, close MongoDB and exit
                console.log('Closing MongoDB connection...');
                await mongoose.connection.close(false);
                console.log('MongoDB connection closed');
                process.exit(0);
            } catch (error) {
                console.error('Error during graceful shutdown:', error);
                if (!process.env.RENDER) {
                    process.exit(1);
                }
            }
        });
        
        return server;
    } catch (error) {
        console.error('Failed to start server:', error);
        console.log('Attempting to restart server in 10 seconds...');
        setTimeout(startServer, 10000);
        return null;
    }
};

const server = startServer();

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit in production
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});
