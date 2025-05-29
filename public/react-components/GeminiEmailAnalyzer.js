/**
 * Gemini Email Analyzer Component
 * 
 * A React component that uses Google's Gemini API to analyze emails,
 * identify suspicious URLs, and send them to the sandbox for analysis.
 */

class GeminiEmailAnalyzer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      emailContent: '',
      emailSubject: '',
      emailSender: '',
      isAnalyzing: false,
      analysisResult: null,
      error: null,
      suspiciousUrls: [],
      selectedUrls: [],
      sandboxSubmitted: false,
      analysisMethod: null // 'gemini' or 'local'
    };
  }
  
  // Handle email content change
  handleEmailContentChange = (e) => {
    this.setState({ emailContent: e.target.value });
  }
  
  // Handle email subject change
  handleEmailSubjectChange = (e) => {
    this.setState({ emailSubject: e.target.value });
  }
  
  // Handle email sender change
  handleEmailSenderChange = (e) => {
    this.setState({ emailSender: e.target.value });
  }
  
  // Analyze email using Gemini API with fallback to local analysis
  analyzeEmail = async () => {
    const { emailContent, emailSubject, emailSender } = this.state;
    
    if (!emailContent) {
      this.setState({ error: 'Please enter email content to analyze' });
      return;
    }
    
    this.setState({ isAnalyzing: true, error: null, analysisResult: null });
    
    try {
      // First try with Gemini API
      console.log('Attempting analysis with Gemini API...');
      
      // Use the simplified function to analyze the email
      const data = await window.analyzeEmailWithGemini(emailContent, emailSubject, emailSender);
      
      console.log('Gemini API analysis successful');
      
      // Extract suspicious URLs (risk score > 50)
      const suspiciousUrls = data.urlAnalysis.filter(url => url.riskScore > 50);
      
      this.setState({
        isAnalyzing: false,
        analysisResult: data,
        suspiciousUrls,
        selectedUrls: suspiciousUrls.map(url => url.url), // Select all suspicious URLs by default
        analysisMethod: 'gemini'
      });
      
    } catch (error) {
      console.error('Error analyzing email with Gemini:', error);
      
      // Fall back to local analysis
      try {
        console.log('Falling back to local analysis...');
        this.setState({ error: 'Gemini API error: ' + error.message + '. Using local analysis instead.' });
        
        // Use the simplified function to perform local analysis
        const localData = await window.analyzeEmailLocally(emailContent, emailSubject, emailSender);
        
        console.log('Local analysis successful');
        
        // Extract suspicious URLs (risk score > 50)
        const suspiciousUrls = localData.urlAnalysis.filter(url => url.riskScore > 50);
        
        this.setState({
          isAnalyzing: false,
          analysisResult: localData,
          suspiciousUrls,
          selectedUrls: suspiciousUrls.map(url => url.url), // Select all suspicious URLs by default
          analysisMethod: 'local'
        });
        
      } catch (localError) {
        console.error('Both Gemini and local analysis failed:', localError);
        this.setState({
          isAnalyzing: false,
          error: 'Both Gemini API and local analysis failed: ' + localError.message
        });
      }
    }
  }
  
  // Toggle URL selection for sandbox analysis
  toggleUrlSelection = (url) => {
    this.setState(prevState => {
      const selectedUrls = [...prevState.selectedUrls];
      
      if (selectedUrls.includes(url)) {
        // Remove URL if already selected
        return {
          selectedUrls: selectedUrls.filter(u => u !== url)
        };
      } else {
        // Add URL if not selected
        return {
          selectedUrls: [...selectedUrls, url]
        };
      }
    });
  }
  
  // Submit selected URLs to sandbox
  submitToSandbox = async () => {
    const { selectedUrls, analysisResult } = this.state;
    
    if (!selectedUrls.length) {
      this.setState({ error: 'Please select at least one URL to analyze' });
      return;
    }
    
    this.setState({ isAnalyzing: true, error: null });
    
    try {
      // For each selected URL, create a sandbox analysis
      const promises = selectedUrls.map(async (url) => {
        // Find the URL data in the analysis result
        const urlData = analysisResult.urlAnalysis.find(u => u.url === url);
        
        // Create a new sandbox analysis
        const response = await fetch(`${window.getBaseUrl()}/api/url-analysis/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            url,
            riskScore: urlData ? urlData.riskScore : 50,
            reasons: urlData ? urlData.reasons : ['Suspicious URL from Gemini analysis']
          })
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || `Failed to submit URL: ${url}`);
        }
        
        return await response.json();
      });
      
      // Wait for all submissions to complete
      await Promise.all(promises);
      
      this.setState({
        isAnalyzing: false,
        sandboxSubmitted: true
      });
      
      // Show success notification
      if (window.showSuccessNotification) {
        window.showSuccessNotification(
          'URLs Submitted',
          `${selectedUrls.length} URLs have been submitted to the sandbox for analysis`
        );
      }
      
    } catch (error) {
      console.error('Error submitting to sandbox:', error);
      this.setState({
        isAnalyzing: false,
        error: error.message || 'An error occurred while submitting to sandbox'
      });
    }
  }
  
  // Render risk score with color coding
  renderRiskScore = (score) => {
    let colorClass = 'text-green-500';
    if (score > 75) {
      colorClass = 'text-red-500';
    } else if (score > 50) {
      colorClass = 'text-orange-500';
    } else if (score > 25) {
      colorClass = 'text-yellow-500';
    }
    
    return (
      <span className={`font-bold ${colorClass}`}>
        {score}
      </span>
    );
  }
  
  render() {
    const {
      emailContent,
      emailSubject,
      emailSender,
      isAnalyzing,
      analysisResult,
      error,
      suspiciousUrls,
      selectedUrls,
      sandboxSubmitted
    } = this.state;
    
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-lg font-semibold mb-4">Gemini Email Analysis</h3>
        
        {/* Email Input Form */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Subject
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={emailSubject}
                onChange={this.handleEmailSubjectChange}
                placeholder="Enter email subject"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Sender
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={emailSender}
                onChange={this.handleEmailSenderChange}
                placeholder="Enter sender email address"
              />
            </div>
          </div>
          
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Content
          </label>
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md h-40"
            value={emailContent}
            onChange={this.handleEmailContentChange}
            placeholder="Paste email content here (text or HTML)"
          />
          
          <div className="mt-4 flex space-x-2">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              onClick={this.analyzeEmail}
              disabled={isAnalyzing || !emailContent}
            >
              {isAnalyzing ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Analyzing...
                </>
              ) : (
                <>
                  <i className="fas fa-robot mr-2"></i>
                  Analyze with Gemini AI
                </>
              )}
            </button>
            
            {/* Direct Local Analysis Button */}
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              onClick={() => {
                // Call the local analysis endpoint directly
                const { emailContent, emailSubject, emailSender } = this.state;
                
                if (!emailContent) {
                  this.setState({ error: 'Please enter email content to analyze' });
                  return;
                }
                
                this.setState({ isAnalyzing: true, error: null, analysisResult: null });
                
                fetch(`${window.getBaseUrl()}/api/gemini/analyze-email-local`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify({
                    emailContent,
                    subject: emailSubject,
                    sender: emailSender
                  })
                })
                .then(response => response.json())
                .then(data => {
                  if (!data.success) {
                    throw new Error(data.message || 'Local analysis failed');
                  }
                  
                  // Extract suspicious URLs (risk score > 50)
                  const suspiciousUrls = data.data.urlAnalysis.filter(url => url.riskScore > 50);
                  
                  this.setState({
                    isAnalyzing: false,
                    analysisResult: data.data,
                    suspiciousUrls,
                    selectedUrls: suspiciousUrls.map(url => url.url),
                    analysisMethod: 'local'
                  });
                })
                .catch(error => {
                  console.error('Error in local analysis:', error);
                  this.setState({
                    isAnalyzing: false,
                    error: 'Local analysis failed: ' + error.message
                  });
                });
              }}
              disabled={isAnalyzing || !emailContent}
            >
              <i className="fas fa-laptop mr-2"></i>
              Use Local Analysis
            </button>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}
        
        {/* Analysis Results */}
        {analysisResult && (
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-md font-semibold">Analysis Results</h4>
              {this.state.analysisMethod && (
                <span className={`text-xs px-2 py-1 rounded ${this.state.analysisMethod === 'gemini' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                  {this.state.analysisMethod === 'gemini' ? 'Gemini AI' : 'Local Analysis'}
                </span>
              )}
            </div>
            
            {/* Overall Risk Score */}
            <div className="mb-4">
              <p className="text-gray-700">
                Overall Risk Score: {this.renderRiskScore(analysisResult.overallRiskScore)}
              </p>
            </div>
            
            {/* Phishing Indicators */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Phishing Indicators:</h5>
              {analysisResult.phishingIndicators.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-gray-600">
                  {analysisResult.phishingIndicators.map((indicator, index) => (
                    <li key={index}>{indicator}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No phishing indicators detected</p>
              )}
            </div>
            
            {/* Summary */}
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <h5 className="text-sm font-medium text-gray-700 mb-1">Summary:</h5>
              <p className="text-sm text-gray-600">{analysisResult.summary}</p>
            </div>
            
            {/* Suspicious URLs */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">
                URL Analysis {suspiciousUrls.length > 0 && `(${suspiciousUrls.length} suspicious URLs found)`}:
              </h5>
              
              {analysisResult.urlAnalysis.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {suspiciousUrls.length > 0 && (
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Select
                          </th>
                        )}
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Score</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reasons</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analysisResult.urlAnalysis.map((url, index) => (
                        <tr key={index} className={url.riskScore > 50 ? 'bg-red-50' : 'bg-white'}>
                          {suspiciousUrls.length > 0 && (
                            <td className="px-3 py-2 whitespace-nowrap">
                              {url.riskScore > 50 && (
                                <input
                                  type="checkbox"
                                  checked={selectedUrls.includes(url.url)}
                                  onChange={() => this.toggleUrlSelection(url.url)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              )}
                            </td>
                          )}
                          <td className="px-3 py-2 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={url.url}>
                            {url.url}
                          </td>
                          <td className="px-3 py-2 text-xs whitespace-nowrap">
                            {this.renderRiskScore(url.riskScore)}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <ul className="list-disc pl-5">
                              {url.reasons.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No URLs found in the email</p>
              )}
            </div>
            
            {/* Submit to Sandbox Button */}
            {suspiciousUrls.length > 0 && (
              <div className="mt-4">
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                  onClick={this.submitToSandbox}
                  disabled={isAnalyzing || selectedUrls.length === 0 || sandboxSubmitted}
                >
                  {isAnalyzing ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Submitting...
                    </>
                  ) : sandboxSubmitted ? (
                    <>
                      <i className="fas fa-check mr-2"></i>
                      Submitted to Sandbox
                    </>
                  ) : (
                    <>
                      <i className="fas fa-shield-alt mr-2"></i>
                      Submit {selectedUrls.length} URLs to Sandbox
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

// Export the component
window.GeminiEmailAnalyzer = GeminiEmailAnalyzer;
