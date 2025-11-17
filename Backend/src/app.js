// app.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import './config/passport.js';
import authRoutes from './routes/auth.route.js';
import adminRoutes from './routes/admin.route.js';
import dashboardRoutes from './routes/dashboard.route.js';
import gmailRoutes from './routes/gmail.route.js';
import gmailConnectionRoutes from './routes/gmail-connection.route.js';
import gmailStatusRoutes from './routes/gmailStatus.route.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'cookie-secret'));

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
  credentials: true,
}));

// Logging (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.path}`);
    next();
  });
}

// Passport (only if OAuth is used)
// app.use(passport.initialize());

// Routes

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/user', gmailConnectionRoutes);
app.use('/api/user/gmail/status', gmailStatusRoutes);

// Health check
// app.get('/', (req, res) => res.json({ status: 'ok' }));

// 404 handler
app.use('/api/*', (req, res) => res.status(404).json({ message: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: isProduction && status >= 500 ? 'Internal Server Error' : err.message
  });
});

export default app;
