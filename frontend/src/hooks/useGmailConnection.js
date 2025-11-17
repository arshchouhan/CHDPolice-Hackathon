import { useState, useCallback } from 'react';
import { setGmailStatusToPending, getGmailStatus } from '../utils/gmailApi';

export const useGmailConnection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const initGmailConnection = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First, update status to 'pending' in the database
      await setGmailStatusToPending();
      
      // Then redirect to Gmail OAuth
      window.location.href = '/api/gmail/auth';
      
    } catch (err) {
      console.error('Gmail connection error:', err);
      setError(err.message || 'Failed to initialize Gmail connection');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkGmailStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getGmailStatus();
      setStatus(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch Gmail status:', err);
      setError(err.message || 'Failed to fetch Gmail status');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    initGmailConnection,
    checkGmailStatus,
    status,
    isLoading,
    error,
    resetError: () => setError(null)
  };
};
