import { getAuthToken } from './auth';

export const setGmailStatusToPending = async () => {
  const token = getAuthToken();
  const response = await fetch('/api/user/gmail/status/pending', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update Gmail status');
  }

  return response.json();
};

export const getGmailStatus = async () => {
  const token = getAuthToken();
  const response = await fetch('/api/user/gmail/status', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch Gmail status');
  }

  return response.json();
};
