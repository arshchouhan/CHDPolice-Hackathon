import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <header className="app-header">
        <h1>AI-Powered Email Security</h1>
        <p>Protect your inbox from phishing and malicious emails</p>
      </header>
      
      <main className="main-content">
        <section className="cta-section">
          <button 
            className="cta-button"
            onClick={() => navigate('/analyze')}
          >
            Analyze Email
          </button>
        </section>
      </main>
      
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} AI Email Security</p>
      </footer>
    </div>
  );
}

export default Home;
