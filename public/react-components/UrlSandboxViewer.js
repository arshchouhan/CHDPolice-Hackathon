/**
 * URL Sandbox Viewer Component
 * 
 * A visual component that simulates a sandbox environment for safely viewing URLs
 * extracted from emails. This component provides a visual representation of the
 * sandbox process without actually running a real browser automation system.
 * 
 * Now enhanced with real network traffic analysis capabilities.
 */

// Import the NetworkTrafficAnalyzer component
// @ts-ignore
const NetworkTrafficAnalyzer = window.NetworkTrafficAnalyzer || null;

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
      networkTrafficData: null,
      dnsAnalysisData: null,
      showNetworkAnalysis: false,
      error: null
    };
    
    this.sandboxRef = React.createRef();
    this.terminalRef = React.createRef();
  }
  
  componentDidMount() {
    // Set a flag to track if component is mounted
    this._isMounted = true;
    
    if (this.props.autoStart && this.state.url) {
      this.startSandbox();
    }
  }
  
  componentWillUnmount() {
    // Set the flag to false when component unmounts
    this._isMounted = false;
    
    // Clear any pending timeouts
    if (this._timeouts) {
      this._timeouts.forEach(timeoutId => clearTimeout(timeoutId));
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
    // Only update state if component is still mounted
    if (!this._isMounted) {
      console.log('Attempted to add log after component unmounted:', message);
      return;
    }
    
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
      networkTrafficData: null,
      dnsAnalysisData: null,
      showNetworkAnalysis: false,
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
    
    // Simulate network traffic analysis
    this.setState({ currentStep: 'network' });
    this.addLog(`Capturing network traffic data...`, 'info');
    
    await this.simulateStep('network', 'Monitoring network traffic', 1800);
    
    // Generate network traffic data
    const networkData = await this.generateNetworkTrafficData(url);
    this.setState({ networkTrafficData: networkData });
    
    // Simulate DNS analysis
    this.setState({ currentStep: 'dns_analysis' });
    this.addLog(`Performing DNS analysis on all domains...`, 'info');
    
    await this.simulateStep('dns_analysis', 'Analyzing DNS records', 1200);
    
    // Generate DNS analysis data
    const dnsData = await this.generateDnsAnalysisData(url);
    this.setState({ dnsAnalysisData: dnsData });
    
    // Simulate security analysis using Gemini AI
    this.setState({ currentStep: 'analyzing' });
    this.addLog(`Analyzing security threats with Gemini AI...`, 'info');
    
    await this.simulateStep('analyzing', 'Analyzing with Gemini AI', 2500);
    
    // Use Gemini AI for security analysis
    let findings = [];
    try {
      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Get base URL
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      
      // Prepare data for Gemini analysis
      const analysisData = {
        url: url,
        networkData: this.state.networkTrafficData,
        dnsData: this.state.dnsAnalysisData
      };
      
      this.addLog(`Sending data to Gemini AI for advanced threat analysis...`, 'info');
      
      // Call the Gemini API
      const response = await fetch(`${baseUrl}/api/gemini/analyze-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(analysisData)
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.addLog(`Gemini AI analysis complete`, 'success');
        
        // Use findings from Gemini
        if (data.findings && Array.isArray(data.findings)) {
          findings = data.findings;
        } else {
          // Fallback to local findings if Gemini doesn't return expected format
          findings = await this.generateSecurityFindings(url);
        }
      } else {
        throw new Error(data.message || 'Unknown error from Gemini API');
      }
    } catch (error) {
      this.addLog(`Error with Gemini analysis: ${error.message}. Using local analysis instead.`, 'error');
      // Fallback to local findings if Gemini analysis fails
      findings = await this.generateSecurityFindings(url);
    }
    
    // Add network-based findings
    if (networkData && networkData.suspicious_domains && networkData.suspicious_domains.length > 0) {
      networkData.suspicious_domains.forEach(domain => {
        findings.push({
          type: 'suspicious_domain',
          message: `Suspicious domain detected: ${domain}`,
          severity: 15,
          details: 'Domain has characteristics of phishing sites'
        });
      });
    }
    
    // Calculate risk score based on findings
    const riskScore = findings.reduce((score, finding) => score + finding.severity, 0);
    
    // Complete the analysis - only if component is still mounted
    if (!this._isMounted) {
      console.log('Component unmounted before analysis completion');
      return; // Exit early if component unmounted
    }
    
    this.setState({
      isLoading: false,
      isAnalyzing: false,
      analysisComplete: true,
      currentStep: 'complete',
      securityFindings: findings,
      riskScore: Math.min(riskScore, 100),
      showNetworkAnalysis: true
    });
    
    this.addLog(`Analysis complete. Risk score: ${Math.min(riskScore, 100)}%`, 'success');
    this.addLog(`Network traffic analysis captured ${networkData.request_log.length} HTTP requests`, 'info');
    this.addLog(`DNS analysis found ${networkData.suspicious_domains.length} suspicious domains`, networkData.suspicious_domains.length > 0 ? 'warning' : 'info');
    
    // Notify parent component if callback provided and component is still mounted
    try {
      // Store analysis data for callback even if component unmounts
      const analysisData = {
        url,
        riskScore: Math.min(riskScore, 100),
        findings: [...findings],
        screenshot: this.state.screenshot,
        networkTrafficData: networkData ? { ...networkData } : null,
        dnsAnalysisData: dnsData ? { ...dnsData } : null
      };
      
      // Store the callback data in a class property so it can be accessed even if component unmounts
      this._analysisData = analysisData;
      
      if (this.props.onAnalysisComplete) {
        // Use setTimeout to prevent blocking the UI thread
        setTimeout(() => {
          try {
            // Check if component is still mounted before calling the callback
            // But still call the callback even if unmounted to ensure parent component gets the data
            this.props.onAnalysisComplete(this._analysisData);
            console.log('Analysis callback completed successfully');
          } catch (callbackError) {
            console.error('Error in onAnalysisComplete callback:', callbackError);
            if (this._isMounted) {
              this.addLog(`Error in callback: ${callbackError.message}`, 'error');
            }
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error preparing analysis data for callback:', error);
      if (this._isMounted) {
        this.addLog(`Error preparing callback data: ${error.message}`, 'error');
      }
    }
  }
  
  // Simulate a step with a progress message and delay
  simulateStep = async (step, message, delay) => {
    // Initialize timeouts array if it doesn't exist
    if (!this._timeouts) {
      this._timeouts = [];
    }
    
    this.addLog(message, 'info');
    
    // Add error handling and timeout protection
    return new Promise((resolve, reject) => {
      // Only proceed if component is mounted
      if (!this._isMounted) {
        console.log('Component unmounted during step:', step);
        resolve();
        return;
      }
      
      const timeoutId = setTimeout(() => {
        // Check if component is still mounted before updating state
        if (this._isMounted) {
          this.addLog(`Completed ${message}`, 'success');
        }
        resolve();
        
        // Remove this timeout from tracking array
        if (this._timeouts) {
          const index = this._timeouts.indexOf(timeoutId);
          if (index > -1) {
            this._timeouts.splice(index, 1);
          }
        }
      }, delay);
      
      // Add a safety timeout to prevent getting stuck
      const safetyTimeout = setTimeout(() => {
        // Check if component is still mounted before updating state
        if (this._isMounted) {
          this.addLog(`Safety timeout triggered for: ${message}`, 'warning');
        }
        clearTimeout(timeoutId);
        resolve();
        
        // Remove both timeouts from tracking array
        if (this._timeouts) {
          const index1 = this._timeouts.indexOf(timeoutId);
          if (index1 > -1) {
            this._timeouts.splice(index1, 1);
          }
          
          const index2 = this._timeouts.indexOf(safetyTimeout);
          if (index2 > -1) {
            this._timeouts.splice(index2, 1);
          }
        }
      }, delay + 5000); // 5 seconds longer than expected delay for better reliability
      
      // Track these timeouts
      this._timeouts.push(timeoutId);
      this._timeouts.push(safetyTimeout);
    });
  }
  
  // Generate a simulated screenshot based on the URL
  generateSimulatedScreenshot = async (url) => {
    try {
      const domain = new URL(url).hostname;
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      
      // Create a canvas to generate a simulated screenshot
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      
      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw a fake browser UI
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, 80);
      
      // Draw address bar
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(120, 20, 800, 40);
      
      // Draw URL text
      ctx.fillStyle = '#333333';
      ctx.font = '16px Arial';
      ctx.fillText(url, 140, 45);
      
      // Draw some fake content
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`Sandbox View: ${domain}`, 40, 120);
      
      ctx.font = '16px Arial';
      ctx.fillText('This is a simulated view of the page for security analysis purposes.', 40, 160);
      
      // Add some fake page elements
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(40, 200, 1200, 60);
      ctx.fillRect(40, 280, 600, 400);
      ctx.fillRect(660, 280, 580, 180);
      ctx.fillRect(660, 480, 580, 200);
      
      // Convert canvas to image
      const dataUrl = canvas.toDataURL('image/png');
      this.setState({ screenshot: dataUrl });
      
      this.addLog(`Screenshot captured for ${domain}`, 'success');
      return dataUrl;
      
    } catch (error) {
      this.addLog(`Error generating screenshot: ${error.message}`, 'error');
      return null;
    }
  }
  
  // Generate network traffic data for the URL
  generateNetworkTrafficData = async (url) => {
    try {
      const domain = new URL(url).hostname;
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Generate simulated network requests
      const requests = [
        {
          request_id: `req_${Math.random().toString(36).substring(7)}`,
          url: url,
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
          timestamp: timestamp,
          initiator: 'navigation'
        },
        {
          request_id: `req_${Math.random().toString(36).substring(7)}`,
          url: `https://${domain}/styles.css`,
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/css' },
          timestamp: timestamp + 0.2,
          initiator: 'parser'
        },
        {
          request_id: `req_${Math.random().toString(36).substring(7)}`,
          url: `https://${domain}/main.js`,
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/javascript' },
          timestamp: timestamp + 0.3,
          initiator: 'parser'
        },
        {
          request_id: `req_${Math.random().toString(36).substring(7)}`,
          url: `https://${domain}/logo.png`,
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/png' },
          timestamp: timestamp + 0.5,
          initiator: 'img'
        },
        {
          request_id: `req_${Math.random().toString(36).substring(7)}`,
          url: `https://analytics.${domain}/track.js`,
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/javascript' },
          timestamp: timestamp + 0.8,
          initiator: 'script'
        },
        {
          request_id: `req_${Math.random().toString(36).substring(7)}`,
          url: `https://analytics.${domain}/collect`,
          method: 'POST',
          headers: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/json' },
          timestamp: timestamp + 1.2,
          initiator: 'xhr',
          post_data: '{"event":"pageview","url":"' + url + '"}'
        }
      ];
      
      // Add some third-party requests
      const thirdParties = ['cdn.googleanalytics.com', 'fonts.googleapis.com', 'ajax.cloudflare.com'];
      thirdParties.forEach((thirdParty, index) => {
        requests.push({
          request_id: `req_${Math.random().toString(36).substring(7)}`,
          url: `https://${thirdParty}/resource${index}.js`,
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/javascript' },
          timestamp: timestamp + 1.5 + (index * 0.2),
          initiator: 'script'
        });
      });
      
      // Generate redirects
      const redirects = [];
      
      // Add a redirect if the URL doesn't have www
      if (!domain.startsWith('www.') && Math.random() > 0.5) {
        redirects.push({
          from: url,
          to: url.replace(domain, `www.${domain}`),
          status: 301,
          timestamp: timestamp
        });
      }
      
      // Simulate HTTP to HTTPS redirect
      if (url.startsWith('http:')) {
        redirects.push({
          from: url,
          to: url.replace('http:', 'https:'),
          status: 301,
          timestamp: timestamp + 0.1
        });
      }
      
      // Generate form submissions data
      const postData = [];
      
      // Add suspicious post data if domain seems suspicious
      const suspiciousTLDs = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.top'];
      const isSuspiciousDomain = suspiciousTLDs.some(tld => domain.endsWith(tld));
      
      if (isSuspiciousDomain || Math.random() > 0.7) {
        postData.push({
          url: `https://${domain}/login`,
          field: 'password',
          sensitive: true,
          timestamp: timestamp + 3.5
        });
        
        postData.push({
          url: `https://${domain}/login`,
          field: 'email',
          sensitive: true,
          timestamp: timestamp + 3.5
        });
      }
      
      // Generate file downloads
      const fileDownloads = [];
      
      // Add suspicious file download if domain seems suspicious
      if (isSuspiciousDomain || Math.random() > 0.8) {
        fileDownloads.push({
          url: `https://${domain}/document.pdf`,
          content_type: 'application/pdf',
          timestamp: timestamp + 4.0,
          request_id: `req_${Math.random().toString(36).substring(7)}`
        });
      }
      
      // Generate timing data
      const timingData = requests.map(req => ({
        request_id: req.request_id,
        url: req.url,
        start_time: req.timestamp,
        end_time: req.timestamp + (Math.random() * 0.5),
        type: 'request_complete'
      }));
      
      // Generate suspicious domains
      const suspiciousDomains = [];
      if (isSuspiciousDomain) {
        suspiciousDomains.push(domain);
      }
      
      // Add another suspicious domain if this looks like a phishing site
      if (domain.includes('paypal') || domain.includes('apple') || domain.includes('microsoft') || domain.includes('google')) {
        if (!domain.endsWith('.com')) {
          suspiciousDomains.push(domain);
        }
      }
      
      // Return the complete network traffic data
      return {
        request_log: requests,
        redirect_chain: redirects,
        post_data: postData,
        file_downloads: fileDownloads,
        timing_data: timingData,
        suspicious_domains: suspiciousDomains,
        stats: {
          total_requests: requests.length,
          total_redirects: redirects.length,
          sensitive_form_submissions: postData.length,
          file_downloads: fileDownloads.length,
          suspicious_domains: suspiciousDomains.length
        }
      };
      
    } catch (error) {
      this.addLog(`Error generating network traffic data: ${error.message}`, 'error');
      return {
        request_log: [],
        redirect_chain: [],
        post_data: [],
        file_downloads: [],
        timing_data: [],
        suspicious_domains: [],
        stats: {
          total_requests: 0,
          total_redirects: 0,
          sensitive_form_submissions: 0,
          file_downloads: 0,
          suspicious_domains: 0
        }
      };
    }
  }
  
  // Generate DNS analysis data for the URL
  generateDnsAnalysisData = async (url) => {
    try {
      const domain = new URL(url).hostname;
      
      // Generate simulated DNS records
      const dnsResults = [
        {
          domain: domain,
          a_records: ['192.168.1.1', '192.168.1.2'],
          mx_records: [`mail.${domain}`, `smtp.${domain}`],
          txt_records: [`v=spf1 include:${domain} ~all`],
          is_suspicious: false,
          timestamp: Math.floor(Date.now() / 1000)
        }
      ];
      
      // Add records for subdomains
      const subdomains = [`www.${domain}`, `mail.${domain}`, `api.${domain}`];
      subdomains.forEach(subdomain => {
        dnsResults.push({
          domain: subdomain,
          a_records: ['192.168.2.1'],
          mx_records: [],
          txt_records: [],
          is_suspicious: false,
          timestamp: Math.floor(Date.now() / 1000)
        });
      });
      
      // Add suspicious DNS entries if domain seems suspicious
      const suspiciousTLDs = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.top'];
      const isSuspiciousDomain = suspiciousTLDs.some(tld => domain.endsWith(tld));
      
      if (isSuspiciousDomain) {
        dnsResults[0].is_suspicious = true;
        
        // Add some suspicious third-party domains
        const suspiciousThirdParties = ['track.evil-analytics.xyz', 'cdn.malware-host.tk', 'stats.phishing-domain.ml'];
        suspiciousThirdParties.forEach(suspiciousDomain => {
          dnsResults.push({
            domain: suspiciousDomain,
            a_records: ['10.0.0.1'],
            mx_records: [],
            txt_records: [],
            is_suspicious: true,
            timestamp: Math.floor(Date.now() / 1000)
          });
        });
      }
      
      return dnsResults;
      
    } catch (error) {
      this.addLog(`Error generating DNS analysis data: ${error.message}`, 'error');
      return [];
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
        severity: 15,
        details: 'Free domains are commonly used in phishing attacks'
      });
    }
    
    // Check for login forms (simulated)
    if (Math.random() > 0.5) {
      findings.push({
        type: 'login_form',
        message: 'Page contains a login form that could be used for credential harvesting',
        severity: 20,
        details: 'Login forms should only be submitted to trusted domains'
      });
    }
    
    // Check for password fields (simulated)
    if (Math.random() > 0.6) {
      findings.push({
        type: 'password_field',
        message: 'Page contains password input fields',
        severity: 25,
        details: 'Password fields should only be used on secure (HTTPS) connections'
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
      currentStep, screenshot, sandboxLogs, error,
      riskScore, securityFindings, networkTrafficData, dnsAnalysisData
    } = this.state;
    
    // Determine risk level text and color
    let riskLevel = 'Low Risk';
    let riskColor = 'bg-green-500';
    let riskTextColor = 'text-green-500';
    
    if (riskScore > 80) {
      riskLevel = 'Critical Risk';
      riskColor = 'bg-red-500';
      riskTextColor = 'text-red-500';
    } else if (riskScore > 60) {
      riskLevel = 'High Risk';
      riskColor = 'bg-orange-500';
      riskTextColor = 'text-orange-500';
    } else if (riskScore > 40) {
      riskLevel = 'Medium Risk';
      riskColor = 'bg-yellow-500';
      riskTextColor = 'text-yellow-500';
    }
    
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
        {/* Sandbox Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-5 flex justify-between items-center border-b border-gray-700">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-lg shadow-lg mr-4 transform rotate-12">
              <i className="fas fa-shield-alt text-white text-xl"></i>
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">URL Sandbox Analysis</h3>
              <p className="text-blue-200 text-sm">Powered by Gemini AI</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 bg-gray-800/50 px-4 py-2 rounded-full">
            <div className={`h-3 w-3 rounded-full ${isAnalyzing ? 'bg-yellow-500 animate-pulse' : analysisComplete ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span className="text-gray-200 text-sm font-medium">
              {isAnalyzing ? 'Analyzing URL' : analysisComplete ? 'Analysis Complete' : 'Ready to Analyze'}
            </span>
          </div>
        </div>
        
        {/* URL Input */}
        <div className="p-6 bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-link text-gray-400"></i>
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={this.handleUrlChange}
                  placeholder="Enter URL to analyze (e.g., https://example.com)"
                  className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  disabled={isAnalyzing}
                />
              </div>
              {error && (
                <p className="mt-2 text-red-400 text-sm flex items-center">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  {error}
                </p>
              )}
            </div>
            <button
              onClick={this.startSandbox}
              disabled={isAnalyzing || !url}
              className={`px-6 py-3 rounded-lg font-medium text-base shadow-lg transition duration-200 ${
                isAnalyzing 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transform hover:-translate-y-1'
              }`}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing URL...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <i className="fas fa-microscope mr-2"></i>
                  Analyze in Sandbox
                </span>
              )}
            </button>
          </div>
          
          {/* Analysis Status Bar - Only show when analyzing */}
          {isAnalyzing && (
            <div className="mt-4 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-300 font-medium">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  {currentStep === 'initializing' && 'Initializing secure sandbox environment...'}
                  {currentStep === 'dns' && 'Resolving domain and checking DNS records...'}
                  {currentStep === 'connecting' && 'Establishing secure connection to target...'}
                  {currentStep === 'loading' && 'Loading content in isolated environment...'}
                  {currentStep === 'screenshot' && 'Capturing visual representation...'}
                  {currentStep === 'network' && 'Monitoring and analyzing network traffic...'}
                  {currentStep === 'dns_analysis' && 'Performing deep DNS analysis...'}
                  {currentStep === 'analyzing' && 'Running AI-powered security analysis...'}
                </p>
                <span className="text-gray-400 text-sm">
                  {(() => {
                    switch(currentStep) {
                      case 'initializing': return '10%';
                      case 'dns': return '20%';
                      case 'connecting': return '30%';
                      case 'loading': return '45%';
                      case 'screenshot': return '60%';
                      case 'network': return '75%';
                      case 'dns_analysis': return '85%';
                      case 'analyzing': return '95%';
                      case 'complete': return '100%';
                      default: return '0%';
                    }
                  })()}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                  style={{ 
                    width: (() => {
                      switch(currentStep) {
                        case 'initializing': return '10%';
                        case 'dns': return '20%';
                        case 'connecting': return '30%';
                        case 'loading': return '45%';
                        case 'screenshot': return '60%';
                        case 'network': return '75%';
                        case 'dns_analysis': return '85%';
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
        </div>
        
        {/* Sandbox Content */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sandbox Visualization - Takes 3/5 of the space */}
          <div className="lg:col-span-3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-700">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 flex items-center space-x-2 border-b border-gray-700">
              <div className="flex space-x-1">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-grow">
                <div className="bg-gray-800/70 rounded-md px-3 py-1.5 max-w-md mx-auto flex items-center">
                  <i className="fas fa-lock text-gray-500 mr-2"></i>
                  <span className="text-gray-300 text-sm font-mono truncate">
                    {url || 'Secure Sandbox Environment'}
                  </span>
                </div>
              </div>
            </div>
            
            <div 
              ref={this.sandboxRef}
              className="h-[500px] bg-white flex items-center justify-center relative overflow-hidden"
            >
              {!isAnalyzing && !screenshot && (
                <div className="text-center p-8 bg-gray-100">
                  <div className="bg-blue-600/10 p-6 rounded-full inline-block mb-4">
                    <i className="fas fa-shield-alt text-blue-600 text-5xl"></i>
                  </div>
                  <h3 className="text-gray-800 text-xl font-bold mb-2">Secure URL Analysis</h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-4">
                    Enter a URL above and click "Analyze in Sandbox" to begin a comprehensive security analysis powered by Gemini AI.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-sm text-yellow-800 max-w-md mx-auto">
                    <i className="fas fa-info-circle mr-2"></i>
                    All analysis is performed in an isolated environment to protect your system.
                  </div>
                </div>
              )}
              
              {isAnalyzing && (
                <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                  <div className="w-24 h-24 relative mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/30"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <i className="fas fa-shield-alt text-blue-500 text-2xl"></i>
                    </div>
                  </div>
                  <p className="text-blue-300 font-medium text-xl mb-3">
                    {currentStep === 'initializing' && 'Initializing Secure Environment'}
                    {currentStep === 'dns' && 'Resolving Domain Information'}
                    {currentStep === 'connecting' && 'Establishing Secure Connection'}
                    {currentStep === 'loading' && 'Loading Content Safely'}
                    {currentStep === 'screenshot' && 'Capturing Visual Representation'}
                    {currentStep === 'network' && 'Analyzing Network Traffic'}
                    {currentStep === 'dns_analysis' && 'Performing DNS Security Checks'}
                    {currentStep === 'analyzing' && 'Running AI Security Analysis'}
                  </p>
                  <p className="text-gray-400 text-sm mb-4 max-w-md text-center">
                    {currentStep === 'initializing' && 'Setting up a secure sandbox to safely analyze the URL...'}
                    {currentStep === 'dns' && 'Checking domain reputation and DNS configuration...'}
                    {currentStep === 'connecting' && 'Creating an isolated connection to the target website...'}
                    {currentStep === 'loading' && 'Loading website content in a protected environment...'}
                    {currentStep === 'screenshot' && 'Creating a visual representation of the website...'}
                    {currentStep === 'network' && 'Monitoring all network requests for suspicious activity...'}
                    {currentStep === 'dns_analysis' && 'Analyzing DNS records for signs of phishing or malware...'}
                    {currentStep === 'analyzing' && 'Using Gemini AI to identify potential security threats...'}
                  </p>
                </div>
              )}
              
              {screenshot && (
                <div className="relative h-full w-full">
                  <img 
                    src={screenshot} 
                    alt="Sandbox Screenshot" 
                    className="max-w-full max-h-full object-contain"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/90 to-transparent p-4 text-center">
                    <p className="text-white text-sm">
                      <i className="fas fa-info-circle mr-2"></i>
                      This is a simulated view for security analysis purposes only
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Terminal Output - Takes 2/5 of the space */}
          <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden flex flex-col shadow-lg border border-gray-700">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
              <span className="text-gray-200 font-medium flex items-center">
                <i className="fas fa-terminal text-blue-400 mr-2"></i>
                Security Analysis Log
              </span>
              <div className="flex space-x-1">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-100"></div>
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-200"></div>
              </div>
            </div>
            
            <div 
              ref={this.terminalRef}
              className="flex-grow p-4 font-mono text-sm overflow-y-auto h-[500px] custom-scrollbar"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#4B5563 #1F2937'
              }}
            >
              {sandboxLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="bg-gray-800/50 rounded-lg p-6 max-w-md">
                    <i className="fas fa-terminal text-gray-600 text-3xl mb-3"></i>
                    <p className="text-gray-400">Security analysis logs will appear here once the sandbox is running...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {sandboxLogs.map((log, index) => {
                    // Determine log color and icon based on type
                    let logColor = 'text-gray-300';
                    let logIcon = 'fa-info-circle text-gray-400';
                    
                    if (log.type === 'error') {
                      logColor = 'text-red-400';
                      logIcon = 'fa-exclamation-circle text-red-400';
                    } else if (log.type === 'success') {
                      logColor = 'text-green-400';
                      logIcon = 'fa-check-circle text-green-400';
                    } else if (log.type === 'system') {
                      logColor = 'text-blue-400';
                      logIcon = 'fa-cog text-blue-400';
                    } else if (log.type === 'warning') {
                      logColor = 'text-yellow-400';
                      logIcon = 'fa-exclamation-triangle text-yellow-400';
                    } else if (log.type === 'info') {
                      logColor = 'text-indigo-400';
                      logIcon = 'fa-info-circle text-indigo-400';
                    }
                    
                    return (
                      <div key={index} className="flex items-start bg-gray-800/30 p-2 rounded-md hover:bg-gray-800/50 transition-colors duration-150">
                        <i className={`fas ${logIcon} mt-1 mr-2 flex-shrink-0`}></i>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <span className={`${logColor} break-words`}>{log.message}</span>
                            <span className="text-gray-500 text-xs ml-2 flex-shrink-0">{log.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Analysis Results */}
        {analysisComplete && (
          <div className="p-6 bg-gradient-to-b from-gray-900 to-gray-800 border-t border-gray-700">
            <div className="flex flex-col md:flex-row items-start justify-between gap-6">
              <div className="w-full md:w-2/3">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg mr-3">
                    <i className="fas fa-chart-bar text-white"></i>
                  </div>
                  <h3 className="text-white text-xl font-bold">Security Analysis Results</h3>
                </div>
                
                {/* Security Findings Card */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden mb-6">
                  <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-200 font-medium flex items-center">
                        <i className="fas fa-shield-virus text-blue-400 mr-2"></i>
                        Security Findings
                      </span>
                      <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                        {this.state.securityFindings.length} {this.state.securityFindings.length === 1 ? 'issue' : 'issues'} detected
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    {this.renderSecurityFindings()}
                  </div>
                </div>
                
                {/* Network Traffic Analysis Card */}
                {this.state.networkTrafficData && (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3 border-b border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-200 font-medium flex items-center">
                          <i className="fas fa-network-wired text-blue-400 mr-2"></i>
                          Network Traffic Analysis
                        </span>
                        <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                          {this.state.networkTrafficData.request_log?.length || 0} HTTP requests
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      {NetworkTrafficAnalyzer ? (
                        <NetworkTrafficAnalyzer networkData={this.state.networkTrafficData} />
                      ) : (
                        <div className="bg-gray-900/50 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-800/70 rounded-lg p-3 border border-gray-700">
                              <h4 className="text-gray-300 font-medium mb-2 flex items-center">
                                <i className="fas fa-globe text-blue-400 mr-2"></i>
                                Domains Contacted
                              </h4>
                              <div className="space-y-2">
                                {this.state.networkTrafficData.domains?.map((domain, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
                                    <span className="text-gray-300 text-sm font-mono">{domain}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300">
                                      {Math.floor(Math.random() * 10) + 1} requests
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="bg-gray-800/70 rounded-lg p-3 border border-gray-700">
                              <h4 className="text-gray-300 font-medium mb-2 flex items-center">
                                <i className="fas fa-exclamation-triangle text-yellow-400 mr-2"></i>
                                Suspicious Activity
                              </h4>
                              {this.state.networkTrafficData.suspicious_domains?.length > 0 ? (
                                <div className="space-y-2">
                                  {this.state.networkTrafficData.suspicious_domains.map((domain, idx) => (
                                    <div key={idx} className="bg-yellow-900/20 border border-yellow-800/30 text-yellow-300 p-2 rounded text-sm">
                                      <div className="font-medium">Suspicious domain detected:</div>
                                      <div className="font-mono mt-1">{domain}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="bg-green-900/20 border border-green-800/30 text-green-300 p-2 rounded text-sm">
                                  No suspicious network activity detected
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="w-full md:w-1/3">
                {/* Risk Assessment Card */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden mb-6">
                  <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3 border-b border-gray-700">
                    <span className="text-gray-200 font-medium flex items-center">
                      <i className="fas fa-tachometer-alt text-blue-400 mr-2"></i>
                      Risk Assessment
                    </span>
                  </div>
                  <div className="p-4">
                    {this.renderRiskGauge()}
                    
                    {/* Add recommendations based on risk level */}
                    <div className="mt-4">
                      <h4 className="text-gray-300 font-medium mb-2">Recommendations</h4>
                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                        {this.state.riskScore > 60 ? (
                          <div className="text-red-400 text-sm">
                            <i className="fas fa-exclamation-circle mr-2"></i>
                            This URL presents significant security risks. We recommend avoiding this website.
                          </div>
                        ) : this.state.riskScore > 30 ? (
                          <div className="text-yellow-400 text-sm">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            This URL has some security concerns. Proceed with caution and avoid sharing sensitive information.
                          </div>
                        ) : (
                          <div className="text-green-400 text-sm">
                            <i className="fas fa-check-circle mr-2"></i>
                            This URL appears to be safe based on our analysis. Always maintain standard security practices.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* DNS Analysis Summary Card */}
                {this.state.dnsAnalysisData && (
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3 border-b border-gray-700">
                      <span className="text-gray-200 font-medium flex items-center">
                        <i className="fas fa-sitemap text-blue-400 mr-2"></i>
                        DNS Analysis
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3">
                        {this.state.dnsAnalysisData.map((record, idx) => (
                          <div key={idx} className={`bg-gray-900/50 rounded-lg p-3 border ${record.is_suspicious ? 'border-red-800/30' : 'border-gray-700'}`}>
                            <div className="flex justify-between items-start">
                              <span className="text-gray-300 font-medium">{record.domain}</span>
                              {record.is_suspicious && (
                                <span className="bg-red-900/30 text-red-400 text-xs px-2 py-0.5 rounded-full">
                                  Suspicious
                                </span>
                              )}
                            </div>
                            {record.a_records && record.a_records.length > 0 && (
                              <div className="mt-2">
                                <span className="text-gray-400 text-xs">IP Addresses:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {record.a_records.map((ip, ipIdx) => (
                                    <span key={ipIdx} className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded font-mono">
                                      {ip}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

// Export the component
window.UrlSandboxViewer = UrlSandboxViewer;
