/**
 * Gmail OAuth Handler
 * 
 * This script handles the Gmail OAuth flow, including:
 * - Initiating the OAuth process
 * - Handling the callback from Google
 * - Managing the connection state
 * - Redirecting the user back to the dashboard
 */

// Initialize BASE_URL only once using IIFE to avoid conflicts
(function() {
    // Check if BASE_URL is already defined globally
    if (typeof window.BASE_URL !== 'undefined') {
        console.log('BASE_URL already exists:', window.BASE_URL);
        return;
    }
    
    // Function to get the base URL for API requests
    function getBaseUrl() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;
        
        // Development environment (local)
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            const devUrl = `${protocol}//${hostname}${port ? ':' + port : ''}`;
            console.log('Using development URL:', devUrl);
            return devUrl;
        } 
        // Production environment
        else {
            // Check if we're in a Vercel or Render deployment
            const isVercel = window.location.hostname.endsWith('.vercel.app');
            const isRender = window.location.hostname.endsWith('.onrender.com');
            
            // For Vercel and Render, use the current origin
            if (isVercel || isRender) {
                const prodUrl = window.location.origin;
                console.log('Using production URL (Vercel/Render):', prodUrl);
                return prodUrl;
            }
            
            // For custom domains, use the current origin
            const prodUrl = window.location.origin;
            console.log('Using production URL (custom domain):', prodUrl);
            return prodUrl;
        }
    }
    
    // Define BASE_URL as a non-configurable property
    Object.defineProperty(window, 'BASE_URL', {
        value: getBaseUrl(),
        writable: false,
        configurable: false
    });
    
    console.log('Base URL initialized:', window.BASE_URL);
})();

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
async function checkAuthentication() {
    console.log('Checking authentication status...');
    
    try {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add token to headers if it exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        console.log('Sending auth check to:', `${window.BASE_URL}/auth/check-auth`);
        const response = await fetch(`${window.BASE_URL}/auth/check-auth`, {
            method: 'GET',
            credentials: 'include',
            headers: headers
        });
        
        console.log('Auth check response status:', response.status);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('Authentication check failed:', error);
            return false;
        }
        
        const data = await response.json();
        console.log('Authentication response:', data);
        
        if (data.authenticated && data.user) {
            console.log('User is authenticated:', data.user);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error during authentication check:', error);
        return false;
    }
}

// Function to show the Gmail authorization modal
function showGmailAuthModal() {
    console.log('Showing Gmail authorization modal');
    const gmailAuthModal = document.getElementById('gmailAuthModal');
    if (gmailAuthModal) {
        gmailAuthModal.classList.remove('hidden');
    } else {
        console.error('Gmail auth modal not found in DOM');
    }
}

// Function to hide the Gmail authorization modal
function hideGmailAuthModal() {
    console.log('Hiding Gmail authorization modal');
    const gmailAuthModal = document.getElementById('gmailAuthModal');
    if (gmailAuthModal) {
        gmailAuthModal.classList.add('hidden');
    }
}

// Function to show loading state
function showLoading() {
    const statusText = document.getElementById('gmailStatusText');
    if (statusText) {
        statusText.textContent = 'Connecting...';
        statusText.className = 'text-blue-500 text-sm';
    }
}

// Function to hide loading state
function hideLoading() {
    const statusText = document.getElementById('gmailStatusText');
    if (statusText) {
        statusText.textContent = '';
    }
}

// Function to show error message
function showError(title, message) {
    console.error(`${title}: ${message}`);
    const statusText = document.getElementById('gmailStatusText');
    if (statusText) {
        statusText.textContent = message;
        statusText.className = 'text-red-500 text-sm';
    }
    alert(`${title}: ${message}`);
}

// Function to show success notification
function showSuccessNotification(title, message) {
    console.log(`${title}: ${message}`);
    const statusText = document.getElementById('gmailStatusText');
    if (statusText) {
        statusText.textContent = message;
        statusText.className = 'text-green-500 text-sm';
    }
}

