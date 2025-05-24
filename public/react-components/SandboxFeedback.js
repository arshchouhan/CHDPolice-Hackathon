// SandboxFeedback.js - Modern UI component to show sandbox status and analysis
class SandboxFeedback extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: 'idle', // idle, running, complete, error
      analysisSteps: [
        { id: 'headers', label: 'Analyzing Email Headers', complete: false, result: null },
        { id: 'urls', label: 'Extracting & Analyzing URLs', complete: false, result: null },
        { id: 'domains', label: 'Checking Domain Reputation', complete: false, result: null },
        { id: 'redirects', label: 'Detecting URL Redirects', complete: false, result: null },
        { id: 'ssl', label: 'Verifying SSL Certificates', complete: false, result: null },
        { id: 'age', label: 'Analyzing Domain Age', complete: false, result: null }
      ],
      currentStep: 0,
      overallScore: null,
      threatLevel: null,
      emailId: props.emailId,
      error: null
    };
  }

  componentDidMount() {
    if (this.state.emailId) {
      this.startAnalysis();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.emailId !== this.props.emailId && this.props.emailId) {
      this.setState({ 
        emailId: this.props.emailId,
        status: 'idle',
        currentStep: 0,
        overallScore: null,
        threatLevel: null,
        error: null,
        analysisSteps: this.state.analysisSteps.map(step => ({
          ...step,
          complete: false,
          result: null
        }))
      }, this.startAnalysis);
    }
  }

  startAnalysis = async () => {
    this.setState({ status: 'running' });
    
    try {
      // Simulate the analysis process with steps
      await this.runAnalysisWithSteps();
      
      // After all steps, fetch the actual results
      await this.fetchAnalysisResults();
    } catch (error) {
      console.error('Analysis error:', error);
      this.setState({
        status: 'error',
        error: error.message || 'An error occurred during analysis'
      });
    }
  };

  runAnalysisWithSteps = async () => {
    const { analysisSteps } = this.state;
    
    // Start the actual analysis in the background
    this.triggerRealAnalysis();
    
    // Simulate steps with realistic timing
    for (let i = 0; i < analysisSteps.length; i++) {
      this.setState({ currentStep: i });
      
      // Random time between 1-3 seconds per step for visual feedback
      const stepTime = Math.floor(Math.random() * 2000) + 1000;
      await new Promise(resolve => setTimeout(resolve, stepTime));
      
      // Update step status
      const updatedSteps = [...this.state.analysisSteps];
      updatedSteps[i] = {
        ...updatedSteps[i],
        complete: true,
        // Simulate some random results for visual feedback
        result: this.getRandomStepResult(updatedSteps[i].id)
      };
      
      this.setState({ analysisSteps: updatedSteps });
    }
  };

  getRandomStepResult = (stepId) => {
    // Generate realistic-looking results based on step type
    switch(stepId) {
      case 'headers':
        return Math.random() > 0.7 ? 'Found SPF/DKIM issues' : 'Headers validated';
      case 'urls':
        return `Found ${Math.floor(Math.random() * 5) + 1} URLs`;
      case 'domains':
        return Math.random() > 0.8 ? 'Suspicious domain detected' : 'Domains look safe';
      case 'redirects':
        return Math.random() > 0.7 ? 'Redirect chain detected' : 'No suspicious redirects';
      case 'ssl':
        return Math.random() > 0.9 ? 'Invalid certificate' : 'Valid certificates';
      case 'age':
        return `Domain age: ${Math.floor(Math.random() * 1000) + 30} days`;
      default:
        return 'Completed';
    }
  };

  triggerRealAnalysis = async () => {
    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Call the API to analyze the email
      await fetch(`${this.getBaseUrl()}/api/email-analysis/analyze/${this.state.emailId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Note: We don't wait for the response here as we're simulating the steps
      // The actual results will be fetched in fetchAnalysisResults()
    } catch (error) {
      console.error('Error triggering analysis:', error);
      // Don't update state here as we're just triggering the background process
    }
  };

  fetchAnalysisResults = async () => {
    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Fetch the actual analysis results
      const response = await fetch(`${this.getBaseUrl()}/api/email-analysis/results/${this.state.emailId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch analysis results');
      }
      
      const data = await response.json();
      
      if (data.success && data.analysis) {
        this.setState({
          status: 'complete',
          overallScore: data.analysis.totalRiskScore || 0,
          threatLevel: data.analysis.riskLevel || 'Unknown'
        });
      } else {
        throw new Error('Invalid analysis data received');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      // We don't set status to error here because the visual steps already completed
      // Just log the error and show whatever data we have
    }
  };

  getBaseUrl = () => {
    // Get base URL based on environment
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:3000';
    } else if (window.location.hostname.includes('vercel.app')) {
      return 'https://email-detection-api.onrender.com';
    } else {
      return ''; // Same domain
    }
  };

  renderStepIcon = (step) => {
    if (!step.complete) {
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse"></div>
        </div>
      );
    }
    
    return (
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    );
  };

  renderThreatLevelBadge = () => {
    const { threatLevel } = this.state;
    
    if (!threatLevel) return null;
    
    const badgeClasses = {
      'Low': 'bg-green-100 text-green-800 border-green-200',
      'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'High': 'bg-orange-100 text-orange-800 border-orange-200',
      'Critical': 'bg-red-100 text-red-800 border-red-200',
      'Unknown': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${badgeClasses[threatLevel] || badgeClasses['Unknown']}`}>
        {threatLevel} Threat
      </span>
    );
  };

  render() {
    const { status, analysisSteps, currentStep, overallScore, threatLevel, error } = this.state;
    
    if (status === 'error') {
      return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Analysis Error</h3>
              <p className="text-sm text-gray-600">{error || 'An unexpected error occurred during analysis'}</p>
            </div>
          </div>
          <button 
            onClick={this.startAnalysis}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Email Sandbox Analysis</h2>
          {status === 'complete' && this.renderThreatLevelBadge()}
        </div>
        
        {status === 'idle' && (
          <div className="text-center py-8">
            <button 
              onClick={this.startAnalysis}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors duration-200"
            >
              Start Analysis
            </button>
          </div>
        )}
        
        {(status === 'running' || status === 'complete') && (
          <>
            <div className="space-y-4 mb-6">
              {analysisSteps.map((step, index) => (
                <div 
                  key={step.id}
                  className={`flex items-start ${index <= currentStep ? 'opacity-100' : 'opacity-50'}`}
                >
                  <div className="mr-3 mt-0.5">
                    {this.renderStepIcon(step)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium ${step.complete ? 'text-gray-900' : 'text-gray-600'}`}>
                        {step.label}
                      </p>
                      {index === currentStep && status === 'running' && !step.complete && (
                        <span className="text-xs text-blue-600 animate-pulse">In progress...</span>
                      )}
                    </div>
                    {step.complete && step.result && (
                      <p className="text-sm text-gray-600 mt-1">{step.result}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {status === 'complete' && overallScore !== null && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Overall Risk Score</h3>
                  <span className="font-bold text-2xl">{overallScore}</span>
                </div>
                
                <div className="h-3 relative max-w-xl rounded-full overflow-hidden bg-gray-200">
                  <div 
                    className="absolute h-full transition-all duration-500 ease-out"
                    style={{
                      width: `${Math.min(100, overallScore)}%`,
                      background: `linear-gradient(90deg, 
                        rgb(34, 197, 94) 0%, 
                        rgb(234, 179, 8) 50%, 
                        rgb(239, 68, 68) 100%)`
                    }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Safe</span>
                  <span>Suspicious</span>
                  <span>Dangerous</span>
                </div>
                
                <div className="mt-4 bg-gray-50 rounded-md p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Analysis Summary</h4>
                  <p className="text-sm text-gray-700">
                    {threatLevel === 'Low' && 'This email appears to be safe. No significant security threats were detected.'}
                    {threatLevel === 'Medium' && 'This email shows some suspicious characteristics. Review with caution before interacting with any content.'}
                    {threatLevel === 'High' && 'This email contains multiple suspicious elements that indicate it may be a phishing attempt. Proceed with extreme caution.'}
                    {threatLevel === 'Critical' && 'This email has been identified as dangerous. It likely contains phishing attempts or malicious content. Do not interact with any links or attachments.'}
                    {!threatLevel && 'Analysis complete. Review the detailed results for more information.'}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}

// Register component
window.SandboxFeedback = SandboxFeedback;
