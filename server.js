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

// Essential middleware
app.use(express.json());
app.use(cookieParser());

// Consolidated CORS configuration
const corsOptions = {
    origin: function(origin, callback) {
        const allowedOrigins = [
            'https://email-detection-eight.vercel.app',
            'https://email-detection-git-main-arshchouhan.vercel.app',
            'https://email-detection-arshchouhan.vercel.app',
            'https://chd-police-hackathon.vercel.app',
            'https://email-detection-api.onrender.com',
            'https://email-detection.onrender.com',
            'https://email-detection.public.onrender.com',
            'http://localhost:3000'
        ];
        
        console.log('Request origin:', origin || 'No origin (direct access)');
        
        // In production, check against allowed origins
        if (process.env.NODE_ENV === 'production') {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.warn(`Blocked request from unauthorized origin: ${origin}`);
                callback(null, true); // Still allow for now, but log it
            }
        } else {
            // In development, allow all origins
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    exposedHeaders: ['Set-Cookie']
};

// Apply CORS configuration (only once)
app.use(cors(corsOptions));

// Authentication middleware - MOVED BEFORE ROUTES TO FIX RENDER DEPLOYMENT ERROR
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
    
    // Check for authentication using token from headers
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        return res.redirect('/login.html');
    }
    next();
};

// Register authentication routes (no auth required)
app.use('/auth', authRoutes);

// Apply authentication middleware to protected API routes
app.use('/api/users', authenticateUser, userRoutes);
app.use('/api/admin', authenticateUser, adminRoutes);

// Special handling for Gmail routes - callback doesn't need authentication
app.use('/api/gmail/callback', gmailRoutes); // No auth for callback
app.use('/api/gmail', authenticateUser, gmailRoutes); // Auth for other Gmail routes

// Then serve static files (after API routes)
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0, // Cache for 1 day in production
    etag: true,
    lastModified: true
}));

// Connect to MongoDB with improved error handling
const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        const mongoURI = process.env.MONGO_URI;
        
        if (!mongoURI) {
            console.error('MONGO_URI environment variable is not set');
            // In production, continue without exiting but log the error
            if (process.env.NODE_ENV === 'production') {
                console.error('WARNING: Running without MongoDB connection. Some features will be unavailable.');
                return false;
            } else {
                throw new Error('MONGO_URI environment variable is not set');
            }
        }
        
        // Log a masked version of the URI for security
        const maskedURI = mongoURI.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://****:****@');
        console.log('MongoDB URI:', maskedURI);
        
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000, // Increased timeout for Render
            socketTimeoutMS: 75000, // Increased timeout for Render
            family: 4, // Force to use IPv4
            connectTimeoutMS: 30000,
            heartbeatFrequencyMS: 10000
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
    // For Render, add a delay before first connection attempt to allow network to stabilize
    if (retryCount === 0 && process.env.RENDER) {
        console.log('Running on Render, adding initial delay before MongoDB connection attempt...');
        setTimeout(() => {
            connectDB().catch(err => {
                const retryDelay = Math.min(Math.pow(2, retryCount) * 1000, 30000);
                console.log(`Failed to connect to MongoDB, retrying in ${retryDelay/1000} seconds... (attempt ${retryCount + 1})`);
                setTimeout(() => connectWithRetry(retryCount + 1), retryDelay);
            });
        }, 5000); // 5 second initial delay for Render
    } else {
        connectDB().catch(err => {
            const retryDelay = Math.min(Math.pow(2, retryCount) * 1000, 30000); // Exponential backoff with max 30s
            console.log(`Failed to connect to MongoDB, retrying in ${retryDelay/1000} seconds... (attempt ${retryCount + 1})`);
            setTimeout(() => connectWithRetry(retryCount + 1), retryDelay);
        });
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

// Explicit route handlers for HTML pages
app.get('/', (req, res) => {
    console.log('Serving root path');
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/login', (req, res) => {
    console.log('Serving login page');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login.html', (req, res) => {
    console.log('Serving login.html');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
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

// All other routes should serve index.html for client-side routing
app.get('*', (req, res) => {
    console.log('Serving fallback route:', req.path);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
const PORT = process.env.PORT || 3000;
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
                    console.log('Render deployment URL: https://email-detection-api.onrender.com');
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
        
        // Set up graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            server.close(() => {
                console.log('Server closed');
                mongoose.connection.close(false, () => {
                    console.log('MongoDB connection closed');
                    process.exit(0);
                });
            });
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
