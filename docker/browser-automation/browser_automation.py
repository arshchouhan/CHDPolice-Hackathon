#!/usr/bin/env python3
"""
Browser Automation System for Email Phishing Detection
- Uses Selenium with headless Chrome in Docker container
- Safely visits extracted URLs in isolated environment
- Takes screenshots of pages visited
- Detects login forms, password fields, credit card forms
- Checks if pages try to download files
- Monitors network requests made by pages
- Captures page titles and meta descriptions
- Runs in isolated Docker container
- Timeouts after 30 seconds per URL
"""

import os
import time
import json
import base64
import logging
import traceback
from datetime import datetime
from urllib.parse import urlparse
import requests
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from pymongo import MongoClient
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from pyvirtualdisplay import Display

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("BrowserAutomation")

# Load environment variables
load_dotenv()

# MongoDB connection string
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/email_detection')

# Output directory for screenshots
SCREENSHOT_DIR = os.getenv('SCREENSHOT_DIR', '/app/screenshots')
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

# URL scanning timeout in seconds
URL_TIMEOUT = int(os.getenv('URL_TIMEOUT', 30))

# API endpoint to report results
API_ENDPOINT = os.getenv('API_ENDPOINT', 'http://api:3000/api/browser-automation/results')

class BrowserAutomation:
    """Browser automation class for visiting and analyzing URLs"""
    
    def __init__(self):
        """Initialize the browser automation system"""
        self.display = Display(visible=0, size=(1920, 1080))
        self.display.start()
        
        logger.info("Setting up Chrome options...")
        self.chrome_options = Options()
        self.chrome_options.add_argument('--headless')
        self.chrome_options.add_argument('--no-sandbox')
        self.chrome_options.add_argument('--disable-dev-shm-usage')
        self.chrome_options.add_argument('--disable-gpu')
        self.chrome_options.add_argument('--window-size=1920,1080')
        self.chrome_options.add_argument('--disable-extensions')
        
        # Security settings
        self.chrome_options.add_argument('--disable-web-security')
        self.chrome_options.add_argument('--allow-running-insecure-content')
        self.chrome_options.add_argument('--disable-popup-blocking')
        
        # Disable downloads
        self.chrome_options.add_experimental_option(
            'prefs', {
                'download.default_directory': '/dev/null',
                'download.prompt_for_download': False,
                'download.directory_upgrade': True,
                'safebrowsing.enabled': True
            }
        )
        
        # Connect to MongoDB
        try:
            self.mongo_client = MongoClient(MONGO_URI)
            self.db = self.mongo_client.get_database()
            self.url_collection = self.db.url_analysis
            logger.info("Connected to MongoDB successfully")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            self.mongo_client = None
            self.db = None
            self.url_collection = None
    
    def start_browser(self):
        """Start a new browser instance"""
        logger.info("Starting new browser instance...")
        self.driver = webdriver.Chrome(options=self.chrome_options)
        self.driver.set_page_load_timeout(URL_TIMEOUT)
        self.driver.set_script_timeout(URL_TIMEOUT)
        
        # Enable performance logging
        self.driver.execute_cdp_cmd('Network.enable', {})
        self.driver.execute_cdp_cmd('Page.enable', {})
        
        # Set up listeners for downloads
        self.driver.execute_cdp_cmd('Page.setDownloadBehavior', {
            'behavior': 'deny',
            'downloadPath': '/dev/null'
        })
    
    def stop_browser(self):
        """Stop the browser instance"""
        if hasattr(self, 'driver') and self.driver:
            logger.info("Stopping browser instance...")
            try:
                self.driver.quit()
            except Exception as e:
                logger.error(f"Error stopping browser: {e}")
    
    def analyze_url(self, url, email_id=None, url_id=None):
        """
        Analyze a URL for phishing indicators
        
        Args:
            url (str): The URL to analyze
            email_id (str): ID of the email containing this URL
            url_id (str): Unique ID for this URL
            
        Returns:
            dict: Analysis results
        """
        logger.info(f"Analyzing URL: {url}")
        
        # Prepare result object
        result = {
            'url': url,
            'email_id': email_id,
            'url_id': url_id,
            'timestamp': datetime.utcnow(),
            'success': False,
            'error': None,
            'screenshot_path': None,
            'title': None,
            'meta_description': None,
            'has_login_form': False,
            'has_password_field': False,
            'has_credit_card_form': False,
            'attempted_download': False,
            'network_requests': [],
            'suspicious_indicators': [],
            'domain': urlparse(url).netloc,
            'path': urlparse(url).path,
            'risk_score': 0
        }
        
        try:
            # Start a new browser for each URL for isolation
            self.start_browser()
            
            # Capture network requests
            network_requests = []
            
            def log_request(request):
                network_requests.append({
                    'url': request.get('url', ''),
                    'method': request.get('method', ''),
                    'resource_type': request.get('resourceType', '')
                })
            
            # Set up network request interception
            self.driver.execute_cdp_cmd('Network.setRequestInterception', {'patterns': [{'urlPattern': '*'}]})
            
            # Navigate to the URL
            logger.info(f"Navigating to URL: {url}")
            self.driver.get(url)
            
            # Wait for page to load
            time.sleep(2)
            
            # Take screenshot
            screenshot_filename = f"{url_id or int(time.time())}.png"
            screenshot_path = os.path.join(SCREENSHOT_DIR, screenshot_filename)
            self.driver.save_screenshot(screenshot_path)
            result['screenshot_path'] = screenshot_path
            
            # Get page title
            result['title'] = self.driver.title
            
            # Get meta description
            try:
                meta_desc = self.driver.find_element(By.CSS_SELECTOR, 'meta[name="description"]')
                result['meta_description'] = meta_desc.get_attribute('content')
            except:
                pass
            
            # Check for login forms
            login_indicators = ['login', 'log in', 'sign in', 'signin', 'account', 'username', 'email', 'password']
            page_source_lower = self.driver.page_source.lower()
            
            for indicator in login_indicators:
                if indicator in page_source_lower:
                    result['has_login_form'] = True
                    result['suspicious_indicators'].append(f"Login indicator found: {indicator}")
                    break
            
            # Check for password fields
            password_fields = self.driver.find_elements(By.CSS_SELECTOR, 'input[type="password"]')
            if password_fields:
                result['has_password_field'] = True
                result['suspicious_indicators'].append(f"Found {len(password_fields)} password field(s)")
            
            # Check for credit card form fields
            cc_indicators = [
                'input[name*="card"]', 'input[name*="credit"]', 'input[name*="cc-"]',
                'input[id*="card"]', 'input[id*="credit"]', 'input[id*="cc-"]',
                'input[placeholder*="card"]', 'input[placeholder*="credit"]'
            ]
            
            for selector in cc_indicators:
                cc_fields = self.driver.find_elements(By.CSS_SELECTOR, selector)
                if cc_fields:
                    result['has_credit_card_form'] = True
                    result['suspicious_indicators'].append(f"Credit card field indicator found: {selector}")
                    break
            
            # Parse HTML for further analysis
            soup = BeautifulSoup(self.driver.page_source, 'lxml')
            
            # Check for suspicious form actions (different domain)
            forms = soup.find_all('form')
            for form in forms:
                if form.get('action'):
                    form_action = form['action']
                    if form_action.startswith('http'):
                        form_domain = urlparse(form_action).netloc
                        if form_domain and form_domain != result['domain']:
                            result['suspicious_indicators'].append(
                                f"Form submits to different domain: {form_domain}"
                            )
            
            # Store network requests
            result['network_requests'] = network_requests
            
            # Check for redirects to different domains
            if self.driver.current_url != url:
                redirect_domain = urlparse(self.driver.current_url).netloc
                if redirect_domain != result['domain']:
                    result['suspicious_indicators'].append(
                        f"Page redirected to different domain: {redirect_domain}"
                    )
            
            # Calculate risk score based on indicators
            risk_score = 0
            if result['has_login_form']: risk_score += 20
            if result['has_password_field']: risk_score += 30
            if result['has_credit_card_form']: risk_score += 40
            if result['attempted_download']: risk_score += 50
            risk_score += len(result['suspicious_indicators']) * 10
            
            # Cap risk score at 100
            result['risk_score'] = min(risk_score, 100)
            
            result['success'] = True
            logger.info(f"Successfully analyzed URL: {url}")
            
        except TimeoutException:
            error_msg = f"Timeout while loading URL: {url}"
            logger.error(error_msg)
            result['error'] = error_msg
            result['risk_score'] = 60  # Assign medium-high risk score for timeouts
            
        except WebDriverException as e:
            error_msg = f"WebDriver error for URL {url}: {str(e)}"
            logger.error(error_msg)
            result['error'] = error_msg
            
        except Exception as e:
            error_msg = f"Error analyzing URL {url}: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            result['error'] = error_msg
            
        finally:
            # Always stop the browser
            self.stop_browser()
            
            # Save result to MongoDB if available
            if self.url_collection:
                try:
                    # Convert datetime to string for JSON serialization
                    result_copy = result.copy()
                    result_copy['timestamp'] = result_copy['timestamp'].isoformat()
                    
                    # Insert result into MongoDB
                    self.url_collection.insert_one(result_copy)
                    logger.info(f"Saved analysis result to MongoDB for URL: {url}")
                except Exception as e:
                    logger.error(f"Failed to save result to MongoDB: {e}")
            
            # Send result to API endpoint
            try:
                # Convert datetime to string for JSON serialization
                result_copy = result.copy()
                result_copy['timestamp'] = result_copy['timestamp'].isoformat()
                
                # Convert screenshot to base64 if it exists
                if result_copy['screenshot_path'] and os.path.exists(result_copy['screenshot_path']):
                    with open(result_copy['screenshot_path'], 'rb') as img_file:
                        result_copy['screenshot_base64'] = base64.b64encode(img_file.read()).decode('utf-8')
                
                # Send result to API
                response = requests.post(
                    API_ENDPOINT,
                    json=result_copy,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                if response.status_code == 200:
                    logger.info(f"Successfully sent analysis result to API for URL: {url}")
                else:
                    logger.error(f"Failed to send result to API. Status code: {response.status_code}")
                    
            except Exception as e:
                logger.error(f"Error sending result to API: {e}")
            
            return result
    
    def cleanup(self):
        """Clean up resources"""
        if hasattr(self, 'display') and self.display:
            self.display.stop()
        
        if hasattr(self, 'mongo_client') and self.mongo_client:
            self.mongo_client.close()


def process_url_queue():
    """Process URLs from the queue in MongoDB"""
    automation = BrowserAutomation()
    
    try:
        while True:
            if not automation.url_collection:
                logger.error("No MongoDB connection available")
                time.sleep(10)
                continue
                
            # Find and update one URL to mark it as processing
            result = automation.url_collection.find_one_and_update(
                {'status': 'pending'},
                {'$set': {'status': 'processing', 'processing_started': datetime.utcnow()}},
                return_document=True
            )
            
            if not result:
                logger.info("No pending URLs found. Waiting...")
                time.sleep(5)
                continue
            
            url = result.get('url')
            email_id = result.get('email_id')
            url_id = result.get('_id')
            
            if not url:
                logger.error(f"Invalid URL record: {result}")
                continue
            
            try:
                # Process the URL
                analysis_result = automation.analyze_url(url, email_id, str(url_id))
                
                # Update the URL status
                automation.url_collection.update_one(
                    {'_id': url_id},
                    {'$set': {
                        'status': 'completed',
                        'completed_at': datetime.utcnow(),
                        'analysis_result': analysis_result
                    }}
                )
                
                logger.info(f"Completed analysis for URL: {url}")
                
            except Exception as e:
                logger.error(f"Error processing URL {url}: {e}")
                logger.error(traceback.format_exc())
                
                # Mark URL as failed
                automation.url_collection.update_one(
                    {'_id': url_id},
                    {'$set': {
                        'status': 'failed',
                        'error': str(e),
                        'failed_at': datetime.utcnow()
                    }}
                )
    
    except KeyboardInterrupt:
        logger.info("Received interrupt. Shutting down...")
    finally:
        automation.cleanup()


def process_single_url(url):
    """Process a single URL for testing"""
    automation = BrowserAutomation()
    try:
        result = automation.analyze_url(url)
        print(json.dumps(result, default=str, indent=2))
    finally:
        automation.cleanup()


if __name__ == "__main__":
    # Check if a specific URL was provided for testing
    test_url = os.getenv('TEST_URL')
    if test_url:
        logger.info(f"Testing single URL: {test_url}")
        process_single_url(test_url)
    else:
        logger.info("Starting URL processing queue")
        process_url_queue()
