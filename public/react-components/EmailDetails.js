import React from 'react';
import AttachmentAnalyzer from './AttachmentAnalyzer';

const EmailDetails = ({ email }) => {
  // Sample attachment analysis data
  const sampleAttachmentData = {
    overall_score: 75,
    risk_score: "High",
    malware_score: 80,
    file_type_score: 70,
    malware_detection: {
      signature_match: "Trojan.Generic.23423",
      sandbox_behavior: [
        "Creates autorun registry key",
        "Connects to suspicious IP address",
        "Attempts to modify system files"
      ],
      hash_status: "Matches known malware (SHA256: abcd123...)",
      polymorphism_detected: true
    },
    file_type_verification: {
      extension_mismatch: true,
      actual_type: ".exe",
      reported_type: ".pdf",
      macro_detected: true,
      archive_contents: ["malware.exe", "readme.txt"]
    },
    ioc_summary: [
      "Suspicious file behavior detected",
      "Macro with obfuscated code found",
      "Hash matches previous ransomware variant",
      "Attempts to establish C2 connection"
    ],
    recommendation: "Quarantine immediately and report to security team"
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Email Analysis Results</h2>
      
      {/* Other email analysis components */}
      
      {/* Attachment Analysis Component */}
      <AttachmentAnalyzer attachmentData={sampleAttachmentData} />
      
      {/* Other components */}
    </div>
  );
};

export default EmailDetails;
