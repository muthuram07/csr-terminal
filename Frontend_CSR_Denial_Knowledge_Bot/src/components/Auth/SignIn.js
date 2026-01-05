import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function SignIn() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    username: '',
    password: '',
    general: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newFieldErrors = {
      username: '',
      password: '',
      general: []
    };

    if (!username.trim()) {
      newFieldErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newFieldErrors.username = 'Username must be at least 3 characters';
    } else if (username.length > 20) {
      newFieldErrors.username = 'Username must not exceed 20 characters';
    }

    if (!password) {
      newFieldErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newFieldErrors.password = 'Password must be at least 6 characters';
    } else if (password.length > 50) {
      newFieldErrors.password = 'Password must not exceed 50 characters';
    }

    setFieldErrors(newFieldErrors);
    return !newFieldErrors.username && !newFieldErrors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({ username: '', password: '', general: [] });
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }
    
    try {
      const result = await login(username.trim(), password);
      
      if (result.success) {
        navigate('/chatbot');
      } else {
        const newFieldErrors = { username: '', password: '', general: [] };
        
        if (result.message) {
          const errorMessages = result.message.split('; ');
          
          errorMessages.forEach(message => {
            const trimmedMessage = message.trim();
            
            if (trimmedMessage === 'This username is not registered. Please sign up first.') {
              newFieldErrors.username = 'Username not found. Please check or sign up.';
            } else if (trimmedMessage === 'Incorrect password. Please try again.') {
              newFieldErrors.password = 'Incorrect password. Please try again.';
            } else if (trimmedMessage === 'Username is required') {
              newFieldErrors.username = 'Username is required';
            } else if (trimmedMessage === 'Password is required') {
              newFieldErrors.password = 'Password is required';
            } else if (trimmedMessage === 'This account is inactive. Please contact support.') {
              newFieldErrors.username = 'Account inactive. Contact support.';
            } else if (trimmedMessage.includes('Network error')) {
              newFieldErrors.general.push('Connection failed. Check your internet.');
            } else {
              newFieldErrors.general.push(trimmedMessage);
            }
          });
        } else {
          newFieldErrors.general = ['Login failed. Please try again.'];
        }
        setFieldErrors(newFieldErrors);
      }
    } catch (error) {
      setFieldErrors({
        username: '', password: '',
        general: ['Unexpected error. Please try again.']
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value.substring(0, 20);
    setUsername(value);
    if (fieldErrors.username) {
      setFieldErrors(prev => ({ ...prev, username: '' }));
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
    <div className="auth-page">
      <div className="auth-layout">
        {/* Left Side - Clean MNC Branding */}
        <div className="auth-branding">
          <div className="branding-content">
            <div className="brand-logo">
              <div className="brand-icon-wrapper">
                <span className="brand-icon">🤖</span>
                <div className="icon-glow"></div>
              </div>
              <h1 className="brand-name">CSR Denial Knowledge Bot</h1>
              <p className="brand-tagline">Intelligent Customer Support Assistant</p>
            </div>
            
            <div className="auth-hero">
              <h2 className="auth-hero-title">Welcome Back</h2>
              <p className="auth-hero-description">
                Experience the future of customer service excellence with AI-powered insights 
                that transform how your team handles complex inquiries and delivers exceptional support.
              </p>
            </div>
            
            <div className="auth-navigation">
              <Link to="/" className="home-button">
                <span className="home-icon">🏠</span>
                <span>Back to Home</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side - Enhanced Form */}
        <div className="auth-form-section">
          <div className="form-container">
            <div className="form-header">
              <h2 className="form-title">Sign In to Your Account</h2>
              <p className="form-subtitle">Continue your journey to exceptional customer service</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label className="input-label">
                  <span className="label-icon">👤</span>
                  <span className="label-text">Username</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    disabled={isLoading}
                    placeholder="Enter your username"
                    maxLength={20}
                    className={`form-input ${fieldErrors.username ? 'error' : ''}`}
                  />
                  <div className="input-accent"></div>
                </div>
                {fieldErrors.username && (
                  <div className="input-error">
                    <span className="error-icon">⚠️</span>
                    <span>{fieldErrors.username}</span>
                  </div>
                )}
              </div>
              
              <div className="input-group">
                <label className="input-label">
                  <span className="label-icon">🔒</span>
                  <span className="label-text">Password</span>
                </label>
                <div className="input-wrapper password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    disabled={isLoading}
                    placeholder="Enter your password"
                    maxLength={50}
                    className={`form-input ${fieldErrors.password ? 'error' : ''}`}
                  />
                  <button
                    type="button"
                    className="password-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                  <div className="input-accent"></div>
                </div>
                {fieldErrors.password && (
                  <div className="input-error">
                    <span className="error-icon">⚠️</span>
                    <span>{fieldErrors.password}</span>
                  </div>
                )}
              </div>
              
              <button 
                type="submit" 
                className="submit-button"
                disabled={isLoading}
              >
                <div className="button-content">
                  {isLoading ? (
                    <>
                      <div className="button-spinner"></div>
                      <span>Signing You In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In   </span>
                      <span className="button-arrow">→</span>
                    </>
                  )}
                </div>
                <div className="button-shine"></div>
              </button>
              
              {fieldErrors.general.length > 0 && (
                <div className="general-errors">
                  {fieldErrors.general.map((error, index) => (
                    <div key={index} className="general-error">
                      <span className="error-icon">⚠️</span>
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}
            </form>
            
            <div className="form-footer">
              <p className="footer-text">
                Don't have an account? 
                <Link to="/signup" className="auth-link">Create your free account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Homepage Style Footer */}
      <footer className="professional-footer">
        <p>&copy; 2024 AI Assistant. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default SignIn;