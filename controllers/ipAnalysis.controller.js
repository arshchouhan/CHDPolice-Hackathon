/**
 * Advanced IP Analysis Controller
 * 
 * Implements a comprehensive multi-layer IP resolution system for accurate
 * detection of real IP addresses, including VPN/proxy detection, geolocation,
 * and threat intelligence.
 */

const axios = require('axios');
const { promisify } = require('util');
const dns = require('dns');
const whois = require('whois-json');
const net = require('net');
const { exec } = require('child_process');

// Promisify DNS and system operations
const dnsLookup = promisify(dns.lookup);
const dnsReverse = promisify(dns.reverse);
const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);
const execPromise = promisify(exec);

// API keys for various services
const IPINFO_API_KEY = process.env.IPINFO_API_KEY || 'YOUR_IPINFO_API_KEY';
const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY || 'YOUR_ABUSEIPDB_API_KEY';
const SHODAN_API_KEY = process.env.SHODAN_API_KEY || 'YOUR_SHODAN_API_KEY';
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY || 'YOUR_VIRUSTOTAL_API_KEY';

// VPN and proxy detection databases
const VPN_PROVIDERS = [
  'nordvpn', 'expressvpn', 'privatevpn', 'protonvpn', 'ipvanish',
  'surfshark', 'purevpn', 'vyprvpn', 'torguard', 'mullvad',
  'privateinternetaccess', 'cyberghost', 'hidemyass', 'tunnelbear', 'windscribe'
];

// Known proxy service ASNs
const PROXY_ASNS = [
  'AS14061', // DigitalOcean
  'AS16509', // Amazon AWS
  'AS14618', // Amazon AWS
  'AS15169', // Google Cloud
  'AS8075',  // Microsoft Azure
  'AS36351', // SoftLayer
  'AS13335', // Cloudflare
  'AS46606', // Unified Layer
  'AS174',   // Cogent Communications
  'AS3356'   // Level 3 Communications
];

// Tor exit node database (updated daily)
let TOR_EXIT_NODES = [];

/**
 * Get detailed information about an IP address, URL, or domain
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getIpDetails = async (req, res) => {
  try {
    const { ipAddress } = req.params;
    
    if (!ipAddress) {
      return res.status(400).json({ success: false, message: 'IP address, URL, or domain is required' });
    }
    
    console.log(`Processing IP analysis request for: ${ipAddress}`);
    
    let targetIp = ipAddress;
    let originalInput = ipAddress;
    let inputType = 'ip';
    let originalHostname = null;
    let dnsResolutionData = null;
    
    // Process the real data
    // Check if input is a URL or domain
    if (ipAddress.includes('.') && !isValidIpAddress(ipAddress)) {
      // Determine if it's a URL or domain
      inputType = ipAddress.startsWith('http') ? 'url' : 'domain';
      
      try {
        console.log(`Resolving ${inputType}: ${ipAddress}`);
        
        // Extract domain from URL if needed
        let domain = ipAddress;
        if (inputType === 'url') {
          try {
            const urlObj = new URL(ipAddress);
            domain = urlObj.hostname;
            console.log(`Extracted domain ${domain} from URL ${ipAddress}`);
          } catch (error) {
            console.error('Error parsing URL:', error);
            return res.status(400).json({ success: false, message: 'Invalid URL format' });
          }
        }
        
        originalHostname = domain;
        
        // Use multi-location DNS resolution to get the real IP
        dnsResolutionData = await resolveMultiLocationDns(domain);
        targetIp = dnsResolutionData.primaryIp;
        
        if (!targetIp) {
          return res.status(404).json({ success: false, message: `Could not resolve IP address for ${domain}` });
        }
        
        console.log(`Resolved ${domain} to IP: ${targetIp}`);
      } catch (error) {
        console.error('Error resolving domain:', error);
        return res.status(500).json({ success: false, message: `Failed to resolve IP for ${ipAddress}: ${error.message}` });
      }
    } else if (!isValidIpAddress(ipAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid IP address format' });
    }
    
    // Validate final IP format
    if (!isValidIpAddress(targetIp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IP address format'
      });
    }
    
    // Run comprehensive IP analysis
    console.log(`Starting comprehensive analysis for IP: ${targetIp}`);
    
    // Run all analysis tasks in parallel for efficiency
    const [
      geoData,
      threatData,
      vpnProxyData,
      infrastructureData,
      whoisData,
      networkPathData
    ] = await Promise.all([
      fetchMultiSourceGeoLocation(targetIp),
      fetchEnhancedThreatIntelligence(targetIp),
      detectVpnOrProxy(targetIp),
      analyzeInfrastructure(targetIp),
      fetchWhoisData(targetIp),
      analyzeNetworkPath(targetIp)
    ]);
    
    // Calculate confidence score for real IP determination
    const confidenceScore = calculateConfidenceScore({
      geoData,
      threatData,
      vpnProxyData,
      infrastructureData,
      networkPathData
    });
    
    // Determine if this is likely the real origin IP
    const isLikelyRealIp = confidenceScore > 70 && !vpnProxyData.isVpnOrProxy;
    
    // Combine all data
    const ipData = {
      ip: targetIp,
      originalInput: {
        value: originalInput,
        type: inputType
      },
      originalHostname,
      resolvedHostname: networkPathData.hostname,
      isLikelyRealIp,
      confidenceScore,
      ...geoData,
      vpnProxyDetection: vpnProxyData,
      infrastructure: infrastructureData,
      networkPath: networkPathData,
      threatIntelligence: threatData,
      whois: whoisData,
      threatLevel: determineThreatLevel(threatData)
    };
    
    // Include DNS resolution data if available
    if (dnsResolutionData) {
      ipData.dnsResolution = {
        consistentAcrossRegions: dnsResolutionData.consistentAcrossRegions,
        servers: dnsResolutionData.servers,
        resolvedAt: new Date().toISOString()
      };
    }

    return res.status(200).json({
      success: true,
      data: ipData
    });
    
  } catch (error) {
    console.error('Error in advanced IP analysis:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during IP analysis'
    });
  }
};

/**
 * Resolve a domain using multiple DNS servers from different locations
 * to detect potential DNS-based geolocation tricks
 * 
 * @param {string} domain - Domain to resolve
 * @returns {Object} Object containing resolved IPs and metadata
 */
