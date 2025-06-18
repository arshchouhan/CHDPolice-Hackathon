/**
 * Unified Base URL Handler
 * 
 * This file provides a consistent implementation of getBaseUrl() across the application
 * to ensure API endpoints are correctly resolved in all environments.
 */

// Define the getBaseUrl function in the global scope
// API Configuration
const API_CONFIG = {
    production: {
        render: 'https://chdpolice-hackathon.onrender.com',
        vercel: 'https://chdpolice-hackathon.onrender.com' // Same as render since we're not using separate API domain
    },
    development: {
        api: 'http://localhost:3000'
    }
};

// Token storage with domain validation
window.TokenStorage = {
    setToken: function(token, expiresIn = 7 * 24 * 60 * 60 * 1000) { // 7 days default
        try {
            const tokenData = {
                value: token,
                domain: window.location.hostname,
                expires: Date.now() + expiresIn,
                timestamp: Date.now()
            };
            localStorage.setItem('authToken', JSON.stringify(tokenData));
            console.log('Token stored successfully for domain:', tokenData.domain);
        } catch (error) {
            console.error('Error storing token:', error);
        }
    },

    getToken: function() {
        try {
            const tokenData = JSON.parse(localStorage.getItem('authToken'));
            if (!tokenData) return null;

            // Validate domain
            if (tokenData.domain !== window.location.hostname) {
                console.warn('Token domain mismatch, clearing token');
                this.clearToken();
                return null;
            }

            // Check expiration
            if (Date.now() > tokenData.expires) {
                console.warn('Token expired, clearing token');
                this.clearToken();
                return null;
            }

            return tokenData.value;
        } catch (error) {
            console.error('Error retrieving token:', error);
            return null;
        }
    },

    clearToken: function() {
        localStorage.removeItem('authToken');
        console.log('Token cleared');
    }
};

// Get API base URL based on environment
window.getApiBaseUrl = function() {
    try {
        const hostname = window.location.hostname;
        console.log('Getting API base URL for hostname:', hostname);

        // Development environment
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            console.log('Development environment detected');
            return API_CONFIG.development.api;
        }

        // Production environment
        if (hostname.includes('vercel.app')) {
            console.log('Vercel environment detected');
            return API_CONFIG.production.vercel;
        }

        if (hostname.includes('onrender.com')) {
            console.log('Render environment detected');
            return API_CONFIG.production.render;
        }

        // Fallback to development
        console.warn('Unknown environment, falling back to development API');
        return API_CONFIG.development.api;
    } catch (error) {
        console.error('Error determining API base URL:', error);
        return API_CONFIG.production.render; // Safe fallback
    }
};

// Backward compatibility
window.getBaseUrl = window.getApiBaseUrl;

// OAuth URL generator
window.getOAuthRedirectUrl = function() {
    const baseUrl = window.getApiBaseUrl();
    return `${baseUrl}/api/gmail/callback`;
};

// Log that the base URL module has been loaded
console.log('Base URL module loaded');
