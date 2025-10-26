// PhishingScoreOverview.js
import React from 'react';

const PhishingScoreOverview = ({ totalScore }) => {
  // Determine risk level and color based on score
  const getRiskLevel = (score) => {
    if (score >= 80) return { level: 'Low Risk', color: 'bg-green-500' };
    if (score >= 60) return { level: 'Medium Risk', color: 'bg-yellow-500' };
    return { level: 'High Risk', color: 'bg-red-500' };
  };

  const { level, color } = getRiskLevel(totalScore);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Phishing Risk Overview</h2>
      
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-medium">
          Total Score: {totalScore}%
        </span>
        <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${
          color === 'bg-green-500' ? 'bg-green-500' : 
          color === 'bg-yellow-500' ? 'bg-yellow-500' : 'bg-red-500'
        }`}>
          {level}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
        <div 
          className={`${color} h-4 rounded-full transition-all duration-500 ease-in-out`} 
          style={{ width: `${totalScore}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>High Risk</span>
        <span>Medium Risk</span>
        <span>Low Risk</span>
      </div>
    </div>
  );
};

export default PhishingScoreOverview;
