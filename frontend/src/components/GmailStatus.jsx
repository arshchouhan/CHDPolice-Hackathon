import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faSync } from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import useGmailStatus from '../hooks/useGmailStatus';

const GmailStatus = ({ onStatusChange }) => {
  const {
    isConnected,
    gmailEmail,
    isLoading,
    error,
    checkGmailStatus,
    connectGmail,
    disconnectGmail
  } = useGmailStatus();

  const handleConnect = async () => {
    try {
      await connectGmail();
      if (onStatusChange) onStatusChange(true);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = async () => {
    const success = await disconnectGmail();
    if (success && onStatusChange) {
      onStatusChange(false);
    }
  };

  const handleRefresh = async () => {
    await checkGmailStatus();
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="animate-spin">
          <FontAwesomeIcon icon={faSync} />
        </div>
        <span>Checking Gmail status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">
        <p>Error: {error}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 text-sm text-blue-500 hover:text-blue-700"
        >
          <FontAwesomeIcon icon={faSync} className="mr-1" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <FontAwesomeIcon
          icon={isConnected ? faCheckCircle : faTimesCircle}
          className={isConnected ? 'text-green-500' : 'text-red-500'}
        />
        <span className="font-medium">
          {isConnected ? 'Connected to Gmail' : 'Not connected to Gmail'}
        </span>
        {isConnected && gmailEmail && (
          <span className="text-sm text-gray-500">({gmailEmail})</span>
        )}
      </div>
      
      <div className="flex space-x-2">
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors"
            disabled={isLoading}
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors flex items-center"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faGoogle} className="mr-2" />
            Connect Gmail
          </button>
        )}
        
        <button
          onClick={handleRefresh}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition-colors flex items-center"
          disabled={isLoading}
        >
          <FontAwesomeIcon icon={faSync} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  );
};

export default GmailStatus;