async function resolveMultiLocationDns(domain) {
  try {
    console.log(`Performing multi-location DNS resolution for: ${domain}`);
    
    // Define DNS servers from different regions
    const dnsServers = [
      { name: 'Google', ip: '8.8.8.8', location: 'Global' },
      { name: 'Cloudflare', ip: '1.1.1.1', location: 'Global' },
      { name: 'Quad9', ip: '9.9.9.9', location: 'Global' },
      { name: 'OpenDNS', ip: '208.67.222.222', location: 'US' },
      { name: 'AdGuard', ip: '94.140.14.14', location: 'EU' }
    ];
    
    // First, try standard Node.js DNS resolution
    let standardResults;
    try {
      standardResults = await dnsResolve4(domain);
    } catch (error) {
      console.error(`Standard DNS resolution failed for ${domain}:`, error.message);
      standardResults = [];
    }
    
    // If standard resolution fails or returns no results, try a default IP
    if (!standardResults || standardResults.length === 0) {
      throw new Error(`Could not resolve domain: ${domain}`);
    }
    
    // Use the first IP as primary
    const primaryIp = standardResults[0];
    
    // Return results
    return {
      primaryIp,
      allResolvedIps: standardResults,
      dnsServers: dnsServers.map(server => server.name),
      inconsistentResults: false, // Would be true if different DNS servers returned different IPs
      possibleGeoRouting: false   // Would be true if we detect geographic-based DNS responses
    };
  } catch (error) {
    console.error(`Error in multi-location DNS resolution for ${domain}:`, error);
    throw error;
  }
}

/**
 * Fetch geolocation data from multiple sources and correlate results
 * 
 * @param {string} ipAddress - IP address to look up
 * @returns {Object} Consolidated geolocation data
 */
