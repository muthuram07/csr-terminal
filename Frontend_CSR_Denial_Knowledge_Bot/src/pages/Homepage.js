import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/terminal.css';
import './Homepage.css';

function Homepage() {
  const { user, logout } = useAuth();

  return (
    <div className="terminal-homepage">
      {/* Terminal Header */}
      <header className="terminal-header-bar">
        <div className="terminal-header-content">
          <div className="terminal-brand">
            <span className="term-green term-bold">root@csr-bot:~#</span>
            <span className="term-white">CSR_DENIAL_KNOWLEDGE_BOT</span>
          </div>
          <nav className="terminal-nav">
            {user ? (
              <>
                <span className="term-dim">user: <span className="term-green">{user.username}</span></span>
                <Link to="/chatbot" className="terminal-nav-btn">./chatbot</Link>
                <button onClick={logout} className="terminal-nav-btn">logout</button>
              </>
            ) : (
              <>
                <Link to="/signin" className="terminal-nav-btn">login</Link>
                <Link to="/signup" className="terminal-nav-btn">signup</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="bento-grid homepage-bento">
        {/* Hero Section - Large Bento */}
        <div className="bento-cell-4x1 terminal-window hero-terminal">
          <div className="terminal-header">
            <span className="terminal-title">┌─ MAIN TERMINAL ─┐</span>
            <span className="terminal-controls">
              <span className="term-dim">[_]</span>
              <span className="term-dim">[□]</span>
              <span className="term-red">[X]</span>
            </span>
          </div>
          <div className="terminal-body hero-body">
            <div className="hero-prompt">
              <pre className="term-green hero-ascii">
                {`
   ██████╗███████╗██████╗     ██████╗  ██████╗ ████████╗
  ██╔════╝██╔════╝██╔══██╗    ██╔══██╗██╔═══██╗╚══██╔══╝
  ██║     ███████╗██████╔╝    ██████╔╝██║   ██║   ██║   
  ██║     ╚════██║██╔══██╗    ██╔══██╗██║   ██║   ██║   
  ╚██████╗███████║██║  ██║    ██████╔╝╚██████╔╝   ██║   
   ╚═════╝╚══════╝╚═╝  ╚═╝    ╚═════╝  ╚═════╝    ╚═╝   
`}
              </pre>
            </div>
            <div className="hero-text">
              <p className="term-white term-bold">$ cat README.md</p>
              <p className="term-green">&gt; Instant Answers for Denial Codes & Plan Coverage</p>
              <p className="term-dim">
                Get immediate, accurate information about denial codes, member plans, and coverage details
                with our intelligent AI assistant trained on your specific data.
              </p>
            </div>
            <div className="hero-actions">
              {user ? (
                <Link to="/chatbot" className="terminal-button hero-cta">
                  ./start-chatbot.sh
                </Link>
              ) : (
                <Link to="/signup" className="terminal-button hero-cta">
                  sudo useradd --signup
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Feature Cards - Bento Grid */}
        <div className="bento-cell-2x1 terminal-window feature-terminal">
          <div className="terminal-header">
            <span className="terminal-title">┌─ FEATURE: SPEED ─┐</span>
          </div>
          <div className="terminal-body">
            <div className="feature-icon-term">
              <span className="term-green term-bold">[⚡]</span>
            </div>
            <p className="term-green term-bold">$ ./faster-response.sh</p>
            <p className="term-white">Faster Response Times</p>
            <p className="term-dim">
              Reduce call handling time with real-time lookup and instant access to denial code explanations.
            </p>
            <div className="feature-stats">
              <span className="term-green">STATUS:</span>
              <span className="term-white">OPTIMIZED</span>
            </div>
          </div>
        </div>

        <div className="bento-cell-2x1 terminal-window feature-terminal">
          <div className="terminal-header">
            <span className="terminal-title">┌─ FEATURE: ACCURACY ─┐</span>
          </div>
          <div className="terminal-body">
            <div className="feature-icon-term">
              <span className="term-green term-bold">[✓]</span>
            </div>
            <p className="term-green term-bold">$ ./accuracy-check.sh</p>
            <p className="term-white">Improved Accuracy</p>
            <p className="term-dim">
              Eliminate human errors with AI-powered lookups that provide consistent, accurate information.
            </p>
            <div className="feature-stats">
              <span className="term-green">PRECISION:</span>
              <span className="term-white">99.9%</span>
            </div>
          </div>
        </div>

        <div className="bento-cell-2x1 terminal-window feature-terminal">
          <div className="terminal-header">
            <span className="terminal-title">┌─ FEATURE: TRAINING ─┐</span>
          </div>
          <div className="terminal-body">
            <div className="feature-icon-term">
              <span className="term-green term-bold">[↗]</span>
            </div>
            <p className="term-green term-bold">$ ./reduce-training.sh</p>
            <p className="term-white">Reduced Training Time</p>
            <p className="term-dim">
              New CSR agents can become productive faster with intelligent assistance.
            </p>
            <div className="feature-stats">
              <span className="term-green">EFFICIENCY:</span>
              <span className="term-white">+85%</span>
            </div>
          </div>
        </div>

        <div className="bento-cell-2x1 terminal-window feature-terminal">
          <div className="terminal-header">
            <span className="terminal-title">┌─ FEATURE: SATISFACTION ─┐</span>
          </div>
          <div className="terminal-body">
            <div className="feature-icon-term">
              <span className="term-green term-bold">[★]</span>
            </div>
            <p className="term-green term-bold">$ ./customer-satisfaction.sh</p>
            <p className="term-white">Enhanced Customer Satisfaction</p>
            <p className="term-dim">
              Deliver better customer experiences with confident, knowledgeable responses.
            </p>
            <div className="feature-stats">
              <span className="term-green">RATING:</span>
              <span className="term-white">4.9/5.0</span>
            </div>
          </div>
        </div>

        {/* Process Section - Wide Bento */}
        <div className="bento-cell-4x1 terminal-window process-terminal">
          <div className="terminal-header">
            <span className="terminal-title">┌─ PROCESS FLOW ─┐</span>
          </div>
          <div className="terminal-body">
            <div className="process-grid">
              <div className="process-step">
                <div className="step-number term-green">[1]</div>
                <p className="term-white term-bold">$ ask-question.sh</p>
                <p className="term-dim">Type your question in natural language</p>
              </div>

              <div className="process-arrow term-green">───&gt;</div>

              <div className="process-step">
                <div className="step-number term-green">[2]</div>
                <p className="term-white term-bold">$ ai-process.sh</p>
                <p className="term-dim">AI analyzes and searches data</p>
              </div>

              <div className="process-arrow term-green">───&gt;</div>

              <div className="process-step">
                <div className="step-number term-green">[3]</div>
                <p className="term-white term-bold">$ get-results.sh</p>
                <p className="term-dim">Receive instant accurate answers</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Stats - 2 Column Bento */}
        <div className="bento-cell-2x1 terminal-window stats-terminal">
          <div className="terminal-header">
            <span className="terminal-title">┌─ SYSTEM STATS ─┐</span>
          </div>
          <div className="terminal-body">
            <div className="stats-list">
              <div className="stat-line">
                <span className="term-green">UPTIME:</span>
                <span className="term-white">99.99%</span>
              </div>
              <div className="stat-line">
                <span className="term-green">QUERIES/DAY:</span>
                <span className="term-white">10,000+</span>
              </div>
              <div className="stat-line">
                <span className="term-green">AVG_RESPONSE:</span>
                <span className="term-white">&lt;2s</span>
              </div>
              <div className="stat-line">
                <span className="term-green">USERS:</span>
                <span className="term-white">500+</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bento-cell-2x1 terminal-window info-terminal">
          <div className="terminal-header">
            <span className="terminal-title">┌─ QUICK INFO ─┐</span>
          </div>
          <div className="terminal-body">
            <div className="info-list">
              <p className="term-green term-bold">$ cat features.txt</p>
              <p className="term-dim">• Denial Code Lookup</p>
              <p className="term-dim">• Plan Coverage Analysis</p>
              <p className="term-dim">• Member Information</p>
              <p className="term-dim">• Real-time Support</p>
              <p className="term-dim">• AI-Powered Insights</p>
            </div>
          </div>
        </div>

        {/* Footer - Full Width Bento */}
        <div className="bento-cell-4x1 terminal-window footer-terminal">
          <div className="terminal-body terminal-footer">
            <span className="term-dim">© 2024 CSR Denial Knowledge Bot</span>
            <span className="term-dim">|</span>
            <span className="term-dim">All rights reserved</span>
            <span className="term-dim">|</span>
            <span className="term-green">root@csr-bot:~#</span>
            <span className="terminal-cursor"></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Homepage;