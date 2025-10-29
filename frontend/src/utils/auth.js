// Force logout function that can be called from any admin page
export const forceLogout = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    // Call the server to clear the session
    await fetch(`${apiUrl}/api/admin/force-logout`, {
      method: 'POST',
      credentials: 'include'
    });
    
    // Clear all auth data from localStorage
    localStorage.removeItem('adminToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('isAdminLoggedIn');
    localStorage.removeItem('userData');
    localStorage.removeItem('tokenExpiration');
    
    // Redirect to login with forceLogout parameter
    window.location.href = '/admin/login?forceLogout=true';
  } catch (error) {
    console.error('Force logout error:', error);
    // Still clear local storage and redirect even if server call fails
    localStorage.clear();
    window.location.href = '/admin/login?forceLogout=true';
  }
};

// Check if admin is authenticated
export const isAdminAuthenticated = async () => {
  const token = localStorage.getItem('adminToken');
  const tokenExpiration = localStorage.getItem('tokenExpiration');
  const currentTime = new Date().getTime();
  
  if (!token || (tokenExpiration && currentTime > parseInt(tokenExpiration))) {
    await forceLogout();
    return false;
  }
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/admin/verify-token`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      await forceLogout();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Auth check error:', error);
    await forceLogout();
    return false;
  }
};
