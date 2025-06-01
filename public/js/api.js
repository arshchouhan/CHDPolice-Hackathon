/**
 * API utility for making authenticated requests
 * Handles CSRF tokens, authentication, and error handling
 */

const BASE_URL = window.location.origin;

// Get CSRF token from cookies
function getCsrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

// Standard fetch wrapper with authentication and error handling
async function apiRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    // Set default headers
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
    };
    
    // Add CSRF token if available
    const csrfToken = getCsrfToken();
    if (csrfToken) {
        headers['X-XSRF-TOKEN'] = csrfToken;
    }
    
    // Prepare request options
    const requestOptions = {
        ...options,
        headers,
        credentials: 'include', // Important: include cookies with requests
        mode: 'cors',
    };
    
    try {
        console.log(`API Request: ${requestOptions.method || 'GET'} ${url}`);
        const response = await fetch(url, requestOptions);
        
        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401) {
            console.warn('Authentication required, redirecting to login');
            window.location.href = '/login.html';
            return null;
        }
        
        // Parse JSON response
        const data = await response.json().catch(() => ({}));
        
        // Handle non-2xx responses
        if (!response.ok) {
            const error = new Error(data.message || 'API request failed');
            error.status = response.status;
            error.data = data;
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Check authentication status
export async function checkAuth() {
    try {
        const data = await apiRequest('/api/auth/check', {
            method: 'GET'
        });
        return data.authenticated ? data : null;
    } catch (error) {
        console.error('Auth check failed:', error);
        return null;
    }
}

// Gmail API functions
export const gmail = {
    getStatus: async () => {
        return apiRequest('/api/gmail/status', {
            method: 'GET'
        });
    },
    
    getAuthUrl: async () => {
        return apiRequest('/api/gmail/auth/url', {
            method: 'GET'
        });
    },
    
    disconnect: async () => {
        return apiRequest('/api/gmail/disconnect', {
            method: 'POST'
        });
    }
};

// User authentication functions
export const auth = {
    login: async (email, password) => {
        return apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },
    
    logout: async () => {
        return apiRequest('/api/auth/logout', {
            method: 'POST'
        });
    },
    
    googleLogin: async (credential) => {
        return apiRequest('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify({ credential })
        });
    }
};

// Initialize CSRF token on page load
document.addEventListener('DOMContentLoaded', () => {
    // Make a request to get the CSRF token if not in cookies
    if (!getCsrfToken()) {
        fetch(`${BASE_URL}/api/csrf-token`, {
            credentials: 'include'
        }).catch(console.error);
    }
});
