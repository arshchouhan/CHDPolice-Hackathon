/**
 * Gemini API Client for Browser
 * 
 * This file provides client-side functions for interacting with the Gemini API endpoints.
 * It's designed to be used in the browser environment.
 */

// Global object to hold Gemini client functions
window.GeminiClient = {
  /**
   * Analyze a URL using the Gemini API
   * 
   * @param {string} url - The URL to analyze
   * @param {Object} networkData - Optional network traffic data
   * @param {Object} dnsData - Optional DNS analysis data
   * @returns {Promise<Object>} Analysis results
   */
  analyzeUrl: async function(url, networkData = null, dnsData = null) {
    try {
      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Get base URL
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      
      // Prepare data for Gemini analysis
      const analysisData = {
        url: url,
        networkData: networkData,
        dnsData: dnsData
      };
      
      console.log('Sending data to Gemini API for URL analysis...');
      
      // Call the Gemini API
      const response = await fetch(`${baseUrl}/api/gemini/analyze-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisData)
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Unknown error from Gemini API');
      }
      
      return data;
    } catch (error) {
      console.error('Error analyzing URL with Gemini:', error);
      throw error;
    }
  },
  
  /**
   * Analyze an email using the Gemini API
   * 
   * @param {string} emailContent - The email content to analyze
   * @param {string} subject - Optional email subject
   * @param {string} sender - Optional email sender
   * @param {string} emailId - Optional email ID for database reference
   * @returns {Promise<Object>} Analysis results
   */
  analyzeEmail: async function(emailContent, subject = '', sender = '', emailId = null) {
    try {
      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Get base URL
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      
      // Prepare data for Gemini analysis
      const analysisData = {
        emailContent,
        subject,
        sender,
        emailId
      };
      
      console.log('Sending data to Gemini API for email analysis...');
      
      // Call the Gemini API
      const response = await fetch(`${baseUrl}/api/gemini/analyze-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisData)
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Unknown error from Gemini API');
      }
      
      return data;
    } catch (error) {
      console.error('Error analyzing email with Gemini:', error);
      
      // Try local analysis as fallback
      try {
        console.log('Falling back to local analysis...');
        const localResponse = await fetch(`${window.getBaseUrl()}/api/gemini/analyze-email-local`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            emailContent,
            subject,
            sender,
            emailId
          })
        });
        
        const localData = await localResponse.json();
        
        if (!localResponse.ok) {
          throw new Error(localData.message || 'Local analysis failed');
        }
        
        return localData;
      } catch (localError) {
        console.error('Both Gemini and local analysis failed:', localError);
        throw new Error('Both Gemini API and local analysis failed: ' + localError.message);
      }
    }
  }
};

console.log('Gemini client initialized');
