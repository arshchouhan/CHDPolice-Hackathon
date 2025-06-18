# Email Detection System

A comprehensive email security and phishing detection platform developed for the CHD Police Hackathon. The system provides real-time email analysis, attachment scanning, and browser-based security features.

## Features

- **Email Analysis**
  - Real-time phishing detection
  - Header analysis
  - Link scanning
  - Content analysis using Google's Gemini AI

- **Attachment Analysis**
  - File type detection
  - Malware scanning
  - Content inspection

- **Browser Security**
  - Real-time URL scanning
  - Domain reputation checking
  - SSL certificate validation

- **Authentication & Security**
  - JWT-based authentication
  - Role-based access control
  - Session persistence
  - Google OAuth integration

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT, Google OAuth
- **AI/ML**: Google Gemini AI
- **Deployment**: Render (Backend), Vercel (Frontend)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/arshchouhan/CHDPolice-Hackathon.git
   cd email-detection
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## API Documentation

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/google` - Google OAuth sign-in
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check authentication status

### Email Analysis

- `POST /api/email/analyze` - Analyze email content
- `POST /api/email/headers` - Analyze email headers
- `POST /api/email/links` - Scan email links

### Attachment Analysis

- `POST /api/attachment/scan` - Scan email attachments
- `GET /api/attachment/report/:id` - Get scan report

### Browser Security

- `POST /api/browser/scan-url` - Real-time URL scanning
- `GET /api/browser/domain/:domain` - Get domain reputation

## Deployment

### Backend (Render)

1. Fork this repository
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Configure environment variables
5. Deploy

### Frontend (Vercel)

1. Navigate to the client directory
2. Configure environment variables on Vercel
3. Deploy using Vercel CLI or GitHub integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- CHD Police Department for the opportunity
- Google Cloud Platform for AI/ML services
- Open-source community for various tools and libraries