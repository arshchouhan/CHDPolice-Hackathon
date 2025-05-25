/**
 * Admin Sandbox Panel Component
 * 
 * A component for the admin dashboard that allows admins to analyze URLs
 * in a simulated sandbox environment.
 */

class AdminSandboxPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      emails: [],
      selectedEmail: null,
      extractedUrls: [],
      selectedUrl: '',
      isLoading: false,
      analysisResults: null,
      geminiAnalysisResults: null,
      isAnalyzingWithGemini: false,
      suspiciousUrls: [],
      error: null
    };
  }
  
  componentDidMount() {
    this.loadEmails();
  }
  
  // Load emails from the API
  loadEmails = async () => {
    try {
      this.setState({ isLoading: true, error: null });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      const response = await fetch(`${baseUrl}/api/admin/emails?limit=10&sort=createdAt:desc`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        } else {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Invalid response format from server. Please try again later.');
      }
      
      if (data.success && data.emails) {
        this.setState({ 
          emails: data.emails,
          isLoading: false
        });
      } else {
        this.setState({ 
          emails: [],
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error loading emails:', error);
      this.setState({ 
        error: error.message,
        isLoading: false
      });
    }
  };
  
  // Handle email selection
  handleEmailSelect = async (emailId) => {
    try {
      console.log('Email selected with ID:', emailId);
      this.setState({ 
        isLoading: true, 
        error: null, 
        selectedUrl: '', 
        geminiAnalysisResults: null,
        suspiciousUrls: [],
        isAnalyzingWithGemini: false
      });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      console.log('Loading email details with ID:', emailId);
      
      // Use the correct admin API endpoint for emails
      const response = await fetch(`${baseUrl}/api/admin/emails/${emailId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Email details response status:', response.status);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        } else {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Invalid response format from server. Please try again later.');
      }
      
      if (data.success && data.email) {
        console.log('Email data loaded successfully:', {
          emailId: data.email._id,
          subject: data.email.subject,
          hasContent: !!data.email.html || !!data.email.textPlain
        });
        
        // Extract URLs from email content
        const urls = this.extractUrlsFromEmail(data.email);
        
        this.setState({ 
          selectedEmail: data.email,
          extractedUrls: urls,
          isLoading: false
        });
        
        // Don't automatically analyze with Gemini - let user click the button
        // This prevents issues with empty content
        console.log('Email loaded successfully with', urls.length, 'URLs extracted');
        
        // If no URLs found, show a message
        if (urls.length === 0) {
          console.log('No URLs found in the email');
          // Add a test URL for development purposes
          if (process.env.NODE_ENV !== 'production') {
            this.setState({
              extractedUrls: ['https://example.com', 'https://test-phishing-site.com']
            });
          }
        }
      } else {
        this.setState({ 
          selectedEmail: null,
          extractedUrls: [],
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error loading email details:', error);
      this.setState({ 
        error: error.message,
        isLoading: false
      });
    }
  };
  
  // Extract URLs from email content
  extractUrlsFromEmail = (email) => {
    const urls = new Set();
    
    // Regular expression to match URLs - improved to catch more URL formats
    const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+\.[^\s<>"']+)/gi;
    
    console.log('Extracting URLs from email:', {
      hasHtml: !!email.html,
      hasTextPlain: !!email.textPlain,
      hasSubject: !!email.subject,
      emailKeys: Object.keys(email)
    });
    
    // Extract URLs from HTML content
    if (email.html) {
      const htmlMatches = email.html.match(urlRegex) || [];
      console.log('URLs found in HTML:', htmlMatches.length);
      htmlMatches.forEach(url => urls.add(url));
    }
    
    // Extract URLs from text content
    if (email.textPlain) {
      const textMatches = email.textPlain.match(urlRegex) || [];
      console.log('URLs found in text:', textMatches.length);
      textMatches.forEach(url => urls.add(url));
    }
    
    // Extract URLs from subject
    if (email.subject) {
      const subjectMatches = email.subject.match(urlRegex) || [];
      console.log('URLs found in subject:', subjectMatches.length);
      subjectMatches.forEach(url => urls.add(url));
    }
    
    // Check for body field (some email formats use this)
    if (email.body) {
      const bodyMatches = email.body.match(urlRegex) || [];
      console.log('URLs found in body:', bodyMatches.length);
      bodyMatches.forEach(url => urls.add(url));
    }
    
    // Check for content field (some email formats use this)
    if (email.content) {
      const contentMatches = email.content.match(urlRegex) || [];
      console.log('URLs found in content:', contentMatches.length);
      contentMatches.forEach(url => urls.add(url));
    }
    
    // Add some test URLs if none found (for development/testing)
    if (urls.size === 0 && process.env.NODE_ENV !== 'production') {
      console.log('No URLs found in email, adding test URLs for development');
      urls.add('https://example.com');
      urls.add('https://test-phishing-site.com');
    }
    
    const extractedUrls = Array.from(urls);
    console.log('Total unique URLs extracted:', extractedUrls.length);
    return extractedUrls;
  };
  
  // Handle URL selection
  handleUrlSelect = (url) => {
    this.setState({ selectedUrl: url });
  };
  
  // Analyze email with Gemini AI
  analyzeEmailWithGemini = async (email) => {
    try {
      console.log('Analyzing email with Gemini:', email ? email._id : 'No email selected');
      
      // Check if email is selected
      if (!email || (!email.html && !email.textPlain && !email.body && !email.content)) {
        throw new Error('Please select an email with valid content to analyze');
      }
      
      this.setState({ 
        isAnalyzingWithGemini: true, 
        error: null
      });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Prepare email data for Gemini analysis with detailed logging
      const emailContent = email.html || email.textPlain || email.body || email.content || '';
      const subject = email.subject || 'No Subject';
      const sender = email.from || 'unknown@sender.com';
      
      console.log('Email data for Gemini analysis:', {
        hasHtml: !!email.html,
        hasTextPlain: !!email.textPlain,
        contentLength: emailContent.length,
        subject: subject,
        sender: sender
      });
      
      if (!emailContent) {
        throw new Error('Email content is missing. Please select an email with valid content.');
      }
      
      const emailData = {
        emailContent: emailContent,
        subject: subject,
        sender: sender
      };
      
      // Get base URL with debugging
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      console.log('Using base URL for Gemini analysis:', baseUrl);
      
      // Log the request details for debugging
      console.log('Sending Gemini analysis request:', {
        url: `${baseUrl}/api/gemini/analyze-email`,
        method: 'POST',
        headers: {
          'Authorization': 'Bearer [TOKEN HIDDEN]',
          'Content-Type': 'application/json'
        },
        bodyLength: JSON.stringify(emailData).length
      });
      
      const response = await fetch(`${baseUrl}/api/gemini/analyze-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });
      
      // Log response details for debugging
      console.log('Gemini analysis response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        headers: Object.fromEntries([...response.headers.entries()])
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        } else {
          // Try to get the response text for better error reporting
          const responseText = await response.text();
          console.error('Non-JSON error response:', responseText.substring(0, 500) + '...');
          throw new Error(`Error ${response.status}: ${response.statusText}. Server returned HTML instead of JSON.`);
        }
      }
      
      let data;
      try {
        const responseText = await response.text();
        console.log('Response text preview:', responseText.substring(0, 100) + '...');
        
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('JSON parse error:', jsonError);
          console.error('Invalid JSON response:', responseText.substring(0, 500) + '...');
          throw new Error('Invalid JSON response from server. Please check server logs.');
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Invalid response format from server. Please try again later.');
      }
      
      if (data.success) {
        console.log('Gemini analysis successful:', data);
        
        // Process suspicious URLs
        const suspiciousUrls = data.suspiciousUrls || [];
        
        this.setState({
          geminiAnalysisResults: data,
          suspiciousUrls: suspiciousUrls,
          isAnalyzingWithGemini: false
        });
        
        // Show notification
        if (window.showSuccessNotification) {
          window.showSuccessNotification(
            'Gemini Analysis Complete',
            `Found ${suspiciousUrls.length} suspicious URLs`
          );
        }
      } else {
        throw new Error(data.message || 'Unknown error occurred during analysis');
      }
    } catch (error) {
      console.error('Error analyzing with Gemini:', error);
      this.setState({ 
        error: `Error analyzing with Gemini: ${error.message}`,
        isAnalyzingWithGemini: false
      });
      
      // Show error notification
      if (window.showErrorNotification) {
        window.showErrorNotification('Analysis Error', error.message);
      }
    }
  };
  
  // Handle sandbox analysis
  handleSandboxAnalysis = async (url) => {
    try {
      // Implementation for sandbox analysis
      console.log('Analyzing URL in sandbox:', url);
      
      // Show notification
      if (window.showInfoNotification) {
        window.showInfoNotification('Sandbox Analysis', `Analyzing ${url}`);
      }
    } catch (error) {
      console.error('Error with sandbox analysis:', error);
      this.setState({ error: error.message });
    }
  };
  
  // Handle analysis completion
  handleAnalysisComplete = (results) => {
    try {
      console.log('Sandbox analysis complete:', results);
      
      // Store the analysis results in state
      this.setState({
        analysisResults: results,
        error: null
      });
      
      // Show success notification
      if (results && window.showSuccessNotification) {
        window.showSuccessNotification(
          'URL Analysis Complete', 
          `Risk Score: ${results.riskScore}/100`
        );
      }
    } catch (error) {
      console.error('Error handling analysis completion:', error);
      this.setState({ error: `Error handling analysis completion: ${error.message}` });
    }
  };
  
  render() {
    const { 
      emails, 
      selectedEmail,
      extractedUrls,
      selectedUrl,
      isLoading,
      isAnalyzingWithGemini,
      geminiAnalysisResults,
      suspiciousUrls,
      error
    } = this.state;
    
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Email Sandbox Analysis</h2>
            <p className="text-blue-300 text-sm">Safely analyze URLs from suspicious emails with Gemini AI</p>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-900/30 border border-red-800/50 text-red-300 p-3 rounded-xl mb-4 shadow-lg">
            <p className="flex items-center">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Email List - Takes 3/12 of the space */}
          <div className="lg:col-span-3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 max-h-[600px] overflow-y-auto border border-gray-700 shadow-lg">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg mr-3">
                <i className="fas fa-envelope text-white"></i>
              </div>
              <h3 className="text-white font-medium">Recent Emails</h3>
            </div>
            
            {isLoading && !selectedEmail ? (
              <div className="flex justify-center py-8">
                <div className="w-10 h-10 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/30"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                </div>
              </div>
            ) : emails.length === 0 ? (
              <div className="bg-gray-800/50 rounded-lg p-6 text-center">
                <i className="fas fa-inbox text-gray-600 text-3xl mb-3"></i>
                <p className="text-gray-400">No emails found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {emails.map(email => (
                  <div 
                    key={email._id} 
                    onClick={() => this.handleEmailSelect(email._id)}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${selectedEmail && selectedEmail._id === email._id ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-500/50 shadow-md' : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-white font-medium truncate">{email.subject || 'No Subject'}</p>
                      <span className="text-xs text-gray-400 bg-gray-800/70 px-2 py-1 rounded-full">
                        {new Date(email.receivedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm truncate flex items-center">
                      <i className="fas fa-user-circle text-gray-500 mr-2"></i>
                      {email.from || 'Unknown Sender'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* URL Sandbox - Takes 6/12 of the space (central position) */}
          <div className="lg:col-span-6 lg:order-2">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 shadow-lg overflow-hidden h-full">
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-5 py-4 border-b border-gray-700 flex items-center">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg mr-3 transform rotate-12">
                  <i className="fas fa-shield-alt text-white"></i>
                </div>
                <h3 className="text-white font-medium">URL Sandbox Analysis</h3>
              </div>
              
              {!selectedUrl ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center h-[500px]">
                  <div className="bg-blue-600/10 p-6 rounded-full inline-block mb-4">
                    <i className="fas fa-search text-blue-500 text-4xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Select a URL to Analyze</h3>
                  <p className="text-gray-400 max-w-md">
                    Choose a URL from the list to analyze it in the secure sandbox environment with Gemini AI protection.
                  </p>
                </div>
              ) : (
                <div className="p-0">
                  <div className="bg-gray-900/50 backdrop-blur-sm p-3 border-b border-gray-700 flex items-center">
                    <i className="fas fa-link text-blue-400 mr-2"></i>
                    <p className="text-white text-sm font-mono break-all overflow-hidden overflow-ellipsis">{selectedUrl}</p>
                  </div>
                  
                  <ErrorBoundary fallback={
                    <div className="p-8 flex flex-col items-center justify-center h-[400px]">
                      <div className="bg-yellow-600/20 p-4 rounded-lg text-center max-w-md">
                        <i className="fas fa-exclamation-triangle text-yellow-500 text-3xl mb-3"></i>
                        <p className="text-yellow-400 text-lg font-medium mb-2">Sandbox viewer encountered an error</p>
                        <p className="text-gray-300 text-sm mb-4">The URL analysis is still processing in the background.</p>
                        <button 
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                        >
                          Reload Page
                        </button>
                      </div>
                    </div>
                  }>
                    <UrlSandboxViewer 
                      url={selectedUrl} 
                      autoStart={true}
                      onAnalysisComplete={this.handleAnalysisComplete}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </div>
          </div>
          
          {/* URL List - Takes 3/12 of the space */}
          <div className="lg:col-span-3 lg:order-1 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 max-h-[600px] overflow-y-auto border border-gray-700 shadow-lg">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg mr-3">
                <i className="fas fa-link text-white"></i>
              </div>
              <h3 className="text-white font-medium">URLs</h3>
              {isAnalyzingWithGemini && (
                <div className="flex items-center ml-3 bg-blue-900/30 px-3 py-1 rounded-full">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-blue-300 text-xs">Analyzing with Gemini AI...</span>
                </div>
              )}
            </div>
            
            {/* Gemini Analysis Results */}
            {geminiAnalysisResults && suspiciousUrls.length > 0 && (
              <div className="mb-5 p-4 bg-gradient-to-r from-red-900/20 to-red-800/20 border border-red-800/30 rounded-lg shadow-md">
                <div className="flex items-center mb-3">
                  <div className="bg-red-900/50 p-2 rounded-full mr-2">
                    <i className="fas fa-exclamation-triangle text-red-400"></i>
                  </div>
                  <h4 className="text-red-300 font-medium">
                    {suspiciousUrls.length} Suspicious URL{suspiciousUrls.length !== 1 ? 's' : ''} Detected
                  </h4>
                </div>
                <div className="bg-red-900/30 rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-sm">Overall Risk Assessment:</span>
                    <span className="font-bold text-red-300 bg-red-900/50 px-3 py-1 rounded-full text-sm">
                      {geminiAnalysisResults.overallRiskScore}/100
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all duration-1000 ease-out"
                      style={{ width: `${geminiAnalysisResults.overallRiskScore}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-2">
                  {suspiciousUrls.map((urlData, index) => (
                    <div 
                      key={`suspicious-${index}`}
                      onClick={() => this.handleUrlSelect(urlData.url)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 bg-gradient-to-r from-red-900/30 to-red-800/20 hover:from-red-900/40 hover:to-red-800/30 border ${urlData.url === selectedUrl ? 'border-red-500 shadow-md' : 'border-red-800/30'}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-red-300 text-xs font-medium bg-red-900/50 px-2 py-1 rounded-full">
                          Risk Score: {urlData.riskScore}/100
                        </span>
                        <span className="text-xs text-gray-400 bg-gray-800/70 px-2 py-1 rounded-full">URL #{index + 1}</span>
                      </div>
                      <p className="text-white text-sm break-all font-mono">{urlData.url}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* All Extracted URLs */}
            <div>
              {geminiAnalysisResults && suspiciousUrls.length > 0 && (
                <div className="flex items-center mb-3 border-t border-gray-700 pt-4">
                  <i className="fas fa-globe text-blue-400 mr-2"></i>
                  <h4 className="text-gray-300 font-medium">All Extracted URLs</h4>
                </div>
              )}
              
              {!selectedEmail ? (
                <div className="bg-gray-800/50 rounded-lg p-6 text-center">
                  <i className="fas fa-mouse-pointer text-gray-600 text-3xl mb-3"></i>
                  <p className="text-gray-400">Select an email to view extracted URLs</p>
                </div>
              ) : isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/30"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                  </div>
                </div>
              ) : extractedUrls.length === 0 ? (
                <div className="bg-gray-800/50 rounded-lg p-6 text-center">
                  <i className="fas fa-search text-gray-600 text-3xl mb-3"></i>
                  <p className="text-gray-400">No URLs found in this email</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {extractedUrls.map((url, index) => {
                    // Check if this URL is in the suspicious list
                    const isSuspicious = suspiciousUrls.some(suspiciousUrl => suspiciousUrl.url === url);
                    
                    return (
                      <div 
                        key={index}
                        onClick={() => this.handleUrlSelect(url)}
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                          url === selectedUrl
                            ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-500/50 shadow-md' 
                            : isSuspicious
                              ? 'bg-gradient-to-r from-red-900/20 to-red-800/20 border border-red-800/30 hover:from-red-900/30 hover:to-red-800/40'
                              : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center">
                            <i className={`fas ${isSuspicious ? 'fa-exclamation-circle text-red-400' : 'fa-link text-blue-400'} mr-2`}></i>
                            <span className="text-xs text-gray-400">URL #{index + 1}</span>
                          </div>
                          {isSuspicious && (
                            <span className="bg-red-900/50 text-red-300 text-xs px-2 py-1 rounded-full">
                              <i className="fas fa-exclamation-triangle mr-1"></i>
                              High Risk
                            </span>
                          )}
                        </div>
                        <p className="text-white text-sm break-all font-mono mt-2">{url}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Sandbox Viewer */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/30 rounded-lg p-4 h-full">
              <h3 className="text-white font-medium mb-3">URL Sandbox</h3>
              
              {!selectedUrl ? (
                <p className="text-gray-400 text-center py-4">Select a URL to analyze in the sandbox</p>
              ) : (
                <div>
                  <div className="mb-3 p-2 bg-gray-700/50 rounded-md">
                    <p className="text-white text-sm break-all">{selectedUrl}</p>
                  </div>
                  
                  <ErrorBoundary fallback={
                    <div className="p-4 bg-gray-700/50 rounded-md">
                      <p className="text-yellow-400 mb-2">Sandbox viewer encountered an error</p>
                      <p className="text-gray-300 text-sm">The URL analysis is still processing in the background.</p>
                      <button 
                        onClick={() => window.location.reload()}
                        className="mt-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                      >
                        Reload page
                      </button>
                    </div>
                  }>
                    <UrlSandboxViewer 
                      url={selectedUrl}
                      onComplete={this.handleAnalysisComplete}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// Export the component
window.AdminSandboxPanel = AdminSandboxPanel;
