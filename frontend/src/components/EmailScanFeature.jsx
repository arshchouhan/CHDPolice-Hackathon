// EmailScanFeature.js
import React, { useState } from 'react';
import PhishingScoreOverview from './PhishingScoreOverview';

const EmailScanFeature = ({ onScanComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [error, setError] = useState(null);

  // Categories for detailed score breakdown
  const scoreCategories = [
    { name: 'Header Analysis', score: scanResults?.scores?.header || 0, id: 'header' },
    { name: 'Content Analysis', score: scanResults?.scores?.text || 0, id: 'content' },
    { name: 'URL Analysis', score: scanResults?.scores?.urls || 0, id: 'urls' },
    { name: 'Attachment Analysis', score: scanResults?.scores?.attachments || 0, id: 'attachments' }
  ];

  // Function to handle the scan action
  const handleScan = async () => {
    try {
      setIsScanning(true);
      setError(null);
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      // Get base URL
      const hostname = window.location.hostname;
      const BASE_URL = hostname === 'localhost' || hostname === '127.0.0.1' 
        ? `http://${hostname}:3000` 
        : window.location.origin;
      
      // Call the API to scan emails
      const response = await fetch(`${BASE_URL}/api/gmail/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setScanResults(data);
      
      // Call the callback function if provided
      if (onScanComplete) {
        onScanComplete(data);
      }
    } catch (error) {
      console.error('Scan error:', error);
      setError(error.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Function to get color based on score
  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Email Security Scanner</h1>
        <p className="text-gray-600 mb-6">
          Scan your inbox for potential phishing threats and security risks. Our advanced AI analyzes email headers, 
          content, URLs, and attachments to identify suspicious patterns.
        </p>
        
        <button
          onClick={handleScan}
          disabled={isScanning}
          className={`w-full py-3 rounded-lg font-medium text-white transition-all duration-300 ${
            isScanning 
              ? 'bg-blue-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isScanning ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Scanning Emails...
            </span>
          ) : (
            'Scan Emails for Threats'
          )}
        </button>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
      
      {scanResults && (
        <>
          {/* Total Score Overview Component */}
          <PhishingScoreOverview totalScore={scanResults.scores?.total || 0} />
          
          {/* Detailed Score Breakdown */}
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Detailed Analysis</h2>
            
            <div className="space-y-4">
              {scoreCategories.map((category) => (
                <div key={category.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-700">{category.name}</span>
                    <span className="text-gray-700 font-medium">{category.score}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`${getScoreColor(category.score)} h-3 rounded-full transition-all duration-500 ease-in-out`} 
                      style={{ width: `${category.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Summary and Recommendations */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Security Recommendations</h2>
            
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="ml-2 text-gray-600">Enable two-factor authentication for all your email accounts.</p>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="ml-2 text-gray-600">Be cautious of emails requesting personal information or urgent action.</p>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="ml-2 text-gray-600">Verify sender email addresses carefully before responding or clicking links.</p>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-5 w-5 text-green-500 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="ml-2 text-gray-600">Hover over links to preview the URL before clicking.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EmailScanFeature;
