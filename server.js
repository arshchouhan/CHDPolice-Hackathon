const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());

// Session configuration
app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        ttl: 24 * 60 * 60 // Session TTL (1 day)
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Authentication middleware
const authenticateUser = (req, res, next) => {
    // Public paths that don't require authentication
    const publicPaths = [
        '/static',
        '/auth',
        '/login',
        '/signup',
        '/signup.html',
        '/login.html',
        '/',
        '/favicon.ico'
    ];

    // Check if the path starts with any of the public paths
    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    // Check for authentication
    if (!req.session.userId) {
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        return res.redirect('/login');
    }
    next();
};

// Route handlers first
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

// Serve signup page
app.get(['/signup', '/signup.html'], (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'views', 'signup.html'));
    }
});

// Handle 404 for .html extensions
app.get('*.html', (req, res) => {
    res.redirect(req.path.replace('.html', ''));
});

app.get('/login', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

// Logout route
app.get('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ message: 'Error during logout' });
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

// Serve static files from the public directory
app.use(express.static('public'));

// Serve index.html for dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle index route
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle 404 - send to login page
app.use((req, res, next) => {
    if (req.path.startsWith('/auth/')) {
        next();
        return;
    }
    if (!req.path.endsWith('.html')) {
        res.redirect('/login.html');
        return;
    }
    next();
});

// CORS configuration for production
app.use((req, res, next) => {
    const allowedOrigins = [
        'https://chdpolice-hackathon.vercel.app',
        'https://chdpolice-hackathon-git-main-arshchouhan.vercel.app',
        'https://chdpolice-hackathon-arshchouhan.vercel.app'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Import routes
const userRoutes = require('./routes/user.route');
const adminRoutes = require('./routes/admin.route');
const authRoutes = require('./routes/auth.route');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/users', authenticateUser, userRoutes);
app.use('/api/admin', authenticateUser, adminRoutes);
app.use('/auth', authRoutes);

// Serve index.html for dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Server URL: http://localhost:${PORT}`);
});
