// EmailAnalysisDetails.js - Component to display detailed email analysis results
class EmailAnalysisDetails extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      error: null,
      analysis: null,
      emailId: props.emailId
    };
  }

  componentDidMount() {
    if (this.state.emailId) {
      this.fetchAnalysisResults();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.emailId !== this.props.emailId && this.props.emailId) {
      this.setState({ emailId: this.props.emailId }, this.fetchAnalysisResults);
    }
  }

  fetchAnalysisResults = async () => {
    try {
      this.setState({ loading: true, error: null });
      
      // Get JWT token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Fetch analysis results
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
      
      // If no analysis exists, trigger a new analysis
      if (response.status === 404) {
        return this.runEmailAnalysis();
      }
      
      this.setState({
        loading: false,
        analysis: data.analysis
      });
    } catch (error) {
      console.error('Error fetching analysis results:', error);
      this.setState({
        loading: false,
        error: error.message
      });
    }
  };

  runEmailAnalysis = async () => {
    try {
      this.setState({ loading: true, error: null });
      
      // Get JWT token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Run email analysis
      const response = await fetch(`${this.getBaseUrl()}/api/email-analysis/analyze/${this.state.emailId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze email');
      }
      
      const data = await response.json();
      
      this.setState({
        loading: false,
        analysis: data.analysis
      });
    } catch (error) {
      console.error('Error analyzing email:', error);
      this.setState({
        loading: false,
        error: error.message
      });
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

  renderHeaderAnalysis = () => {
    const { headerAnalysis } = this.state.analysis;
    if (!headerAnalysis) return null;

    return (
      <div className="analysis-section">
        <h3>Header Analysis</h3>
        <div className="header-details">
          <div className="detail-row">
            <span className="detail-label">From:</span>
            <span className="detail-value">{headerAnalysis.from}</span>
          </div>
          {headerAnalysis.replyTo && (
            <div className="detail-row">
              <span className="detail-label">Reply-To:</span>
              <span className="detail-value">{headerAnalysis.replyTo}</span>
            </div>
          )}
          {headerAnalysis.returnPath && (
            <div className="detail-row">
              <span className="detail-label">Return-Path:</span>
              <span className="detail-value">{headerAnalysis.returnPath}</span>
            </div>
          )}
          {headerAnalysis.messageId && (
            <div className="detail-row">
              <span className="detail-label">Message-ID:</span>
              <span className="detail-value">{headerAnalysis.messageId}</span>
            </div>
          )}
        </div>
        
        {headerAnalysis.anomalies && headerAnalysis.anomalies.length > 0 && (
          <div className="anomalies">
            <h4>Detected Anomalies</h4>
            <ul className="anomaly-list">
              {headerAnalysis.anomalies.map((anomaly, index) => (
                <li key={index} className={`anomaly-item severity-${anomaly.severity}`}>
                  <span className="anomaly-type">{anomaly.type}</span>: 
                  <span className="anomaly-description">{anomaly.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  renderUrlAnalysis = () => {
    const { urlAnalysis } = this.state.analysis;
    if (!urlAnalysis || urlAnalysis.length === 0) return null;

    return (
      <div className="analysis-section">
        <h3>URL Analysis</h3>
        <div className="url-list">
          {urlAnalysis.map((urlItem, index) => (
            <div key={index} className={`url-item risk-${urlItem.riskLevel.toLowerCase()}`}>
              <div className="url-header">
                <span className="url-domain">{urlItem.domain}</span>
                <span className={`url-risk-badge risk-${urlItem.riskLevel.toLowerCase()}`}>
                  {urlItem.riskLevel} Risk
                </span>
              </div>
              
              <div className="url-details">
                <div className="detail-row">
                  <span className="detail-label">URL:</span>
                  <span className="detail-value url-value">{urlItem.url}</span>
                </div>
                
                {urlItem.isUrlShortener && (
                  <div className="detail-row">
                    <span className="detail-label">Expanded URL:</span>
                    <span className="detail-value url-value">{urlItem.expandedUrl || 'N/A'}</span>
                  </div>
                )}
                
                {urlItem.redirectInfo && urlItem.redirectInfo.redirects && (
                  <div className="detail-row warning">
                    <span className="detail-label">Redirects:</span>
                    <span className="detail-value">
                      Redirects to {urlItem.redirectInfo.finalDomain}
                    </span>
                  </div>
                )}
                
                {urlItem.sslInfo && (
                  <div className="detail-row">
                    <span className="detail-label">SSL Certificate:</span>
                    <span className={`detail-value ${urlItem.sslInfo.valid ? 'valid' : 'invalid'}`}>
                      {urlItem.sslInfo.valid ? 'Valid' : 'Invalid'}
                      {urlItem.sslInfo.error ? ` (${urlItem.sslInfo.error})` : ''}
                    </span>
                  </div>
                )}
                
                {urlItem.domainAgeInfo && (
                  <div className="detail-row">
                    <span className="detail-label">Domain Age:</span>
                    <span className="detail-value">
                      {urlItem.domainAgeInfo.age !== null 
                        ? `${urlItem.domainAgeInfo.age} days` 
                        : 'Unknown'}
                    </span>
                  </div>
                )}
                
                {urlItem.reputationInfo && !urlItem.reputationInfo.error && (
                  <div className="detail-row">
                    <span className="detail-label">Reputation:</span>
                    <span className="detail-value">
                      {urlItem.reputationInfo.lastAnalysisStats 
                        ? `${urlItem.reputationInfo.lastAnalysisStats.malicious} malicious / ${urlItem.reputationInfo.lastAnalysisStats.suspicious} suspicious` 
                        : 'No data'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  renderOverallScore = () => {
    const { totalRiskScore, riskLevel } = this.state.analysis;
    if (totalRiskScore === undefined || riskLevel === undefined) return null;

    return (
      <div className="analysis-section overall-score">
        <h3>Overall Risk Assessment</h3>
        <div className={`score-display risk-${riskLevel.toLowerCase()}`}>
          <div className="score-number">{totalRiskScore}</div>
          <div className="risk-level">{riskLevel} Risk</div>
        </div>
        <div className="score-bar-container">
          <div 
            className="score-bar" 
            style={{ width: `${Math.min(totalRiskScore, 100)}%` }}
          ></div>
          <div className="score-markers">
            <span className="marker" style={{ left: '30%' }}>Low</span>
            <span className="marker" style={{ left: '50%' }}>Medium</span>
            <span className="marker" style={{ left: '70%' }}>High</span>
          </div>
        </div>
      </div>
    );
  };

  render() {
    const { loading, error, analysis } = this.state;

    if (loading) {
      return (
        <div className="analysis-container loading">
          <div className="spinner"></div>
          <p>Analyzing email...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="analysis-container error">
          <div className="error-icon">⚠️</div>
          <p>Error: {error}</p>
          <button className="retry-button" onClick={this.fetchAnalysisResults}>
            Retry
          </button>
        </div>
      );
    }

    if (!analysis) {
      return (
        <div className="analysis-container empty">
          <p>No analysis available for this email.</p>
          <button className="analyze-button" onClick={this.runEmailAnalysis}>
            Analyze Now
          </button>
        </div>
      );
    }

    return (
      <div className="analysis-container">
        <div className="analysis-header">
          <h2>Advanced Email Analysis</h2>
          <button className="refresh-button" onClick={this.runEmailAnalysis}>
            Refresh Analysis
          </button>
        </div>
        
        {this.renderOverallScore()}
        {this.renderHeaderAnalysis()}
        {this.renderUrlAnalysis()}
        
        <div className="analysis-footer">
          <p className="analysis-timestamp">
            Last analyzed: {new Date(analysis.analyzedAt).toLocaleString()}
          </p>
        </div>
      </div>
    );
  }
}

// Register component
window.EmailAnalysisDetails = EmailAnalysisDetails;
