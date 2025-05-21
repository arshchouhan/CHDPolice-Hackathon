// Test script for phishing detection
const fs = require('fs');
const path = require('path');

// Define the analyzeEmail function directly in this script
// This is a copy of the function from gmail.controller.js
function analyzeEmail(emailData) {
  // Initialize scores
  const scores = {
    header: 0,
    text: 0,
    metadata: 0,
    attachments: 0,
    total: 0
  };
  
  // Header analysis
  if (emailData.from.includes('noreply') || emailData.from.includes('no-reply')) {
    scores.header += 5;
  }
  
  if (emailData.from.includes('security') || emailData.from.includes('account')) {
    scores.header += 10;
  }
  
  // Text analysis
  const lowerBody = emailData.body.toLowerCase();
  
  // Check for urgent language
  if (lowerBody.includes('urgent') || lowerBody.includes('immediately')) {
    scores.text += 10;
  }
  
  // Check for financial terms
  if (lowerBody.includes('bank') || lowerBody.includes('account') || 
      lowerBody.includes('credit card') || lowerBody.includes('payment')) {
    scores.text += 15;
  }
  
  // Check for action requests
  if (lowerBody.includes('click here') || lowerBody.includes('login now') || 
      lowerBody.includes('verify your') || lowerBody.includes('update your')) {
    scores.text += 20;
  }
  
  // Metadata analysis
  if (emailData.subject.toLowerCase().includes('urgent') || 
      emailData.subject.toLowerCase().includes('alert') ||
      emailData.subject.toLowerCase().includes('verify')) {
    scores.metadata += 15;
  }
  
  // Attachment analysis
  emailData.attachments.forEach(attachment => {
    if (attachment.name.endsWith('.exe') || attachment.name.endsWith('.zip') || 
        attachment.name.endsWith('.bat') || attachment.name.endsWith('.js')) {
      scores.attachments += 25;
    }
  });
  
  // Calculate total score
  scores.total = scores.header + scores.text + scores.metadata + scores.attachments;
  
  return scores;
}

// Define the calculateRiskLevel function
function calculateRiskLevel(score) {
  if (score < 30) return 'Low';
  if (score < 50) return 'Medium';
  if (score < 80) return 'High';
  return 'Critical';
}

// Read the HTML content of the test phishing email
const htmlContent = fs.readFileSync(
  path.join(__dirname, 'test-phishing-email.html'), 
  'utf8'
);

// Create a mock email object similar to what would be extracted from Gmail
const testEmail = {
  from: "security@example-bank.com",
  to: "user@example.com",
  subject: "URGENT: Your Bank Account Security Alert",
  date: new Date(),
  body: htmlContent,
  rawHeaders: JSON.stringify({
    from: "security@example-bank.com",
    to: "user@example.com",
    subject: "URGENT: Your Bank Account Security Alert"
  }),
  attachments: [
    { name: "security.exe", contentType: "application/octet-stream", size: 1024 }
  ],
  urls: [
    { url: "http://fake-bank-verification.com/login" },
    { url: "http://fake-bank-verification.com/security.exe" }
  ]
};

// Analyze the email for phishing indicators
const scores = analyzeEmail(testEmail);

// Display the results
console.log('Phishing Analysis Results:');
console.log('-------------------------');
console.log('Header Score:', scores.header);
console.log('Text Score:', scores.text);
console.log('Metadata Score:', scores.metadata);
console.log('Attachments Score:', scores.attachments);
console.log('Total Score:', scores.total);
console.log('Risk Level:', calculateRiskLevel(scores.total));
