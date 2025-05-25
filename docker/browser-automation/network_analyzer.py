#!/usr/bin/env python3
"""
Network Traffic Analyzer for Email Phishing Detection
- Captures all HTTP/HTTPS requests made by browser
- Logs redirects and URL changes
- Monitors DNS lookups to detect suspicious domains
- Checks for data being sent via POST requests (form submissions)
- Detects file downloads and their types
- Records timing of network activities
- Uses Python requests and urllib for real network analysis
- Returns actual network intelligence data
"""

import os
import time
import json
import socket
import logging
import dns.resolver
import requests
import urllib.parse
from datetime import datetime
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

# Configure logging
logger = logging.getLogger("NetworkAnalyzer")

class NetworkAnalyzer:
    """Network traffic analyzer for monitoring browser requests and responses"""
    
    def __init__(self):
        """Initialize the network analyzer"""
        self.dns_cache = {}
        self.suspicious_tlds = [
            '.xyz', '.top', '.club', '.online', '.site', '.icu', '.vip', '.work',
            '.tk', '.ml', '.ga', '.cf', '.gq', '.buzz', '.fun', '.monster', '.rest'
        ]
        self.suspicious_domains = []
        self.request_log = []
        self.redirect_chain = []
        self.post_data = []
        self.file_downloads = []
        self.timing_data = []
        
        # Load known phishing domains if available
        self.known_phishing_domains = self._load_phishing_domains()
    
    def _load_phishing_domains(self):
        """Load known phishing domains from file or API"""
        try:
            # Try to load from local file first
            phishing_domains_file = os.path.join(os.path.dirname(__file__), 'phishing_domains.txt')
            if os.path.exists(phishing_domains_file):
                with open(phishing_domains_file, 'r') as f:
                    return [line.strip() for line in f if line.strip()]
            
            # If file doesn't exist, try to fetch from PhishTank or similar API
            # This is a placeholder - in a real implementation, you would use an API key
            # and fetch from a real threat intelligence feed
            return []
        except Exception as e:
            logger.error(f"Error loading phishing domains: {e}")
            return []
    
    def get_chrome_performance_logging_capabilities(self):
        """Configure Chrome capabilities for network logging"""
        capabilities = DesiredCapabilities.CHROME.copy()
        capabilities['goog:loggingPrefs'] = {
            'browser': 'ALL',
            'performance': 'ALL',
            'network': 'ALL'
        }
        return capabilities
    
    def analyze_network_logs(self, driver):
        """Analyze network logs from Chrome performance logs"""
        network_events = []
        
        try:
            # Get performance logs
            logs = driver.get_log('performance')
            
            # Process each log entry
            for log in logs:
                try:
                    log_data = json.loads(log['message'])['message']
                    
                    # Filter for Network events
                    if 'Network' in log_data.get('method', ''):
                        network_events.append(log_data)
                        
                        # Process specific network events
                        self._process_network_event(log_data)
                        
                except json.JSONDecodeError:
                    continue
                except Exception as e:
                    logger.error(f"Error processing log entry: {e}")
        
        except Exception as e:
            logger.error(f"Error getting performance logs: {e}")
        
        return network_events
    
    def _process_network_event(self, event):
        """Process a single network event from Chrome logs"""
        method = event.get('method', '')
        params = event.get('params', {})
        
        # Request will be sent
        if method == 'Network.requestWillBeSent':
            request = params.get('request', {})
            request_id = params.get('requestId')
            timestamp = params.get('timestamp', time.time())
            
            # Record request timing
            self.timing_data.append({
                'request_id': request_id,
                'url': request.get('url'),
                'start_time': timestamp,
                'type': 'request_start'
            })
            
            # Record request details
            request_data = {
                'request_id': request_id,
                'url': request.get('url'),
                'method': request.get('method'),
                'headers': request.get('headers', {}),
                'timestamp': timestamp,
                'initiator': params.get('initiator', {}).get('type', 'unknown')
            }
            
            # Check for POST data
            if request.get('method') == 'POST' and request.get('postData'):
                post_data = request.get('postData')
                request_data['post_data'] = post_data
                
                # Check for sensitive data in POST requests
                self._analyze_post_data(request.get('url'), post_data)
            
            self.request_log.append(request_data)
            
            # Check if this is a redirect
            if params.get('redirectResponse'):
                redirect_url = params.get('redirectResponse', {}).get('url')
                new_url = request.get('url')
                
                if redirect_url and new_url:
                    self.redirect_chain.append({
                        'from': redirect_url,
                        'to': new_url,
                        'status': params.get('redirectResponse', {}).get('status'),
                        'timestamp': timestamp
                    })
        
        # Response received
        elif method == 'Network.responseReceived':
            response = params.get('response', {})
            request_id = params.get('requestId')
            timestamp = params.get('timestamp', time.time())
            
            # Record response timing
            self.timing_data.append({
                'request_id': request_id,
                'url': response.get('url'),
                'end_time': timestamp,
                'type': 'response_received'
            })
            
            # Check for file downloads
            content_type = response.get('headers', {}).get('content-type', '')
            if self._is_downloadable_content(content_type):
                self.file_downloads.append({
                    'url': response.get('url'),
                    'content_type': content_type,
                    'timestamp': timestamp,
                    'request_id': request_id
                })
    
    def _analyze_post_data(self, url, post_data):
        """Analyze POST data for sensitive information"""
        # Check for common sensitive field names
        sensitive_fields = ['password', 'pass', 'pwd', 'credential', 'token', 'auth',
                           'credit', 'card', 'cvv', 'ccv', 'ssn', 'social', 'account']
        
        # Try to parse as form data or JSON
        try:
            # If it's JSON data
            if isinstance(post_data, str) and (post_data.startswith('{') or post_data.startswith('[')):
                try:
                    json_data = json.loads(post_data)
                    self._check_json_for_sensitive_data(url, json_data)
                except json.JSONDecodeError:
                    pass
            
            # If it's form data
            elif isinstance(post_data, str):
                # Try to parse as URL-encoded form data
                try:
                    form_data = urllib.parse.parse_qs(post_data)
                    
                    # Check for sensitive fields
                    for field in sensitive_fields:
                        for key in form_data.keys():
                            if field.lower() in key.lower():
                                self.post_data.append({
                                    'url': url,
                                    'field': key,
                                    'sensitive': True,
                                    'timestamp': time.time()
                                })
                except Exception:
                    pass
        except Exception as e:
            logger.error(f"Error analyzing POST data: {e}")
    
    def _check_json_for_sensitive_data(self, url, json_data, parent_key=''):
        """Recursively check JSON data for sensitive fields"""
        sensitive_fields = ['password', 'pass', 'pwd', 'credential', 'token', 'auth',
                           'credit', 'card', 'cvv', 'ccv', 'ssn', 'social', 'account']
        
        if isinstance(json_data, dict):
            for key, value in json_data.items():
                current_key = f"{parent_key}.{key}" if parent_key else key
                
                # Check if this key contains sensitive information
                for field in sensitive_fields:
                    if field.lower() in key.lower():
                        self.post_data.append({
                            'url': url,
                            'field': current_key,
                            'sensitive': True,
                            'timestamp': time.time()
                        })
                
                # Recursively check nested objects
                if isinstance(value, (dict, list)):
                    self._check_json_for_sensitive_data(url, value, current_key)
        
        elif isinstance(json_data, list):
            for i, item in enumerate(json_data):
                current_key = f"{parent_key}[{i}]" if parent_key else f"[{i}]"
                if isinstance(item, (dict, list)):
                    self._check_json_for_sensitive_data(url, item, current_key)
    
    def _is_downloadable_content(self, content_type):
        """Check if the content type indicates a downloadable file"""
        downloadable_types = [
            'application/octet-stream',
            'application/zip',
            'application/x-zip-compressed',
            'application/x-rar-compressed',
            'application/x-msdownload',
            'application/x-msdos-program',
            'application/x-msi',
            'application/x-dosexec',
            'application/pdf',
            'application/x-executable',
            'application/x-shockwave-flash',
            'application/java-archive'
        ]
        
        return any(dtype in content_type.lower() for dtype in downloadable_types)
    
    def perform_dns_lookups(self, urls):
        """Perform DNS lookups for a list of URLs"""
        domains = set()
        
        # Extract domains from URLs
        for url in urls:
            try:
                parsed_url = urllib.parse.urlparse(url)
                domain = parsed_url.netloc
                if domain:
                    domains.add(domain)
            except Exception as e:
                logger.error(f"Error parsing URL {url}: {e}")
        
        # Perform DNS lookups
        dns_results = []
        for domain in domains:
            try:
                # Check if we've already looked up this domain
                if domain in self.dns_cache:
                    dns_results.append(self.dns_cache[domain])
                    continue
                
                # Perform A record lookup
                a_records = []
                try:
                    answers = dns.resolver.resolve(domain, 'A')
                    for answer in answers:
                        a_records.append(str(answer))
                except Exception as e:
                    logger.debug(f"Error resolving A record for {domain}: {e}")
                
                # Perform MX record lookup
                mx_records = []
                try:
                    answers = dns.resolver.resolve(domain, 'MX')
                    for answer in answers:
                        mx_records.append(str(answer.exchange))
                except Exception as e:
                    logger.debug(f"Error resolving MX record for {domain}: {e}")
                
                # Perform TXT record lookup
                txt_records = []
                try:
                    answers = dns.resolver.resolve(domain, 'TXT')
                    for answer in answers:
                        txt_records.append(str(answer))
                except Exception as e:
                    logger.debug(f"Error resolving TXT record for {domain}: {e}")
                
                # Check if domain is suspicious
                is_suspicious = self._is_suspicious_domain(domain)
                
                # Create DNS result
                result = {
                    'domain': domain,
                    'a_records': a_records,
                    'mx_records': mx_records,
                    'txt_records': txt_records,
                    'is_suspicious': is_suspicious,
                    'timestamp': time.time()
                }
                
                # Cache the result
                self.dns_cache[domain] = result
                dns_results.append(result)
                
                # If suspicious, add to list
                if is_suspicious:
                    self.suspicious_domains.append(domain)
                
            except Exception as e:
                logger.error(f"Error performing DNS lookup for {domain}: {e}")
        
        return dns_results
    
    def _is_suspicious_domain(self, domain):
        """Check if a domain is suspicious based on various factors"""
        # Check against known phishing domains
        if domain in self.known_phishing_domains:
            return True
        
        # Check for suspicious TLDs
        for tld in self.suspicious_tlds:
            if domain.endswith(tld):
                return True
        
        # Check for domain age (would require WHOIS lookup)
        # This is a placeholder - in a real implementation, you would use a WHOIS API
        
        # Check for lookalike domains (would require a list of legitimate domains)
        # This is a placeholder - in a real implementation, you would compare against known good domains
        
        return False
    
    def get_network_analysis_results(self):
        """Get the complete network analysis results"""
        return {
            'request_log': self.request_log,
            'redirect_chain': self.redirect_chain,
            'post_data': self.post_data,
            'file_downloads': self.file_downloads,
            'timing_data': self.timing_data,
            'dns_results': list(self.dns_cache.values()),
            'suspicious_domains': self.suspicious_domains,
            'stats': {
                'total_requests': len(self.request_log),
                'total_redirects': len(self.redirect_chain),
                'sensitive_form_submissions': len(self.post_data),
                'file_downloads': len(self.file_downloads),
                'suspicious_domains': len(self.suspicious_domains)
            }
        }
    
    def reset(self):
        """Reset all analysis data"""
        self.request_log = []
        self.redirect_chain = []
        self.post_data = []
        self.file_downloads = []
        self.timing_data = []
        self.suspicious_domains = []
        # Keep the DNS cache as it can be reused
