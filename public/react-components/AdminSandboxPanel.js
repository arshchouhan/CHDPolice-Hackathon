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
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
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
      this.setState({ isLoading: true, error: null, selectedUrl: '' });
      
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
      
      if (data.success && data.email) {
        // Extract URLs from email content
        const urls = this.extractUrlsFromEmail(data.email);
        
        this.setState({ 
          selectedEmail: data.email,
          extractedUrls: urls,
          isLoading: false
        });
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
      emails, selectedEmail, extractedUrls, 
      selectedUrl, isLoading, error 
    } = this.state;
    
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Email Sandbox Analysis</h2>
            <p className="text-gray-400 text-sm">Safely analyze URLs from suspicious emails</p>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-500/20 text-red-200 p-4 rounded-md mb-4">
            <p className="font-medium">Error: {error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Email List */}
          <div className="lg:col-span-1 bg-gray-800/30 rounded-lg p-4 max-h-[400px] overflow-y-auto">
            <h3 className="text-white font-medium mb-3">Recent Emails</h3>
            
            {isLoading && emails.length === 0 ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : emails.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No emails found</p>
            ) : (
              <div className="space-y-2">
                {emails.map((email) => (
                  <div 
                    key={email._id}
                    onClick={() => this.handleEmailSelect(email._id)}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedEmail && selectedEmail._id === email._id
                        ? 'bg-blue-600/30 border border-blue-500/50' 
                        : 'bg-gray-700/30 hover:bg-gray-700/50'
                    }`}
                  >
                    <p className="text-white text-sm font-medium truncate">{email.subject || 'No Subject'}</p>
                    <p className="text-gray-400 text-xs truncate">From: {email.from || 'Unknown'}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(email.receivedDate || email.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* URL List */}
          <div className="lg:col-span-1 bg-gray-800/30 rounded-lg p-4 max-h-[400px] overflow-y-auto">
            <h3 className="text-white font-medium mb-3">Extracted URLs</h3>
            
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
                {extractedUrls.map((url, index) => (
                  <div 
                    key={index}
                    onClick={() => this.handleUrlSelect(url)}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      url === selectedUrl
                        ? 'bg-blue-600/30 border border-blue-500/50' 
                        : 'bg-gray-700/30 hover:bg-gray-700/50'
                    }`}
                  >
                    <p className="text-white text-sm break-all">{url}</p>
                  </div>
                ))}
              </div>
            )}
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
