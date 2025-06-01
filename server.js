// Load environment variables first
require('dotenv').config({ path: '.env' });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const Admin = require('./models/Admin');
const User = require('./models/Users');

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

// Set a default SESSION_SECRET if not provided
if (!process.env.SESSION_SECRET) {
    console.warn('WARNING: SESSION_SECRET not set. Using a default value in development only.');
    if (process.env.NODE_ENV === 'production') {
        console.error('ERROR: SESSION_SECRET must be set in production environment');
        process.exit(1);
    }
    process.env.SESSION_SECRET = 'dev-secret-change-this-in-production';
}

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
app.use(cookieParser(process.env.SESSION_SECRET || 'your-secret-key'));

// Trust first proxy (important for secure cookies in production)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Session configuration
const sessionConfig = {
    name: 'sessionId',
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60, // 1 day
        autoRemove: 'native',
        crypto: {
            secret: process.env.SESSION_SECRET || 'your-secret-key'
        },
        collectionName: 'sessions',
        stringify: false
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        path: '/',
        ...(process.env.NODE_ENV === 'production' && {
            domain: 'chdpolice-hackathon.onrender.com'
        })
    },
    rolling: true,
    proxy: process.env.NODE_ENV === 'production'
};

// Apply session middleware
app.use(session(sessionConfig));

// Enhanced cache control and security headers
app.use((req, res, next) => {
    const isStaticAsset = /\.[a-f0-9]{8}\..+$/.test(req.path) || 
                        /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/.test(req.path);
    
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
        Object.assign(securityHeaders, {
            'Cache-Control': 'public, max-age=31536000, immutable'
        });
    }
    
    res.set(securityHeaders);
    req.requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    next();
});

