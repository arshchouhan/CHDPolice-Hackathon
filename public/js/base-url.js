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
        vercel: 'https://chdpolice-hackathon.onrender.com'
    },
    development: {
        api: 'http://localhost:5000'  // Match the actual backend port
    }
};

// Fetch configuration for cross-origin requests
const FETCH_CONFIG = {
    credentials: 'include',  // Required for cookies
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    mode: 'cors'  // Explicit CORS mode
};

// Token storage with domain validation
window.TokenStorage = {
    setToken: function(token, expiresIn) {
        const tokenData = {
            token: token,
            domain: window.location.hostname,
            expires: Date.now() + (expiresIn || 7 * 24 * 60 * 60 * 1000) // Default 7 days
        };
        localStorage.setItem('authToken', JSON.stringify(tokenData));
        
        // Set a session flag cookie
        document.cookie = 'sessionActive=true; path=/; secure; samesite=lax';
    },
    getToken: function() {
        try {
            // First check if session is active via cookie
            if (!document.cookie.includes('sessionActive=true')) {
                console.log('No active session cookie found');
                this.clearToken();
                return null;
            }
            
            const tokenData = JSON.parse(localStorage.getItem('authToken'));
            if (!tokenData) {
                console.log('No token data found');
                return null;
            }

            // Validate domain
            if (tokenData.domain !== window.location.hostname) {
                console.log('Token domain mismatch, clearing token');
                this.clearToken();
                return null;
            }

            // Check expiration
            if (Date.now() > tokenData.expires) {
                console.log('Token expired, clearing token');
                this.clearToken();
                return null;
            }

            return tokenData.token;
        } catch (error) {
            console.error('Error reading token:', error);
            this.clearToken();
            return null;
        }
    },
    clearToken: function() {
        localStorage.removeItem('authToken');
        // Clear the session cookie
        document.cookie = 'sessionActive=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; secure; samesite=lax';
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

        // Production environment - always use Render backend
        console.log('Production environment detected');
        return API_CONFIG.production.render;
    } catch (error) {
        console.error('Error determining API base URL:', error);
        return API_CONFIG.production.render; // Safe fallback
    }
};

// Helper function for API requests
window.apiRequest = async function(endpoint, options = {}) {
    const baseUrl = window.getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;
    
    // Merge default config with provided options
    const config = {
        ...FETCH_CONFIG,
        ...options,
        headers: {
            ...FETCH_CONFIG.headers,
            ...options.headers
        }
    };
    
    console.log('Making API request:', {
        url,
        method: options.method || 'GET',
        headers: config.headers
    });
    
    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
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
