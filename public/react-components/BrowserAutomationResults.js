/**
 * Browser Automation Results Component
 * Displays the results of browser automation URL analysis
 */

class BrowserAutomationResults extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      results: null,
      error: null,
      selectedUrl: null,
      showScreenshot: false
    };
  }

  componentDidMount() {
    if (this.props.emailId) {
      this.fetchUrlAnalysisResults(this.props.emailId);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.emailId !== prevProps.emailId && this.props.emailId) {
      this.fetchUrlAnalysisResults(this.props.emailId);
    }
  }

  fetchUrlAnalysisResults = async (emailId) => {
    try {
      this.setState({ loading: true, error: null });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      const response = await fetch(`${baseUrl}/api/emails/${emailId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.email && data.email.urlAnalysis) {
        this.setState({ 
          results: data.email.urlAnalysis,
          loading: false
        });
      } else {
        this.setState({ 
          results: [],
          loading: false
        });
      }
    } catch (error) {
      console.error('Error fetching URL analysis results:', error);
      this.setState({ 
        error: error.message,
        loading: false
      });
    }
  };

  triggerUrlAnalysis = async () => {
    try {
      this.setState({ loading: true, error: null });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      const response = await fetch(`${baseUrl}/api/browser-automation/analyze-email/${this.props.emailId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Show notification that analysis has started
        if (window.showSuccessNotification) {
          window.showSuccessNotification(
            'URL Analysis Started', 
            `Analyzing ${data.urls.length} URLs. This may take a few minutes.`
          );
        }
        
        // Poll for results every 5 seconds
        this.startPolling();
      } else {
        throw new Error(data.message || 'Failed to start URL analysis');
      }
    } catch (error) {
      console.error('Error triggering URL analysis:', error);
      this.setState({ 
        error: error.message,
        loading: false
      });
      
      if (window.showErrorNotification) {
        window.showErrorNotification('URL Analysis Error', error.message);
      }
    }
  };

  startPolling = () => {
    this.pollingInterval = setInterval(() => {
      this.fetchUrlAnalysisResults(this.props.emailId);
      
      // Check if all URLs have been analyzed
      const { results } = this.state;
      if (results && results.length > 0) {
        const allAnalyzed = results.every(url => url.analyzed_at);
        
        if (allAnalyzed) {
          clearInterval(this.pollingInterval);
          this.setState({ loading: false });
          
          if (window.showSuccessNotification) {
            window.showSuccessNotification(
              'URL Analysis Complete', 
              `Successfully analyzed ${results.length} URLs.`
            );
          }
        }
      }
    }, 5000);
    
    // Stop polling after 5 minutes
    setTimeout(() => {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.setState({ loading: false });
      }
    }, 300000);
  };

  componentWillUnmount() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  handleUrlClick = (url) => {
    this.setState({ 
      selectedUrl: url,
      showScreenshot: false
    });
  };

  toggleScreenshot = () => {
    this.setState(prevState => ({
      showScreenshot: !prevState.showScreenshot
    }));
  };

  getRiskBadgeClass = (riskScore) => {
    if (!riskScore && riskScore !== 0) return 'bg-gray-500';
    if (riskScore >= 80) return 'bg-red-500';
    if (riskScore >= 60) return 'bg-orange-500';
    if (riskScore >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  getRiskLabel = (riskScore) => {
    if (!riskScore && riskScore !== 0) return 'Unknown';
    if (riskScore >= 80) return 'Critical';
    if (riskScore >= 60) return 'High';
    if (riskScore >= 40) return 'Medium';
    return 'Low';
  };

  render() {
    const { loading, results, error, selectedUrl, showScreenshot } = this.state;
    
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">URL Analysis</h2>
            <p className="text-gray-400 text-sm">Browser automation results for detected URLs</p>
          </div>
          
          <button 
            onClick={this.triggerUrlAnalysis}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              loading 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </span>
            ) : 'Analyze URLs'}
          </button>
        </div>
        
        {error && (
          <div className="bg-red-500/20 text-red-200 p-4 rounded-md mb-4">
            <p className="font-medium">Error: {error}</p>
          </div>
        )}
        
        {!results || results.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {loading ? 'Analyzing URLs...' : 'No URL analysis results available'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* URL List */}
            <div className="lg:col-span-1 bg-gray-800/30 rounded-lg p-4 max-h-[500px] overflow-y-auto">
              <h3 className="text-white font-medium mb-3">Detected URLs</h3>
              
              <div className="space-y-2">
                {results.map((url, index) => (
                  <div 
                    key={index}
                    onClick={() => this.handleUrlClick(url)}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedUrl === url 
                        ? 'bg-blue-600/30 border border-blue-500/50' 
                        : 'bg-gray-700/30 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="truncate max-w-[70%]">
                        <span className="text-gray-300 text-sm">{url.domain}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${this.getRiskBadgeClass(url.risk_score)}`}>
                        {this.getRiskLabel(url.risk_score)}
                      </span>
                    </div>
                    <p className="text-white text-sm truncate mt-1">{url.url}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* URL Details */}
            <div className="lg:col-span-2 bg-gray-800/30 rounded-lg p-4">
              {selectedUrl ? (
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-white font-medium">URL Details</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${this.getRiskBadgeClass(selectedUrl.risk_score)}`}>
                      Risk: {selectedUrl.risk_score || 0}/100
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-gray-400 text-sm">URL:</p>
                    <p className="text-white break-all">{selectedUrl.url}</p>
                  </div>
                  
                  {selectedUrl.title && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-sm">Page Title:</p>
                      <p className="text-white">{selectedUrl.title}</p>
                    </div>
                  )}
                  
                  {selectedUrl.meta_description && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-sm">Meta Description:</p>
                      <p className="text-white">{selectedUrl.meta_description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-700/30 p-3 rounded-md">
                      <p className="text-gray-400 text-sm">Login Form:</p>
                      <p className={`font-medium ${selectedUrl.has_login_form ? 'text-yellow-400' : 'text-green-400'}`}>
                        {selectedUrl.has_login_form ? 'Detected' : 'Not Detected'}
                      </p>
                    </div>
                    
                    <div className="bg-gray-700/30 p-3 rounded-md">
                      <p className="text-gray-400 text-sm">Password Field:</p>
                      <p className={`font-medium ${selectedUrl.has_password_field ? 'text-orange-400' : 'text-green-400'}`}>
                        {selectedUrl.has_password_field ? 'Detected' : 'Not Detected'}
                      </p>
                    </div>
                    
                    <div className="bg-gray-700/30 p-3 rounded-md">
                      <p className="text-gray-400 text-sm">Credit Card Form:</p>
                      <p className={`font-medium ${selectedUrl.has_credit_card_form ? 'text-red-400' : 'text-green-400'}`}>
                        {selectedUrl.has_credit_card_form ? 'Detected' : 'Not Detected'}
                      </p>
                    </div>
                    
                    <div className="bg-gray-700/30 p-3 rounded-md">
                      <p className="text-gray-400 text-sm">Download Attempt:</p>
                      <p className={`font-medium ${selectedUrl.attempted_download ? 'text-red-400' : 'text-green-400'}`}>
                        {selectedUrl.attempted_download ? 'Detected' : 'Not Detected'}
                      </p>
                    </div>
                  </div>
                  
                  {selectedUrl.suspicious_indicators && selectedUrl.suspicious_indicators.length > 0 && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-sm mb-2">Suspicious Indicators:</p>
                      <ul className="bg-gray-700/30 p-3 rounded-md list-disc list-inside">
                        {selectedUrl.suspicious_indicators.map((indicator, index) => (
                          <li key={index} className="text-orange-300 text-sm">{indicator}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {selectedUrl.screenshot_path && (
                    <div className="mt-4">
                      <button
                        onClick={this.toggleScreenshot}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                      >
                        {showScreenshot ? 'Hide Screenshot' : 'Show Screenshot'}
                      </button>
                      
                      {showScreenshot && (
                        <div className="mt-3 bg-gray-700/30 p-2 rounded-md">
                          <p className="text-gray-400 text-xs mb-2">Screenshot (captured in secure container):</p>
                          <img 
                            src={`/api/browser-automation/screenshot/${selectedUrl.url_id}`}
                            alt="URL Screenshot" 
                            className="w-full rounded border border-gray-600"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  Select a URL to view details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
}

// Export the component
window.BrowserAutomationResults = BrowserAutomationResults;
