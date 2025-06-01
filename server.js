const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Import your existing routes
const userRoutes = require('./routes/user.route');
const adminRoutes = require('./routes/admin.route');
const authRoutes = require('./routes/auth.route');
const gmailRoutes = require('./routes/gmail.route');
const emailAnalysisRoutes = require('./routes/emailAnalysis.route');
const geminiAnalysisRoutes = require('./routes/geminiAnalysis.route');

// Simple CORS setup
app.use(cors({
    origin: [
        'https://chd-police-hackathon.vercel.app',
        'http://localhost:3000'
    ],
    credentials: true
}));

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/email-analysis', emailAnalysisRoutes);
app.use('/api/gemini', geminiAnalysisRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Catch all - serve index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB error:', err));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});