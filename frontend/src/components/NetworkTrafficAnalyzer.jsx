import React, { useState } from 'react';

/**
 * NetworkTrafficAnalyzer component
 * Displays network traffic analysis data from email sandbox
 */
const NetworkTrafficAnalyzer = ({ networkData }) => {
  const [activeTab, setActiveTab] = useState('requests');
  
  // Handle empty data
  if (!networkData || Object.keys(networkData).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-lg font-semibold mb-2">Network Traffic Analysis</h3>
        <div className="text-gray-500 italic">No network data available</div>
      </div>
    );
  }

  // Extract data from the network analysis
  const { 
    request_log = [], 
    redirect_chain = [], 
    post_data = [], 
    file_downloads = [],
    timing_data = [],
    dns_results = [],
    suspicious_domains = [],
    stats = {}
  } = networkData;

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
  };

  // Render request log table
  const renderRequestsTab = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Initiator</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {request_log.length > 0 ? (
            request_log.map((req, index) => (
              <tr key={index} className={req.url.includes('https') ? 'bg-green-50' : 'bg-yellow-50'}>
                <td className="px-3 py-2 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={req.url}>
                  {req.url}
                </td>
                <td className="px-3 py-2 text-xs">
                  <span className={`px-2 py-1 rounded text-xs ${req.method === 'POST' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    {req.method}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">{formatTime(req.timestamp)}</td>
                <td className="px-3 py-2 text-xs">{req.initiator}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="px-3 py-2 text-center text-sm text-gray-500">No requests recorded</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // Render redirects tab
  const renderRedirectsTab = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {redirect_chain.length > 0 ? (
            redirect_chain.map((redirect, index) => (
              <tr key={index}>
                <td className="px-3 py-2 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={redirect.from}>
                  {redirect.from}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={redirect.to}>
                  {redirect.to}
                </td>
                <td className="px-3 py-2 text-xs">
                  <span className={`px-2 py-1 rounded text-xs ${redirect.status >= 300 && redirect.status < 400 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {redirect.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">{formatTime(redirect.timestamp)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="px-3 py-2 text-center text-sm text-gray-500">No redirects detected</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // Render DNS analysis tab
  const renderDnsTab = () => (
    <div>
      <div className="mb-4">
        <h4 className="text-md font-medium mb-2">Suspicious Domains</h4>
        {suspicious_domains.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suspicious_domains.map((domain, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded p-2 text-sm">
                {domain}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No suspicious domains detected</p>
        )}
      </div>

      <h4 className="text-md font-medium mb-2">DNS Records</h4>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">A Records</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MX Records</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dns_results.length > 0 ? (
              dns_results.map((dns, index) => (
                <tr key={index} className={dns.is_suspicious ? 'bg-red-50' : 'bg-white'}>
                  <td className="px-3 py-2 text-xs font-medium">{dns.domain}</td>
                  <td className="px-3 py-2 text-xs">
                    {dns.a_records.length > 0 ? 
                      dns.a_records.map((record, i) => <div key={i}>{record}</div>) : 
                      <span className="text-gray-400">None</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {dns.mx_records.length > 0 ? 
                      dns.mx_records.map((record, i) => <div key={i}>{record}</div>) : 
                      <span className="text-gray-400">None</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`px-2 py-1 rounded text-xs ${dns.is_suspicious ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {dns.is_suspicious ? 'Suspicious' : 'Clean'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-3 py-2 text-center text-sm text-gray-500">No DNS records analyzed</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render sensitive data tab
  const renderSensitiveDataTab = () => (
    <div>
      <h4 className="text-md font-medium mb-2">Form Submissions</h4>
      {post_data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sensitivity</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {post_data.map((data, index) => (
                <tr key={index} className={data.sensitive ? 'bg-red-50' : 'bg-white'}>
                  <td className="px-3 py-2 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={data.url}>
                    {data.url}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium">{data.field}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`px-2 py-1 rounded text-xs ${data.sensitive ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {data.sensitive ? 'Sensitive' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{formatTime(data.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No form submissions detected</p>
      )}

      <h4 className="text-md font-medium mt-4 mb-2">File Downloads</h4>
      {file_downloads.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {file_downloads.map((file, index) => (
                <tr key={index} className="bg-yellow-50">
                  <td className="px-3 py-2 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={file.url}>
                    {file.url}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium">{file.content_type}</td>
                  <td className="px-3 py-2 text-xs">{formatTime(file.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No file downloads detected</p>
      )}
    </div>
  );

  // Render stats summary
  const renderStatsSummary = () => {
    const threatLevel = suspicious_domains.length > 0 ? 'High' : 
                       (redirect_chain.length > 2 || post_data.length > 0) ? 'Medium' : 'Low';
    
    const threatColor = threatLevel === 'High' ? 'red' : 
                       threatLevel === 'Medium' ? 'orange' : 'green';
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 rounded p-3 border border-blue-100">
          <div className="text-xs text-blue-500 uppercase font-semibold">Requests</div>
          <div className="text-xl font-bold">{stats.total_requests || request_log.length}</div>
        </div>
        
        <div className="bg-yellow-50 rounded p-3 border border-yellow-100">
          <div className="text-xs text-yellow-500 uppercase font-semibold">Redirects</div>
          <div className="text-xl font-bold">{stats.total_redirects || redirect_chain.length}</div>
        </div>
        
        <div className="bg-purple-50 rounded p-3 border border-purple-100">
          <div className="text-xs text-purple-500 uppercase font-semibold">Suspicious Domains</div>
          <div className="text-xl font-bold">{stats.suspicious_domains || suspicious_domains.length}</div>
        </div>
        
        <div className={`bg-${threatColor}-50 rounded p-3 border border-${threatColor}-100`}>
          <div className={`text-xs text-${threatColor}-500 uppercase font-semibold`}>Threat Level</div>
          <div className="text-xl font-bold">{threatLevel}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-lg font-semibold mb-4">Network Traffic Analysis</h3>
      
      {renderStatsSummary()}
      
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-4">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 text-sm font-medium ${
              activeTab === 'requests'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            HTTP Requests
          </button>
          <button
            onClick={() => setActiveTab('redirects')}
            className={`py-2 px-1 text-sm font-medium ${
              activeTab === 'redirects'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Redirects
          </button>
          <button
            onClick={() => setActiveTab('dns')}
            className={`py-2 px-1 text-sm font-medium ${
              activeTab === 'dns'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            DNS Analysis
          </button>
          <button
            onClick={() => setActiveTab('sensitive')}
            className={`py-2 px-1 text-sm font-medium ${
              activeTab === 'sensitive'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sensitive Data
          </button>
        </nav>
      </div>
      
      <div className="mt-4">
        {activeTab === 'requests' && renderRequestsTab()}
        {activeTab === 'redirects' && renderRedirectsTab()}
        {activeTab === 'dns' && renderDnsTab()}
        {activeTab === 'sensitive' && renderSensitiveDataTab()}
      </div>
    </div>
  );
};

export default NetworkTrafficAnalyzer;
