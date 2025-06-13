#!/usr/bin/env python3
"""
IP Geolocation Module for Email Phishing Detection
- Resolves domain names to IP addresses using DNS
- Performs geolocation lookups for IP addresses
- Maps IPs and ASNs to known data center providers
- Integrates with existing NetworkAnalyzer and BrowserAutomation
"""

import os
import json
import socket
import logging
import requests
import ipaddress
from urllib.parse import urlparse
from dns.resolver import Resolver, NXDOMAIN, NoAnswer, Timeout

# Configure logging
logger = logging.getLogger("IPGeolocation")

# ipwho.is free endpoint - has usage limits, consider upgrading to pro version for production
IP_API_ENDPOINT = "https://ipwho.is/"

# BGP/ASN to Data Center mapping - based on common CIDR blocks
# This is a basic mapping - consider expanding this with more comprehensive data
DATACENTER_MAPPINGS = {
    # AWS IP ranges (sample ranges, not complete)
    "16509": {"name": "AWS", "ranges": ["3.0.0.0/8", "13.32.0.0/12", "13.112.0.0/14", "18.32.0.0/11", "52.0.0.0/8", "54.0.0.0/8"]},
    
    # Google Cloud
    "15169": {"name": "Google Cloud", "ranges": ["34.64.0.0/10", "34.128.0.0/10", "35.184.0.0/13", "35.192.0.0/14", "35.196.0.0/15", "35.198.0.0/16"]},
    
    # Microsoft Azure
    "8075": {"name": "Microsoft Azure", "ranges": ["13.64.0.0/11", "20.33.0.0/16", "20.34.0.0/15", "20.36.0.0/14", "20.40.0.0/13"]},
    
    # Cloudflare
    "13335": {"name": "Cloudflare", "ranges": ["1.0.0.0/24", "1.1.1.0/24", "104.16.0.0/12", "162.158.0.0/15", "172.64.0.0/13"]},
    
    # DigitalOcean
    "14061": {"name": "DigitalOcean", "ranges": ["45.55.0.0/16", "67.205.0.0/17", "104.131.0.0/16", "128.199.0.0/16", "138.68.0.0/16", "159.65.0.0/16"]},
    
    # Linode
    "63949": {"name": "Linode", "ranges": ["23.92.16.0/20", "72.14.176.0/20", "97.107.128.0/20", "139.162.0.0/16", "173.230.128.0/20", "178.79.128.0/18"]},
}

