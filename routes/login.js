const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Serve the login page with environment variables injected
router.get('/', (req, res) => {
    // Read the login.html file
    const filePath = path.join(__dirname, '../public/login.html');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading login.html:', err);
            return res.status(500).send('Error loading login page');
        }
        
        // Replace the Google Client ID with the one from environment variables
        const updatedContent = data.replace(
            /const GOOGLE_CLIENT_ID = 'your_google_client_id';/,
            `const GOOGLE_CLIENT_ID = '${process.env.GOOGLE_CLIENT_ID || ''}';`
        );
        
        res.send(updatedContent);
    });
});

module.exports = router;