// Consolidated CORS configuration
const corsOptions = {
    origin: function(origin, callback) {
        if (!origin) {
            console.log('No origin, allowing request');
            return callback(null, true);
        }
        
        console.log('Request origin:', origin);
        
        let hostname;
        try {
            hostname = new URL(origin).hostname;
        } catch (e) {
            console.log('Invalid origin URL:', origin);
            return callback(new Error('Invalid origin'));
        }

        // List of allowed domains and patterns
        const allowedDomains = [
            'chdpolice-hackathon.onrender.com',
            'localhost',
            '127.0.0.1'
        ];

        // Check if the origin's hostname matches any allowed domain or pattern
        const isAllowed = allowedDomains.some(domain => {
            // For exact matches
            if (hostname === domain) return true;
            
            // For wildcard domains (starting with .)
            if (domain.startsWith('.') && hostname.endsWith(domain)) {
                return true;
            }
            
            // For partial matches (like Vercel previews)
            if (hostname.includes(domain)) {
                return true;
            }
            
            // For local development
            if (process.env.NODE_ENV === 'development' && 
                (hostname === 'localhost' || hostname === '127.0.0.1')) {
                return true;
            }
            
            return false;
        });

        if (isAllowed) {
            console.log(`Origin ${origin} is allowed`);
            // Set the Access-Control-Allow-Origin header to the requesting origin
            // This is important for credentials to work
            return callback(null, origin);
        }
        
        console.warn(`Origin not allowed: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Accept-Encoding',
        'Accept-Language',
        'X-Access-Token',
        'X-Refresh-Token',
        'X-Forwarded-For',
        'X-Forwarded-Proto',
        'X-Forwarded-Host',
        'X-Forwarded-Port',
        'X-Real-IP',
        'X-Request-ID',
        'X-Response-Time',
        'X-Powered-By',
        'Set-Cookie',
        'Cookie'
    ],
    exposedHeaders: [
        'Content-Range',
        'X-Content-Range',
        'X-Total-Count',
        'X-Pagination',
        'X-Access-Token',
        'X-Refresh-Token',
        'Set-Cookie',
        'Authorization'
    ],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Allowed origins
const allowedOrigins = [
    'https://chdpolice-hackathon.onrender.com',
    'https://chd-police-hackathon.vercel.app',
    'https://chd-police-hackathon-git-main-arshchouhan.vercel.app',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000'
];

// CORS middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Always set Vary header for proper caching
    res.header('Vary', 'Origin');
    
    // Set CORS headers if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
            res.header('Access-Control-Max-Age', '86400');
            return res.status(204).end();
        }
    }
    
    next();
});

// Apply CORS to all routes
app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Access-Token', 'X-Refresh-Token']
}));

// Enable pre-flight for all routes
app.options('*', cors());

// Enhanced authentication middleware
const authenticateUser = (req, res, next) => {
    // Public paths that don't require authentication
    const publicPaths = [
        '/health',
        '/api/health',
        '/login',
        '/signup',
        '/login.html',
        '/signup.html',
        '/favicon.ico',
        '/manifest.json',
        '/.well-known/',
        '/api/auth/',
        '/api/gmail/callback'
    ];

    // Check if current path is public or static file
    const isPublicPath = publicPaths.some(path => 
        req.path === path || req.path.startsWith(path)
    );

    if (isPublicPath || /\.[a-zA-Z0-9]+$/.test(req.path)) {
        return next();
    }

    // Check for token
    const token = req.cookies?.token || 
                 req.session?.token ||
                 req.headers.authorization?.split(' ')[1] ||
                 req.query?.token;

    if (!token) {
        console.log(`[${req.requestId}] No authentication token found for ${req.path}`);
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
            
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined,
                path: '/'
            });
            
            if (req.session) {
                req.session.destroy();
            }
            
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
        }

        try {
            // FIXED: Use decoded.userId instead of decoded.id
            const user = await User.findById(decoded.userId).select('-password');
            if (!user || user.status !== 'active') {
                throw new Error('User not found or inactive');
            }

            req.user = user;
            req.token = token;
            
            // Refresh token if it's about to expire (within 1 day)
            const now = Math.floor(Date.now() / 1000);
            if (decoded.exp - now < 86400) {
                const newToken = jwt.sign(
                    { userId: user._id, role: user.role }, // FIXED: Use userId consistently
                    process.env.JWT_SECRET,
                    { expiresIn: '7d' }
                );
                
                res.cookie('token', newToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    maxAge: 7 * 24 * 60 * 60 * 1000,
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

// Serve static files from the public directory with proper MIME types and CORS
const staticOptions = {
  setHeaders: (res, filePath) => {
    // Set CORS headers for all static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Set proper MIME types for common file types
    const mimeTypes = {
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.otf': 'font/otf'
    };
    
    const ext = path.extname(filePath);
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
};

app.use(express.static(path.join(__dirname, 'public'), staticOptions));

// Serve index.html for the root route
app.get('/', (req, res) => {
    console.log('Serving root route - sending index.html');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve login page
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

// Health check endpoint (single implementation)
app.get('/health', async (req, res) => {
    const mongoStatus = {
        readyState: mongoose.connection.readyState,
        status: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
    };
    
    const envVars = {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        PORT: process.env.PORT || 'not set',
        MONGODB_URI: process.env.MONGODB_URI ? 'set' : 'not set',
        JWT_SECRET: process.env.JWT_SECRET ? 'set' : 'not set',
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'set' : 'not set',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'set' : 'not set'
    };
    
    const platform = {
        isRender: !!process.env.RENDER,
        isVercel: !!process.env.VERCEL,
        hostname: req.hostname,
        originalUrl: req.originalUrl
    };
    
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

// Register auth routes FIRST (without authentication)
app.use('/api/auth', (req, res, next) => {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
}, authRoutes);

// Special handling for Gmail callback (without authentication)
app.get('/api/gmail/callback', (req, res) => {
    console.log('Gmail callback route hit, forwarding to controller');
    const gmailController = require('./controllers/gmail.controller');
    gmailController.handleCallback(req, res);
});

// Apply authentication middleware to protected API routes ONLY
app.use('/api/users', authenticateUser, userRoutes);
app.use('/api/admin', authenticateUser, adminRoutes);
app.use('/api/gmail', authenticateUser, gmailRoutes);
app.use('/api/email-analysis', authenticateUser, emailAnalysisRoutes);
app.use('/api/gemini', authenticateUser, geminiAnalysisRoutes);

// Apply authentication to protected page routes
app.use(['/dashboard', '/profile', '/settings'], authenticateUser);

// MongoDB connection setup
const getMongoOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isAtlas = process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb+srv://');
    
    const options = {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 1,
        family: 4,
        autoIndex: !isProduction,
        retryWrites: true,
        retryReads: true
    };
    
    if (isProduction || isAtlas) {
        return {
            ...options,
            ssl: true,
            tls: true,
            authSource: 'admin',
            ...(isAtlas ? { directConnection: false } : {})
        };
    }
    
    return {
        ...options,
        directConnection: true,
        ssl: false
    };
};

const mongoOptions = getMongoOptions();

const connectDB = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    const mongoURI = process.env.MONGODB_URI;
    
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
        const maskedURI = mongoURI.replace(/mongodb(?:\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@');
        console.log(`🔌 Connecting to MongoDB (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
        console.log(`   URI: ${maskedURI}`);
        
        mongoose.set('strictQuery', false);
        await mongoose.connect(mongoURI, mongoOptions);
        
        console.log('✅ MongoDB connected successfully');
        
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
        
        if (process.env.NODE_ENV === 'production' && retryCount < MAX_RETRIES - 1) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
            console.log(`⏳ Retrying in ${delay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return connectDB(retryCount + 1);
        }
        
        if (process.env.NODE_ENV === 'production') {
            console.error('❌ Failed to connect to MongoDB after multiple attempts');
            return false;
        }
        
        console.error('\n💡 Development Tip:');
        console.error('1. Make sure MongoDB is running locally');
        console.error('2. Check your MONGODB_URI in .env file');
        console.error('3. For local development, try: mongodb://localhost:27017/your-db-name');
        console.error('4. If using MongoDB Atlas, ensure your IP is whitelisted\n');
        
        process.exit(1);
    }
};

// Initialize MongoDB connection
const initializeMongoDB = async () => {
    try {
        console.log('Initializing MongoDB connection...');
        
        if (process.env.NODE_ENV !== 'production') {
            mongoose.set('debug', (collectionName, method, query, doc) => {
                console.log(`Mongoose: ${collectionName}.${method}`, JSON.stringify(query));
            });
        }
        
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
            console.error('Exiting process due to MongoDB connection failure in development');
            process.exit(1);
        }
        
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

// All other routes should serve index.html for client-side routing
app.get('*', (req, res) => {
    console.log('Serving fallback route:', req.path);
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`[${req.requestId || 'unknown'}] Error:`, err);
    
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
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        error: 'Not Found',
        code: 'NOT_FOUND',
        path: req.originalUrl
    });
});

// Server start
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const startServer = () => {
    try {
        console.log('Starting server with the following configuration:');
        console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`- Port: ${PORT}`);
        console.log(`- Host: ${HOST}`);
        console.log(`- Platform: ${process.env.RENDER ? 'Render' : process.env.VERCEL ? 'Vercel' : 'Local/Other'}`);
        
        const server = app.listen(PORT, HOST, () => {
            console.log(`✅ Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
            
            if (process.env.RENDER) {
                console.log('Render deployment URL: https://email-detection-api.onrender.com');
            } else if (process.env.VERCEL) {
                console.log('Vercel deployment URL: https://chd-police-hackathon.vercel.app');
            } else {
                console.log('Local development URL: http://localhost:3000');
            }
        });
        
        server.on('error', (error) => {
            console.error('Server error:', error);
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use. Trying again in 10 seconds...`);
                setTimeout(startServer, 10000);
            }
        });
        
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received, shutting down gracefully');
            try {
                await new Promise((resolve) => {
                    server.close(() => {
                        console.log('Server closed');
                        resolve();
                    });
                });
                
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

if (server) {
    server.on('error', (error) => {
        console.error('Server error:', error);
    });
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});