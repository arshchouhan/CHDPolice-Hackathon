/**
 * Gmail OAuth Handler
 * 
 * This script handles the Gmail OAuth flow, including:
 * - Initiating the OAuth process
 * - Handling the callback from Google
 * - Managing the connection state
 * - Redirecting the user back to the dashboard
 */

// Use the global getBaseUrl function from base-url.js
// This function is now defined in public/js/base-url.js and loaded in the HTML head
function getBaseUrl() {
    // Always use the global function if available
    if (window.getBaseUrl) {
        console.log('Using global getBaseUrl function');
        return window.getBaseUrl();
    }
    
    // Fallback implementation in case the script hasn't loaded yet
    console.warn('Using fallback getBaseUrl in gmail-oauth-handler.js because global function is not available');
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    console.log('Current hostname:', hostname, 'Origin:', origin);
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    } else if (hostname.includes('vercel.app')) {
        return origin;
    } else if (hostname.includes('onrender.com') || hostname.includes('email-detection')) {
        return 'https://email-detection-api.onrender.com';
    } else {
        return origin;
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

// Function to connect Gmail account
async function connectGmail() {
    console.log('Initiating Gmail connection...');
    const connectBtn = document.getElementById('connectGmailBtn');
    const statusText = document.getElementById('gmailStatusText');
    
    if (connectBtn) connectBtn.disabled = true;
    if (statusText) statusText.textContent = 'Connecting to Gmail...';
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated. Please log in again.');
        }
        
        // Use the baseUrl function to ensure consistent API endpoint resolution
        const baseUrl = getBaseUrl();
        console.log('Using base URL for Gmail auth:', baseUrl);
        
        const response = await fetch(`${baseUrl}/api/gmail/auth-url`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get auth URL');
        }
        
        const data = await response.json();
        console.log('Auth URL response:', data);
        
        if (data.authUrl) {
            // Store the current URL to return after OAuth flow
            localStorage.setItem('preOAuthPath', window.location.pathname);
            console.log('Redirecting to Google OAuth:', data.authUrl);
            window.location.href = data.authUrl;
        } else {
            throw new Error('No auth URL received from server');
        }
    } catch (error) {
        console.error('Error connecting to Gmail:', error);
        if (statusText) {
            statusText.textContent = `Error: ${error.message}`;
            statusText.className = 'text-red-500 text-sm';
        }
        if (connectBtn) connectBtn.disabled = false;
        
        // Show error toast or alert
        alert(`Failed to connect Gmail: ${error.message}`);
    }
    hideGmailAuthModal();
    showLoading();
    
    try {
        // First, verify user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication token not found. Please log in again.');
        }
        
        // Verify token is valid by making a test request
        try {
            console.log('Verifying authentication token...');
            const testResponse = await fetch(`${getBaseUrl()}/api/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Auth verification response status:', testResponse.status);
            
            if (!testResponse.ok) {
                // Token is invalid or expired
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
        } catch (authError) {
            console.error('Authentication verification failed:', authError);
            throw new Error('Authentication failed. Please log in again.');
        }
        
        // Store the exact current URL to return after auth
        const currentUrl = window.location.href;
        localStorage.setItem('gmailAuthReturnUrl', currentUrl);
        
        // Get environment information for debugging
        const baseUrl = getBaseUrl();
        const hostname = window.location.hostname;
        const origin = window.location.origin;
        
        console.log('Gmail connection - Environment details:');
        console.log('- BASE_URL:', baseUrl);
        console.log('- Hostname:', hostname);
        console.log('- Origin:', origin);
        console.log('- Return URL:', currentUrl);
        
        // Determine platform for server-side handling
        const platform = hostname.includes('vercel.app') ? 'vercel' : 
                        hostname.includes('onrender.com') ? 'render' : 'other';
        
        // Determine the correct redirect URI based on environment
        let redirectUri;
        
        if (platform === 'vercel') {
            redirectUri = 'https://chd-police-hackathon.vercel.app/api/gmail/callback';
        } else if (platform === 'render') {
            redirectUri = 'https://email-detection-api.onrender.com/api/gmail/callback';
        } else {
            // For local development or unknown environments
            redirectUri = `${baseUrl}/api/gmail/callback`;
            console.log('Using local redirect URI:', redirectUri);
        }
        
        console.log('Using redirect URI:', redirectUri);
        console.log('Platform detected:', platform);
        
        // Get the OAuth URL from our backend with explicit redirect_uri and platform info
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
    }
}

// Function to check if we just completed the OAuth flow
function checkOAuthRedirect() {
    console.log('Checking for OAuth redirect...');
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const oauthError = urlParams.get('oauth_error');
    
    // If we have an error, show it and clean up the URL
    if (error || oauthError) {
        const errorMessage = error || oauthError;
        console.error('OAuth error:', errorMessage);
        
        // Show error to user
        alert(`Gmail connection failed: ${decodeURIComponent(errorMessage)}`);
        
        // Clean up URL without reloading
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return;
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
    }
    try {
        console.log('Checking for OAuth redirect...');
        
        // Check if we just completed OAuth flow (URL has connected=true)
        const urlParams = new URLSearchParams(window.location.search);
        const justConnected = urlParams.get('connected') === 'true';
        const redirectTarget = urlParams.get('redirect');
        const token = urlParams.get('token');
        
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
            if (typeof updateGmailConnectionStatus === 'function') {
                updateGmailConnectionStatus(true, 'Gmail Account');
            }
            
            // Show success notification
            if (typeof showSuccessNotification === 'function') {
                showSuccessNotification(
                    'Gmail Connected Successfully', 
                    'Your Gmail account is now connected and protected.'
                );
            }
            
            // Show emails section if it exists
            const emailsSection = document.getElementById('emailsSection');
            if (emailsSection) {
                emailsSection.classList.remove('hidden');
                // Load emails automatically if the function exists
                if (typeof loadUserEmails === 'function') {
                    loadUserEmails();
                }
            } else {
                console.warn('emailsSection element not found in DOM');
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
        const response = await fetch(`${getBaseUrl()}/api/users/me`, {
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

            // Gmail OAuth Handler
            const GMAIL_AUTH_URL = '/api/gmail/auth-url';
            const GMAIL_STATUS_URL = '/api/gmail/status';

            // Check if we're coming back from OAuth redirect
            function checkOAuthRedirect() {
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const error = urlParams.get('error');
                const state = urlParams.get('state');

                if (code && state) {
                    console.log('OAuth flow in progress...');
                    // The backend will handle the rest via the callback URL
                    return true;
                } else if (error) {
                    const errorDescription = urlParams.get('error_description') || error;
                    console.error('OAuth error:', errorDescription);
                    showError(`Failed to connect Gmail: ${errorDescription}`);
                    return false;
                }
                return false;
            }

            // Show error message to user
            function showError(message) {
                const errorDiv = document.getElementById('error-message');
                if (errorDiv) {
                    errorDiv.textContent = message;
                    errorDiv.classList.remove('hidden');
                    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
                } else {
                    alert(message);
                }
            }

            // Initialize Gmail OAuth flow
            async function initGmailOAuth() {
                const isRedirect = checkOAuthRedirect();
                if (!isRedirect) {
                    await checkGmailStatus();
                }

                // Set up connect button
                const connectBtn = document.getElementById('connectGmailBtn');
                if (connectBtn) {
                    connectBtn.addEventListener('click', connectGmail);
                }
            }

            // Connect to Gmail
            async function connectGmail() {
                const connectBtn = document.getElementById('connectGmailBtn');
                const statusText = document.getElementById('gmailStatusText');

                try {
                    // Disable button and show loading state
                    if (connectBtn) connectBtn.disabled = true;
                    if (statusText) {
                        statusText.textContent = 'Connecting to Gmail...';
                        statusText.className = 'text-blue-500 text-sm';
                    }

                    // Get the auth URL from the server
                    const response = await fetch(GMAIL_AUTH_URL, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || 'Failed to get auth URL');
                    }

                    const data = await response.json();

                    if (data.authUrl) {
                        // Store the current URL to return after OAuth flow
                        localStorage.setItem('preOAuthPath', window.location.pathname);
                        // Redirect to Google OAuth
                        window.location.href = data.authUrl;
                    } else {
                        throw new Error('No auth URL received from server');
                    }
                } catch (error) {
                    console.error('Error connecting to Gmail:', error);
                    if (statusText) {
                        statusText.textContent = `Error: ${error.message}`;
                        statusText.className = 'text-red-500 text-sm';
                    }
                    if (connectBtn) connectBtn.disabled = false;
                    showError(`Failed to connect Gmail: ${error.message}`);
                }
            }

            // Check Gmail connection status
            async function checkGmailStatus() {
                const connectBtn = document.getElementById('connectGmailBtn');
                const statusText = document.getElementById('gmailStatusText');

                if (!connectBtn) return;

                try {
                    const response = await fetch(GMAIL_STATUS_URL, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to check Gmail status');
                    }

                    const data = await response.json();
                    updateUI(data.connected);
                } catch (error) {
                    console.error('Error checking Gmail status:', error);
                    if (statusText) {
                        statusText.textContent = 'Error checking status';
                        statusText.className = 'text-red-500 text-sm';
                    }
                }
            }

            // Update UI based on connection status
            function updateUI(isConnected) {
                const connectBtn = document.getElementById('connectGmailBtn');
                const statusText = document.getElementById('gmailStatusText');

                if (!connectBtn || !statusText) return;

                if (isConnected) {
                    connectBtn.textContent = 'Disconnect Gmail';
                    connectBtn.className = connectBtn.className.replace('bg-blue-500', 'bg-red-500 hover:bg-red-600');
                    statusText.textContent = 'Gmail is connected';
                    statusText.className = 'text-green-500 text-sm';
                } else {
                    connectBtn.textContent = 'Connect Gmail';
                    connectBtn.className = connectBtn.className.replace('bg-red-500 hover:bg-red-600', 'bg-blue-500 hover:bg-blue-600');
                    statusText.textContent = 'Gmail is not connected';
                    statusText.className = 'text-gray-500 text-sm';
                }

                connectBtn.disabled = false;
            }

            // Initialize when DOM is loaded
            document.addEventListener('DOMContentLoaded', initGmailOAuth);

            // Check Gmail connection status
            async function checkGmailStatus() {
                try {
                    const token = localStorage.getItem('token');
                    if (!token) return;

                    const response = await fetch('/api/gmail/status', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const status = await response.json();
                        updateGmailUI(status.connected);
                    }
                } catch (error) {
                    console.error('Error checking Gmail status:', error);
                }
            }

            // Update UI based on Gmail connection status
            function updateGmailUI(isConnected) {
                const connectBtn = document.getElementById('connectGmailBtn');
                const statusText = document.getElementById('gmailStatusText');

                if (isConnected) {
                    if (connectBtn) {
                        connectBtn.textContent = 'Reconnect Gmail';
                        connectBtn.className = 'px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600';
                    }
                    if (statusText) {
                        statusText.textContent = 'Gmail is connected';
                        statusText.className = 'text-green-500 text-sm';
                    }
                } else {
                    if (connectBtn) {
                        connectBtn.textContent = 'Connect Gmail';
                        connectBtn.className = 'px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600';
                    }
                    if (statusText) {
                        statusText.textContent = 'Gmail is not connected';
                        statusText.className = 'text-gray-500 text-sm';
                    }
                }
            }

            // Initialize the Gmail OAuth handlers when the page loads
            document.addEventListener('DOMContentLoaded', function() {
                console.log('Initializing Gmail OAuth handlers...');

                // Check if we're coming back from OAuth
                checkOAuthRedirect();

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
                checkRedirect: checkOAuthRedirect
            };
        } else {
            console.error('Failed to load user data:', data.message || 'Unknown error');
        }
    } catch (error) {
        console.error('Error verifying token:', error);
    }
}

// Check Gmail connection status
async function checkGmailStatus() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/gmail/status', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const status = await response.json();
            updateGmailUI(status.connected);
        }
    } catch (error) {
        console.error('Error checking Gmail status:', error);
    }
}

// Update UI based on Gmail connection status
function updateGmailUI(isConnected) {
    const connectBtn = document.getElementById('connectGmailBtn');
    const statusText = document.getElementById('gmailStatusText');

    if (isConnected) {
        if (connectBtn) {
            connectBtn.textContent = 'Reconnect Gmail';
            connectBtn.className = 'px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600';
        }
        if (statusText) {
            statusText.textContent = 'Gmail is connected';
            statusText.className = 'text-green-500 text-sm';
        }
    } else {
        if (connectBtn) {
            connectBtn.textContent = 'Connect Gmail';
            connectBtn.className = 'px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600';
        }
        if (statusText) {
            statusText.textContent = 'Gmail is not connected';
            statusText.className = 'text-gray-500 text-sm';
        }
    }
}

// Initialize the Gmail OAuth handlers when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Gmail OAuth handlers...');
    
    // Check if we're coming back from OAuth
    checkOAuthRedirect();
    
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
    checkRedirect: checkOAuthRedirect
};
