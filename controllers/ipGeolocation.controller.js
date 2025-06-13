/**
 * IP Geolocation Controller
 * Handles IP address resolution, geolocation lookup, and data center detection
 */

const mongoose = require('mongoose');
const { URL } = require('url');
const dns = require('dns').promises;
const axios = require('axios');

// Data center CIDR mappings
const DATA_CENTER_MAPPINGS = {
  // AWS IP ranges (sample)
  '16509': {
    name: 'AWS',
    ranges: ['3.0.0.0/8', '13.32.0.0/12', '13.112.0.0/14', '18.32.0.0/11', '52.0.0.0/8', '54.0.0.0/8']
  },
  
  // Google Cloud
  '15169': {
    name: 'Google Cloud',
    ranges: ['34.64.0.0/10', '34.128.0.0/10', '35.184.0.0/13', '35.192.0.0/14', '35.196.0.0/15', '35.198.0.0/16']
  },
  
  // Microsoft Azure
  '8075': {
    name: 'Microsoft Azure',
    ranges: ['13.64.0.0/11', '20.33.0.0/16', '20.34.0.0/15', '20.36.0.0/14', '20.40.0.0/13']
  },
  
  // Cloudflare
  '13335': {
    name: 'Cloudflare',
    ranges: ['1.0.0.0/24', '1.1.1.0/24', '104.16.0.0/12', '162.158.0.0/15', '172.64.0.0/13']
  }
};

/**
 * Resolve domain to IP address
 * @param {Object} req - Express request object with domain in query
 * @param {Object} res - Express response object
 */
exports.resolveDomain = async (req, res) => {
  try {
    const { domain } = req.query;
    
    if (!domain) {
      return res.status(400).json({ success: false, message: 'Domain is required' });
    }
    
    // Extract domain from URL if full URL provided
    let cleanDomain = domain;
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      try {
        const url = new URL(domain);
        cleanDomain = url.hostname;
      } catch (error) {
        return res.status(400).json({ success: false, message: 'Invalid URL format' });
      }
    }
    
    // Resolve domain to IP addresses
    const ips = await dns.resolve4(cleanDomain);
    
    return res.status(200).json({
      success: true,
      domain: cleanDomain,
      ips: ips
    });
    
  } catch (error) {
    console.error('Error resolving domain:', error);
    return res.status(500).json({
      success: false,
      message: 'Error resolving domain',
      error: error.message
    });
  }
};

/**
 * Get geolocation data for an IP address
 * @param {Object} req - Express request object with ip in query
 * @param {Object} res - Express response object
 */
exports.getIpGeolocation = async (req, res) => {
  try {
    const { ip } = req.query;
    
    if (!ip) {
      return res.status(400).json({ success: false, message: 'IP address is required' });
    }
    
    // Query ipwho.is for geolocation data
    const response = await axios.get(`https://ipwho.is/${ip}`);
    
    const data = response.data;

    // Validate response
    if (!data || data.success === false) {
      return res.status(502).json({
        success: false,
        message: data?.message || 'Error fetching geolocation data',
        ip
      });
    }

    // Extract connection / ASN details
    const connection = data.connection || {};
    const asnNumber = connection.asn ? connection.asn.toString() : null;

    // Detect data center based on ASN
    let dataCenter = null;
    if (asnNumber && DATA_CENTER_MAPPINGS[asnNumber]) {
      dataCenter = DATA_CENTER_MAPPINGS[asnNumber].name;
    }

    // Format the response
    const geoData = {
      ip,
      asn: asnNumber ? `AS${asnNumber}` : null,
      isp: connection.isp || null,
      org: connection.org || null,
      location: {
        city: data.city || null,
        region: data.region || null,
        country: data.country || null,
        countryCode: data.country_code || null,
        lat: data.latitude || null,
        lon: data.longitude || null,
        timezone: (data.timezone && data.timezone.id) ? data.timezone.id : data.timezone || null
      },
      data_center: dataCenter ? `${dataCenter} - ${data.city || ''}` : null
    };
    
    return res.status(200).json({
      success: true,
      geolocation: geoData
    });
    
  } catch (error) {
    console.error('Error getting IP geolocation:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting IP geolocation',
      error: error.message
    });
  }
};

/**
 * Analyze a URL for IP geolocation and data center detection
 * @param {Object} req - Express request object with url in body
 * @param {Object} res - Express response object
 */
exports.analyzeUrl = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL is required' });
    }
    
    // Extract domain from URL
    let domain;
    try {
      const parsedUrl = new URL(url.startsWith('http') ? url : `http://${url}`);
      domain = parsedUrl.hostname;
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid URL format' });
    }
    
    // Resolve domain to IP addresses
    let ips;
    try {
      ips = await dns.resolve4(domain);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Could not resolve domain to IP address: ${error.message}`,
        domain: domain,
        url: url
      });
    }
    
    // Get geolocation data for each IP
    const geoResults = [];
    for (const ip of ips) {
      try {
        const response = await axios.get(`https://ipwho.is/${ip}`);

        if (response.data && response.data.success) {
          const data = response.data;
          const connection = data.connection || {};
          const asnNumber = connection.asn ? connection.asn.toString() : null;

          // Detect data center
          let dataCenter = null;
          if (asnNumber && DATA_CENTER_MAPPINGS[asnNumber]) {
            dataCenter = DATA_CENTER_MAPPINGS[asnNumber].name;
          }

          // Perform reverse DNS lookup
          let hostname = null;
          try {
            const hosts = await dns.reverse(ip);
            hostname = hosts[0];
          } catch (reverseErr) {
            console.log(`Reverse DNS lookup failed for ${ip}: ${reverseErr.message}`);
          }

          // Push formatted result
          geoResults.push({
            ip,
            asn: asnNumber ? `AS${asnNumber}` : null,
            isp: connection.isp || null,
            org: connection.org || null,
            hostname,
            location: {
              city: data.city || null,
              region: data.region || null,
              country: data.country || null,
              countryCode: data.country_code || null,
              lat: data.latitude || null,
              lon: data.longitude || null,
              timezone: (data.timezone && data.timezone.id) ? data.timezone.id : data.timezone || null
            },
            data_center: dataCenter ? `${dataCenter} - ${data.city || ''}` : null
          });
        } else {
          geoResults.push({ ip, error: response.data?.message || 'Lookup failed' });
        }
      } catch (error) {
        console.error(`Error getting geolocation for IP ${ip}:`, error);
        geoResults.push({
          ip: ip,
          error: error.message
        });
      }
    }
    
    // Store the analysis in database
    await mongoose.connection.collection('url_ip_analysis').insertOne({
      url: url,
      domain: domain,
      ips: ips,
      geolocation_data: geoResults,
      created_at: new Date(),
      user_id: req.user._id
    });
    
    // Return the results
    return res.status(200).json({
      success: true,
      url: url,
      domain: domain,
      ips: ips,
      geolocation_data: geoResults
    });
    
  } catch (error) {
    console.error('Error analyzing URL:', error);
    return res.status(500).json({
      success: false, 
      message: 'Error analyzing URL',
      error: error.message
    });
  }
};

/**
 * Get URL IP analysis history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAnalysisHistory = async (req, res) => {
  try {
    // Get analysis history from MongoDB
    const history = await mongoose.connection.collection('url_ip_analysis')
      .find({ user_id: req.user._id })
      .sort({ created_at: -1 })
      .limit(20)
      .toArray();
    
    return res.status(200).json({
      success: true,
      history: history
    });
    
  } catch (error) {
    console.error('Error getting analysis history:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting analysis history',
      error: error.message
    });
  }
};
