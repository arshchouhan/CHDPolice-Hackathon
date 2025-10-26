import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const useGmailStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get base URL from environment or use current origin
  const getBaseUrl = () => {
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    return window.location.origin;
  };

  const BASE_URL = getBaseUrl();

  // Check Gmail connection status
  const checkGmailStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check for OAuth redirect
      const urlParams = new URLSearchParams(window.location.search);
      const justConnected = urlParams.get('connected') === 'true';
      
      if (justConnected) {
        // Clean up URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // Set connected state
        setIsConnected(true);
        setGmailEmail('Gmail Account');
        setIsLoading(false);
        return true;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setIsConnected(false);
        setIsLoading(false);
        return false;
      }

      const response = await fetch(`${BASE_URL}/api/gmail/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.connected) {
          setIsConnected(true);
          setGmailEmail(data.email || 'Gmail Account');
          return true;
        }
      } else if (response.status === 401) {
        // Handle unauthorized
        setIsConnected(false);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to check Gmail status');
      }
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      setError(error.message || 'Failed to check Gmail status');
      toast.error('Error checking Gmail status');
      return false;
    } finally {
      setIsLoading(false);
    }
    
    setIsConnected(false);
    return false;
  };

  // Connect Gmail
  const connectGmail = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${BASE_URL}/api/gmail/connect`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to connect Gmail');
      }

      const { authUrl } = await response.json();
      if (authUrl) {
        // Store the current URL to redirect back after OAuth
        localStorage.setItem('redirectAfterAuth', window.location.pathname);
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      setError(error.message || 'Failed to connect Gmail');
      toast.error('Failed to connect Gmail');
      throw error;
    }
  };

  // Disconnect Gmail
  const disconnectGmail = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${BASE_URL}/api/gmail/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to disconnect Gmail');
      }

      setIsConnected(false);
      setGmailEmail('');
      toast.success('Gmail disconnected successfully');
      return true;
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      setError(error.message || 'Failed to disconnect Gmail');
      toast.error('Failed to disconnect Gmail');
      return false;
    }
  };

  // Initial check on component mount
  useEffect(() => {
    checkGmailStatus();
  }, []);

  return {
    isConnected,
    gmailEmail,
    isLoading,
    error,
    checkGmailStatus,
    connectGmail,
    disconnectGmail
  };
};

export default useGmailStatus;
