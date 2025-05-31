const express = require('express');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();

const app = express();

// First middleware: Check if public directory exists
const publicDir = path.join(__dirname, 'public');
console.log('Public directory:', publicDir);

// Verify public directory exists
try {
  if (!fs.existsSync(publicDir)) {
    console.error('Public directory does not exist!');
    process.exit(1);
  }
} catch (error) {
  console.error('Error checking public directory:', error);
  process.exit(1);
}

// Serve static files first
const serveStatic = require('serve-static');
const compression = require('compression');

// Static file serving with better configuration
const staticMiddleware = serveStatic(publicDir, {
  maxAge: '1h',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    console.log('Serving file:', path);
    
    // Handle HTML files - no caching
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    // Handle JavaScript and CSS files - cache for 1 hour
    else if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    // Handle images - cache for 24 hours
    else if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    // Handle fonts - cache for 1 week
    else if (path.endsWith('.woff') || path.endsWith('.woff2') || path.endsWith('.ttf') || path.endsWith('.eot')) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
    // Default cache for other files
    else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    
    // Add CORS headers for static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  },
  index: false // Don't automatically serve index.html
});

// Add compression middleware
app.use(compression());

// Add static file serving as first middleware
app.use(staticMiddleware);

// Add error handling for static files
app.use((err, req, res, next) => {
  console.error('Static file error:', err);
  console.error('Request URL:', req.url);
  console.error('Error stack:', err.stack);
  
  if (err.code === 'ENOENT') {
    res.status(404).json({
      error: 'File not found',
      message: 'The requested resource could not be found',
      path: req.url
    });
  } else {
    res.status(500).json({
      error: 'Server error',
      message: 'There was an error serving the file',
      path: req.url
    });
  }
});

// Add logging middleware to see all requests
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Allowed origins with development and production URLs
const allowedOrigins = [
  // Development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://localhost:5173', // Vite dev server
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173',
  
  // Production frontend
  'https://chd-police-hackathon.vercel.app',
  'https://*.vercel.app',
  
  // Production backend
  'https://email-detection-api.onrender.com',
  'https://*.onrender.com',
  
  // For development with IP
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/, // Local network IPs
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/ // Local network IPs
];

// Function to check if origin is allowed
const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow requests with no origin (like mobile apps or curl)
  
  const normalizedOrigin = origin.toLowerCase().trim();
  
  // Check if origin matches any pattern in allowedOrigins
  return allowedOrigins.some(allowedOrigin => {
    // Handle string patterns (exact matches and wildcards)
    if (typeof allowedOrigin === 'string') {
      // Handle wildcard subdomains (e.g., '*.example.com')
      if (allowedOrigin.startsWith('*')) {
        const domain = allowedOrigin.replace('*.', '.').toLowerCase();
        return normalizedOrigin.endsWith(domain);
      }
      // Handle exact matches
      return normalizedOrigin === allowedOrigin.toLowerCase();
    }
    // Handle regex patterns
    else if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(normalizedOrigin);
    }
    return false;
  });
};

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.toLowerCase().trim();
    
    // Check if origin is allowed
    if (isOriginAllowed(normalizedOrigin)) {
      return callback(null, true);
    }
    
    // Log blocked origins for debugging
    console.log('CORS: Blocked origin:', normalizedOrigin);
    console.log('CORS: Allowed origins:', allowedOrigins);
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Enable credentials (cookies, authorization headers)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Access-Token',
    'X-CSRF-Token',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Authorization',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours
  // Allow credentials for all origins
  credentials: true
};

// Apply CORS middleware with options
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Add CORS headers to all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    res.header('Access-Control-Allow-Headers', [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Access-Token',
      'X-CSRF-Token'
    ].join(', '));
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// Request timing middleware
app.use((req, res, next) => {
  req.requestStart = process.hrtime();
  next();
});

// Security headers middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'same-origin');
  
  // Cache control for API responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Apply JSON parsing middleware
app.use(express.json());

// Add CORS headers to all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isOriginAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    res.header('Access-Control-Allow-Headers', [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'X-Access-Token',
      'X-CSRF-Token'
    ].join(', '));
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Log request details for debugging (skip health checks)
app.use((req, res, next) => {
  // Skip logging for health checks
  if (req.path === '/health') {
    return next();
  }

  const start = Date.now();
  
  // Log request start
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`, {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    referrer: req.headers['referer'] || req.headers['referrer'],
    query: Object.keys(req.query).length ? req.query : undefined,
    params: Object.keys(req.params).length ? req.params : undefined,
    body: Object.keys(req.body).length ? req.body : undefined
  });

  // Log response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${duration}ms`);
  });
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Session configuration
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Trust first proxy if behind a reverse proxy (like on Render)
app.set('trust proxy', 1);

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined
  }
}));

// Add user to request if authenticated
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Cache configuration
const cacheOptions = {
  maxAge: '1h',
  etag: true,
  lastModified: true
};

// Serve static files from the public directory with caching
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Handle HTML files - no caching
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    // Handle JavaScript and CSS files - cache for 1 hour
    else if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    // Handle images - cache for 24 hours
    else if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    // Handle fonts - cache for 1 week
    else if (path.endsWith('.woff') || path.endsWith('.woff2') || path.endsWith('.ttf') || path.endsWith('.eot')) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
    // Default cache for other files
    else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    
    // Add CORS headers for static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  }
}));

// Fallback to index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add cache control headers for all routes
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
  next();
});

// Import routes
const authRoutes = require('./routes/auth.route');
const emailRoutes = require('./routes/email.route');
const userRoutes = require('./routes/user.route');
const adminRoutes = require('./routes/admin.route');
const loginRoute = require('./routes/login');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Serve login page with environment variables
app.use('/login.html', loginRoute);

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Track if server is already starting/started
let isServerStarting = false;
let serverInstance = null;

/**
 * Start the Express server
 */
const startServer = async () => {
  // If server is already starting/started, return the existing instance
  if (serverInstance) {
    console.log('Server instance already exists, returning existing instance');
    return app;
  }

  // Prevent multiple server starts
  if (isServerStarting) {
    console.log('Server is already starting, returning app without starting new instance');
    return app;
  }

  isServerStarting = true;
  
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('MongoDB connected successfully');
    
    // Only start the HTTP server if not in Vercel environment
    if (!process.env.VERCEL) {
      const PORT = process.env.PORT || 3000;
      const HOST = '0.0.0.0'; // Important: Bind to all network interfaces
      
      // Create HTTP server
      const server = app.listen(PORT, HOST, () => {
        console.log(`\n=== Server Information ===`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Listening on: http://${HOST}:${PORT}`);
        console.log(`Process ID: ${process.pid}`);
        console.log(`Node Version: ${process.version}`);
        console.log(`Platform: ${process.platform} ${process.arch}`);
        console.log(`Memory Usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
        console.log('==========================\n');
        
        // Store the server instance
        serverInstance = server;
      });
      
      // Handle server errors
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Error: Port ${PORT} is already in use. Another instance may be running.`);
          // Don't exit in production to allow for container orchestration
          if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
          }
        } else {
          console.error('Server error:', error);
          process.exit(1);
        }
      });
      
      // Handle process termination
      const gracefulShutdown = () => {
        console.log('\nShutting down gracefully...');
        server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
        
        // Force shutdown after timeout
        setTimeout(() => {
          console.error('Could not close connections in time, forcefully shutting down');
          process.exit(1);
        }, 10000);
      };
      
      // Handle different shutdown signals
      process.on('SIGTERM', gracefulShutdown);
      process.on('SIGINT', gracefulShutdown);
      
      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        gracefulShutdown();
      });
      
      // Handle unhandled promise rejections
      process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      });
    }
    
    return app;
  } catch (err) {
    console.error('Failed to start server:', err);
    // Only exit if not in production to allow for container restart
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw err; // Re-throw for Vercel to handle
  } finally {
    isServerStarting = false;
  }
};

// Start the server immediately when this file is run directly
if (require.main === module) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
} else {
  // For when this file is imported as a module (e.g., in tests or Vercel)
  let serverPromise = null;
  module.exports = () => {
    if (!serverPromise) {
      serverPromise = startServer();
    }
    return serverPromise;
  };
}
