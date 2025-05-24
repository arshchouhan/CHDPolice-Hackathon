# Docker Compose Setup for Email Detection Application

This document explains how to use Docker Compose to run the Email Detection application with the browser automation system.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed on your system
- Git repository cloned to your local machine

## Configuration

1. Create a `.env` file in the root directory with the following variables:

```
# MongoDB Connection
MONGO_URI=mongodb://mongodb:27017/email_detection

# JWT Authentication
JWT_SECRET=your_jwt_secret_key

# VirusTotal API
VIRUSTOTAL_API_KEY=your_virustotal_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
PROD_REDIRECT_URI=https://your-domain.com/api/gmail/callback

# Application Settings
PORT=3000
NODE_ENV=production
```

## Directory Structure

The Docker Compose setup uses the following directory structure:

```
email-detection/
├── docker/
│   └── browser-automation/
│       ├── Dockerfile
│       ├── requirements.txt
│       ├── browser_automation.py
│       └── logs/
├── mongo-init/
│   └── init.js
├── screenshots/
├── uploads/
├── logs/
├── Dockerfile
├── docker-compose.yml
├── docker-compose.override.yml (for development)
└── .env
```

## Running the Application

### Production Mode

To start all services in production mode:

```bash
docker-compose up -d
```

This will start:
- The main API service on port 3000
- The browser automation service
- MongoDB database

### Development Mode

For development, use:

```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up
```

This will:
- Mount your local code into the containers
- Enable debug logging
- Make the services accessible for debugging

## Service Details

### API Service

The main Node.js application that handles:
- User authentication
- Email analysis
- API endpoints for the frontend

**Port**: 3000

### Browser Automation Service

A Python service with Selenium and headless Chrome that:
- Visits URLs extracted from emails in an isolated container
- Takes screenshots of pages
- Detects login forms, password fields, credit card forms
- Checks for download attempts
- Monitors network requests
- Captures page titles and meta descriptions

### MongoDB

Database service that stores:
- User accounts
- Email data
- URL analysis results

**Port**: 27017

## Volume Mounts

The Docker Compose setup uses the following volumes:

- `./uploads:/app/uploads`: For uploaded files
- `./logs:/app/logs`: For application logs
- `./public:/app/public`: For static files
- `./screenshots:/app/screenshots`: For URL screenshots
- `./docker/browser-automation/logs:/app/logs`: For browser automation logs
- `./mongo-init:/docker-entrypoint-initdb.d`: For MongoDB initialization
- `mongodb_data:/data/db`: For persistent MongoDB data

## Security Features

The browser automation container includes several security features:
- Runs as a non-root user
- Has limited capabilities
- Uses the `no-new-privileges` security option
- Runs in an isolated network

## Monitoring and Maintenance

### Checking Logs

```bash
# API service logs
docker-compose logs api

# Browser automation logs
docker-compose logs browser-automation

# MongoDB logs
docker-compose logs mongodb
```

### Restarting Services

```bash
# Restart a specific service
docker-compose restart api

# Restart all services
docker-compose restart
```

### Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (will delete all data)
docker-compose down -v
```

## Troubleshooting

### API Service Not Starting

Check the logs:
```bash
docker-compose logs api
```

Ensure MongoDB is running:
```bash
docker-compose ps mongodb
```

### Browser Automation Issues

Check the logs:
```bash
docker-compose logs browser-automation
```

Verify the container can access the API:
```bash
docker-compose exec browser-automation ping api
```

### MongoDB Connection Issues

Check if MongoDB is running:
```bash
docker-compose ps mongodb
```

Verify the connection string in your .env file:
```
MONGO_URI=mongodb://mongodb:27017/email_detection
```
