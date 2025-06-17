import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, ShieldCheckIcon, ShieldExclamationIcon, DocumentIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const AttachmentAnalyzer = ({ attachmentData }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getRiskColor = (score) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 50) return 'text-orange-500';
    if (score >= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getRiskBadgeColor = (score) => {
    if (score >= 70) return 'bg-red-100 text-red-800';
    if (score >= 50) return 'bg-orange-100 text-orange-800';
    if (score >= 30) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const AnalysisSection = ({ title, icon: Icon, data, score }) => (
    <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center mb-2">
        <Icon className="h-5 w-5 mr-2" />
        <h3 className="text-lg font-semibold">{title}</h3>
        {score && (
          <span className={`ml-auto ${getRiskColor(score)} font-medium`}>
            Score: {score}%
          </span>
        )}
      </div>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="text-sm font-medium text-gray-600">
              {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </span>
            {Array.isArray(value) ? (
              <ul className="list-disc list-inside ml-4">
                {value.map((item, index) => (
                  <li key={index} className="text-sm text-gray-700">{item}</li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-gray-700">
                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center">
          <DocumentIcon className="h-6 w-6 mr-2 text-blue-500" />
          <span className="font-semibold text-lg">Attachment Analysis</span>
          {attachmentData.risk_score && (
            <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskBadgeColor(attachmentData.overall_score)}`}>
              {attachmentData.risk_score}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <AnalysisSection
            title="Malware Detection"
            icon={ShieldExclamationIcon}
            data={attachmentData.malware_detection}
            score={attachmentData.malware_score}
          />
          
          <AnalysisSection
            title="File Type Verification"
            icon={DocumentIcon}
            data={attachmentData.file_type_verification}
            score={attachmentData.file_type_score}
          />

          <AnalysisSection
            title="Risk Assessment"
            icon={ChartBarIcon}
            data={{
              risk_level: attachmentData.risk_score,
              indicators_of_compromise: attachmentData.ioc_summary,
              recommendation: attachmentData.recommendation
            }}
          />

          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <div className="flex items-center mb-2">
              <ShieldCheckIcon className="h-5 w-5 mr-2 text-blue-500" />
              <h3 className="text-lg font-semibold">Overall Assessment</h3>
            </div>
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${getRiskColor(attachmentData.overall_score)}`}
                  style={{ width: `${attachmentData.overall_score}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm">
                <span>Safe</span>
                <span>Suspicious</span>
                <span>Critical</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentAnalyzer;
