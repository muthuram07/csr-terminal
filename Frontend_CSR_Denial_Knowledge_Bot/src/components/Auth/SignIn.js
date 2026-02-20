import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import '../../styles/terminal.css';
import './TerminalAuth.css';
import GoogleAuthButton from './GoogleAuthButton';

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
    general: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const { loginWithFirebase } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newFieldErrors = {
      email: '',
      password: '',
      general: []
    };

    if (!email.trim()) {
      newFieldErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newFieldErrors.email = 'Enter a valid email';
    }

    if (!password) {
      newFieldErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newFieldErrors.password = 'Password must be at least 6 characters';
    } else if (password.length > 50) {
      newFieldErrors.password = 'Password must not exceed 50 characters';
    }

    setFieldErrors(newFieldErrors);
    return !newFieldErrors.email && !newFieldErrors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({ email: '', password: '', general: [] });
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }
    
    try {
      const result = await loginWithFirebase(email.trim(), password);
      
      if (result.success) {
        navigate('/chatbot');
      } else {
        const newFieldErrors = { email: '', password: '', general: [] };
        
        if (result.message) {
          const errorMessages = result.message.split('; ');
          
          errorMessages.forEach(message => {
            const trimmedMessage = message.trim();
            
            if (trimmedMessage.toLowerCase().includes('email') || trimmedMessage.toLowerCase().includes('user')) {
              newFieldErrors.email = 'Email not found';
            } else if (trimmedMessage.toLowerCase().includes('password')) {
              newFieldErrors.password = 'Incorrect password';
            } else if (trimmedMessage === 'Email is required') {
              newFieldErrors.email = 'Email is required';
            } else if (trimmedMessage === 'Password is required') {
              newFieldErrors.password = 'Password is required';
            } else if (trimmedMessage.includes('Network error')) {
              newFieldErrors.general.push('Connection failed');
            } else {
              newFieldErrors.general.push(trimmedMessage);
            }
          });
        } else {
          newFieldErrors.general = ['Login failed'];
        }
        setFieldErrors(newFieldErrors);
      }
    } catch (error) {
      setFieldErrors({
        email: '', password: '',
        general: ['Unexpected error']
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value.substring(0, 100);
    setEmail(value);
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: '' }));
    }
  };

  return (
    <div className="terminal-auth-page">
      {/* Terminal Header Bar */}
      <div className="terminal-top-bar">
        <div className="terminal-top-bar-content">
          <span className="term-green term-bold">CSR_DENIAL_KNOWLEDGE_BOT</span>
          <span className="term-dim">v1.0.0</span>
        </div>
      </div>

      <div className="bento-grid auth-bento-grid">
        {/* Left Side - System Info Bento */}
        <div className="bento-cell-2x2 terminal-window">
          <div className="terminal-header">
            <span className="terminal-title">┌─ SYSTEM INFO ─┐</span>
          </div>
          <div className="terminal-body">
            <div className="terminal-ascii-art">
              <pre className="term-green">
{`
   ██████╗███████╗██████╗ 
  ██╔════╝██╔════╝██╔══██╗
  ██║     ███████╗██████╔╝
  ██║     ╚════██║██╔══██╗
  ╚██████╗███████║██║  ██║
   ╚═════╝╚══════╝╚═╝  ╚═╝
`}
              </pre>
            </div>
            
            <div className="system-info-lines">
              <div className="terminal-prompt">
                <span className="term-green">SYSTEM:</span>
                <span className="term-white">CSR Denial Knowledge Bot</span>
              </div>
              <div className="terminal-prompt">
                <span className="term-green">VERSION:</span>
                <span className="term-white">1.0.0</span>
              </div>
              <div className="terminal-prompt">
                <span className="term-green">STATUS:</span>
                <span className="term-matrix-green">ONLINE</span>
              </div>
              <div className="terminal-prompt">
                <span className="term-green">AUTH:</span>
                <span className="term-yellow">REQUIRED</span>
              </div>
            </div>

            <div className="terminal-divider">
              ─────────────────────────────────
            </div>

            <div className="terminal-help-text">
              <p className="term-dim">AI-Powered CSR Assistant</p>
              <p className="term-dim">Intelligent Denial Code Analysis</p>
              <p className="term-dim">Real-time Plan Coverage Lookup</p>
            </div>

            <div className="terminal-nav-link">
              <Link to="/" className="terminal-button">
                cd ~/home
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form Bento */}
        <div className="bento-cell-2x2 terminal-window">
          <div className="terminal-header">
            <span className="terminal-title">┌─ USER AUTHENTICATION ─┐</span>
          </div>
          <div className="terminal-body">
            <div className="auth-session-header">
              <span className="term-green term-bold">$ ./login.sh</span>
              <span className="terminal-cursor"></span>
            </div>

            <form onSubmit={handleSubmit} className="terminal-auth-form">
              {/* Username Input */}
              <div className="terminal-input-wrapper">
                <label className="terminal-input-label">
                  email
                </label>
                <div className="terminal-input-container">
                  <span className="term-green">&gt; </span>
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onFocus={() => setActiveField('email')}
                    onBlur={() => setActiveField(null)}
                    disabled={isLoading}
                    placeholder="enter email"
                    maxLength={100}
                    className={`terminal-input ${fieldErrors.email ? 'error' : ''}`}
                  />
                  {activeField === 'email' && <span className="terminal-cursor"></span>}
                </div>
                {fieldErrors.email && (
                  <div className="terminal-error">
                    {fieldErrors.email}
                  </div>
                )}
              </div>

              {/* Password Input */}
              <div className="terminal-input-wrapper">
                <label className="terminal-input-label">
                  password
                </label>
                <div className="terminal-input-container">
                  <span className="term-green">&gt; </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    onFocus={() => setActiveField('password')}
                    onBlur={() => setActiveField(null)}
                    disabled={isLoading}
                    placeholder="enter password"
                    maxLength={50}
                    className={`terminal-input ${fieldErrors.password ? 'error' : ''}`}
                  />
                  {activeField === 'password' && <span className="terminal-cursor"></span>}
                </div>
                <div className="password-toggle-wrapper">
                  <button
                    type="button"
                    className="terminal-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? '[HIDE]' : '[SHOW]'}
                  </button>
                </div>
                {fieldErrors.password && (
                  <div className="terminal-error">
                    {fieldErrors.password}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="terminal-submit-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="terminal-spinner">
                    <span className="term-green">[</span>
                    <span className="spinner-char">|</span>
                    <span className="term-green">]</span>
                    <span> AUTHENTICATING...</span>
                  </span>
                ) : (
                  <span>
                    <span className="term-green">&gt;</span> user login --execute
                  </span>
                )}
              </button>

              <div className="terminal-divider">──────── OR ────────</div>
              <GoogleAuthButton
                onSuccess={() => navigate('/chatbot')}
                onError={(message) => setFieldErrors(prev => ({ ...prev, general: [message] }))}
              />

              {/* General Errors */}
              {fieldErrors.general.length > 0 && (
                <div className="terminal-errors-container">
                  {fieldErrors.general.map((error, index) => (
                    <div key={index} className="terminal-error">
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </form>

            <div className="terminal-divider">
              ─────────────────────────────────
            </div>

            {/* Alternative Actions */}
            <div className="terminal-alt-actions">
              <div className="terminal-prompt">
                <span className="term-dim">New user?</span>
                <Link to="/signup" className="term-green terminal-link">
                  sudo useradd --create
                </Link>
              </div>
              <div className="terminal-prompt">
                <span className="term-dim">Forgot password?</span>
                <span className="term-green terminal-link">
                  sudo recovery --email
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Info Bento */}
        <div className="bento-cell-4x1 terminal-window terminal-footer-info">
          <div className="terminal-body terminal-footer-content">
            <span className="term-dim">© 2024 CSR Denial Knowledge Bot</span>
            <span className="term-dim">|</span>
            <span className="term-dim">All rights reserved</span>
            <span className="term-dim">|</span>
            <span className="term-green">STATUS: OPERATIONAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignIn;