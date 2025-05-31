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

// Allowed origins with exact matches only for better security
const allowedOrigins = [
  // Development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://localhost:5173', // Vite dev server
  
  // Production frontend
  'https://chd-police-hackathon.vercel.app',
  
  // Production backend
  'https://email-detection-api.onrender.com'
];

// Function to check if origin is allowed
const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow requests with no origin (like mobile apps)
  
  const normalizedOrigin = origin.toLowerCase().trim();
  
  // Check exact matches first
  if (allowedOrigins.includes(normalizedOrigin)) {
    return true;
  }
  
  // Check wildcard matches
  return allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin.startsWith('*')) {
      const domain = allowedOrigin.replace('*.', '.').toLowerCase();
      return normalizedOrigin.endsWith(domain);
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
    
    // Check exact matches
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    // Log blocked origins for debugging
    console.log('Blocked origin:', normalizedOrigin);
    console.log('Allowed origins:', allowedOrigins);
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Authorization',
    'Access-Control-Allow-Origin'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware with options
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

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

// Connect to MongoDB
connectDB()
  .then(() => {
    // Server start
    const PORT = process.env.PORT || 3000;
    const HOST = '0.0.0.0'; // Bind to all interfaces

    // For Render deployment
    app.set('trust proxy', true);
    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
      console.log(`Access the site at: http://localhost:${PORT}`);
      console.log('Server is ready to accept connections');
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
