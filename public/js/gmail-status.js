/**
 * Gmail Status Management
 * Handles checking and displaying Gmail connection status
 */

// Import the API utility
import { gmail } from './api.js';

// Global state
let gmailStatus = {
    connected: false,
    email: null,
    loading: true
};

/**
 * Update the UI based on Gmail connection status
 * @param {boolean} connected - Whether Gmail is connected
 * @param {string} [email] - The connected email address
 */
function updateGmailConnectionStatus(connected, email = null) {
    try {
        const statusElement = document.getElementById('gmailStatus');
        const emailElement = document.getElementById('gmailEmail');
        const connectButton = document.getElementById('connectGmailBtn');
        const disconnectButton = document.getElementById('disconnectGmailBtn');
        const loadingIndicator = document.getElementById('gmailLoading');
        
        // Update global state
        gmailStatus = { connected, email, loading: false };
        
        // Update UI elements if they exist
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        if (statusElement) {
            statusElement.textContent = connected ? 'Connected' : 'Not Connected';
            statusElement.className = connected ? 'text-green-500 font-medium' : 'text-red-500 font-medium';
        }
        
        if (emailElement) {
            emailElement.textContent = email || 'N/A';
            emailElement.style.display = email ? 'inline' : 'none';
        }
        
        if (connectButton) {
            connectButton.style.display = connected ? 'none' : 'inline-flex';
        }
        
        if (disconnectButton) {
            disconnectButton.style.display = connected ? 'inline-flex' : 'none';
        }
    } catch (error) {
        console.error('Error updating Gmail connection status:', error);
    }
}

/**
 * Load user emails if the loadUserEmails function is available
 */
async function loadEmailsIfAvailable() {
    try {
        if (typeof loadUserEmails === 'function') {
            await loadUserEmails();
        } else {
            console.log('loadUserEmails function not available');
        }
    } catch (error) {
        console.error('Error loading emails:', error);
    }
}

/**
 * Check the Gmail connection status
 */
async function checkGmailStatus() {
    let loadingIndicator;
    
    try {
        console.log('Checking Gmail connection status...');
        
        // Show loading state
        loadingIndicator = document.getElementById('gmailLoading');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        
        // Check for OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const justConnected = urlParams.get('connected') === 'true';
        
        if (justConnected) {
            console.log('Detected successful OAuth completion from URL parameter');
            // Clean up URL
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
            
            // Update UI and load emails
            updateGmailConnectionStatus(true, 'Gmail Account');
            const emailsSection = document.getElementById('emailsSection');
            if (emailsSection) {
                emailsSection.classList.remove('hidden');
                await loadEmailsIfAvailable();
            }
            return;
        }
        
        // Check Gmail status via API
        const data = await gmail.getStatus();
        console.log('Gmail connection data:', data);
        
        if (data.connected) {
            updateGmailConnectionStatus(true, data.email || 'Gmail Account');
            
            // Show emails section if connected
            const emailsSection = document.getElementById('emailsSection');
            if (emailsSection) {
                emailsSection.classList.remove('hidden');
                await loadEmailsIfAvailable();
            } else {
                console.log('Emails section not found in DOM');
            }
        } else {
            updateGmailConnectionStatus(false);
        }
    } catch (error) {
        console.error('Error checking Gmail status:', error);
        updateGmailConnectionStatus(false);
        
        // Handle authentication errors
        if (error.status === 401) {
            console.log('Authentication error, attempting to refresh token...');
            try {
                const response = await fetch('/api/auth/refresh', {
                    method: 'POST',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    console.log('Token refreshed, retrying...');
                    await checkGmailStatus();
                } else {
                    console.log('Token refresh failed, redirecting to login');
                    window.location.href = '/login.html';
                }
            } catch (refreshError) {
                console.error('Error refreshing token:', refreshError);
                window.location.href = '/login.html';
            }
        }
    } finally {
        // Hide loading indicator
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check Gmail status when the page loads
    checkGmailStatus();
    
    // Set up event listeners for connect/disconnect buttons
    const connectBtn = document.getElementById('connectGmailBtn');
    const disconnectBtn = document.getElementById('disconnectGmailBtn');
    
    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            window.location.href = '/connect-gmail.html';
        });
    }
    
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', async () => {
            try {
                await gmail.disconnect();
                updateGmailConnectionStatus(false);
            } catch (error) {
                console.error('Error disconnecting Gmail:', error);
                alert('Failed to disconnect Gmail. Please try again.');
            }
        });
    }
});
