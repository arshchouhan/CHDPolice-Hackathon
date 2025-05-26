#!/usr/bin/env python
"""
Analyze an email for phishing indicators using the trained model.

This script is called by the Node.js application to analyze an email
and return the results in JSON format.
"""

import argparse
import json
import os
import pickle
import re
import numpy as np
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def preprocess_email(text):
    """Preprocess email text by removing HTML tags and normalizing text."""
    if not isinstance(text, str):
        return ""
    
    # Remove HTML tags if present
    if bool(re.search(r'<[^<]+?>', text)):
        soup = BeautifulSoup(text, 'html.parser')
        text = soup.get_text()
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Convert to lowercase
    text = text.lower()
    
    return text

def extract_features(email_data, vectorizer):
    """Extract features from email data for analysis."""
    # Combine subject and body for analysis
    text = f"{email_data['subject']} {email_data['body']}"
    processed_text = preprocess_email(text)
    
    # Extract additional features
    features = {
        'text_length': len(processed_text),
        'has_urgency': 1 if re.search(r'urgent|immediate|alert|warning|attention|important', processed_text) else 0,
        'has_financial': 1 if re.search(r'account|bank|credit|payment|paypal|transaction|financial|money', processed_text) else 0,
        'has_personal_request': 1 if re.search(r'password|credit card|social security|ssn|bank account|login|credentials', processed_text) else 0,
        'url_count': len(email_data['urls'])
    }
    
    # Create TF-IDF features
    X_tfidf = vectorizer.transform([processed_text])
    
    # Combine TF-IDF with other features
    additional_features = np.array([[
        features['text_length'],
        features['has_urgency'],
        features['has_financial'],
        features['has_personal_request'],
        features['url_count']
    ]])
    
    # Convert sparse matrix to dense for concatenation
    X_tfidf_dense = X_tfidf.toarray()
    X = np.hstack((X_tfidf_dense, additional_features))
    
    return X, features