class IPGeolocation:
    """IP Geolocation class for resolving and analyzing IP addresses"""
    
    def __init__(self):
        """Initialize the IP Geolocation system"""
        self.resolver = Resolver()
        # Use Google's public DNS servers for more reliable resolution
        self.resolver.nameservers = ['8.8.8.8', '8.8.4.4']
        self.resolver.timeout = 2.0
        self.resolver.lifetime = 4.0
        self.ip_cache = {}  # Cache IP lookup results
        
        # Load custom API key if available
        self.api_key = os.getenv("IP_GEOLOCATION_API_KEY", "")
        
    def resolve_domain_to_ip(self, domain):
        """
        Resolve a domain name to IP addresses
        
        Args:
            domain (str): Domain name to resolve
            
        Returns:
            list: List of IP addresses
        """
        if not domain:
            return []
            
        # Strip protocol and path if a full URL was provided
        if domain.startswith(('http://', 'https://')):
            domain = urlparse(domain).netloc
            
        # Strip port if present
        if ':' in domain:
            domain = domain.split(':')[0]
            
        # Check if it's already an IP address
        try:
            ipaddress.ip_address(domain)
            return [domain]  # It's already an IP address
        except ValueError:
            pass  # Not an IP address, continue with resolution
            
        try:
            # Try to get A records first
            answers = self.resolver.resolve(domain, 'A')
            ips = [str(rdata) for rdata in answers]
            
            # If no results, try AAAA (IPv6)
            if not ips:
                try:
                    answers = self.resolver.resolve(domain, 'AAAA')
                    ips.extend([str(rdata) for rdata in answers])
                except (NXDOMAIN, NoAnswer, Timeout):
                    pass
                    
            return ips
            
        except (NXDOMAIN, NoAnswer, Timeout) as e:
            logger.warning(f"DNS resolution failed for {domain}: {e}")
            return []
        except Exception as e:
            logger.error(f"Error resolving domain {domain}: {e}")
            return []
            
    def get_ip_geolocation(self, ip):
        """
        Get geolocation data for an IP address
        
        Args:
            ip (str): IP address to look up
            
        Returns:
            dict: Geolocation data
        """
        # Check cache first
        if ip in self.ip_cache:
            return self.ip_cache[ip]
            
        try:
            # Perform API request
            url = f"{IP_API_ENDPOINT}{ip}"
            if self.api_key:
                url += f"?api_key={self.api_key}"
            
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                
                # ipwho.is returns success boolean
                if not data.get("success", False):
                    raise ValueError(data.get("message", "Lookup failed"))
                
                connection = data.get("connection", {})
                asn_num = str(connection.get("asn")) if connection.get("asn") is not None else ""
                isp = connection.get("isp")
                org = connection.get("org")
                
                # Extract relevant fields in our unified format
                geolocation = {
                    "ip": ip,
                    "asn": f"AS{asn_num}" if asn_num else None,
                    "isp": isp,
                    "org": org,
                    "location": {
                        "city": data.get("city"),
                        "region": data.get("region"),
                        "country": data.get("country"),
                        "countryCode": data.get("country_code"),
                        "lat": data.get("latitude"),
                        "lon": data.get("longitude"),
                        "timezone": (data.get("timezone") or {}).get("id") if isinstance(data.get("timezone"), dict) else data.get("timezone")
                    },
                    "data_center": self._detect_data_center(ip, f"AS{asn_num}" if asn_num else "")
                }
                
                # Cache the result
                self.ip_cache[ip] = geolocation
                return geolocation
                
        except Exception as e:
            logger.error(f"Error getting geolocation for IP {ip}: {e}")
            return {
                "ip": ip,
                "error": str(e),
                "asn": None,
                "isp": None,
                "org": None,
                "location": {},
                "data_center": None
            }
            
    def _detect_data_center(self, ip, asn_string):
        """
        Detect if an IP belongs to a known data center provider
        
        Args:
            ip (str): IP address
            asn_string (str): ASN string from geolocation API
            
        Returns:
            str: Detected data center provider and location, or None
        """
        try:
            # Extract ASN number from string (e.g. "AS13335 Cloudflare, Inc." -> "13335")
            asn = asn_string.split()[0].strip("AS") if asn_string else ""
            
            # Check if we have a mapping for this ASN
            if asn in DATACENTER_MAPPINGS:
                provider = DATACENTER_MAPPINGS[asn]["name"]
                
                # Check if IP is in any of the known ranges
                ip_obj = ipaddress.ip_address(ip)
                for cidr in DATACENTER_MAPPINGS[asn]["ranges"]:
                    if ip_obj in ipaddress.ip_network(cidr):
                        return f"{provider} - {cidr}"
                
                # If ASN matches but not CIDR, return provider only
                return provider
                
            # Try reverse DNS lookup for more hints
            try:
                hostname = socket.gethostbyaddr(ip)[0]
                
                # Look for common patterns in hostname
                datacenter_hints = {
                    "amazonaws.com": "AWS",
                    "compute.amazonaws.com": "AWS",
                    "googleusercontent.com": "Google Cloud",
                    "cloudfront.net": "AWS CloudFront",
                    "azurewebsites.net": "Azure",
                    "cloudflare.com": "Cloudflare",
                    "digitalocean": "DigitalOcean",
                    "linode": "Linode",
                    "vultr": "Vultr",
                    "hetzner": "Hetzner"
                }
                
                for pattern, provider in datacenter_hints.items():
                    if pattern in hostname:
                        # Try to extract region from hostname
                        if provider == "AWS":
                            # Parse AWS region codes like us-east-1, ap-south-1, etc.
                            region_patterns = ["us-east-", "us-west-", "eu-west-", "eu-central-", 
                                             "ap-south-", "ap-northeast-", "ap-southeast-", 
                                             "sa-east-", "ca-central-"]
                            for region in region_patterns:
                                if region in hostname:
                                    region_code = hostname.split(region)[1][0]
                                    return f"{provider} - {region}{region_code}"
                        return provider
            except:
                # Reverse DNS lookup failed, continue
                pass
                
        except Exception as e:
            logger.error(f"Error detecting data center for IP {ip}: {e}")
            
        return None
        
    def perform_reverse_dns(self, ip):
        """
        Perform reverse DNS lookup for an IP address
        
        Args:
            ip (str): IP address to look up
            
        Returns:
            str: Hostname or None if lookup fails
        """
        try:
            hostname = socket.gethostbyaddr(ip)[0]
            return hostname
        except (socket.herror, socket.gaierror):
            return None
        except Exception as e:
            logger.error(f"Error performing reverse DNS for IP {ip}: {e}")
            return None
            
    def analyze_url(self, url):
        """
        Analyze a URL for IP and geolocation data
        
        Args:
            url (str): URL to analyze
            
        Returns:
            dict: Analysis results
        """
        try:
            # Parse URL to get domain
            parsed_url = urlparse(url)
            domain = parsed_url.netloc
            
            if not domain:
                return {
                    "url": url,
                    "error": "Invalid URL format"
                }
                
            # Strip port if present
            if ':' in domain:
                domain = domain.split(':')[0]
                
            # Resolve domain to IP addresses
            ips = self.resolve_domain_to_ip(domain)
            
            if not ips:
                return {
                    "url": url,
                    "domain": domain,
                    "error": "Could not resolve domain to IP address"
                }
                
            # Get geolocation data for each IP
            geo_results = []
            for ip in ips:
                geo_data = self.get_ip_geolocation(ip)
                
                # Add reverse DNS lookup
                hostname = self.perform_reverse_dns(ip)
                if hostname:
                    geo_data["hostname"] = hostname
                    
                geo_results.append(geo_data)
                
            # Compile final result
            result = {
                "url": url,
                "domain": domain,
                "ips": ips,
                "geolocation_data": geo_results,
                "timestamp": os.times()
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing URL {url}: {e}")
            return {
                "url": url,
                "error": str(e)
            }

# For testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Test the IP Geolocation module
    geolocation = IPGeolocation()
    
    # Test URLs
    test_urls = [
        "https://www.cloudflare.com",
        "https://www.aws.amazon.com",
        "https://www.google.com"
    ]
    
    for url in test_urls:
        print(f"\nAnalyzing {url}:")
        result = geolocation.analyze_url(url)
        print(json.dumps(result, indent=2, default=str))
