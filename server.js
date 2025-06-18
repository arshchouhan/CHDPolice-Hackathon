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
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            callback(null, true);
            return;
        }
        
        // Check if the origin is allowed
        if (allowedOrigins.includes(origin)) {
            // Return the origin instead of true
            callback(null, origin);
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
    exposedHeaders: ['Set-Cookie', 'Authorization'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Apply CORS configuration
app.use((req, res, next) => {
    // Log the request details
    console.log('Incoming request:', {
        method: req.method,
        path: req.path,
        origin: req.headers.origin,
        cookies: req.headers.cookie ? 'present' : 'absent'
    });
    next();
});

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', (req, res) => {
    console.log('Handling preflight request from:', req.headers.origin);
    res.set('Access-Control-Allow-Origin', req.headers.origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.set('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
    res.set('Access-Control-Expose-Headers', corsOptions.exposedHeaders.join(', '));
    res.set('Access-Control-Max-Age', corsOptions.maxAge);
    res.status(204).end();
});

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
                { expiresIn: '7d' } // 7 days to match client-side
            );
            
            // Set new token in cookie with appropriate options
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days to match client-side
            };

            // In production, set domain based on request origin
            if (process.env.NODE_ENV === 'production') {
                const origin = req.get('origin');
                if (origin && origin.includes('vercel.app')) {
                    // For Vercel, don't set domain as it's already handled by same-origin
                    console.log('Request from Vercel frontend, using default cookie domain');
                } else if (origin && origin.includes('render.com')) {
                    cookieOptions.domain = '.onrender.com';
                    console.log('Setting cookie domain for Render');
                }
                
                // Log cookie options for debugging
                console.log('Final cookie options:', cookieOptions);
            }

            res.cookie('token', newToken, cookieOptions);
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

        // Connect to MongoDB
        const connectToMongoDB = () => {
            return mongoose.connect(mongoURI, options)
                .then(() => {
                    console.log('✅ MongoDB connected successfully');
                })
                .catch((err) => {
                    console.error('❌ MongoDB connection error:', err);
                    if (!isRender) {
                        console.error('Not running on Render, exiting process...');
                        process.exit(1);
                    }
                    throw err;
                });
        };

        // Handle MongoDB connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB connection disconnected');
            if (!process.env.RENDER) {
                console.log('Not running on Render, attempting to reconnect...');
                connectToMongoDB().catch(err => {
                    console.error('Reconnection failed:', err);
                });
            }
        });

        // Initial MongoDB connection
        await connectToMongoDB();
        return true;
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        return false;
    }
};

// Enhanced health check endpoint for Render with detailed diagnostics
app.get('/health', (req, res) => {
    try {
        // Check MongoDB connection
        const dbStatus = {
            readyState: mongoose.connection.readyState,
            status: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
        };

        // Check environment variables (without exposing sensitive values)
        const envStatus = {
            NODE_ENV: process.env.NODE_ENV || 'not set',
            PORT: process.env.PORT || 'not set',
            MONGO_URI: process.env.MONGODB_URI ? 'set' : 'not set',
            JWT_SECRET: process.env.JWT_SECRET ? 'set' : 'not set',
            GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'set' : 'not set',
            GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'set' : 'not set',
            PROD_REDIRECT_URI: process.env.PROD_REDIRECT_URI || 'not set'
        };

        // Check platform detection
        const platformStatus = {
            isRender: !!process.env.RENDER,
            isVercel: !!process.env.VERCEL,
            hostname: req.hostname,
            originalUrl: req.originalUrl
        };

        // Check file system access
        let fsStatus;
        try {
            const publicDir = path.join(__dirname, 'public');
            const files = require('fs').readdirSync(publicDir);
            fsStatus = {
                status: 'ok',
                publicDir,
                fileCount: files.length,
                hasIndexHtml: files.includes('index.html'),
                hasLoginHtml: files.includes('login.html')
            };
        } catch (err) {
            fsStatus = {
                status: 'error',
                error: err.message
            };
        }

        // Always return 200 to prevent Render from restarting the server unnecessarily
        try {
            res.json({
                status: dbStatus.readyState === 1 ? 'ok' : 'warning',
                message: dbStatus.readyState === 1 ? 'Server is healthy' : 'Server is running with warnings',
                timestamp: new Date().toISOString(),
                database: dbStatus,
                environment: envStatus,
                platform: platformStatus,
                filesystem: fsStatus,
                uptime: process.uptime() + ' seconds'
            });
        } catch (error) {
            console.error('Health check error:', error);
            res.status(500).json({
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Set up routes
app.get('/signup', (req, res) => {
    console.log('Serving signup page');
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/signup.html', (req, res) => {
    console.log('Serving signup.html');
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Register routes
const registerRoutes = () => {
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
};

// MongoDB connection options
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    wtimeoutMS: 30000
};

// Connect to MongoDB
const connectToMongoDB = () => {
    return mongoose.connect(mongoURI, options)
        .then(() => {
            console.log('✅ MongoDB connected successfully');
        })
        .catch((err) => {
            console.error('❌ MongoDB connection error:', err);
            if (!isRender) {
                console.error('Not running on Render, exiting process...');
                process.exit(1);
            }
            throw err;
        });
};

// Handle MongoDB connection events
const setupMongoDBEvents = () => {
    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
        if (!isRender) process.exit(1);
    });

    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        if (!isRender) process.exit(1);
    });

    mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
    });
};

// Initialize application
registerRoutes();
setupMongoDBEvents();

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
    console.log(`${signal} received, initiating graceful shutdown...`);
    
    if (!server) {
        console.log('No server instance found, exiting...');
        process.exit(0);
        return;
    }
    
    server.close(() => {
        console.log('Server closed, no longer accepting connections');
        
        if (!isRender && mongoose.connection.readyState === 1) {
            console.log('Closing MongoDB connection...');
            mongoose.disconnect()
                .then(() => {
                    console.log('MongoDB disconnected successfully');
                    if (!isRender) {
                        console.log('Exiting process...');
                        process.exit(0);
                    }
                })
                .catch(err => {
                    console.error('Error during shutdown:', err);
                    if (!isRender) process.exit(1);
                });
        } else if (isRender) {
            console.log('Running on Render - keeping MongoDB connection alive');
        }
    });

    // Force shutdown after timeout (only for non-Render environments)
    if (!isRender) {
        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000).unref();
    }
};