def analyze_url(url):
    """Analyze a URL for phishing indicators."""
    risk_score = 0
    reasons = []
    
    try:
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        
        # Check for IP address in domain
        if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', domain):
            risk_score += 25
            reasons.append('URL uses IP address instead of domain name')
        
        # Check for uncommon TLDs
        tld = domain.split('.')[-1] if '.' in domain else ''
        if tld in ['xyz', 'tk', 'ml', 'ga', 'cf', 'gq', 'top', 'club']:
            risk_score += 15
            reasons.append(f'URL uses uncommon TLD (.{tld})')
        
        # Check for excessive subdomains
        subdomain_count = len(domain.split('.')) - 2 if len(domain.split('.')) > 2 else 0
        if subdomain_count > 2:
            risk_score += 10
            reasons.append(f'URL has {subdomain_count} subdomains')
        
        # Check for suspicious keywords in URL
        if re.search(r'secure|login|account|update|verify|password|bank|paypal|ebay|amazon', parsed_url.path, re.I):
            risk_score += 15
            reasons.append('URL contains sensitive keywords')
        
        # Check for URL shorteners
        if re.search(r'bit\.ly|tinyurl\.com|goo\.gl|t\.co|is\.gd|cli\.gs|ow\.ly|buff\.ly', domain, re.I):
            risk_score += 20
            reasons.append('URL uses a URL shortening service')
        
        # Check for deceptive domains (simplified)
        popular_domains = ['paypal.com', 'google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'facebook.com']
        for popular_domain in popular_domains:
            popular_name = popular_domain.split('.')[0]
            if popular_name in domain and domain != popular_domain:
                risk_score += 30
                reasons.append(f'URL may be impersonating {popular_domain}')
                break
        
        # Cap the risk score at 100
        risk_score = min(round(risk_score), 100)
        
        # If no specific issues found but URL isn't a common domain, assign a base risk
        if not reasons:
            # List of common legitimate domains
            common_domains = ['google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'facebook.com', 
                             'github.com', 'linkedin.com', 'twitter.com', 'instagram.com', 'youtube.com']
            
            if not any(domain.endswith(d) for d in common_domains):
                risk_score = 10
                reasons.append('URL is not from a commonly recognized domain')
        
    except Exception as e:
        risk_score = 50
        reasons.append(f'Invalid or malformed URL: {str(e)}')
    
    return {
        'url': url,
        'riskScore': risk_score,
        'reasons': reasons
    }

def generate_summary(overall_risk_score, phishing_indicators, url_analysis):
    """Generate a summary of the analysis results."""
    if overall_risk_score < 30:
        risk_level = 'Low'
    elif overall_risk_score < 70:
        risk_level = 'Medium'
    else:
        risk_level = 'High'
    
    summary = f"This email has a {risk_level.lower()} risk score of {overall_risk_score}/100. "
    
    if phishing_indicators:
        summary += f"Key concerns include: {', '.join(phishing_indicators[:3])}. "
    
    high_risk_urls = [u for u in url_analysis if u['riskScore'] > 50]
    if high_risk_urls:
        summary += f"{len(high_risk_urls)} high-risk URLs were identified. "
    
    if risk_level == 'High':
        summary += 'Recommend treating this email with extreme caution.'
    elif risk_level == 'Medium':
        summary += 'Exercise caution when interacting with this email.'
    else:
        summary += 'This email appears to be legitimate, but always verify sensitive requests.'
    
    return summary

def main():
    parser = argparse.ArgumentParser(description='Analyze an email for phishing indicators')
    parser.add_argument('--input', required=True, help='Path to JSON file with email data')
    parser.add_argument('--model', required=True, help='Directory containing the trained model')
    
    args = parser.parse_args()
    
    try:
        # Load email data
        with open(args.input, 'r') as f:
            data = json.load(f)
        
        email_data = data['emailData']
        
        # Load model and vectorizer
        model_path = os.path.join(args.model, 'model.pkl')
        vectorizer_path = os.path.join(args.model, 'vectorizer.pkl')
        
        if not os.path.exists(model_path) or not os.path.exists(vectorizer_path):
            raise FileNotFoundError(f"Model files not found in {args.model}")
        
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        
        with open(vectorizer_path, 'rb') as f:
            vectorizer = pickle.load(f)
        
        # Extract features
        X, features = extract_features(email_data, vectorizer)
        
        # Predict using the model
        if hasattr(model, 'predict_proba'):
            y_prob = model.predict_proba(X)[0, 1]  # Probability of being phishing
            is_phishing = y_prob > 0.5
        else:
            y_pred = model.predict(X)
            is_phishing = bool(y_pred[0])
            y_prob = float(is_phishing)
        
        # Calculate overall risk score (0-100)
        overall_risk_score = round(y_prob * 100)
        
        # Identify phishing indicators
        phishing_indicators = []
        
        if features['has_urgency']:
            phishing_indicators.append('Email contains urgent or threatening language')
        
        if features['has_financial']:
            phishing_indicators.append('Email contains financial terms')
        
        if features['has_personal_request']:
            phishing_indicators.append('Email requests personal information')
        
        # Analyze URLs
        url_analysis = [analyze_url(url) for url in email_data['urls']]
        
        # Add suspicious URLs to phishing indicators
        suspicious_urls = [u for u in url_analysis if u['riskScore'] > 50]
        if suspicious_urls:
            phishing_indicators.append(f'Email contains {len(suspicious_urls)} suspicious URLs')
        
        # Generate summary
        summary = generate_summary(overall_risk_score, phishing_indicators, url_analysis)
        
        # Prepare result
        result = {
            'overallRiskScore': overall_risk_score,
            'phishingIndicators': phishing_indicators,
            'urlAnalysis': url_analysis,
            'summary': summary,
            'originalEmail': {
                'subject': email_data['subject'],
                'sender': email_data['sender'],
                'urlCount': len(email_data['urls'])
            }
        }
        
        # Print result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'overallRiskScore': 50,  # Default risk score on error
            'phishingIndicators': ['Error analyzing email'],
            'urlAnalysis': [],
            'summary': f'Error analyzing email: {str(e)}'
        }
        print(json.dumps(error_result))

if __name__ == '__main__':
    main()
