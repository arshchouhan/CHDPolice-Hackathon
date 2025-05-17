const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: [
        'https://email-detection-eight.vercel.app',
        'https://email-detection-git-main-arshchouhan.vercel.app',
        'https://email-detection-arshchouhan.vercel.app'
    ],
    credentials: true
}));

// Import routes
const userRoutes = require('./routes/user.route');
const adminRoutes = require('./routes/admin.route');
const authRoutes = require('./routes/auth.route');

// Enable CORS for all routes
app.use(cors({
    origin: ['https://email-detection-eight.vercel.app', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

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



// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

connectDB();

// Route handlers - API routes first
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Route handlers for pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// All other routes should serve index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



// Server start
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
});
