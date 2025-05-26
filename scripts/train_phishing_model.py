#!/usr/bin/env python
"""
Train a phishing email detection model using a Kaggle dataset.

This script trains a machine learning model to detect phishing emails
using features extracted from email content and saves the model for
use in the Node.js application.
"""

import argparse
import json
import os
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import pickle
import re
from bs4 import BeautifulSoup

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

def extract_features(df, text_column, label_column):
    """Extract features from email text."""
    print(f"Extracting features from {len(df)} emails...")
    
    # Preprocess text
    df['processed_text'] = df[text_column].apply(preprocess_email)
    
    # Extract additional features
    df['text_length'] = df['processed_text'].apply(len)
    df['has_urgency'] = df['processed_text'].apply(lambda x: 1 if re.search(r'urgent|immediate|alert|warning|attention|important', x) else 0)
    df['has_financial'] = df['processed_text'].apply(lambda x: 1 if re.search(r'account|bank|credit|payment|paypal|transaction|financial|money', x) else 0)
    df['has_personal_request'] = df['processed_text'].apply(lambda x: 1 if re.search(r'password|credit card|social security|ssn|bank account|login|credentials', x) else 0)
    
    # Extract URLs
    df['urls'] = df['processed_text'].apply(lambda x: re.findall(r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+', x))
    df['url_count'] = df['urls'].apply(len)
    
    # Create TF-IDF features
    vectorizer = TfidfVectorizer(
        max_features=5000,
        min_df=5,
        max_df=0.7,
        ngram_range=(1, 2)
    )
    
    X_tfidf = vectorizer.fit_transform(df['processed_text'])
    
    # Combine TF-IDF with other features
    additional_features = df[['text_length', 'has_urgency', 'has_financial', 'has_personal_request', 'url_count']].values
    
    # Convert sparse matrix to dense for concatenation
    X_tfidf_dense = X_tfidf.toarray()
    X = np.hstack((X_tfidf_dense, additional_features))
    
    # Get labels
    y = df[label_column].values
    
    return X, y, vectorizer

def train_model(X_train, y_train, model_type='random_forest'):
    """Train a machine learning model on the extracted features."""
    print(f"Training {model_type} model...")
    
    if model_type == 'logistic_regression':
        model = LogisticRegression(max_iter=1000, class_weight='balanced')
    else:  # default to random forest
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=20,
            min_samples_split=10,
            class_weight='balanced'
        )
    
    model.fit(X_train, y_train)
    return model

def evaluate_model(model, X_test, y_test):
    """Evaluate the trained model."""
    print("Evaluating model...")
    
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred)
    
    print(f"Accuracy: {accuracy:.4f}")
    print(f"Classification Report:\n{report}")
    
    return accuracy, report

def save_model(model, vectorizer, output_dir):
    """Save the trained model and vectorizer."""
    print(f"Saving model to {output_dir}...")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Save the model
    with open(os.path.join(output_dir, 'model.pkl'), 'wb') as f:
        pickle.dump(model, f)
    
    # Save the vectorizer
    with open(os.path.join(output_dir, 'vectorizer.pkl'), 'wb') as f:
        pickle.dump(vectorizer, f)
    
    # Save feature names and coefficients for JS implementation
    if hasattr(model, 'feature_importances_'):
        feature_weights = model.feature_importances_
    elif hasattr(model, 'coef_'):
        feature_weights = model.coef_[0]
    else:
        feature_weights = np.zeros(vectorizer.get_feature_names_out().shape[0] + 5)
    
    # Get feature names
    feature_names = list(vectorizer.get_feature_names_out())
    feature_names.extend(['text_length', 'has_urgency', 'has_financial', 'has_personal_request', 'url_count'])
    
    # Create a dictionary of feature weights
    feature_weights_dict = {
        feature_names[i]: float(feature_weights[i]) 
        for i in range(min(len(feature_names), len(feature_weights)))
    }
    
    # Save as JSON for JavaScript
    with open(os.path.join(output_dir, 'feature_weights.json'), 'w') as f:
        json.dump(feature_weights_dict, f)
    
    # Save vectorizer vocabulary as JSON for JavaScript
    with open(os.path.join(output_dir, 'vectorizer.json'), 'w') as f:
        json.dump({
            'vocabulary': vectorizer.vocabulary_,
            'idf': vectorizer.idf_.tolist()
        }, f)
    
    # Save model metadata
    with open(os.path.join(output_dir, 'model_metadata.json'), 'w') as f:
        json.dump({
            'model_type': model.__class__.__name__,
            'num_features': len(feature_names),
            'training_date': pd.Timestamp.now().isoformat(),
            'threshold': 0.5  # Default threshold for classification
        }, f)
    
    print("Model saved successfully!")

def load_dataset(dataset_path):
    """Load and prepare the Kaggle dataset."""
    print(f"Loading dataset from {dataset_path}...")
    
    # Determine file extension
    _, ext = os.path.splitext(dataset_path)
    
    if ext.lower() == '.csv':
        df = pd.read_csv(dataset_path)
    elif ext.lower() in ['.xlsx', '.xls']:
        df = pd.read_excel(dataset_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")
    
    print(f"Dataset loaded with {len(df)} rows")
    
    # Print column names to help identify text and label columns
    print(f"Columns in dataset: {df.columns.tolist()}")
    
    # Try to automatically identify text and label columns
    text_column = None
    label_column = None
    
    # Common column names for email text
    text_column_candidates = ['text', 'email', 'content', 'body', 'message', 'email_text']
    for col in text_column_candidates:
        if col in df.columns:
            text_column = col
            break
    
    # Common column names for phishing labels
    label_column_candidates = ['label', 'class', 'phishing', 'is_phishing', 'spam', 'is_spam']
    for col in label_column_candidates:
        if col in df.columns:
            label_column = col
            break
    
    # If we couldn't identify columns, use the first string column for text
    # and the first binary column for label
    if text_column is None:
        for col in df.columns:
            if df[col].dtype == 'object':
                text_column = col
                break
    
    if label_column is None:
        for col in df.columns:
            if set(df[col].unique()).issubset({0, 1}) or set(df[col].unique()).issubset({False, True}):
                label_column = col
                break
    
    if text_column is None or label_column is None:
        raise ValueError("Could not automatically identify text and label columns. Please specify them manually.")
    
    print(f"Using '{text_column}' as text column and '{label_column}' as label column")
    
    return df, text_column, label_column

def main():
    parser = argparse.ArgumentParser(description='Train a phishing email detection model')
    parser.add_argument('--dataset', required=True, help='Path to the Kaggle dataset')
    parser.add_argument('--output', required=True, help='Directory to save the trained model')
    parser.add_argument('--text-column', help='Column name containing email text')
    parser.add_argument('--label-column', help='Column name containing phishing labels')
    parser.add_argument('--model-type', choices=['random_forest', 'logistic_regression'], 
                        default='random_forest', help='Type of model to train')
    
    args = parser.parse_args()
    
    try:
        # Load dataset
        df, auto_text_col, auto_label_col = load_dataset(args.dataset)
        
        # Use specified columns or auto-detected ones
        text_column = args.text_column or auto_text_col
        label_column = args.label_column or auto_label_col
        
        # Extract features
        X, y, vectorizer = extract_features(df, text_column, label_column)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train model
        model = train_model(X_train, y_train, args.model_type)
        
        # Evaluate model
        evaluate_model(model, X_test, y_test)
        
        # Save model
        save_model(model, vectorizer, args.output)
        
        print("Training completed successfully!")
        
    except Exception as e:
        print(f"Error during training: {str(e)}")
        raise

if __name__ == '__main__':
    main()
