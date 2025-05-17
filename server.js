const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const Admin = require('./models/Admin');
const User = require('./models/Users');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration
const corsOptions = {
    origin: function(origin, callback) {
        const allowedOrigins = [
            'https://email-detection-eight.vercel.app',
            'https://email-detection-git-main-arshchouhan.vercel.app',
            'https://email-detection-arshchouhan.vercel.app',
            'https://email-detection-api.onrender.com',
            'http://localhost:3000'
        ];
        console.log('Request origin:', origin);
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('Origin not allowed:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

// Import routes
const userRoutes = require('./routes/user.route');
const adminRoutes = require('./routes/admin.route');
const authRoutes = require('./routes/auth.route');

// Enable CORS for all routes
const allowedOrigins = [
    'https://email-detection-eight.vercel.app',
    'https://email-detection-api.onrender.com',
    'http://localhost:3000'
];

app.use(cors({
    origin: function(origin, callback) {
        console.log('Request origin:', origin);
        // allow requests with no origin (like mobile apps or curl requests)
        if(!origin) return callback(null, true);
        if(allowedOrigins.indexOf(origin) === -1){
            console.log('Origin not allowed:', origin);
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        console.log('Origin allowed:', origin);
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
    credentials: true
}));

// Add cookie parser
app.use(cookieParser());

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
        console.log('Attempting to connect to MongoDB...');
        const mongoURI = process.env.MONGO_URI;
        if (!mongoURI) {
            throw new Error('MONGO_URI environment variable is not set');
        }
        
        console.log('MongoDB URI:', mongoURI.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://****:****@'));
        
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        await mongoose.connect(mongoURI, options);
        console.log('Successfully connected to MongoDB');

        // Test the connection
        const adminCount = await Admin.countDocuments();
        const userCount = await User.countDocuments();
        console.log(`Database stats - Admins: ${adminCount}, Users: ${userCount}`);

    } catch (err) {
        console.error('MongoDB connection error:', err);
        if (err.name === 'MongoServerSelectionError') {
            console.error('Could not connect to MongoDB server. Please check your connection string and make sure the server is running.');
        }
        // Don't exit in production
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
};

// Retry connection
const connectWithRetry = () => {
    connectDB().catch(err => {
        console.log('Failed to connect to MongoDB, retrying in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

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



// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
    });
});

// Server start
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on ${HOST}:${PORT}`);
});

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