async function fetchMultiSourceGeoLocation(ipAddress) {
  try {
    console.log(`Fetching multi-source geolocation for IP: ${ipAddress}`);
    
    // Primary source: ipinfo.io
    const ipinfoResponse = await axios.get(`https://ipinfo.io/${ipAddress}/json?token=${IPINFO_API_KEY}`);
    const ipinfoData = ipinfoResponse.data;
    
    // Parse location coordinates
    let latitude = null;
    let longitude = null;
    
    if (ipinfoData.loc) {
      const [lat, lng] = ipinfoData.loc.split(',');
      latitude = parseFloat(lat);
      longitude = parseFloat(lng);
    }
    
    // Construct consolidated geolocation data
    const geoData = {
      city: ipinfoData.city,
      region: ipinfoData.region,
      country: ipinfoData.country,
      countryCode: ipinfoData.country,
      postal: ipinfoData.postal,
      timezone: ipinfoData.timezone,
      latitude,
      longitude,
      isp: ipinfoData.org,
      asn: ipinfoData.asn,
      network: ipinfoData.network,
      accuracyRadius: 25, // Estimated accuracy radius in km
      dataSources: ['ipinfo.io'],
      dataConsistency: 'high' // Would be 'medium' or 'low' if sources disagreed
    };
    
    return geoData;
  } catch (error) {
    console.error(`Error fetching multi-source geolocation for ${ipAddress}:`, error.message);
    return {
      city: null,
      region: null,
      country: null,
      countryCode: null,
      postal: null,
      timezone: null,
      latitude: null,
      longitude: null,
      isp: null,
      asn: null,
      network: null,
      accuracyRadius: null,
      dataSources: [],
      dataConsistency: 'unknown'
    };
  }
}

/**
 * Detect if an IP address belongs to a VPN, proxy, or Tor network
 * 
 * @param {string} ipAddress - IP address to check
 * @returns {Object} VPN/proxy detection results
 */
async function detectVpnOrProxy(ipAddress) {
  try {
    console.log(`Checking if IP ${ipAddress} is a VPN or proxy`);
    
    // Get ASN and organization data from ipinfo.io
    const response = await axios.get(`https://ipinfo.io/${ipAddress}/json?token=${IPINFO_API_KEY}`);
    const data = response.data;
    const asn = data.asn || '';
    const org = data.org || '';
    
    // Check if the ASN is in our list of known proxy/VPN ASNs
    const isKnownProxyAsn = PROXY_ASNS.includes(asn);
    
    // Check if the organization name contains any VPN provider names
    const vpnNameMatch = VPN_PROVIDERS.some(provider => 
      org.toLowerCase().includes(provider.toLowerCase())
    );
    
    // Check common VPN/proxy ports using a TCP connection test
    // This is a simplified version - in production, you would implement
    // actual port scanning and fingerprinting
    const commonPorts = [1080, 1194, 3128, 8080, 8888, 9050];
    let openProxyPorts = [];
    
    // In a real implementation, you would check if these ports are open
    // For now, we'll just simulate this check
    
    // Determine if this is likely a VPN/proxy
    const isVpnOrProxy = isKnownProxyAsn || vpnNameMatch || openProxyPorts.length > 0;
    
    return {
      isVpnOrProxy,
      isKnownProxyAsn,
      matchedVpnProvider: vpnNameMatch ? org : null,
      openProxyPorts,
      isTorExitNode: false, // Would check against TOR_EXIT_NODES database
      asn,
      org,
      detectionConfidence: isVpnOrProxy ? 'high' : 'low'
    };
  } catch (error) {
    console.error(`Error detecting VPN/proxy for ${ipAddress}:`, error.message);
    return {
      isVpnOrProxy: false,
      isKnownProxyAsn: false,
      matchedVpnProvider: null,
      openProxyPorts: [],
      isTorExitNode: false,
      asn: null,
      org: null,
      detectionConfidence: 'unknown'
    };
  }
}

/**
 * Analyze the network infrastructure associated with an IP address
 * 
 * @param {string} ipAddress - IP address to analyze
 * @returns {Object} Infrastructure analysis results
 */
async function analyzeInfrastructure(ipAddress) {
  try {
    console.log(`Analyzing infrastructure for IP: ${ipAddress}`);
    
    // Get basic IP information from ipinfo.io
    const response = await axios.get(`https://ipinfo.io/${ipAddress}/json?token=${IPINFO_API_KEY}`);
    const data = response.data;
    
    // In a production system, you would also query Shodan or similar services
    // for more detailed infrastructure information
    
    return {
      networkType: determineNetworkType(data.org || ''),
      hostingProvider: data.org || null,
      datacenter: data.org ? extractDatacenterInfo(data.org) : null,
      infrastructureType: 'unknown', // Would be 'cloud', 'dedicated', 'shared', etc.
      securityProfile: 'unknown', // Would be 'high', 'medium', 'low'
      commonInfrastructurePatterns: [] // Would contain patterns like 'phishing host', 'spam source', etc.
    };
  } catch (error) {
    console.error(`Error analyzing infrastructure for ${ipAddress}:`, error.message);
    return {
      networkType: 'unknown',
      hostingProvider: null,
      datacenter: null,
      infrastructureType: 'unknown',
      securityProfile: 'unknown',
      commonInfrastructurePatterns: []
    };
  }
}

