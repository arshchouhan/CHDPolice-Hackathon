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

// Import middleware
const requireAdmin = require('./middlewares/requireAdmin');

// Essential middleware
app.use(express.json());
app.use(cookieParser());

// Enhanced cache control and security headers
app.use((req, res, next) => {
    // Skip cache control for static assets with hashed filenames
    const isStaticAsset = /\.[a-f0-9]{8}\..+$/.test(req.path) || 
                        /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/.test(req.path);
    
    // Set security headers for all responses
    const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-site'
    };
    
    // Set cache control headers for non-static assets and API routes
    if (!isStaticAsset || req.path.startsWith('/api/')) {
        Object.assign(securityHeaders, {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store',
            'ETag': false,
            'Last-Modified': new Date().toUTCString()
        });
    } else {
        // Cache static assets for 1 year
        Object.assign(securityHeaders, {
            'Cache-Control': 'public, max-age=31536000, immutable'
        });
    }
    
    // Apply all headers
    res.set(securityHeaders);
    
    // Add request ID for tracking
    req.requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for the root route
app.get('/', (req, res) => {
    console.log('Serving root route - redirecting to login');
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Consolidated CORS configuration
const corsOptions = {
    origin: function(origin, callback) {
        const allowedOrigins = [
            'https://chdpolice-hackathon.onrender.com',
            'https://chd-police-hackathon-jku23otvi-arsh-chauhans-projects-1f436a49.vercel.app',
            'https://chd-police-hackathon.vercel.app',
            'http://localhost:3000',
            'http://localhost:5000'  // For local development with separate ports
        ];
        
        console.log('Request origin:', origin || 'No origin (direct access)');
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            console.log('No origin, allowing request');
            return callback(null, true);
        }

        // Check if the origin is in the allowed list
        if (allowedOrigins.includes(origin)) {
            console.log('Origin allowed:', origin);
            return callback(null, true);
        }
        
        // For development, allow all origins but log a warning
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`Allowing request from non-whitelisted origin in development: ${origin}`);
            return callback(null, true);
        }
        
        // In production, block unauthorized origins
        console.warn(`Blocked request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Origin', 
        'Accept',
        'X-Requested-With',
        'X-Access-Token',
        'X-Forwarded-For',
        'X-Forwarded-Proto'
    ],
    exposedHeaders: [
        'Set-Cookie',
        'Authorization',
        'X-Access-Token'
    ],
    maxAge: 86400  // 24 hours
};

// Apply CORS configuration with preflight continue
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable preflight for all routes

// Enhanced authentication middleware with session validation
const authenticateUser = (req, res, next) => {
    // Skip auth for static files, public routes, and health checks
    if (req.path === '/health' || req.path === '/api/health' || 
        req.path.startsWith('/auth/') || 
        req.path.startsWith('/public/') ||
        /\.[a-zA-Z0-9]+$/.test(req.path)) {
        return next();
    }

    // Check for token in cookies first
    const token = req.cookies?.token || 
                 req.headers.authorization?.split(' ')[1] ||
                 req.query?.token;

    if (!token) {
        console.log(`[${req.requestId}] No authentication token found`);
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }

    // Verify JWT token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            console.error(`[${req.requestId}] Token verification failed:`, err.message);
            
            // Clear invalid token
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
            });
            
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
        }

        try {
            // Check if user exists and is active
            const user = await User.findById(decoded.id).select('-password');
            if (!user || user.status !== 'active') {
                throw new Error('User not found or inactive');
            }

            // Attach user to request
            req.user = user;
            req.token = token;
            
            // Refresh token if it's about to expire (within 1 day)
            const now = Math.floor(Date.now() / 1000);
            if (decoded.exp - now < 86400) { // 1 day in seconds
                const newToken = jwt.sign(
                    { id: user._id, role: user.role },
                    process.env.JWT_SECRET,
                    { expiresIn: '7d' }
                );
                
                // Set new token in cookie
                res.cookie('token', newToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                    domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined
                });
                
                console.log(`[${req.requestId}] Token refreshed for user ${user._id}`);
            }
            
            next();
        } catch (error) {
            console.error(`[${req.requestId}] User validation error:`, error.message);
            res.status(401).json({ 
                success: false, 
                error: 'Authentication failed',
                code: 'AUTH_FAILED'
            });
        }
    });
};

// Apply authentication middleware to protected routes
app.use(['/api', '/dashboard', '/profile', '/settings'], authenticateUser);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`[${req.requestId}] Error:`, err);
    
    const statusCode = err.statusCode || 500;
    const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : err.message;
    
    res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: err.code || 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        code: 'NOT_FOUND'
    });
});

// Authentication middleware - MOVED BEFORE ROUTES TO FIX RENDER DEPLOYMENT ERROR
const _authenticateUser = (req, res, next) => {
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
    
    // Try to get token from multiple sources
    let token = null;
    
    // Check Authorization header first
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } 
    // Then check cookies
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    
    if (!token) {
        console.log('No token found in request');
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        return res.redirect('/login.html');
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        return res.redirect('/login.html');
    }
};

// Register authentication routes (no auth required)
app.use('/auth', authRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// Register API routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/email-analysis', emailAnalysisRoutes);
app.use('/api/gemini', geminiAnalysisRoutes);

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

// Special handling for Gmail routes
// First register the callback route without authentication
app.get('/api/gmail/callback', (req, res) => {
    console.log('Callback route hit directly, forwarding to controller');
    const gmailController = require('./controllers/gmail.controller');
    gmailController.handleCallback(req, res);
});

// Then register other Gmail routes with authentication
app.use('/api/gmail', authenticateUser, gmailRoutes);

// Register email analysis routes with authentication
app.use('/api/email-analysis', authenticateUser, emailAnalysisRoutes);

// Then serve static files (after API routes)
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0, // Cache for 1 day in production
    etag: true,
    lastModified: true
}));

/**
 * Get MongoDB connection options based on environment
 * Handles both local and Atlas connections
 */
const getMongoOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isAtlas = process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb+srv://');
    
    // Base options that work across all environments
    const options = {
        // Timeouts
        serverSelectionTimeoutMS: 10000, // 10 seconds
        connectTimeoutMS: 10000,        // 10 seconds
        socketTimeoutMS: 30000,         // 30 seconds
        
        // Connection pool
        maxPoolSize: 10,
        minPoolSize: 1,
        
        // Network
        family: 4,  // Force IPv4
        
        // Indexing
        autoIndex: !isProduction,
        
        // Retry settings
        retryWrites: true,
        retryReads: true
    };
    
    // SSL/TLS options for production or Atlas
    if (isProduction || isAtlas) {
        return {
            ...options,
            ssl: true,
            tls: true,
            authSource: 'admin',
            // Disable directConnection for Atlas SRV URIs
            ...(isAtlas ? { directConnection: false } : {})
        };
    }
    
    // Local development options
    return {
        ...options,
        directConnection: true,
        ssl: false
    };
};

const mongoOptions = getMongoOptions();

// Connect to MongoDB with simplified and robust error handling
const connectDB = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const mongoURI = process.env.MONGODB_URI;
    
    // Validate MongoDB URI
    if (!mongoURI) {
        const errorMsg = 'MongoDB connection string not found. Please set MONGODB_URI environment variable.';
        console.error(errorMsg);
        
        if (process.env.NODE_ENV === 'production') {
            console.warn('⚠️ Running without MongoDB connection in production. Some features will be unavailable.');
            return false;
        }
        
        throw new Error('MONGODB_URI not set');
    }

    try {
        // Log connection attempt (masking credentials in the URI)
        const maskedURI = mongoURI.replace(/mongodb(?:\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@');
        console.log(`🔌 Connecting to MongoDB (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
        console.log(`   URI: ${maskedURI}`);
        
        // Configure Mongoose
        mongoose.set('strictQuery', false); // Suppress deprecation warning
        
        // Attempt to connect
        await mongoose.connect(mongoURI, mongoOptions);
        
        console.log('✅ MongoDB connected successfully');
        
        // Set up event handlers
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err.message);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('ℹ️  MongoDB disconnected');
            if (process.env.NODE_ENV === 'production') {
                console.log('🔄 Attempting to reconnect...');
                connectDB().catch(console.error);
            }
        });
        
        return true;
        
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        
        // Implement retry logic in production
        if (process.env.NODE_ENV === 'production' && retryCount < MAX_RETRIES - 1) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
            console.log(`⏳ Retrying in ${delay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return connectDB(retryCount + 1);
        }
        
        // Handle final failure
        if (process.env.NODE_ENV === 'production') {
            console.error('❌ Failed to connect to MongoDB after multiple attempts');
            return false;
        }
        
        // In development, provide helpful error message and exit
        console.error('\n💡 Development Tip:');
        console.error('1. Make sure MongoDB is running locally');
        console.error('2. Check your MONGODB_URI in .env file');
        console.error('3. For local development, try: mongodb://localhost:27017/your-db-name');
        console.error('4. If using MongoDB Atlas, ensure your IP is whitelisted\n');
        
        process.exit(1);
    }
};

// Set up MongoDB connection event handlers
const setupMongoEventHandlers = () => {
    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        if (process.env.NODE_ENV === 'production') {
            console.log('Attempting to reconnect...');
            connectDB().catch(console.error);
        }
    });
    
    mongoose.connection.on('connected', () => {
        console.log('MongoDB connected');
    });
};

// Initialize MongoDB connection
const initializeMongoDB = async () => {
    try {
        console.log('Initializing MongoDB connection...');
        
        // Set up Mongoose debug mode in development
        if (process.env.NODE_ENV !== 'production') {
            mongoose.set('debug', (collectionName, method, query, doc) => {
                console.log(`Mongoose: ${collectionName}.${method}`, JSON.stringify(query));
            });
        }
        
        // Initial connection attempt
        const connected = await connectDB();
        
        if (!connected) {
            if (process.env.NODE_ENV === 'production') {
                console.warn('⚠️ Running without MongoDB connection in production. Some features may be unavailable.');
                return false;
            }
            throw new Error('Failed to connect to MongoDB');
        }
        
        console.log('✅ MongoDB initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize MongoDB:', error.message);
        
        if (process.env.NODE_ENV !== 'production') {
            // In development, we want to fail fast
            console.error('Exiting process due to MongoDB connection failure in development');
            process.exit(1);
        }
        
        // In production, we want the server to keep running even if MongoDB is down
        console.warn('⚠️ Continuing without MongoDB connection in production mode');
        return false;
    }
};

// Initialize MongoDB connection when the server starts
initializeMongoDB()
    .then(connected => {
        if (connected) {
            console.log('MongoDB connection is ready');
        }
    })
    .catch(err => {
        console.error('Fatal error initializing MongoDB:', err);
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    });

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
                const origin = req.get('origin');
                if (origin && origin.includes('chd-police-hackathon.vercel.app')) {
                    cookieOptions.domain = '.chd-police-hackathon.vercel.app';
                } else if (origin && origin.includes('render.com')) {
                    cookieOptions.domain = '.onrender.com';
                }
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
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received, shutting down gracefully');
            try {
                // Close server first
                await new Promise((resolve) => {
                    server.close(() => {
                        console.log('Server closed');
                        resolve();
                    });
                });
                
                // Close MongoDB connection using Promise-based approach
                await mongoose.connection.close(false);
                console.log('MongoDB connection closed');
                process.exit(0);
            } catch (error) {
                console.error('Error during graceful shutdown:', error);
                process.exit(1);
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
