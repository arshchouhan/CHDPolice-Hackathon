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
      this.setState({ 
        isLoading: true, 
        error: null, 
        selectedUrl: '', 
        geminiAnalysisResults: null,
        suspiciousUrls: []
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
        // Extract URLs from email content
        const urls = this.extractUrlsFromEmail(data.email);
        
        this.setState({ 
          selectedEmail: data.email,
          extractedUrls: urls,
          isLoading: false
        });
        
        // Automatically analyze with Gemini if URLs are found
        if (urls.length > 0) {
          this.analyzeEmailWithGemini(data.email);
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
    
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
    
    // Extract URLs from HTML content
    if (email.html) {
      const htmlMatches = email.html.match(urlRegex) || [];
      htmlMatches.forEach(url => urls.add(url));
    }
    
    // Extract URLs from text content
    if (email.textPlain) {
      const textMatches = email.textPlain.match(urlRegex) || [];
      textMatches.forEach(url => urls.add(url));
    }
    
    // Extract URLs from subject
    if (email.subject) {
      const subjectMatches = email.subject.match(urlRegex) || [];
      subjectMatches.forEach(url => urls.add(url));
    }
    
    return Array.from(urls);
  };
  
  // Handle URL selection
  handleUrlSelect = (url) => {
    this.setState({ selectedUrl: url });
  };
  
  // Analyze email with Gemini AI
  analyzeEmailWithGemini = async (email) => {
    try {
      this.setState({ isAnalyzingWithGemini: true, error: null });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Prepare email data for Gemini analysis with detailed logging
      const emailContent = email.html || email.textPlain || '';
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
      
      if (data.success && data.data) {
        // Extract suspicious URLs (risk score > 50)
        const suspiciousUrls = data.data.urlAnalysis.filter(url => url.riskScore > 50);
        
        this.setState({
          geminiAnalysisResults: data.data,
          suspiciousUrls: suspiciousUrls,
          isAnalyzingWithGemini: false
        });
        
        // If suspicious URLs found, select the first one
        if (suspiciousUrls.length > 0) {
          this.setState({ selectedUrl: suspiciousUrls[0].url });
        }
        
        // Show notification
        if (window.showSuccessNotification) {
          window.showSuccessNotification(
            'Gemini Analysis Complete',
            `${suspiciousUrls.length} suspicious URLs found. Overall risk: ${data.data.overallRiskScore}/100`
          );
        }
      }
    } catch (error) {
      console.error('Error analyzing with Gemini:', error);
      this.setState({
        error: `Gemini analysis error: ${error.message}`,
        isAnalyzingWithGemini: false
      });
    }
  };
  
  // Handle sandbox analysis completion
  handleAnalysisComplete = (results) => {
    this.setState({ analysisResults: results });
    
    // Show notification
    if (window.showSuccessNotification) {
      window.showSuccessNotification(
        'URL Analysis Complete', 
        `Risk Score: ${results.riskScore}/100`
      );
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
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Email Sandbox Analysis</h2>
            <p className="text-gray-400 text-sm">Safely analyze URLs from suspicious emails</p>
          </div>
          {selectedEmail && (
            <button
              onClick={() => this.analyzeEmailWithGemini(selectedEmail)}
              disabled={isAnalyzingWithGemini}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50 flex items-center"
            >
              {isAnalyzingWithGemini ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <i className="fas fa-robot mr-2"></i>
                  Analyze with Gemini
                </>
              )}
            </button>
          )}
        </div>
        
        {error && (
          <div className="bg-red-900/30 border border-red-800/50 text-red-300 p-3 rounded-md mb-4">
            <p className="flex items-center">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Email List */}
          <div className="bg-gray-800/30 rounded-lg p-4 max-h-[600px] overflow-y-auto">
            <h3 className="text-white font-medium mb-3">Recent Emails</h3>
            
            {isLoading && emails.length === 0 ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : emails.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No emails found</p>
            ) : (
              <div className="space-y-2">
                {emails.map(email => (
                  <div 
                    key={email._id}
                    onClick={() => this.handleEmailSelect(email._id)}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedEmail && selectedEmail._id === email._id
                        ? 'bg-blue-600/30 border border-blue-500/50' 
                        : 'bg-gray-700/30 hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-white font-medium truncate">{email.subject || 'No Subject'}</p>
                      <span className="text-xs text-gray-400">
                        {new Date(email.receivedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm truncate">{email.from || 'Unknown Sender'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* URL List */}
          <div className="lg:col-span-1 bg-gray-800/30 rounded-lg p-4 max-h-[400px] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-medium">URLs</h3>
              {isAnalyzingWithGemini && (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-blue-400 text-xs">Analyzing with Gemini...</span>
                </div>
              )}
            </div>
            
            {/* Gemini Analysis Results */}
            {geminiAnalysisResults && suspiciousUrls.length > 0 && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800/30 rounded-md">
                <h4 className="text-red-400 text-sm font-medium mb-2">
                  <i className="fas fa-exclamation-triangle mr-1"></i>
                  {suspiciousUrls.length} Suspicious URL{suspiciousUrls.length !== 1 ? 's' : ''} Detected
                </h4>
                <p className="text-gray-300 text-xs mb-2">Overall Risk: 
                  <span className="font-bold text-red-400">{geminiAnalysisResults.overallRiskScore}/100</span>
                </p>
                <div className="space-y-2 mt-3">
                  {suspiciousUrls.map((urlData, index) => (
                    <div 
                      key={`suspicious-${index}`}
                      onClick={() => this.handleUrlSelect(urlData.url)}
                      className={`p-2 rounded-md cursor-pointer transition-colors bg-red-800/20 hover:bg-red-800/30 border border-red-800/30 ${
                        urlData.url === selectedUrl ? 'border-red-500' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-red-300 text-xs font-medium">Risk: {urlData.riskScore}/100</span>
                        <span className="text-xs text-gray-400">#{index + 1}</span>
                      </div>
                      <p className="text-white text-xs break-all">{urlData.url}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* All Extracted URLs */}
            <div>
              {geminiAnalysisResults && suspiciousUrls.length > 0 && (
                <h4 className="text-gray-400 text-sm font-medium mb-2">All Extracted URLs</h4>
              )}
              
              {!selectedEmail ? (
                <p className="text-gray-400 text-center py-4">Select an email to view URLs</p>
              ) : isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : extractedUrls.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No URLs found in this email</p>
              ) : (
                <div className="space-y-2">
                  {extractedUrls.map((url, index) => {
                    // Check if this URL is in the suspicious list
                    const isSuspicious = suspiciousUrls.some(suspiciousUrl => suspiciousUrl.url === url);
                    
                    return (
                      <div 
                        key={index}
                        onClick={() => this.handleUrlSelect(url)}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${
                          url === selectedUrl
                            ? 'bg-blue-600/30 border border-blue-500/50' 
                            : isSuspicious
                              ? 'bg-red-900/20 border border-red-800/30 hover:bg-red-900/30'
                              : 'bg-gray-700/30 hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <p className="text-white text-sm break-all">{url}</p>
                          {isSuspicious && (
                            <span className="ml-2 bg-red-900/50 text-red-300 text-xs px-1 py-0.5 rounded">
                              <i className="fas fa-exclamation-triangle mr-1"></i>
                              Risk
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Sandbox Viewer */}
          <div className="lg:col-span-2">
            <UrlSandboxViewer 
              url={selectedUrl}
              onComplete={this.handleAnalysisComplete}
            />
          </div>
        </div>
      </div>
    );
  }
}

// Export the component
window.AdminSandboxPanel = AdminSandboxPanel;
