const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());

// Route handlers first
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

// Then serve static files
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/static', express.static(path.join(__dirname, 'views')));

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
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
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
