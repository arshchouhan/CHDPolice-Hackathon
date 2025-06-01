# 🛡️ AI-Powered Email Security Platform

A comprehensive email security solution that leverages Google's Gemini AI to detect and prevent phishing attacks, analyze suspicious URLs, and protect organizations from email-based threats.

![Email Security Dashboard](https://img.shields.io/badge/Status-Production%20Ready-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node Version](https://img.shields.io/badge/Node-%3E%3D18.0.0-success)

## 🌟 Features

- **AI-Powered Email Analysis**
  - Real-time scanning using Google's Gemini 2.0 Flash
  - Context-aware threat detection
  - Multi-language support

- **Advanced URL Protection**
  - Sandbox execution of suspicious links
  - Behavioral analysis of web pages
  - Phishing kit detection

- **Threat Intelligence**
  - Real-time threat feeds integration
  - Automated IOC extraction
  - Community-sourced threat data

- **User-Friendly Dashboard**
  - Real-time alerts
  - Detailed threat reports
  - Customizable security policies

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- MongoDB 6.0 or higher
- Google Gemini API Key
- npm 9.x or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/email-security-platform.git
   cd email-security-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   GEMINI_API_KEY=your_gemini_api_key
   JWT_SECRET=your_jwt_secret
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 🏗️ Project Structure

```
├── config/               # Configuration files
├── controllers/          # Route controllers
├── middlewares/          # Custom express middlewares
├── models/               # MongoDB models
├── public/               # Static files
├── routes/               # Route definitions
├── utils/                # Utility functions
├── .env                  # Environment variables
├── .gitignore            # Git ignore file
├── package.json          # Project dependencies
├── server.js             # Application entry point
└── README.md            # This file
```

## 🛠️ Deployment

### Render (Backend)

1. Push your code to a GitHub repository
2. Create a new Web Service on Render
3. Connect your repository
4. Set the following environment variables:
   - `NODE_ENV=production`
   - `MONGODB_URI`
   - `GEMINI_API_KEY`
   - `JWT_SECRET`
   - `PORT=10000`

### Netlify (Frontend)

1. Build your frontend:
   ```bash
   npm run build
   ```
2. Deploy the `public` directory to Netlify
3. Set environment variables in Netlify's dashboard:
   - `REACT_APP_API_URL`: Your Render backend URL

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Application environment | No | `development` |
| `PORT` | Port to run the server | No | `3000` |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `GEMINI_API_KEY` | Google Gemini API key | Yes | - |
| `JWT_SECRET` | Secret for JWT token signing | Yes | - |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | No | - |

## 📚 API Documentation

API documentation is available at `/api-docs` when the application is running in development mode.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- [Your Name](https://github.com/yourusername)

## 🙏 Acknowledgments

- Google Gemini AI Team
- MongoDB
- Node.js Community
- All contributors and supporters

---

<div align="center">
  Made with ❤️ for better email security
</div>
