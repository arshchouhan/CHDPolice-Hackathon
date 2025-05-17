const express = require('express');
const path = require('path');

const app = express();

const RENDER_URL = "https://chdpolice-hackathon.onrender.com";

// Middleware
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const userRoutes = require('./routes/user.route');
const adminRoutes = require('./routes/admin.route');

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server URL: http://localhost:${PORT}`);
});
