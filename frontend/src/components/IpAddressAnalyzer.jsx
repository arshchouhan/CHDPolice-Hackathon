/**
 * IP Address Analyzer Component
 * 
 * This component fetches and displays detailed information about IP addresses,
 * including geolocation data, ISP information, and threat intelligence.
 */

class IpAddressAnalyzer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ipData: null,
      isLoading: false,
      error: null,
      expandedDetails: false
    };
  }

  componentDidMount() {
    if (this.props.ipAddress) {
      this.fetchIpDetails(this.props.ipAddress);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.ipAddress !== prevProps.ipAddress && this.props.ipAddress) {
      this.fetchIpDetails(this.props.ipAddress);
    }
  }

  // Fetch IP details from API
  fetchIpDetails = async (ipAddress) => {
    this.setState({ isLoading: true, error: null });
    
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Use the global getBaseUrl function
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      
      const response = await fetch(`${baseUrl}/api/ip-analysis/details/${ipAddress}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        throw new Error('Your session has expired. Please log in again.');
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch IP details');
      }
      
      this.setState({
        ipData: data.data,
        isLoading: false
      });
      
    } catch (error) {
      console.error('Error fetching IP details:', error);
      
      // Handle authentication errors
      if (error.message.includes('Authentication required') || 
          error.message.includes('session has expired')) {
        window.location.href = '/login.html?error=session_expired';
        return;
      }
      
      this.setState({
        isLoading: false,
        error: error.message || 'An error occurred while fetching IP details'
      });
    }
  };

  // Toggle expanded details view
  toggleDetails = () => {
    this.setState(prevState => ({
      expandedDetails: !prevState.expandedDetails
    }));
  };

  // Determine threat level color
  getThreatLevelColor = (threatLevel) => {
    if (!threatLevel) return 'bg-gray-100 text-gray-800';
    
    switch (threatLevel.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-yellow-100 text-yellow-800';
      case 'none':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  render() {
    const { ipAddress } = this.props;
    const { ipData, isLoading, error, expandedDetails } = this.state;
    
    if (!ipAddress) {
      return (
        <div className="bg-gray-50 p-3 rounded-md text-center text-gray-500">
          No IP address provided for analysis
        </div>
      );
    }
    
    if (isLoading) {
      return (
        <div className="bg-white rounded-md shadow-sm p-4 mb-4">
          <div className="flex items-center justify-center">
            <i className="fas fa-spinner fa-spin mr-2 text-blue-500"></i>
            <span>Analyzing IP address {ipAddress}...</span>
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle text-red-500 mr-2"></i>
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      );
    }
    
    if (!ipData) {
      return (
        <div className="bg-white rounded-md shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">IP Address: {ipAddress}</h3>
              <p className="text-sm text-gray-500">No data available</p>
            </div>
            <button 
              onClick={() => this.fetchIpDetails(ipAddress)}
              className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-md shadow-sm p-4 mb-4">
        {/* IP Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium flex items-center">
            <i className="fas fa-network-wired mr-2 text-blue-500"></i>
            IP Address: {ipAddress}
            {ipData.threatLevel && (
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${this.getThreatLevelColor(ipData.threatLevel)}`}>
                {ipData.threatLevel}
              </span>
            )}
          </h3>
          <button 
            onClick={this.toggleDetails}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            {expandedDetails ? (
              <><i className="fas fa-chevron-up mr-1"></i> Less details</>
            ) : (
              <><i className="fas fa-chevron-down mr-1"></i> More details</>
            )}
          </button>
        </div>
        
        {/* Real IP Detection */}
        {ipData.isLikelyRealIp !== undefined && (
          <div className={`mb-3 p-2 rounded-md border ${ipData.isLikelyRealIp ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}>
            <div className="flex items-center">
              <i className={`fas ${ipData.isLikelyRealIp ? "fa-check-circle text-green-500" : "fa-exclamation-triangle text-yellow-500"} mr-2`}></i>
              <div>
                <p className="font-medium">
                  {ipData.isLikelyRealIp ? "Likely Real Origin IP" : "Possible Masked IP"}
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {ipData.confidenceScore}% confidence
                  </span>
                </p>
                {!ipData.isLikelyRealIp && ipData.vpnProxyDetection?.isVpnOrProxy && (
                  <p className="text-xs text-gray-600">
                    {ipData.vpnProxyDetection.matchedVpnProvider ? 
                      `Detected VPN: ${ipData.vpnProxyDetection.matchedVpnProvider}` : 
                      `Detected proxy or VPN service`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-sm text-gray-500">Location</p>
            <p className="font-medium">
              {ipData.city && ipData.country ? `${ipData.city}, ${ipData.country}` : 'Unknown'}
              {ipData.countryCode && (
                <span className="ml-1 text-xs bg-gray-100 px-1 rounded">{ipData.countryCode}</span>
              )}
              {ipData.accuracyRadius && (
                <span className="ml-1 text-xs text-gray-500">±{ipData.accuracyRadius}km</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ISP / Organization</p>
            <p className="font-medium">{ipData.isp || ipData.org || 'Unknown'}</p>
            {ipData.infrastructure?.networkType && ipData.infrastructure.networkType !== 'unknown' && (
              <span className="text-xs text-gray-500">{ipData.infrastructure.networkType} network</span>
            )}
          </div>
        </div>
        
        {/* Map Preview (if coordinates available) */}
        {ipData.latitude && ipData.longitude && (
          <div className="mb-3">
            <div className="h-40 bg-gray-100 rounded-md flex items-center justify-center relative overflow-hidden">
              <img 
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${ipData.latitude},${ipData.longitude}&zoom=10&size=600x200&key=YOUR_API_KEY`}
                alt="IP Location Map"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/600x200?text=Map+Preview+Unavailable";
                }}
              />
              <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded-md text-xs shadow-sm">
                {ipData.latitude}, {ipData.longitude}
              </div>
            </div>
          </div>
        )}
        
        {/* Expanded Details */}
        {expandedDetails && (
          <div className="mt-4 border-t pt-3">
            <div className="grid grid-cols-2 gap-4">
              {/* Network Details */}
              <div>
                <h4 className="text-sm font-medium mb-2">Network Details</h4>
                <ul className="text-sm space-y-1">
                  <li><span className="text-gray-500">ASN:</span> {ipData.asn || 'N/A'}</li>
                  <li><span className="text-gray-500">Network:</span> {ipData.network || 'N/A'}</li>
                  <li><span className="text-gray-500">Type:</span> {ipData.type || 'N/A'}</li>
                  <li><span className="text-gray-500">Hostname:</span> {ipData.hostname || 'N/A'}</li>
                  {ipData.infrastructure && (
                    <>
                      <li><span className="text-gray-500">Network Type:</span> {ipData.infrastructure.networkType || 'N/A'}</li>
                      {ipData.infrastructure.datacenter && (
                        <li><span className="text-gray-500">Datacenter:</span> {ipData.infrastructure.datacenter}</li>
                      )}
                      {ipData.infrastructure.hostingProvider && (
                        <li><span className="text-gray-500">Hosting Provider:</span> {ipData.infrastructure.hostingProvider}</li>
                      )}
                    </>
                  )}
                </ul>
              </div>
              
              {/* Threat Intelligence */}
              <div>
                <h4 className="text-sm font-medium mb-2">Threat Intelligence</h4>
                {ipData.threatData ? (
                  <ul className="text-sm space-y-1">
                    <li><span className="text-gray-500">Blacklisted:</span> {ipData.threatData.isBlacklisted ? 'Yes' : 'No'}</li>
                    <li><span className="text-gray-500">Abuse Confidence:</span> {ipData.threatData.abuseConfidenceScore || '0'}/100</li>
                    <li><span className="text-gray-500">Last Reported:</span> {ipData.threatData.lastReportedAt || 'Never'}</li>
                    <li><span className="text-gray-500">Categories:</span> {ipData.threatData.categories?.join(', ') || 'None'}</li>
                    {ipData.threatData.totalReports > 0 && (
                      <li><span className="text-gray-500">Total Reports:</span> {ipData.threatData.totalReports}</li>
                    )}
                    {ipData.threatData.lastReportedBy && (
                      <li><span className="text-gray-500">Last Reporter:</span> {ipData.threatData.lastReportedBy}</li>
                    )}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No threat data available</p>
                )}
              </div>
            </div>
            
            {/* VPN/Proxy Detection */}
            {ipData.vpnProxyDetection && (
              <div className="mt-4">
                <h4 className="text-sm text-gray-400 uppercase mb-2">VPN/Proxy Detection</h4>
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                  <div className="space-y-2">
                    {/* Detection Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className={`text-xs px-2 py-1 rounded-full border ${ipData.vpnProxyDetection.isVpnOrProxy ? 'bg-yellow-900 text-yellow-300 border-yellow-700' : 'bg-green-900 text-green-300 border-green-700'}`}>
                        {ipData.vpnProxyDetection.isVpnOrProxy ? 'VPN/Proxy Detected' : 'Clean'}
                      </span>
                    </div>
                    {/* Provider Info */}
                    {ipData.vpnProxyDetection.matchedVpnProvider && (
                      <div>
                        <span className="text-gray-400">Provider:</span>
                        <span className="ml-2 text-gray-300">{ipData.vpnProxyDetection.matchedVpnProvider}</span>
                      </div>
                    )}
                    {/* Risk Score */}
                    {ipData.vpnProxyDetection.riskScore !== undefined && (
                      <div>
                        <span className="text-gray-400">Risk Score:</span>
                        <span className="ml-2 text-blue-400">{ipData.vpnProxyDetection.riskScore}/100</span>
                      </div>
                    )}
                    {ipData.vpnProxyDetection.anonymityLevel && (
                      <div><span className="text-gray-500">Anonymity Level:</span> {ipData.vpnProxyDetection.anonymityLevel}</div>
                    )}
                    {ipData.vpnProxyDetection.riskScore !== undefined && (
                      <div>
                        <span className="text-gray-400">Detection Method:</span>
                        <span className="ml-2 text-gray-300">{ipData.vpnProxyDetection.detectionMethod}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Location Details */}
            <div className="mt-4">
              <h4 className="text-sm text-gray-400 uppercase mb-2">Location Details</h4>
              <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Region:</span>
                    <div className="text-gray-300">{ipData.region || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Postal Code:</span>
                    <div className="text-gray-300">{ipData.postal || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Timezone:</span>
                    <div className="text-gray-300">{ipData.timezone || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Whois Data (if available) */}
            {ipData.whois && (
              <div className="mt-4">
                <h4 className="text-sm text-gray-400 uppercase mb-2">WHOIS Information</h4>
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 text-xs font-mono overflow-x-auto max-h-40">
                  <pre className="text-gray-300">{ipData.whois}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

// Export the component
window.IpAddressAnalyzer = IpAddressAnalyzer;
