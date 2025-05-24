/**
 * URL Sandbox Viewer Component
 * 
 * A visual component that simulates a sandbox environment for safely viewing URLs
 * extracted from emails. This component provides a visual representation of the
 * sandbox process without actually running a real browser automation system.
 */

class UrlSandboxViewer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      url: props.url || '',
      isLoading: false,
      isAnalyzing: false,
      analysisComplete: false,
      currentStep: 'idle',
      screenshot: null,
      securityFindings: [],
      riskScore: 0,
      sandboxLogs: [],
      error: null
    };
    
    this.sandboxRef = React.createRef();
    this.terminalRef = React.createRef();
  }
  
  componentDidMount() {
    if (this.props.autoStart && this.state.url) {
      this.startSandbox();
    }
  }
  
  componentDidUpdate(prevProps) {
    if (this.props.url !== prevProps.url && this.props.url) {
      this.setState({ url: this.props.url });
      
      if (this.props.autoStart) {
        this.startSandbox();
      }
    }
  }
  
  // Add a log entry to the sandbox terminal
  addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    this.setState(prevState => ({
      sandboxLogs: [
        ...prevState.sandboxLogs,
        { message, type, timestamp }
      ]
    }), () => {
      // Auto-scroll to bottom of terminal
      if (this.terminalRef.current) {
        this.terminalRef.current.scrollTop = this.terminalRef.current.scrollHeight;
      }
    });
  }
  
  // Start the sandbox analysis process
  startSandbox = async () => {
    const { url } = this.state;
    
    if (!url) {
      this.setState({ error: 'Please enter a URL to analyze' });
      return;
    }
    
    // Reset state
    this.setState({
      isLoading: true,
      isAnalyzing: true,
      analysisComplete: false,
      currentStep: 'initializing',
      screenshot: null,
      securityFindings: [],
      riskScore: 0,
      sandboxLogs: [],
      error: null
    });
    
    // Simulate sandbox initialization
    this.addLog(`Starting sandbox environment for URL: ${url}`, 'system');
    this.addLog('Initializing secure container...', 'system');
    
    await this.simulateStep('initializing', 'Preparing isolated environment', 1500);
    
    // Simulate DNS resolution
    this.setState({ currentStep: 'dns' });
    this.addLog(`Resolving DNS for domain: ${new URL(url).hostname}`, 'info');
    
    await this.simulateStep('dns', 'Resolving domain name', 800);
    
    // Simulate connection
    this.setState({ currentStep: 'connecting' });
    this.addLog(`Establishing secure connection to target...`, 'info');
    
    await this.simulateStep('connecting', 'Establishing connection', 1200);
    
    // Simulate page loading
    this.setState({ currentStep: 'loading' });
    this.addLog(`Loading page content...`, 'info');
    
    await this.simulateStep('loading', 'Loading page content', 2000);
    
    // Simulate screenshot capture
    this.setState({ currentStep: 'screenshot' });
    this.addLog(`Capturing page screenshot...`, 'info');
    
    await this.simulateStep('screenshot', 'Capturing screenshot', 1000);
    
    // Generate a simulated screenshot based on the URL
    await this.generateSimulatedScreenshot(url);
    
    // Simulate security analysis
    this.setState({ currentStep: 'analyzing' });
    this.addLog(`Analyzing page for security threats...`, 'info');
    
    await this.simulateStep('analyzing', 'Analyzing security threats', 1500);
    
    // Generate security findings
    const findings = await this.generateSecurityFindings(url);
    
    // Calculate risk score based on findings
    const riskScore = findings.reduce((score, finding) => score + finding.severity, 0);
    
    // Complete the analysis
    this.setState({
      isLoading: false,
      isAnalyzing: false,
      analysisComplete: true,
      currentStep: 'complete',
      securityFindings: findings,
      riskScore: Math.min(riskScore, 100)
    });
    
    this.addLog(`Analysis complete. Risk score: ${Math.min(riskScore, 100)}/100`, 'success');
    
    // Call onComplete callback if provided
    if (this.props.onComplete) {
      this.props.onComplete({
        url,
        screenshot: this.state.screenshot,
        findings,
        riskScore: Math.min(riskScore, 100)
      });
    }
  }
  
  // Simulate a step in the sandbox process
  simulateStep = (step, message, duration) => {
    return new Promise(resolve => {
      setTimeout(() => {
        this.addLog(message + ' - Complete', 'success');
        resolve();
      }, duration);
    });
  }
  
  // Generate a simulated screenshot based on the URL
  generateSimulatedScreenshot = async (url) => {
    try {
      // For demo purposes, we'll use a placeholder image service
      // In a real implementation, this would be replaced with actual screenshots
      const domain = new URL(url).hostname;
      const placeholderUrl = `https://via.placeholder.com/800x600/2a3441/FFFFFF?text=Sandbox+View:+${domain}`;
      
      this.setState({ screenshot: placeholderUrl });
      this.addLog('Screenshot captured successfully', 'success');
    } catch (error) {
      this.addLog('Error capturing screenshot: ' + error.message, 'error');
    }
  }
  
  // Generate simulated security findings based on the URL
  generateSecurityFindings = async (url) => {
    const domain = new URL(url).hostname;
    const findings = [];
    
    // Simulate different findings based on domain patterns
    // In a real implementation, this would be based on actual analysis
    
    // Check for suspicious TLDs
    const suspiciousTLDs = ['.xyz', '.tk', '.ml', '.ga', '.cf'];
    if (suspiciousTLDs.some(tld => domain.endsWith(tld))) {
      findings.push({
        type: 'suspicious_domain',
        message: 'Domain uses a suspicious TLD often associated with free domains',
        severity: 15
      });
    }
    
    // Check for login forms (simulated)
    if (Math.random() > 0.5) {
      findings.push({
        type: 'login_form',
        message: 'Page contains a login form that could be used for credential harvesting',
        severity: 20
      });
    }
    
    // Check for password fields (simulated)
    if (Math.random() > 0.6) {
      findings.push({
        type: 'password_field',
        message: 'Page contains password input fields',
        severity: 25
      });
    }
    
    // Check for credit card fields (simulated)
    if (Math.random() > 0.8) {
      findings.push({
        type: 'credit_card',
        message: 'Page contains fields that appear to collect credit card information',
        severity: 35
      });
    }
    
    // Check for suspicious redirects (simulated)
    if (Math.random() > 0.7) {
      findings.push({
        type: 'redirect',
        message: 'Page attempted to redirect to a different domain',
        severity: 30
      });
    }
    
    // Check for malicious scripts (simulated)
    if (Math.random() > 0.75) {
      findings.push({
        type: 'malicious_script',
        message: 'Page contains potentially malicious JavaScript',
        severity: 40
      });
    }
    
    // Add some benign findings to make it more realistic
    findings.push({
      type: 'cookies',
      message: 'Page sets cookies in the browser',
      severity: 5
    });
    
    findings.push({
      type: 'external_resources',
      message: `Page loads resources from ${Math.floor(Math.random() * 10) + 1} external domains`,
      severity: 5
    });
    
    // Sort findings by severity (highest first)
    return findings.sort((a, b) => b.severity - a.severity);
  }
  
  // Handle URL input change
  handleUrlChange = (e) => {
    this.setState({ url: e.target.value });
  }
  
  // Render the security findings
  renderSecurityFindings = () => {
    const { securityFindings } = this.state;
    
    if (!securityFindings || securityFindings.length === 0) {
      return <p className="text-green-400">No security issues detected</p>;
    }
    
    return (
      <div className="mt-4">
        <h4 className="text-white font-medium mb-2">Security Findings</h4>
        <div className="space-y-2">
          {securityFindings.map((finding, index) => {
            // Determine severity color
            let severityColor = 'bg-green-500';
            if (finding.severity > 30) severityColor = 'bg-red-500';
            else if (finding.severity > 15) severityColor = 'bg-orange-500';
            else if (finding.severity > 5) severityColor = 'bg-yellow-500';
            
            return (
              <div key={index} className="bg-gray-800/50 p-3 rounded-md flex items-start">
                <div className={`${severityColor} h-3 w-3 rounded-full mt-1.5 mr-2 flex-shrink-0`}></div>
                <div>
                  <p className="text-white text-sm">{finding.message}</p>
                  <p className="text-gray-400 text-xs">Severity: {finding.severity}/100</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Render the risk score gauge
  renderRiskGauge = () => {
    const { riskScore } = this.state;
    
    // Determine color based on risk score
    let gaugeColor = 'bg-green-500';
    if (riskScore > 80) gaugeColor = 'bg-red-500';
    else if (riskScore > 60) gaugeColor = 'bg-orange-500';
    else if (riskScore > 40) gaugeColor = 'bg-yellow-500';
    
    // Determine risk level text
    let riskLevel = 'Low Risk';
    if (riskScore > 80) riskLevel = 'Critical Risk';
    else if (riskScore > 60) riskLevel = 'High Risk';
    else if (riskScore > 40) riskLevel = 'Medium Risk';
    
    return (
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-white font-medium">Risk Assessment</h4>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${gaugeColor}`}>
            {riskScore}/100
          </span>
        </div>
        
        <div className="h-4 w-full bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${gaugeColor} transition-all duration-1000 ease-out`}
            style={{ width: `${riskScore}%` }}
          ></div>
        </div>
        
        <p className="text-right text-sm mt-1 text-gray-300">{riskLevel}</p>
      </div>
    );
  }
  
  render() {
    const { 
      url, isLoading, isAnalyzing, analysisComplete, 
      currentStep, screenshot, sandboxLogs, error 
    } = this.state;
    
    return (
      <div className="bg-gray-900/50 backdrop-blur-lg rounded-lg border border-gray-800 overflow-hidden">
        {/* Sandbox Header */}
        <div className="bg-gray-800 p-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg mr-3">
              <i className="fas fa-shield-alt text-white"></i>
            </div>
            <h3 className="text-white font-bold">URL Sandbox Viewer</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full ${isAnalyzing ? 'bg-yellow-500 animate-pulse' : analysisComplete ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span className="text-gray-300 text-sm">
              {isAnalyzing ? 'Analyzing' : analysisComplete ? 'Analysis Complete' : 'Ready'}
            </span>
          </div>
        </div>
        
        {/* URL Input */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex">
            <input
              type="text"
              value={url}
              onChange={this.handleUrlChange}
              placeholder="Enter URL to analyze (e.g., https://example.com)"
              className="flex-grow bg-gray-800 text-white px-4 py-2 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isAnalyzing}
            />
            <button
              onClick={this.startSandbox}
              disabled={isAnalyzing || !url}
              className={`px-4 py-2 rounded-r-md font-medium ${
                isAnalyzing 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isAnalyzing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </span>
              ) : 'Start Sandbox'}
            </button>
          </div>
          
          {error && (
            <p className="mt-2 text-red-400 text-sm">{error}</p>
          )}
        </div>
        
        {/* Sandbox Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {/* Sandbox Visualization */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="bg-gray-900 px-4 py-2 flex items-center space-x-2 border-b border-gray-700">
              <div className="flex space-x-1">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-grow text-center">
                <span className="text-gray-400 text-sm truncate">
                  {url || 'Sandbox Browser'}
                </span>
              </div>
            </div>
            
            <div 
              ref={this.sandboxRef}
              className="h-80 bg-white flex items-center justify-center relative overflow-hidden"
            >
              {!isAnalyzing && !screenshot && (
                <div className="text-gray-400 text-center p-4">
                  <i className="fas fa-shield-alt text-4xl mb-2"></i>
                  <p>Enter a URL and click "Start Sandbox" to begin analysis</p>
                </div>
              )}
              
              {isAnalyzing && (
                <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center z-10">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-blue-400 font-medium mb-2">
                    {currentStep === 'initializing' && 'Initializing Sandbox...'}
                    {currentStep === 'dns' && 'Resolving Domain...'}
                    {currentStep === 'connecting' && 'Establishing Connection...'}
                    {currentStep === 'loading' && 'Loading Content...'}
                    {currentStep === 'screenshot' && 'Capturing Screenshot...'}
                    {currentStep === 'analyzing' && 'Analyzing Security Threats...'}
                  </p>
                  <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300 ease-out"
                      style={{ 
                        width: (() => {
                          switch(currentStep) {
                            case 'initializing': return '10%';
                            case 'dns': return '25%';
                            case 'connecting': return '40%';
                            case 'loading': return '60%';
                            case 'screenshot': return '80%';
                            case 'analyzing': return '95%';
                            case 'complete': return '100%';
                            default: return '0%';
                          }
                        })()
                      }}
                    ></div>
                  </div>
                </div>
              )}
              
              {screenshot && (
                <img 
                  src={screenshot} 
                  alt="Sandbox Screenshot" 
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
          </div>
          
          {/* Terminal Output */}
          <div className="bg-gray-900 rounded-lg overflow-hidden flex flex-col">
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
              <span className="text-gray-300 text-sm font-mono">Sandbox Terminal</span>
            </div>
            
            <div 
              ref={this.terminalRef}
              className="flex-grow p-3 font-mono text-xs overflow-y-auto h-80"
            >
              {sandboxLogs.length === 0 ? (
                <p className="text-gray-500">Terminal output will appear here...</p>
              ) : (
                sandboxLogs.map((log, index) => {
                  // Determine log color based on type
                  let logColor = 'text-gray-300';
                  if (log.type === 'error') logColor = 'text-red-400';
                  else if (log.type === 'success') logColor = 'text-green-400';
                  else if (log.type === 'system') logColor = 'text-blue-400';
                  else if (log.type === 'warning') logColor = 'text-yellow-400';
                  
                  return (
                    <div key={index} className="mb-1">
                      <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                      <span className={logColor}>{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        {/* Analysis Results */}
        {analysisComplete && (
          <div className="p-4 bg-gray-800/50">
            <h3 className="text-white font-bold mb-3">Analysis Results</h3>
            
            {/* Risk Gauge */}
            {this.renderRiskGauge()}
            
            {/* Security Findings */}
            {this.renderSecurityFindings()}
          </div>
        )}
      </div>
    );
  }
}

// Export the component
window.UrlSandboxViewer = UrlSandboxViewer;
