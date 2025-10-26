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
      emailHeaders: '',
      isAnalyzing: false,
      analysisResult: null,
      error: null,
      suspiciousUrls: [],
      selectedUrls: [],
      sandboxSubmitted: false,
      showHeaderDetails: false,
      extractedIpAddresses: []
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
  
  // Handle email headers change
  handleEmailHeadersChange = (e) => {
    const headers = e.target.value;
    this.setState({ emailHeaders: headers }, () => {
      // Load the email header analyzer utility
      this.loadHeaderAnalyzer().then(() => {
        if (window.emailHeaderAnalyzer) {
          // Extract sender IP using the specialized utility
          const senderIp = window.emailHeaderAnalyzer.extractSenderIp(headers);
          
          // Analyze header path for suspicious patterns
          const pathAnalysis = window.emailHeaderAnalyzer.analyzeHeaderPath(headers);
          
          // Check return path consistency
          const returnPathCheck = window.emailHeaderAnalyzer.checkReturnPathConsistency(headers);
          
          // Update state with the extracted information
          this.setState({ 
            extractedIpAddresses: senderIp ? [senderIp] : [],
            headerAnalysis: {
              senderIp,
              pathAnalysis,
              returnPathCheck
            }
          });
          
          // If we found a sender IP, analyze it
          if (senderIp) {
            this.analyzeSenderIp(senderIp);
          }
        } else {
          // Fallback to basic IP extraction if the utility isn't loaded
          const extractedIps = this.extractIpAddresses(headers);
          this.setState({ extractedIpAddresses: extractedIps });
        }
      });
    });
  }
  
  // Extract IP addresses from text
  extractIpAddresses = (text) => {
    if (!text) return [];
    
    // Regular expression to match IPv4 addresses
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const matches = text.match(ipRegex) || [];
    
    // Filter out invalid IPs and duplicates
    return [...new Set(matches.filter(ip => {
      const parts = ip.split('.');
      return parts.length === 4 && parts.every(part => parseInt(part) <= 255);
    }))];
  }
  
  // Load the email header analyzer utility
  loadHeaderAnalyzer = async () => {
    if (window.emailHeaderAnalyzer) return Promise.resolve();
    
    return new Promise((resolve) => {
      // Check if the script is already being loaded
      const existingScript = document.getElementById('email-header-analyzer');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        return;
      }
      
      // Create and load the script
      const script = document.createElement('script');
      script.id = 'email-header-analyzer';
      script.src = '/utils/emailHeaderAnalyzer.js';
      script.onload = () => {
        console.log('Email header analyzer loaded successfully');
        resolve();
      };
      script.onerror = (err) => {
        console.error('Failed to load email header analyzer:', err);
        resolve(); // Resolve anyway to continue with fallback
      };
      document.head.appendChild(script);
    });
  }
  
  // Analyze sender IP using the IP analysis API
  analyzeSenderIp = async (ipAddress) => {
    try {
      if (!ipAddress) return;
      
      this.setState({ isSenderIpAnalyzing: true });
      
      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Get base URL
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      const apiEndpoint = `${baseUrl}/api/ip-analysis/details/${encodeURIComponent(ipAddress)}`;
      
      // Call the IP analysis API
      const response = await fetch(apiEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`IP analysis API error: ${response.status}`);
      }
      
      // Parse the response
      const responseText = await response.text();
      let ipData;
      
      try {
        ipData = JSON.parse(responseText);
      } catch (jsonError) {
        throw new Error(`Failed to parse JSON response: ${jsonError.message}`);
      }
      
      if (!ipData.success) {
        throw new Error(ipData.message || 'Unknown error from IP analysis API');
      }
      
      // Update state with IP analysis results
      this.setState({
        senderIpAnalysis: ipData.data,
        isSenderIpAnalyzing: false
      });
      
    } catch (error) {
      console.error('Error analyzing sender IP:', error);
      this.setState({
        senderIpAnalysisError: error.message,
        isSenderIpAnalyzing: false
      });
    }
  }
  
  // Analyze email using Gemini API
  analyzeEmail = async () => {
    const { emailContent, emailSubject, emailSender, emailHeaders } = this.state;
    
    if (!emailContent) {
      this.setState({ error: 'Please enter email content' });
      return;
    }
    
    this.setState({ isAnalyzing: true, error: null, analysisResult: null });
    
    try {
      // Extract URLs from content for IP resolution
      const urlPattern = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
      const urls = emailContent.match(urlPattern) || [];
      const uniqueUrls = [...new Set(urls)];
      
      // Extract IP addresses from both content and headers
      const contentIps = this.extractIpAddresses(emailContent);
      const headerIps = this.extractIpAddresses(emailHeaders);
      const allIps = [...new Set([...contentIps, ...headerIps])];
      
      // Combine IPs and URLs for comprehensive analysis
      const itemsToAnalyze = [...allIps];
      
      // Add domains from URLs
      uniqueUrls.forEach(url => {
        try {
          const urlObj = new URL(url);
          if (!itemsToAnalyze.includes(urlObj.hostname)) {
            itemsToAnalyze.push(urlObj.hostname);
          }
        } catch (e) {
          // Invalid URL, skip
        }
      });
      
      this.setState({ extractedIpAddresses: itemsToAnalyze });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      
      const response = await fetch(`${baseUrl}/api/gemini/analyze-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          emailContent,
          subject: emailSubject,
          sender: emailSender,
          headers: emailHeaders,
          ipAddresses: allIps // Include extracted IP addresses in the request
        })
      });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        throw new Error('Your session has expired. Please log in again.');
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to analyze email');
      }
      
      this.setState({
        analysisResult: data,
        suspiciousUrls: data.suspiciousUrls || []
      });
      
    } catch (error) {
      console.error('Error analyzing email:', error);
      
      // Handle authentication errors
      if (error.message.includes('Authentication required') || 
          error.message.includes('session has expired')) {
        window.location.href = '/login.html?error=session_expired';
        return;
      }
      
      this.setState({
        isAnalyzing: false,
        error: error.message || 'An error occurred while analyzing the email'
      });
    } finally {
      this.setState({ isAnalyzing: false });
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
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Use the global getBaseUrl function
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      console.log('Using base URL for sandbox submission:', baseUrl);
      
      // For each selected URL, create a sandbox analysis
      const promises = selectedUrls.map(async (url) => {
        // Find the URL data in the analysis result
        const urlData = analysisResult.urlAnalysis.find(u => u.url === url);
        
        // Create a new sandbox analysis
        const response = await fetch(`${baseUrl}/api/url-analysis/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
  
  renderHeaderDetails = () => {
    const { 
      emailHeaders, 
      showHeaderDetails, 
      extractedIpAddresses, 
      headerAnalysis,
      senderIpAnalysis,
      isSenderIpAnalyzing,
      senderIpAnalysisError
    } = this.state;
    
    if (!showHeaderDetails) return null;
    
    return (
      <div className="mt-4 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Email Headers Analysis</h3>
        
        {/* Original Sender IP */}
        {headerAnalysis && headerAnalysis.senderIp && (
          <div className="mb-3 p-3 bg-gray-700 rounded">
            <h4 className="text-md font-semibold text-green-400">Original Sender IP:</h4>
            <div className="flex items-center">
              <span className="text-yellow-300 font-mono text-lg">{headerAnalysis.senderIp}</span>
              {isSenderIpAnalyzing && (
                <span className="ml-3 text-blue-400 text-sm">Analyzing...</span>
              )}
            </div>
            
            {/* IP Analysis Results */}
            {senderIpAnalysis && (
              <div className="mt-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-400">Location:</span> 
                    <span className="text-white ml-1">
                      {senderIpAnalysis.geolocation?.city}, {senderIpAnalysis.geolocation?.region}, {senderIpAnalysis.geolocation?.country}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">ISP:</span> 
                    <span className="text-white ml-1">{senderIpAnalysis.isp || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">VPN/Proxy:</span> 
                    <span className={`ml-1 ${senderIpAnalysis.isVpnOrProxy?.detected ? 'text-red-400' : 'text-green-400'}`}>
                      {senderIpAnalysis.isVpnOrProxy?.detected ? 'Detected' : 'Not Detected'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Threat Level:</span> 
                    <span className={`ml-1 ${senderIpAnalysis.threatIntelligence?.isKnownBad ? 'text-red-400' : 'text-green-400'}`}>
                      {senderIpAnalysis.threatIntelligence?.threatLevel || 'None'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {senderIpAnalysisError && (
              <div className="mt-2 text-red-400 text-sm">
                Error: {senderIpAnalysisError}
              </div>
            )}
          </div>
        )}
        
        {/* Header Path Analysis */}
        {headerAnalysis && headerAnalysis.pathAnalysis && (
          <div className="mb-3">
            <h4 className="text-md font-semibold mb-1">Mail Server Path:</h4>
            {headerAnalysis.pathAnalysis.suspicious && (
              <div className="text-red-400 text-sm mb-2">
                <i className="fas fa-exclamation-triangle mr-1"></i>
                Suspicious mail path detected:
                <ul className="list-disc pl-5 mt-1">
                  {headerAnalysis.pathAnalysis.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {headerAnalysis.pathAnalysis.path && headerAnalysis.pathAnalysis.path.length > 0 && (
              <div className="text-xs text-gray-300 max-h-32 overflow-y-auto">
                {headerAnalysis.pathAnalysis.path.map((hop, idx) => (
                  <div key={idx} className="mb-1">
                    <span className="text-blue-400">{idx + 1}.</span> 
                    {hop.from && <span> From: <span className="text-green-300">{hop.from}</span></span>}
                    {hop.by && <span> By: <span className="text-yellow-300">{hop.by}</span></span>}
                    {hop.ip && <span> IP: <span className="text-purple-300">{hop.ip}</span></span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Return Path Consistency */}
        {headerAnalysis && headerAnalysis.returnPathCheck && !headerAnalysis.returnPathCheck.consistent && (
          <div className="mb-3 p-2 bg-red-900 bg-opacity-30 rounded">
            <h4 className="text-md font-semibold text-red-400">Return-Path Mismatch:</h4>
            <div className="text-sm">
              <p>{headerAnalysis.returnPathCheck.reason}</p>
              <p className="mt-1">
                <span className="text-gray-400">From:</span> 
                <span className="text-white ml-1">{headerAnalysis.returnPathCheck.from}</span>
              </p>
              <p>
                <span className="text-gray-400">Return-Path:</span> 
                <span className="text-white ml-1">{headerAnalysis.returnPathCheck.returnPath}</span>
              </p>
            </div>
          </div>
        )}
        
        {/* Raw Headers */}
        <div className="mt-3">
          <h4 className="text-md font-semibold mb-1">Raw Headers:</h4>
          <pre className="whitespace-pre-wrap text-xs text-gray-300 max-h-64 overflow-y-auto p-2 bg-gray-900 rounded">
            {emailHeaders}
          </pre>
        </div>
        
        {/* All Detected IPs */}
        {extractedIpAddresses.length > 0 && (
          <div className="mt-3">
            <h4 className="text-md font-semibold">All Detected IP Addresses:</h4>
            <ul className="list-disc pl-5">
              {extractedIpAddresses.map((ip, index) => (
                <li key={index} className="text-blue-400 cursor-pointer hover:underline"
                    onClick={() => this.analyzeSenderIp(ip)}>
                  {ip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
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
      sandboxSubmitted,
      extractedIpAddresses
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
          
          <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">
            Email Headers (for advanced analysis)
          </label>
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md h-32"
            value={this.state.emailHeaders}
            onChange={this.handleEmailHeadersChange}
            placeholder="Paste raw email headers here (optional)"
          />
          
          <button
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
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
            <h4 className="text-md font-semibold mb-2">Analysis Results</h4>
            
            {/* Overall Risk Score */}
            <div className="mb-4">
              <p className="text-gray-700">
                Overall Risk Score: {this.renderRiskScore(analysisResult.overallRiskScore)}
              </p>
            </div>
            
            {/* Header Analysis Results */}
            {analysisResult.headerAnalysis && (
              <div className="mb-4 border-l-4 border-blue-500 pl-3">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Header Analysis:</h5>
                <p className="text-gray-700 mb-2">
                  Score: {this.renderRiskScore(analysisResult.headerAnalysis.score)}
                </p>
                
                <div className="mt-2">
                  <button 
                    onClick={() => this.setState(prev => ({ showHeaderDetails: !prev.showHeaderDetails }))}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    {this.state.showHeaderDetails ? (
                      <><i className="fas fa-chevron-down mr-1"></i> Hide detailed header analysis</>
                    ) : (
                      <><i className="fas fa-chevron-right mr-1"></i> View detailed header analysis</>
                    )}
                  </button>
                  
                  {this.state.showHeaderDetails && (
                    <div className="mt-2 pl-2 text-sm">
                      {/* Routing Path */}
                      <div className={`mb-3 p-2 rounded ${analysisResult.headerAnalysis.details.routingPath.suspicious ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                        <h6 className="font-medium flex items-center">
                          <i className="fas fa-route mr-1"></i> Email Routing Path
                          {analysisResult.headerAnalysis.details.routingPath.suspicious && 
                            <span className="ml-2 text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">Suspicious</span>}
                        </h6>
                        <p className="text-xs text-gray-500 mb-1">Score: {analysisResult.headerAnalysis.details.routingPath.score}</p>
                        <ul className="list-disc pl-5 text-xs">
                          {analysisResult.headerAnalysis.details.routingPath.findings.map((finding, i) => (
                            <li key={i}>{finding}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Server Reputation */}
                      <div className={`mb-3 p-2 rounded ${analysisResult.headerAnalysis.details.serverReputation.suspicious ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                        <h6 className="font-medium flex items-center">
                          <i className="fas fa-server mr-1"></i> Server Reputation
                          {analysisResult.headerAnalysis.details.serverReputation.suspicious && 
                            <span className="ml-2 text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">Suspicious</span>}
                        </h6>
                        <p className="text-xs text-gray-500 mb-1">Score: {analysisResult.headerAnalysis.details.serverReputation.score}</p>
                        <ul className="list-disc pl-5 text-xs">
                          {analysisResult.headerAnalysis.details.serverReputation.findings.map((finding, i) => (
                            <li key={i}>{finding}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Geographic Consistency */}
                      <div className={`mb-3 p-2 rounded ${analysisResult.headerAnalysis.details.geoConsistency.suspicious ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                        <h6 className="font-medium flex items-center">
                          <i className="fas fa-globe mr-1"></i> Geographic Consistency
                          {analysisResult.headerAnalysis.details.geoConsistency.suspicious && 
                            <span className="ml-2 text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">Suspicious</span>}
                        </h6>
                        <p className="text-xs text-gray-500 mb-1">Score: {analysisResult.headerAnalysis.details.geoConsistency.score}</p>
                        <ul className="list-disc pl-5 text-xs">
                          {analysisResult.headerAnalysis.details.geoConsistency.findings.map((finding, i) => (
                            <li key={i}>{finding}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Timestamp Sequence */}
                      <div className={`mb-3 p-2 rounded ${analysisResult.headerAnalysis.details.timestampSequence.suspicious ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                        <h6 className="font-medium flex items-center">
                          <i className="fas fa-clock mr-1"></i> Timestamp Sequence
                          {analysisResult.headerAnalysis.details.timestampSequence.suspicious && 
                            <span className="ml-2 text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">Suspicious</span>}
                        </h6>
                        <p className="text-xs text-gray-500 mb-1">Score: {analysisResult.headerAnalysis.details.timestampSequence.score}</p>
                        <ul className="list-disc pl-5 text-xs">
                          {analysisResult.headerAnalysis.details.timestampSequence.findings.map((finding, i) => (
                            <li key={i}>{finding}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
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
            
            {/* IP Address Analysis Section */}
            {extractedIpAddresses.length > 0 && (
              <div className="mt-8">
                <h4 className="text-md font-semibold mb-3 border-b pb-2">
                  <i className="fas fa-network-wired mr-2 text-blue-500"></i>
                  IP Address Analysis
                  <span className="text-xs ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {extractedIpAddresses.length} IPs detected
                  </span>
                </h4>
                
                <p className="text-sm mb-3">
                  The following IP addresses were detected in the email headers and content. 
                  Each IP is analyzed for geolocation, reputation, and potential threats.
                </p>
                
                <div className="space-y-4">
                  {extractedIpAddresses.map((ip, index) => (
                    <IpAddressAnalyzer key={index} ipAddress={ip} />
                  ))}
                </div>
              </div>
            )}
            
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
