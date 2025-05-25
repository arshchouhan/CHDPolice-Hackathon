/**
 * Gmail OAuth Handler
 * 
 * This script handles the Gmail OAuth flow, including:
 * - Initiating the OAuth process
 * - Handling the callback from Google
 * - Managing the connection state
 * - Redirecting the user back to the dashboard
 */

// Function to get the base URL for API requests
function getBaseUrl() {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://${hostname}:3000`;
    } else {
        return window.location.origin;
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
    try {
        console.log('Checking for OAuth redirect...');
        
        // Check if we just completed OAuth flow (URL has connected=true)
        const urlParams = new URLSearchParams(window.location.search);
        const justConnected = urlParams.get('connected') === 'true';
        const redirectTarget = urlParams.get('redirect');
        
        if (justConnected) {
            console.log('Detected successful OAuth completion from URL parameter');
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

// Initialize the Gmail OAuth handlers when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Gmail OAuth handlers...');
    
    // Check if we just completed the OAuth flow
    const redirectHandled = checkOAuthRedirect();
    if (redirectHandled) {
        console.log('OAuth redirect handled successfully');
    }
    
    // Set up event listeners for Gmail connection buttons
    const connectButtons = document.querySelectorAll('[data-action="connect-gmail"]');
    connectButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            console.log('Gmail connect button clicked');
            e.preventDefault();
            showGmailAuthModal();
        });
    });
    
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
