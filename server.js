// server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import dotenv from 'dotenv';
import passport from 'passport';
import { fileURLToPath } from 'url';
import path from 'path';
import jwt from 'jsonwebtoken';
import './config/passport.js'; // Passport strategies

// Load environment variables
dotenv.config();

// Environment setup
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = process.env.NODE_ENV === 'production';

// ES module __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Log environment info
console.log('='.repeat(50));
console.log(`Starting server in ${process.env.NODE_ENV} mode`);
console.log(`Node version: ${process.version}`);
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log('='.repeat(50));

// MongoDB options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 120000,
  connectTimeoutMS: 60000,
  maxPoolSize: 10,
  minPoolSize: 2,
  retryWrites: true,
  w: 'majority',
  wtimeoutMS: 30000,
};

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, mongoOptions);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Trust proxy in production
if (isProduction) {
  app.set('trust proxy', 1);
}

// CORS configuration is applied later in the file

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'cookie-secret'));

// Session config
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: true,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || process.env.MONGO_URI,
      mongoOptions,
      collectionName: 'sessions',
    }),
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// JWT verification middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No authentication token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwt-secret');
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// CORS setup
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://chd-police-hackathon.vercel.app',
  'https://chdpolice-hackathon.onrender.com',
  /^https?:\/\/.*-chd-police-hackathon\.vercel\.app$/,
];

const corsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Set-Cookie'],
  exposedHeaders: ['Set-Cookie', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Request logging with route debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} origin=${req.headers.origin || 'n/a'}`);
  console.log('Request headers:', req.headers);
  console.log('Request query:', req.query);
  console.log('Request body:', req.body);
  next();
});

// Import routes
import authRoutes from './routes/auth.route.js';
import adminRoutes from './routes/admin.route.js';
import dashboardRoutes from './routes/dashboard.route.js';
import gmailRoutes from './routes/gmail.route.js';

// API Routes - Mount all routes with their respective base paths
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/gmail', gmailRoutes);

// Debug route to check if API is working
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// ✅ Root route (instead of 404)
app.get('/', (req, res) => {
  res.json({
    message: 'Backend API is running. Use /api/* endpoints.',
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    mongo: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState,
    },
  });
});

// API root info
app.get('/api', (req, res) => {
  res.json({
    name: 'Email Detection API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV,
  });
});

// 404 for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err.stack || err);
  else console.warn(`${status} ${err.message}`);

  res.status(status).json({
    success: false,
    message: isProduction && status >= 500 ? 'Internal Server Error' : err.message,
    ...(!isProduction && { stack: err.stack }),
  });
});

// Start server
const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 4000;
  const server = app.listen(PORT, () => {
    console.log(`
      =====================================
      🚀 Server running on port ${PORT}
      🌍 Environment: ${process.env.NODE_ENV}
      =====================================
    `);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(() => {
      console.log('HTTP server closed');
      if (mongoose.connection.readyState === 1) {
        mongoose.disconnect().then(() => {
          console.log('MongoDB disconnected');
          process.exit(0);
        });
      } else process.exit(0);
    });
    setTimeout(() => {
      console.error('Force shutdown');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();

export default app;
