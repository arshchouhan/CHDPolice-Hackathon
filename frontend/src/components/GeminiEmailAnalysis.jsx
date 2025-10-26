import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faShieldAlt, 
  faTachometerAlt,
  faArrowLeft,
  faRobot
} from '@fortawesome/free-solid-svg-icons';

// Import the GeminiEmailAnalyzer component
import GeminiEmailAnalyzer from '../components/GeminiEmailAnalyzer';

export default function GeminiEmailAnalysis() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  // Show loading overlay
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-lg p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading Gemini Email Analysis...</p>
        </div>
      </div>
    );
  }

  // Show error message if any
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/20 text-red-200 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-2">Error Loading Gemini Email Analysis</h2>
            <p className="mb-4">{error.message || 'An unknown error occurred'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700/50 py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-lg">
                <FontAwesomeIcon icon={faShieldAlt} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">Email Security Platform</h1>
            </div>
            <nav>
              <ul className="flex space-x-6">
                <li>
                  <button 
                    onClick={() => navigate('/admin-dashboard')} 
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    <FontAwesomeIcon icon={faTachometerAlt} className="mr-1" /> Dashboard
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/url-sandbox')} 
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    <FontAwesomeIcon icon={faShieldAlt} className="mr-1" /> URL Sandbox
                  </button>
                </li>
                <li>
                  <span className="text-blue-400 border-b-2 border-blue-400 pb-1">
                    <FontAwesomeIcon icon={faRobot} className="mr-1" /> Gemini Analysis
                  </span>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Gemini Email Analysis</h2>
              <p className="text-gray-400">Use Google's Gemini AI to analyze emails and detect suspicious URLs</p>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => navigate('/url-sandbox')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                <FontAwesomeIcon icon={faShieldAlt} className="mr-1" /> Go to URL Sandbox
              </button>
              <button 
                onClick={() => navigate('/admin-dashboard')}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="mr-1" /> Back to Dashboard
              </button>
            </div>
          </div>
          
          {/* Gemini Email Analyzer Component */}
          <div className="mt-8">
            <GeminiEmailAnalyzer />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800/50 backdrop-blur-lg border-t border-slate-700/50 py-4 mt-8">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Email Security Platform | Chandigarh Police Hackathon
          </p>
        </div>
      </footer>
    </div>
  );
}

// Add the styles that were previously in the HTML head
const styles = `
  .loader {
    border: 3px solid #f3f3f3;
    border-radius: 50%;
    border-top: 3px solid #3498db;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Add the styles to the document head
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);