// Function to connect Gmail account
async function connectGmail() {
    console.log('Initiating Gmail connection...');
    const connectBtn = document.getElementById('connectGmailBtn');
    const statusText = document.getElementById('gmailStatusText');
    
    if (connectBtn) connectBtn.disabled = true;
    if (statusText) statusText.textContent = 'Connecting to Gmail...';
    
    // First check if user is authenticated
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to login...');
        window.location.href = `${window.BASE_URL}/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
    }
    
    hideGmailAuthModal();
    showLoading();
    
    try {
        // Verify user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication token not found. Please log in again.');
        }
        
        // Verify token is valid by making a test request
        console.log('Verifying authentication token...');
        const testResponse = await fetch(`${window.BASE_URL}/api/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Auth verification response status:', testResponse.status);
        
        if (!testResponse.ok) {
            console.error('Authentication verification failed with status:', testResponse.status);
            localStorage.removeItem('token');
            throw new Error('Your session has expired. Please log in again.');
        }
        
        // Get user info to confirm authentication
        const userData = await testResponse.json();
        if (!userData.success) {
            throw new Error('Authentication verification failed: ' + (userData.message || 'Unknown error'));
        }
        
        console.log('Authenticated as user:', userData.email || userData.username || userData._id);
        
        // Store the exact current URL to return after auth
        const currentUrl = window.location.href;
        localStorage.setItem('gmailAuthReturnUrl', currentUrl);
        
        // Get environment information for debugging
        const baseUrl = window.BASE_URL;
        const hostname = window.location.hostname;
        const origin = window.location.origin;
        
        console.log('Gmail connection - Environment details:');
        console.log('- BASE_URL:', baseUrl);
        console.log('- Hostname:', hostname);
        console.log('- Origin:', origin);
        console.log('- Return URL:', currentUrl);
        
        // Always use the Render backend for OAuth
        let redirectUri;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // For local development
            redirectUri = `http://${hostname}:3000/api/gmail/callback`;
            console.log('Using local development redirect URI:', redirectUri);
        } else {
            // For all production environments, use the Render backend
            redirectUri = 'https://chdpolice-hackathon.onrender.com/api/gmail/callback';
            console.log('Using production redirect URI:', redirectUri);
        }
        
        console.log('Using redirect URI:', redirectUri);
        console.log('Platform detected:', platform);
        
        // Get the OAuth URL from our backend
        const response = await fetch(`${baseUrl}/api/gmail/auth-url?platform=${platform}&redirect_uri=${encodeURIComponent(redirectUri)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Enhanced error handling with specific error messages
        if (response.status === 401 || response.status === 403) {
            throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 404) {
            throw new Error('Gmail API endpoint not found. The server might be misconfigured.');
        } else if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Invalid request: ${errorData.message || 'Bad request parameters'}`);
        } else if (response.status === 500) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Server error: ${errorData.message || 'Internal server error'}`);
        } else if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Error ${response.status}: ${errorData.message || response.statusText || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        if (!data.authUrl) {
            throw new Error('Invalid response from server: Missing authentication URL');
        }
        
        console.log('Redirecting to Google OAuth consent screen');
        
        // Store the current URL to return after OAuth flow
        localStorage.setItem('preOAuthPath', window.location.pathname);
        
        // Redirect to Google OAuth consent screen
        window.location.href = data.authUrl;
        
    } catch (error) {
        hideLoading();
        console.error('Gmail connection error:', error);
        
        // Provide helpful error messages based on error type
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showError('Network Error', 'Cannot connect to the server. Please check your internet connection and try again.');
        } else if (error.message.includes('Authentication failed')) {
            showError('Authentication Error', 'Your login session has expired. Please log in again.');
            // Redirect to login page after a short delay
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 3000);
        } else {
            showError('Gmail Connection Error', error.message);
        }
        
        // Re-enable the connect button
        const connectBtn = document.getElementById('connectGmailBtn');
        if (connectBtn) connectBtn.disabled = false;
    }
}

// Function to check if we just completed the OAuth flow
function checkOAuthRedirect() {
    try {
        console.log('Checking for OAuth redirect...');
        
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const oauthError = urlParams.get('oauth_error');
        const justConnected = urlParams.get('connected') === 'true';
        const redirectTarget = urlParams.get('redirect');
        const token = urlParams.get('token');
        
        // If we have an error, show it and clean up the URL
        if (error || oauthError) {
            const errorMessage = error || oauthError;
            console.error('OAuth error:', errorMessage);
            
            // Show error to user
            showError('Gmail Connection Failed', decodeURIComponent(errorMessage));
            
            // Clean up URL without reloading
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            return false;
        }
        
        // If we have a code, we're coming back from OAuth
        if (code) {
            console.log('Detected OAuth callback with code');
            
            // Show loading state
            const statusText = document.getElementById('gmailStatusText');
            if (statusText) {
                statusText.textContent = 'Completing Gmail connection...';
                statusText.className = 'text-blue-500 text-sm';
            }
            
            // Clean up the URL
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            
            // Redirect to dashboard after a short delay to show success message
            setTimeout(() => {
                // Check if we have a stored pre-OAuth path to return to
                const preOAuthPath = localStorage.getItem('preOAuthPath') || '/dashboard';
                localStorage.removeItem('preOAuthPath');
                
                // Add success parameter
                const separator = preOAuthPath.includes('?') ? '&' : '?';
                window.location.href = `${preOAuthPath}${separator}gmail_connected=true`;
            }, 1000);
            
            return true;
        }
        
        // Check if we just completed OAuth flow (URL has connected=true)
        if (justConnected) {
            console.log('Detected successful OAuth completion from URL parameter');
            
            // If we have a token in the URL, store it in localStorage
            if (token) {
                console.log('Found token in URL, storing in localStorage');
                localStorage.setItem('token', token);
                
                // Verify the token by making a request to the server
                verifyAndLoadUserData(token);
            }
            
            // Remove the query parameters to avoid confusion on page refresh
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
            
            // Force update the connection status
            updateGmailConnectionStatus(true, 'Gmail Account');
            
            // Show success notification
            showSuccessNotification(
                'Gmail Connected Successfully', 
                'Your Gmail account is now connected and protected.'
            );
            
            // Show emails section if it exists
            const emailsSection = document.getElementById('emailsSection');
            if (emailsSection) {
                emailsSection.classList.remove('hidden');
                // Load emails automatically if the function exists
                if (typeof loadUserEmails === 'function') {
                    loadUserEmails();
                }
            }
            
            // If we have a specific redirect target, handle it
            if (redirectTarget === 'dashboard') {
                console.log('Redirecting to dashboard section');
                // Scroll to the dashboard section
                const dashboardSection = document.getElementById('dashboardContainer');
                if (dashboardSection) {
                    dashboardSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking OAuth redirect:', error);
        return false;
    }
}

// Function to verify token and load user data
async function verifyAndLoadUserData(token) {
    try {
        console.log('Verifying token and loading user data...');
        const response = await fetch(`${window.BASE_URL}/api/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to verify token: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.success && data.user) {
            console.log('User data loaded successfully');
            // Store user data in localStorage
            localStorage.setItem('userData', JSON.stringify(data.user));
            
            // Update UI with user data if needed
            if (typeof updateUserInfo === 'function') {
                updateUserInfo(data.user);
            }
        } else {
            console.error('Failed to load user data:', data.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Error verifying token:', error);
    }
}

