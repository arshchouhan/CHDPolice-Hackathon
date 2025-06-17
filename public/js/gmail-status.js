// Function to check Gmail connection status from the server
async function checkGmailStatus() {
    try {
        console.log('Checking Gmail connection status...');
        
        // Check if we just completed OAuth flow (URL has connected=true)
        const urlParams = new URLSearchParams(window.location.search);
        const justConnected = urlParams.get('connected') === 'true';
        
        if (justConnected) {
            console.log('Detected successful OAuth completion from URL parameter');
            // Remove the query parameter to avoid confusion on page refresh
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
            
            // Force update the connection status
            updateGmailConnectionStatus(true, 'Gmail Account');
            
            // Add null check before accessing classList
            const emailsSection = document.getElementById('emailsSection');
            if (emailsSection) {
                emailsSection.classList.remove('hidden');
                loadUserEmails();
            } else {
                console.warn('emailsSection element not found in DOM');
            }
            return;
        }
        
        const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
        const response = await fetch(`${baseUrl}/api/gmail/status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Gmail status response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Gmail connection data:', data);
            
            if (data.connected) {
                // Update UI with connection status and email
                updateGmailConnectionStatus(true, data.email || 'Gmail Account');
                
                // Show emails section if connected
                const emailsSection = document.getElementById('emailsSection');
                if (emailsSection) {
                    emailsSection.classList.remove('hidden');
                    await loadUserEmails();
                } else {
                    console.log('Emails section not found in DOM');
                }
            } else {
                updateGmailConnectionStatus(false);
            }
        } else {
            // Handle error response
            console.error('Error checking Gmail status:', response.status);
            const errorData = await response.json().catch(() => ({}));
            console.error('Error details:', errorData);
            
            // If unauthorized, check if we need to reconnect
            if (response.status === 401) {
                updateGmailConnectionStatus(false);
            }
        }
    } catch (error) {
        console.error('Error checking Gmail status:', error);
    }
}

// Export functions for browser use
window.gmailStatus = {
    check: checkGmailStatus
};

// Initialize status check on load if not in OAuth callback
if (!new URLSearchParams(window.location.search).has('code')) {
    document.addEventListener('DOMContentLoaded', checkGmailStatus);
}
