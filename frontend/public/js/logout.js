// Logout handling
async function handleLogout() {
    try {
        const baseUrl = window.getApiBaseUrl();
        console.log('Logging out using API:', baseUrl);

        const response = await fetch(`${baseUrl}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        console.log('Logout response:', data);

        if (data.success) {
            // Clear all client-side storage
            window.TokenStorage.clearToken();
            sessionStorage.clear();
            localStorage.clear();

            // Redirect to login page
            window.location.replace('/login.html');
        } else {
            console.error('Logout failed:', data.message);
            alert('Logout failed: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error during logout:', error);
        alert('Error during logout. Please try again.');
    }
}

// Attach logout handler to all logout buttons/links
document.addEventListener('DOMContentLoaded', () => {
    const logoutElements = document.querySelectorAll('[data-action="logout"]');
    logoutElements.forEach(element => {
        element.addEventListener('click', async (e) => {
            e.preventDefault();
            await handleLogout();
        });
    });
});
