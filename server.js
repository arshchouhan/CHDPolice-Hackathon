const express = require('express');
const path = require('path');
const connectDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration
// Allowed origins with wildcard support
const allowedOrigins = [
  // Development
  `http://localhost:${process.env.PORT || 3000}`,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://localhost:5173', // Vite dev server
  
  // Authentication providers
  'https://accounts.google.com',
  'https://*.google.com',
  'https://*.googleusercontent.com',
  
  // Production URLs (update these in production)
  'https://your-production-domain.com',
  'https://*.your-production-domain.com'
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

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.error('CORS Error: Origin not allowed -', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Accept-Encoding',
    'Accept-Language',
    'Cache-Control',
    'Connection',
    'DNT',
    'Host',
    'Origin',
    'Pragma',
    'Referer',
    'User-Agent',
    'X-Requested-With',
    'X-Request-ID',
    'X-HTTP-Method-Override',
    'X-CSRF-Token',
    'X-XSRF-TOKEN',
    'X-Access-Token',
    'X-Forwarded-For',
    'X-Forwarded-Proto',
    'X-Forwarded-Port',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods',
    'Access-Control-Allow-Credentials',
    'Access-Control-Expose-Headers',
    'Access-Control-Max-Age',
    'Access-Control-Request-Headers',
    'Access-Control-Request-Method',
    'Content-Security-Policy',
    'If-Modified-Since',
    'If-None-Match',
    'ETag',
    'Last-Modified',
    'Link',
    'Location',
    'Retry-After',
    'Vary',
    'WWW-Authenticate',
    'X-Content-Type-Options',
    'X-DNS-Prefetch-Control',
    'X-Download-Options',
    'X-Frame-Options',
    'X-Powered-By',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Robots-Tag',
    'X-UA-Compatible',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Public-Key-Pins',
    'Expect-CT',
    'Feature-Policy',
    'Permissions-Policy',
    'Content-Security-Policy-Report-Only',
    'Report-To',
    'NEL',
    'Server-Timing',
    'SourceMap',
    'X-SourceMap',
    'X-Requested-With'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Date',
    'X-Request-Id',
    'Set-Cookie',
    'Authorization',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  maxAge: 3600,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Apply CORS middleware with options
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Security and CORS response headers middleware
app.use((req, res, next) => {
    // Set CORS headers
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    // Set other CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, X-Access-Token, X-Requested-With, Access-Control-Allow-Headers, Access-Control-Request-Method, Access-Control-Request-Headers, X-CSRF-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Date, X-Request-Id, Set-Cookie, Authorization');
    
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
    
    // Continue to next middleware
    next();
});

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

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
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
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
app.use(express.static(path.join(__dirname, 'public'), cacheOptions));

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
    const HOST = process.env.HOST || 'localhost';

    app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
      console.log(`Access the site at: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
