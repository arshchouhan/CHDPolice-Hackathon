/**
 * Email Header Analyzer
 * 
 * Utility functions to extract and analyze email headers for IP intelligence
 */

/**
 * Extract the original sender IP address from email headers
 * 
 * @param {string} headers - Raw email headers
 * @returns {string|null} - The original sender IP or null if not found
 */
function extractSenderIp(headers) {
  if (!headers) return null;
  
  // Split headers into lines
  const headerLines = headers.split('\n');
  
  // Find all "Received" headers (they appear in reverse chronological order)
  const receivedHeaders = headerLines
    .filter(line => line.toLowerCase().startsWith('received:'))
    .reverse(); // Reverse to get chronological order (oldest first)
  
  // The first Received header (now last after reversing) often contains the original IP
  if (receivedHeaders.length > 0) {
    // Look for IP address patterns in the first Received header
    const firstReceivedHeader = receivedHeaders[0];
    
    // Common patterns for IPs in Received headers
    const ipPatterns = [
      /from\s+\[?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]?/i,  // from [IP] or from IP
      /\((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\)/i,           // (IP)
      /\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/i            // [IP]
    ];
    
    // Try each pattern
    for (const pattern of ipPatterns) {
      const match = firstReceivedHeader.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
  }
  
  // If we couldn't find an IP in the first Received header, try all of them
  for (const header of receivedHeaders) {
    const ipMatch = header.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (ipMatch && ipMatch[1]) {
      return ipMatch[1];
    }
  }
  
  return null;
}

/**
 * Analyze the email header path to detect anomalies
 * 
 * @param {string} headers - Raw email headers
 * @returns {Object} - Analysis results
 */
function analyzeHeaderPath(headers) {
  if (!headers) return { suspicious: false, reasons: [] };
  
  const headerLines = headers.split('\n');
  const receivedHeaders = headerLines
    .filter(line => line.toLowerCase().startsWith('received:'))
    .reverse();
  
  const analysis = {
    suspicious: false,
    reasons: [],
    path: []
  };
  
  // Extract server names and IPs from each Received header
  receivedHeaders.forEach(header => {
    const fromMatch = header.match(/from\s+([^\s\(\)]+)/i);
    const byMatch = header.match(/by\s+([^\s\(\)]+)/i);
    const ipMatch = header.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    
    const hop = {
      from: fromMatch ? fromMatch[1] : null,
      by: byMatch ? byMatch[1] : null,
      ip: ipMatch ? ipMatch[1] : null
    };
    
    analysis.path.push(hop);
  });
  
  // Check for suspicious patterns
  
  // 1. Unusual number of hops
  if (receivedHeaders.length > 15) {
    analysis.suspicious = true;
    analysis.reasons.push('Unusually high number of mail server hops');
  }
  
  // 2. Known spam relay servers
  const knownSpamRelays = ['spam-relay', 'bulk-mail', 'mass-mailer'];
  const containsSpamRelay = analysis.path.some(hop => 
    hop.from && knownSpamRelays.some(relay => hop.from.includes(relay))
  );
  
  if (containsSpamRelay) {
    analysis.suspicious = true;
    analysis.reasons.push('Mail passed through known spam relay server');
  }
  
  // 3. Geographical inconsistencies
  // This would require IP geolocation lookup which we're not implementing here
  
  return analysis;
}

/**
 * Check if the Return-Path matches the From address
 * 
 * @param {string} headers - Raw email headers
 * @returns {Object} - Analysis results
 */
function checkReturnPathConsistency(headers) {
  if (!headers) return { consistent: true };
  
  const headerLines = headers.split('\n');
  
  // Extract From and Return-Path
  const fromLine = headerLines.find(line => line.toLowerCase().startsWith('from:'));
  const returnPathLine = headerLines.find(line => line.toLowerCase().startsWith('return-path:'));
  
  if (!fromLine || !returnPathLine) {
    return { consistent: true, reason: 'Could not find both From and Return-Path headers' };
  }
  
  // Extract email addresses
  const fromMatch = fromLine.match(/<([^>]+)>/);
  const returnPathMatch = returnPathLine.match(/<([^>]+)>/);
  
  if (!fromMatch || !returnPathMatch) {
    return { consistent: true, reason: 'Could not parse email addresses' };
  }
  
  const fromEmail = fromMatch[1].toLowerCase();
  const returnPathEmail = returnPathMatch[1].toLowerCase();
  
  // Compare domains at minimum
  const fromDomain = fromEmail.split('@')[1];
  const returnPathDomain = returnPathEmail.split('@')[1];
  
  if (fromDomain !== returnPathDomain) {
    return {
      consistent: false,
      reason: 'Return-Path domain does not match From domain',
      from: fromEmail,
      returnPath: returnPathEmail
    };
  }
  
  return { consistent: true };
}

module.exports = {
  extractSenderIp,
  analyzeHeaderPath,
  checkReturnPathConsistency
};