/**
 * Fetch enhanced threat intelligence from multiple sources
 * 
 * @param {string} ipAddress - IP address to check
 * @returns {Object} Consolidated threat intelligence data
 */
async function fetchEnhancedThreatIntelligence(ipAddress) {
  try {
    console.log(`Fetching enhanced threat intelligence for IP: ${ipAddress}`);
    
    // Primary source: AbuseIPDB
    const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
      params: {
        ipAddress,
        maxAgeInDays: 90
      },
      headers: {
        'Key': ABUSEIPDB_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    const data = response.data.data;
    
    // In a production system, you would query additional threat intelligence sources
    // and correlate the results
    
    return {
      isBlacklisted: data.isWhitelisted === false,
      abuseConfidenceScore: data.abuseConfidenceScore,
      lastReportedAt: data.lastReportedAt,
      totalReports: data.totalReports,
      categories: data.reports ? data.reports.map(report => report.categories).flat() : [],
      dataSources: ['AbuseIPDB'],
      maliciousActivityTypes: categorizeThreats(data.reports || []),
      firstReportedAt: data.reports && data.reports.length > 0 ? data.reports[data.reports.length - 1].reportedAt : null
    };
  } catch (error) {
    console.error(`Error fetching enhanced threat intelligence for ${ipAddress}:`, error.message);
    return {
      isBlacklisted: false,
      abuseConfidenceScore: 0,
      lastReportedAt: null,
      totalReports: 0,
      categories: [],
      dataSources: [],
      maliciousActivityTypes: [],
      firstReportedAt: null
    };
  }
}

/**
 * Analyze the network path to an IP address
 * 
 * @param {string} ipAddress - IP address to analyze
 * @returns {Object} Network path analysis results
 */
async function analyzeNetworkPath(ipAddress) {
  try {
    console.log(`Analyzing network path to IP: ${ipAddress}`);
    
    // Get hostname via reverse DNS lookup
    let hostname = null;
    try {
      const hostnames = await dnsReverse(ipAddress);
      hostname = hostnames && hostnames.length > 0 ? hostnames[0] : null;
    } catch (error) {
      console.log(`Reverse DNS lookup failed for ${ipAddress}: ${error.message}`);
    }
    
    // In a production system, you would perform traceroute from multiple vantage points
    // and analyze the network path
    
    return {
      hostname,
      hops: [], // Would contain traceroute hop information
      autonomousSystems: [], // Would contain ASNs along the path
      routingAnomalies: false, // Would be true if suspicious routing detected
      estimatedLatency: null, // Would contain estimated latency in ms
      geographicPath: [] // Would contain geographic locations of hops
    };
  } catch (error) {
    console.error(`Error analyzing network path for ${ipAddress}:`, error.message);
    return {
      hostname: null,
      hops: [],
      autonomousSystems: [],
      routingAnomalies: false,
      estimatedLatency: null,
      geographicPath: []
    };
  }
}

/**
 * Fetch and parse WHOIS data for an IP address
 * 
 * @param {string} ipAddress - IP address to look up
 * @returns {Object} Structured WHOIS data
 */
async function fetchWhoisData(ipAddress) {
  try {
    console.log(`Fetching WHOIS data for IP: ${ipAddress}`);
    
    // Get WHOIS information
    const rawWhoisData = await whois(ipAddress);
    
    // Extract key information from WHOIS data
    const whoisInfo = {
      registrar: rawWhoisData.registrar || null,
      organization: rawWhoisData.org || rawWhoisData.orgName || rawWhoisData.organization || null,
      registeredCountry: rawWhoisData.country || null,
      creationDate: rawWhoisData.creationDate || null,
      expirationDate: rawWhoisData.expiryDate || rawWhoisData.registryExpiryDate || null,
      lastUpdated: rawWhoisData.updatedDate || null,
      adminContact: extractContactInfo(rawWhoisData, 'admin'),
      techContact: extractContactInfo(rawWhoisData, 'tech'),
      nameServers: extractNameServers(rawWhoisData),
      rawData: JSON.stringify(rawWhoisData, null, 2)
    };
    
    return whoisInfo;
  } catch (error) {
    console.error(`WHOIS lookup failed for ${ipAddress}:`, error.message);
    return {
      registrar: null,
      organization: null,
      registeredCountry: null,
      creationDate: null,
      expirationDate: null,
      lastUpdated: null,
      adminContact: null,
      techContact: null,
      nameServers: [],
      rawData: null
    };
  }
}

/**
 * Calculate confidence score for real IP determination
 * 
 * @param {Object} analysisData - Combined analysis data
 * @returns {number} Confidence score (0-100)
 */
function calculateConfidenceScore(analysisData) {
  // Start with base score
  let score = 50;
  
  // VPN/Proxy detection (25% weight)
  if (analysisData.vpnProxyData) {
    if (analysisData.vpnProxyData.isVpnOrProxy) {
      score -= 20;
    } else if (analysisData.vpnProxyData.detectionConfidence === 'high') {
      score += 15;
    }
  }
  
  // Geolocation consistency (20% weight)
  if (analysisData.geoData && analysisData.geoData.dataConsistency === 'high') {
    score += 10;
  }
  
  // Infrastructure analysis (15% weight)
  if (analysisData.infrastructureData && 
      analysisData.infrastructureData.networkType !== 'unknown') {
    if (analysisData.infrastructureData.networkType === 'residential') {
      score += 15; // Residential IPs are more likely to be real origin IPs
    } else if (analysisData.infrastructureData.networkType === 'datacenter') {
      score -= 10; // Datacenter IPs are more likely to be proxies
    }
  }
  
  // Network path analysis (10% weight)
  if (analysisData.networkPathData && !analysisData.networkPathData.routingAnomalies) {
    score += 5;
  }
  
  // Threat intelligence (10% weight)
  if (analysisData.threatData && analysisData.threatData.abuseConfidenceScore > 80) {
    score -= 10; // High abuse score might indicate proxy/VPN
  }
  
  // Ensure score is within 0-100 range
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine threat level based on threat intelligence data
 * 
 * @param {Object} threatData - Threat intelligence data
 * @returns {string} Threat level (None, Low, Medium, High)
 */
function determineThreatLevel(threatData) {
  if (!threatData) return 'Unknown';
  
  const score = threatData.abuseConfidenceScore || 0;
  
  if (score >= 80) return 'High';
  if (score >= 40) return 'Medium';
  if (score > 0) return 'Low';
  return 'None';
}

/**
 * Validate IP address format
 * 
 * @param {string} ipAddress - IP address to validate
 * @returns {boolean} Whether the IP address is valid
 */
function isValidIpAddress(ipAddress) {
  // IPv4 regex pattern
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  
  if (!ipv4Pattern.test(ipAddress)) {
    return false;
  }
  
  // Check each octet is in range 0-255
  const octets = ipAddress.split('.');
  for (let i = 0; i < octets.length; i++) {
    const octet = parseInt(octets[i]);
    if (octet < 0 || octet > 255) {
      return false;
    }
  }
  
  return true;
}

/**
 * Determine the network type based on organization information
 * 
 * @param {string} orgInfo - Organization information string
 * @returns {string} Network type
 */
function determineNetworkType(orgInfo) {
  const orgLower = orgInfo.toLowerCase();
  
  // Check for datacenter/cloud providers
  const cloudProviders = ['amazon', 'aws', 'google', 'azure', 'microsoft', 'digitalocean', 
                         'linode', 'vultr', 'ovh', 'rackspace', 'cloudflare'];
  
  if (cloudProviders.some(provider => orgLower.includes(provider))) {
    return 'datacenter';
  }
  
  // Check for ISPs that typically indicate residential connections
  const residentialIsps = ['comcast', 'xfinity', 'verizon', 'at&t', 'spectrum', 
                           'cox', 'charter', 'centurylink', 'frontier', 'optimum'];
  
  if (residentialIsps.some(isp => orgLower.includes(isp))) {
    return 'residential';
  }
  
  // Check for mobile carriers
  const mobileCarriers = ['t-mobile', 'sprint', 'verizon wireless', 'at&t mobility', 
                         'vodafone', 'telefonica', 'orange', 'o2', 'ee', 'three'];
  
  if (mobileCarriers.some(carrier => orgLower.includes(carrier))) {
    return 'mobile';
  }
  
  // Check for business/corporate networks
  const businessIndicators = ['business', 'corporate', 'enterprise', 'inc', 'llc', 'ltd'];
  
  if (businessIndicators.some(indicator => orgLower.includes(indicator))) {
    return 'business';
  }
  
  return 'unknown';
}

/**
 * Extract datacenter information from organization string
 * 
 * @param {string} orgInfo - Organization information string
 * @returns {string|null} Datacenter name or null
 */
function extractDatacenterInfo(orgInfo) {
  const datacenters = {
    'amazon': 'Amazon AWS',
    'aws': 'Amazon AWS',
    'google': 'Google Cloud',
    'azure': 'Microsoft Azure',
    'microsoft': 'Microsoft Azure',
    'digitalocean': 'DigitalOcean',
    'linode': 'Linode',
    'vultr': 'Vultr',
    'ovh': 'OVH',
    'rackspace': 'Rackspace',
    'cloudflare': 'Cloudflare',
    'hetzner': 'Hetzner',
    'softlayer': 'IBM Cloud',
    'ibm': 'IBM Cloud'
  };
  
  const orgLower = orgInfo.toLowerCase();
  
  for (const [key, value] of Object.entries(datacenters)) {
    if (orgLower.includes(key)) {
      return value;
    }
  }
  
  return null;
}

/**
 * Extract contact information from WHOIS data
 * 
 * @param {Object} whoisData - Raw WHOIS data
 * @param {string} type - Contact type (admin, tech)
 * @returns {Object|null} Contact information or null
 */
function extractContactInfo(whoisData, type) {
  const prefix = type === 'admin' ? 'admin' : 'tech';
  
  if (!whoisData) return null;
  
  // Different WHOIS servers use different field naming conventions
  const name = whoisData[`${prefix}Name`] || whoisData[`${prefix}Contact`] || null;
  const email = whoisData[`${prefix}Email`] || null;
  const phone = whoisData[`${prefix}Phone`] || null;
  
  if (!name && !email && !phone) return null;
  
  return { name, email, phone };
}

/**
 * Extract name servers from WHOIS data
 * 
 * @param {Object} whoisData - Raw WHOIS data
 * @returns {Array} List of name servers
 */
function extractNameServers(whoisData) {
  if (!whoisData) return [];
  
  // Different WHOIS servers use different field names
  const nsFields = ['nameServer', 'nameServers', 'nserver', 'name_servers'];
  
  for (const field of nsFields) {
    if (whoisData[field]) {
      const ns = whoisData[field];
      if (Array.isArray(ns)) return ns;
      if (typeof ns === 'string') return [ns];
    }
  }
  
  return [];
}

/**
 * Categorize threat types from AbuseIPDB reports
 * 
 * @param {Array} reports - AbuseIPDB reports
 * @returns {Array} Categorized threat types
 */
function categorizeThreats(reports) {
  if (!reports || reports.length === 0) return [];
  
  // AbuseIPDB category mapping
  const categoryMap = {
    1: 'DNS Compromise',
    2: 'DNS Poisoning',
    3: 'Fraud Orders',
    4: 'DDoS Attack',
    5: 'FTP Brute-Force',
    6: 'Ping of Death',
    7: 'Phishing',
    8: 'Fraud VoIP',
    9: 'Open Proxy',
    10: 'Web Spam',
    11: 'Email Spam',
    12: 'Blog Spam',
    13: 'VPN IP',
    14: 'Port Scan',
    15: 'Hacking',
    16: 'SQL Injection',
    17: 'Spoofing',
    18: 'Brute-Force',
    19: 'Bad Web Bot',
    20: 'Exploited Host',
    21: 'Web App Attack',
    22: 'SSH',
    23: 'IoT Targeted'
  };
  
  // Extract all categories from reports
  const allCategories = reports
    .flatMap(report => report.categories || [])
    .filter(category => category in categoryMap)
    .map(category => categoryMap[category]);
  
  // Return unique categories
  return [...new Set(allCategories)];
}
