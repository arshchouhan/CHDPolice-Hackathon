/**
 * Authentication Utilities
 * Handles authentication state, token management, and protected routes
 */

// Check if user is authenticated
async function isAuthenticated() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const response = await fetch(`${window.BASE_URL}/auth/check-session`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            // If unauthorized, clear the invalid token
            if (response.status === 401) {
                clearAuth();
            }
            return false;
        }
        
        const data = await response.json();
        return data.authenticated === true;
    } catch (error) {
        console.error('Authentication check failed:', error);
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