// Register process event handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (!isRender) {
        process.exit(1);
    }
});

// Create and start HTTP server
const startServer = () => {
    return new Promise((resolve, reject) => {
        const PORT = process.env.PORT || 3000;
        const HOST = '0.0.0.0'; // Always use 0.0.0.0 for Render

        console.log('Starting server with configuration:');
        console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`- Port: ${PORT}`);
        console.log(`- Host: ${HOST}`);
        if (isRender) console.log('- Platform: Render');
        if (isVercel) console.log('- Platform: Vercel');

        // Connect to MongoDB first
        connectToMongoDB()
            .then(() => {
                // Create HTTP server
                const server = app.listen(PORT, HOST, () => {
                    console.log(`Server running at http://${HOST}:${PORT}/`);
                    console.log('Environment:', process.env.NODE_ENV);
                    console.log('Platform:', isRender ? 'Render' : isVercel ? 'Vercel' : 'Local');
                });

                // Handle server errors
                server.on('error', (error) => {
                    console.error('Server error:', error);
                    if (error.code === 'EADDRINUSE') {
                        console.error(`Port ${PORT} is already in use`);
                        if (!isRender) process.exit(1);
                    }
                    reject(error);
                });

                resolve(server);
            })
            .catch(reject);
    });
};

// Start the server
startServer()
    .then(serverInstance => {
        server = serverInstance;
        console.log('Server started successfully');
    })
    .catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });

// Register static file routes
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

app.get('/signup', (req, res) => {
    console.log('Serving signup page');
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/signup.html', (req, res) => {
    console.log('Serving signup.html');
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
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

// Create server variable
let server;

// Graceful shutdown handler
function gracefulShutdown(signal) {
    console.log(`${signal} received, initiating graceful shutdown...`);
    
    if (!server) {
        console.log('No server instance found, exiting...');
        process.exit(0);
        return;
    }
    
    server.close(() => {
        console.log('Server closed, no longer accepting connections');
        
        if (!isRender && mongoose.connection.readyState === 1) {
            console.log('Closing MongoDB connection...');
            mongoose.disconnect()
                .then(() => {
                    console.log('MongoDB disconnected successfully');
                    if (!isRender) {
                        console.log('Exiting process...');
                        process.exit(0);
                    }
                })
                .catch(err => {
                    console.error('Error during shutdown:', err);
                    if (!isRender) process.exit(1);
                });
        } else if (isRender) {
            console.log('Running on Render - keeping MongoDB connection alive');
        }
    });

    // Force shutdown after timeout (only for non-Render environments)
    if (!isRender) {
        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000).unref();
    }
}

// Register process event handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (!isRender) {
        process.exit(1);
    }
});

// Start server function
async function startServer() {
    try {
        // Connect to MongoDB first
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            wtimeoutMS: 30000
        });
        console.log('MongoDB connected successfully');

        // Start the Express server
        const PORT = process.env.PORT || 3000;
        const HOST = '0.0.0.0'; // Required for Render deployment

        const serverInstance = app.listen(PORT, HOST, () => {
            console.log(`Server running at http://${HOST}:${PORT}/`);
            console.log('Environment:', process.env.NODE_ENV);
            if (isRender) {
                console.log('Running on Render platform');
            }
        });

        return serverInstance;
    } catch (error) {
        console.error('Failed to start server:', error);
        throw error;
    }
}

// Start the server
startServer()
    .then(serverInstance => {
        server = serverInstance;
        console.log('Server started successfully');
    })
    .catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });

// Export app for testing
module.exports = app;
