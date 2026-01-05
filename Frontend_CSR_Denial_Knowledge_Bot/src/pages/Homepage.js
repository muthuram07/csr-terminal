import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Homepage() {
  const { user, logout } = useAuth();

  return (
    <div className="homepage-container">
      {/* Professional Header */}
      <header className="professional-header">
        <div className="header-container">
          <div className="brand-section">
            <Link to="/" className="company-logo">
              <span className="logo-symbol">🤖</span>
              <div className="brand-text">
                <h1 className="company-name">CSR Denial Knowledge Bot</h1>
                <p className="company-tagline">Intelligent Denial Code & Plan Coverage Assistant</p>
              </div>
            </Link>
          </div>
          
          <nav className="main-navigation">
            {user ? (
              <div className="auth-nav">
                <span className="user-welcome">Welcome, {user.username}!</span>
                <Link to="/chatbot" className="nav-btn primary">Chat Bot</Link>
                <button onClick={logout} className="nav-btn secondary">Logout</button>
              </div>
            ) : (
              <div className="guest-nav">
                <Link to="/signin" className="nav-btn secondary">Sign In</Link>
                <Link to="/signup" className="nav-btn primary">Sign Up</Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Enterprise Hero Section */}
      <section className="enterprise-hero">
        <div className="hero-background-pattern">
          <div className="background-pattern"></div>
          <div className="floating-elements">
            <div className="element element-1"></div>
            <div className="element element-2"></div>
            <div className="element element-3"></div>
          </div>
        </div>
        
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-icon">🚀</span>
              <span>AI-Powered CSR Assistant</span>
            </div>
            
            <h1 className="hero-title">
              Instant Answers for <span className="highlight">Denial Codes & Plan Coverage</span>
            </h1>
            
            <p className="hero-description">
              Get immediate, accurate information about denial codes, member plans, and coverage details 
              with our intelligent AI assistant trained on your specific data.
            </p>
            
            <div className="hero-actions">
              {user ? (
                <Link to="/chatbot" className="cta-primary">
                  <span>Open Chat Bot</span>
                  <span className="btn-arrow">→</span>
                </Link>
              ) : (
                <Link to="/signup" className="cta-primary">
                  <span>Start Now</span>
                  <span className="btn-arrow">→</span>
                </Link>
              )}
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="platform-preview">
              <div className="preview-header">
                <div className="preview-controls">
                  <div className="control red"></div>
                  <div className="control yellow"></div>
                  <div className="control green"></div>
                </div>
                <div className="preview-title">AI Assistant Preview</div>
              </div>
              <div className="preview-content">
                <div className="chat-preview">
                  <div className="chat-message user">
                    <div className="message-avatar"></div>
                    <div className="message-content">
                      <p className="message-text">What does denial code CO-45 mean?</p>
                    </div>
                  </div>
                  <div className="chat-message bot">
                    <div className="message-avatar"></div>
                    <div className="message-content">
                      <p className="message-text">🔍 CO-45: Charge exceeds fee schedule/maximum allowable amount. Check payer fee schedule or submit an appeal with documentation.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CSR Benefits Section */}
      <section className="enterprise-features">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Benefits for CSR Teams</h2>
            <p className="section-subtitle">
              How this AI assistant empowers your customer service representatives
            </p>
          </div>
          
          <div className="features-grid csr-benefits">
            <div className="feature-card premium">
              <div className="feature-header">
                <div className="feature-icon">➤</div>
                <div className="feature-badge">Efficiency</div>
              </div>
              <h3 className="feature-title">Faster Response Times</h3>
              <p className="feature-description">
                Reduce call handling time with real-time lookup and instant access to denial code explanations and member information.
              </p>
            </div>
            
            <div className="feature-card premium">
              <div className="feature-header">
                <div className="feature-icon">✓</div>
                <div className="feature-badge">Accuracy</div>
              </div>
              <h3 className="feature-title">Improved Accuracy</h3>
              <p className="feature-description">
                Eliminate human errors with AI-powered lookups that provide consistent, accurate information every time.
              </p>
            </div>
            
            <div className="feature-card premium">
              <div className="feature-header">
                <div className="feature-icon">↗</div>
                <div className="feature-badge">Training</div>
              </div>
              <h3 className="feature-title">Reduced Training Time</h3>
              <p className="feature-description">
                New CSR agents can become productive faster with intelligent assistance that guides them through complex queries.
              </p>
            </div>
            
            <div className="feature-card premium centered-feature">
              <div className="feature-header">
                <div className="feature-icon">★</div>
                <div className="feature-badge">Satisfaction</div>
              </div>
              <h3 className="feature-title">Enhanced Customer Satisfaction</h3>
              <p className="feature-description">
                Deliver better customer experiences with confident, knowledgeable responses that build trust and satisfaction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="process-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              Simple process from your question to instant results
            </p>
          </div>
          
          <div className="process-flow">
            <div className="process-step">
              <div className="step-indicator">
                <div className="step-number">1</div>
                <div className="step-connector"></div>
              </div>
              <div className="step-content">
                <h3 className="step-title">Ask Your Question</h3>
                <p className="step-description">
                  Type your question in natural language - ask about denial codes, plan coverage, or member information.
                </p>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-indicator">
                <div className="step-number">2</div>
                <div className="step-connector"></div>
              </div>
              <div className="step-content">
                <h3 className="step-title">AI Processing</h3>
                <p className="step-description">
                  Our trained AI model analyzes your query and searches through denial codes, member data, and plan coverage information.
                </p>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-indicator">
                <div className="step-number">3</div>
              </div>
              <div className="step-content">
                <h3 className="step-title">Get Instant Results</h3>
                <p className="step-description">
                  Receive accurate, detailed answers with all relevant information including codes, descriptions, and actionable guidance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="professional-footer">
        <p>&copy; 2024 AI Assistant. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Homepage;