// Check Gmail connection status
async function checkGmailStatus() {
    const connectBtn = document.getElementById('connectGmailBtn');
    const statusText = document.getElementById('gmailStatusText');
    const gmailStatusText = document.getElementById('gmailStatus');

    if (!connectBtn) return;

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found');
            if (gmailStatusText) {
                gmailStatusText.textContent = 'Not authenticated';
                gmailStatusText.className = 'text-red-500';
            }
            return;
        }

        const response = await fetch('/api/gmail/status', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to check Gmail status');
        }

        const data = await response.json();
        
        // Update the UI based on the connection status
        updateGmailConnectionStatus(data.connected, data.email);
        
    } catch (error) {
        console.error('Error checking Gmail status:', error);
        if (statusText) {
            statusText.textContent = error.message || 'Error checking status';
            statusText.className = 'text-red-500 text-sm';
        }
        if (gmailStatusText) {
            gmailStatusText.textContent = 'Error';
            gmailStatusText.className = 'text-red-500';
        }
    }
}

// Update UI based on Gmail connection status
function updateGmailConnectionStatus(isConnected, email = null) {
    const connectBtn = document.getElementById('connectGmailBtn');
    const statusText = document.getElementById('gmailStatusText');
    const gmailStatusText = document.getElementById('gmailStatus');

    if (isConnected) {
        if (connectBtn) {
            connectBtn.textContent = 'Reconnect Gmail';
            connectBtn.className = 'px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600';
            connectBtn.disabled = false;
        }
        if (statusText) {
            statusText.textContent = `Gmail is connected${email ? ` (${email})` : ''}`;
            statusText.className = 'text-green-500 text-sm';
        }
        if (gmailStatusText) {
            gmailStatusText.textContent = 'Connected';
            gmailStatusText.className = 'text-green-500';
        }
    } else {
        if (connectBtn) {
            connectBtn.textContent = 'Connect Gmail';
            connectBtn.className = 'px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600';
            connectBtn.disabled = false;
        }
        if (statusText) {
            statusText.textContent = 'Gmail is not connected';
            statusText.className = 'text-gray-500 text-sm';
        }
        if (gmailStatusText) {
            gmailStatusText.textContent = 'Not Connected';
            gmailStatusText.className = 'text-red-500';
        }
    }
}

// Initialize the Gmail OAuth handlers when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Gmail OAuth handlers...');
    
    // Check if we're coming back from OAuth
    const hasRedirect = checkOAuthRedirect();
    
    // If we didn't handle a redirect, check Gmail status
    if (!hasRedirect) {
        checkGmailStatus();
    }
    
    // Set up connect button if it exists
    const connectBtn = document.getElementById('connectGmailBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectGmail);
    }
    
    // Set up event listener for the modal's connect button
    const authorizeGmailBtn = document.getElementById('authorizeGmailBtn');
    if (authorizeGmailBtn) {
        authorizeGmailBtn.addEventListener('click', function(e) {
            console.log('Modal Gmail button clicked');
            e.preventDefault();
            connectGmail();
        });
    }
    
    // Set up event listener for the modal's close button
    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function(e) {
            console.log('Close modal button clicked');
            e.preventDefault();
            hideGmailAuthModal();
        });
    }
});

// Export functions for use in other scripts
window.gmailOAuth = {
    connect: connectGmail,
    showModal: showGmailAuthModal,
    hideModal: hideGmailAuthModal,
    checkRedirect: checkOAuthRedirect,
    checkStatus: checkGmailStatus,
    updateStatus: updateGmailConnectionStatus
};