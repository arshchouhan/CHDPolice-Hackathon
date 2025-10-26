import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLink, 
  faSearch, 
  faHistory, 
  faClock,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

const AdminSandboxPanel = () => {
  const [url, setUrl] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const [error, setError] = useState('');

  // Mock recent scans data
  useEffect(() => {
    // In a real app, this would be fetched from an API
    setRecentScans([
      { id: 1, url: 'example.com/phishing', status: 'malicious', timestamp: '2025-10-23T10:30:00Z' },
      { id: 2, url: 'trusted-site.com', status: 'safe', timestamp: '2025-10-23T09:15:00Z' },
      { id: 3, url: 'suspicious-link.net', status: 'suspicious', timestamp: '2025-10-22T16:45:00Z' },
    ]);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a URL to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      // In a real app, this would be an API call to your backend
      // const response = await fetch(`${process.env.REACT_APP_API_URL}/api/analyze-url`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ url }),
      // });
      // const data = await response.json();
      
      // Mock response for demo purposes
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResponse = {
        url,
        status: Math.random() > 0.5 ? 'safe' : 'malicious',
        riskScore: Math.floor(Math.random() * 100),
        analysis: {
          isPhishing: Math.random() > 0.5,
          isMalware: Math.random() > 0.7,
          isSuspicious: Math.random() > 0.3,
          lastAnalyzed: new Date().toISOString(),
          details: {
            domainReputation: Math.random() > 0.3 ? 'Good' : 'Suspicious',
            sslCertificate: Math.random() > 0.2 ? 'Valid' : 'Invalid',
            blacklistStatus: 'Not Blacklisted',
            redirects: Math.floor(Math.random() * 5)
          }
        }
      };

      setAnalysisResults(mockResponse);
      
      // Add to recent scans
      setRecentScans(prev => [
        { 
          id: Date.now(), 
          url, 
          status: mockResponse.status, 
          timestamp: new Date().toISOString() 
        },
        ...prev
      ].slice(0, 5)); // Keep only the 5 most recent scans

    } catch (err) {
      setError('Failed to analyze URL. Please try again.');
      console.error('Error analyzing URL:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'safe':
        return 'text-green-400';
      case 'malicious':
        return 'text-red-400';
      case 'suspicious':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'safe':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-green-400 mr-1" />;
      case 'malicious':
        return <FontAwesomeIcon icon={faTimesCircle} className="text-red-400 mr-1" />;
      case 'suspicious':
        return <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-400 mr-1" />;
      default:
        return <FontAwesomeIcon icon={faInfoCircle} className="text-gray-400 mr-1" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* URL Input Form */}
      <div className="bg-slate-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Analyze a URL</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faLink} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL to analyze (e.g., https://example.com)"
                className="block w-full pl-10 pr-3 py-3 rounded-l-md bg-slate-700 border border-slate-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isAnalyzing}
              />
            </div>
            <button
              type="submit"
              disabled={isAnalyzing}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSearch} className="mr-2" />
                  Analyze URL
                </>
              )}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </form>
      </div>

      {/* Analysis Results */}
      {analysisResults && (
        <div className="bg-slate-800/50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Analysis Results</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(analysisResults.status)} bg-opacity-20 ${analysisResults.status === 'safe' ? 'bg-green-500' : analysisResults.status === 'malicious' ? 'bg-red-500' : 'bg-yellow-500'}`}>
              {getStatusIcon(analysisResults.status)}
              {analysisResults.status.charAt(0).toUpperCase() + analysisResults.status.slice(1)}
            </span>
          </div>
          
          <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faLink} className="text-blue-400 mr-2" />
              <a 
                href={analysisResults.url.startsWith('http') ? analysisResults.url : `https://${analysisResults.url}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline break-all"
              >
                {analysisResults.url}
              </a>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <p className="text-gray-400 text-sm">Risk Score</p>
                <div className="mt-1">
                  <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${analysisResults.riskScore > 70 ? 'bg-red-500' : analysisResults.riskScore > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${analysisResults.riskScore}%` }}
                    ></div>
                  </div>
                  <p className="text-right text-xs mt-1">{analysisResults.riskScore}/100</p>
                </div>
              </div>
              
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <p className="text-gray-400 text-sm">Phishing</p>
                <p className={`text-lg font-medium ${analysisResults.analysis.isPhishing ? 'text-red-400' : 'text-green-400'}`}>
                  {analysisResults.analysis.isPhishing ? 'Detected' : 'Not Detected'}
                </p>
              </div>
              
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <p className="text-gray-400 text-sm">Malware</p>
                <p className={`text-lg font-medium ${analysisResults.analysis.isMalware ? 'text-red-400' : 'text-green-400'}`}>
                  {analysisResults.analysis.isMalware ? 'Detected' : 'Not Detected'}
                </p>
              </div>
              
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <p className="text-gray-400 text-sm">Domain Reputation</p>
                <p className={`text-lg font-medium ${
                  analysisResults.analysis.details.domainReputation === 'Good' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {analysisResults.analysis.details.domainReputation}
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Analysis Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-400"><span className="font-medium">SSL Certificate:</span> {analysisResults.analysis.details.sslCertificate}</p>
                  <p className="text-sm text-gray-400"><span className="font-medium">Blacklist Status:</span> {analysisResults.analysis.details.blacklistStatus}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-400"><span className="font-medium">Redirects:</span> {analysisResults.analysis.details.redirects}</p>
                  <p className="text-sm text-gray-400"><span className="font-medium">Last Analyzed:</span> {new Date(analysisResults.analysis.lastAnalyzed).toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-slate-800 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Recommendation</h4>
              <p className="text-sm">
                {analysisResults.status === 'safe' ? (
                  <span className="text-green-400">This URL appears to be safe. However, always be cautious when visiting unknown websites.</span>
                ) : analysisResults.status === 'suspicious' ? (
                  <span className="text-yellow-400">This URL shows some suspicious characteristics. Proceed with caution and avoid entering any personal information.</span>
                ) : (
                  <span className="text-red-400">This URL has been flagged as potentially malicious. We recommend not visiting this website.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Scans */}
      <div className="bg-slate-800/50 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Scans</h3>
          <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center">
            <FontAwesomeIcon icon={faHistory} className="mr-1" />
            View All
          </button>
        </div>
        
        {recentScans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {recentScans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faLink} className="text-blue-400 mr-2" />
                        <div className="text-sm font-medium text-white truncate max-w-xs">
                          {scan.url}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        scan.status === 'safe' 
                          ? 'bg-green-100 text-green-800' 
                          : scan.status === 'malicious' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {getStatusIcon(scan.status)}
                        {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      <FontAwesomeIcon icon={faClock} className="mr-1" />
                      {new Date(scan.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <FontAwesomeIcon icon={faHistory} className="text-gray-500 text-4xl mb-2" />
            <p className="text-gray-400">No recent scans found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSandboxPanel;
