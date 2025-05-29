/**
 * Simple Gemini API Client for Browser
 * 
 * This is a simplified client that avoids module exports and complex patterns.
 * All functions are directly attached to the window object for global access.
 */

// Initialize Gemini client functions
console.log('Initializing Gemini client functions...');

// Analyze a URL using the Gemini API
window.analyzeUrlWithGemini = async function(url, networkData, dnsData) {
  try {
    // Get authentication token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    // Get base URL
    const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
    
    // Call the Gemini API
    const response = await fetch(`${baseUrl}/api/gemini/analyze-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        networkData: networkData,
        dnsData: dnsData
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Unknown error from Gemini API');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error analyzing URL with Gemini:', error);
    throw error;
  }
};

// Analyze an email using the Gemini API
window.analyzeEmailWithGemini = async function(emailContent, subject, sender) {
  try {
    // Get authentication token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    // Get base URL
    const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
    
    // Call the Gemini API
    const response = await fetch(`${baseUrl}/api/gemini/analyze-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emailContent: emailContent,
        subject: subject || '',
        sender: sender || ''
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Unknown error from Gemini API');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error analyzing email with Gemini:', error);
    throw error;
  }
};

// Analyze an email using local analysis only
window.analyzeEmailLocally = async function(emailContent, subject, sender) {
  try {
    // Get authentication token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    // Get base URL
    const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
    
    // Call the local analysis endpoint
    const response = await fetch(`${baseUrl}/api/gemini/analyze-email-local`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emailContent: emailContent,
        subject: subject || '',
        sender: sender || ''
      })
    });
    
    if (!response.ok) {
      throw new Error(`Local analysis error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Unknown error from local analysis');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error with local email analysis:', error);
    throw error;
  }
};

console.log('Gemini client functions initialized');
