/**
 * Authentication Utilities
 * Handles authentication state, token management, and protected routes
 */

// Initialize BASE_URL if not already set
if (!window.BASE_URL) {
    const hostname = window.location.hostname;
    
    // For local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const port = window.location.port || '3000';
        window.BASE_URL = `http://${hostname}:${port}`;
        console.log('Development environment detected, using local backend at:', window.BASE_URL);
    } else {
        // Always use Render backend in production
        window.BASE_URL = 'https://email-detection-api.onrender.com';
        console.log('Production environment detected, using Render backend at:', window.BASE_URL);
    }
    
    // Clear any old base URL from localStorage to prevent conflicts
    localStorage.removeItem('baseUrl');
}

// Check if user is authenticated
async function isAuthenticated() {
    // Don't check if we're on the login page
    if (window.location.pathname.endsWith('login.html')) {
        return false;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        // If no token but we're not on login page, redirect to login
        if (!window.location.pathname.endsWith('login.html')) {
            const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login.html?returnTo=${returnTo}`;
        }
        return false;
    }
    
    try {
        const response = await fetch(`${window.BASE_URL}/auth/check-auth`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            // If unauthorized, clear the invalid token
            if (response.status === 401) {
                clearAuth();
                // Redirect to login if not already there
                if (!window.location.pathname.endsWith('login.html')) {
                    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
                    window.location.href = `/login.html?returnTo=${returnTo}`;
                }
            }
            return false;
        }
        
        const data = await response.json();
        
        // If authenticated, check if we need to redirect based on role
        if (data.authenticated && data.user) {
            const isAdmin = data.user.role === 'admin';
            
            const isOnAdminPage = window.location.pathname.includes('admin-dashboard.html');
            const isOnIndexPage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html');
            
            // Redirect to appropriate page if not already there
            if ((isAdmin && !isOnAdminPage) || (!isAdmin && !isOnIndexPage)) {
                const redirectPath = isAdmin ? '/admin-dashboard.html' : '/';
                window.location.href = redirectPath;
            }
        }
        
        return data.authenticated === true;
    } catch (error) {
        console.error('Authentication check failed:', error);
        clearAuth();
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = '/login.html';
        }
        return false;
    }
}

// Clear authentication data
function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    
    // Clear any auth-related cookies
    document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.split('=');
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
}

// Redirect to login page with return URL
function redirectToLogin() {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `/login.html?returnTo=${encodeURIComponent(currentPath)}`;
}

// Protect a route - redirect to login if not authenticated
async function protectRoute() {
    const isAuth = await isAuthenticated();
    if (!isAuth) {
        redirectToLogin();
        return false;
    }
    return true;
}

// Get current user info
function getCurrentUser() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
}

// Check if current user has required role
function hasRole(requiredRole) {
    const user = getCurrentUser();
    return user?.role === requiredRole;
}

// Initialize authentication
async function initAuth() {
    // Check if we're on a protected page
    const protectedPages = ['/index.html', '/admin-dashboard.html'];
    const isProtectedPage = protectedPages.some(page => 
        window.location.pathname.endsWith(page)
    );
    
    if (isProtectedPage) {
        const isAuth = await isAuthenticated();
        if (!isAuth) {
            redirectToLogin();
            return false;
        }
    }
    
    // If we're on the login page but already authenticated, redirect to dashboard
    if (window.location.pathname.endsWith('/login.html')) {
        const isAuth = await isAuthenticated();
        if (isAuth) {
            const user = getCurrentUser();
            const redirectPath = user?.role === 'admin' ? '/admin-dashboard.html' : '/index.html';
            window.location.href = redirectPath;
            return false;
        }
    }
    
    return true;
}

// Expose functions to window
window.authUtils = {
    isAuthenticated,
    clearAuth,
    redirectToLogin,
    protectRoute,
    getCurrentUser,
    hasRole,
    initAuth
};

// Initialize auth when the script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.authUtils.initAuth);
} else {
    window.authUtils.initAuth();
}
