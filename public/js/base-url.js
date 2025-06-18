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
        api: 'http://localhost:3000'  // Match the actual backend port we're now using
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
    setToken: function(token, user) {
        // Store in localStorage as backup
        localStorage.setItem('token', token);
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        }
        
        console.log('Token stored in localStorage');
    },
    getToken: function() {
        try {
            // Check if there's a server-set sessionActive cookie - will be checked by backend
            // or fall back to localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('No token found in localStorage');
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
    
    // Always include credentials in requests
    const config = {
        ...FETCH_CONFIG,
        ...options,
        credentials: 'include', // Always include credentials
        headers: {
            ...FETCH_CONFIG.headers,
            ...options.headers
        }
    };
    
    // Add auth header if we have a token in localStorage
    const token = localStorage.getItem('token');
    if (token && !config.headers['Authorization']) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('Making API request:', {
        url,
        method: options.method || 'GET',
        withCredentials: true
    });
    
    try {
        const response = await fetch(url, config);
        
        // If we get a 401 on a token-requiring endpoint, redirect to login
        if (response.status === 401 && !endpoint.includes('login')) {
            console.warn('Authentication failed - redirecting to login');
            window.location.href = '/login.html?error=session_expired&redirect=' + 
                encodeURIComponent(window.location.pathname.replace(/^\//, ''));
            throw new Error('Authentication failed');
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        
        // Handle successful response with auth data
        if (data.token) {
            window.TokenStorage.setToken(data.token, data.user);
        }
        
        return data;
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
