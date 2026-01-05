import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';

function SignUp() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    username: '', email: '', password: '', confirmPassword: '', general: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const newFieldErrors = {
      username: '', email: '', password: '', confirmPassword: '', general: []
    };

    if (!username.trim()) {
      newFieldErrors.username = 'Username is required';
    } else {
      if (username.length < 3) {
        newFieldErrors.username = 'Username must be at least 3 characters';
      } else if (username.length > 20) {
        newFieldErrors.username = 'Username must not exceed 20 characters';
      } else if (!/^[a-zA-Z][a-zA-Z0-9_ ]*$/.test(username)) {
        newFieldErrors.username = 'Must start with letter, contain only letters, numbers, spaces';
      } else if (/^\d+$/.test(username)) {
        newFieldErrors.username = 'Username cannot be only numbers';
      }
    }

    if (!email.trim()) {
      newFieldErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        newFieldErrors.email = 'Please enter a valid email address';
      } else if (email.length > 100) {
        newFieldErrors.email = 'Email must not exceed 100 characters';
      }
    }

    if (!password) {
      newFieldErrors.password = 'Password is required';
    } else {
      if (password.length < 6) {
        newFieldErrors.password = 'Password must be at least 6 characters';
      } else if (password.length > 50) {
        newFieldErrors.password = 'Password must not exceed 50 characters';
      } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
        newFieldErrors.password = 'Password must contain at least one letter and number';
      }
    }

    if (!confirmPassword) {
      newFieldErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newFieldErrors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(newFieldErrors);
    return !newFieldErrors.username && !newFieldErrors.email && !newFieldErrors.password && !newFieldErrors.confirmPassword;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({ username: '', email: '', password: '', confirmPassword: '', general: [] });
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(API_ENDPOINTS.SIGNUP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password: password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsLoading(false);
        setUsername(''); setEmail(''); setPassword(''); setConfirmPassword('');
        setTimeout(() => navigate('/signin'), 2000);
      } else {
        const newFieldErrors = { username: '', email: '', password: '', confirmPassword: '', general: [] };
        
        if (data.message) {
          const errorMessages = data.message.split('; ');
          
          errorMessages.forEach(message => {
            const trimmedMessage = message.trim();
            
            if (trimmedMessage === 'Username is already taken') {
              newFieldErrors.username = 'Username already taken. Try another one.';
            } else if (trimmedMessage === 'Email is already registered') {
              newFieldErrors.email = 'Email already registered. Try signing in.';
            } else if (trimmedMessage === 'Username is required') {
              newFieldErrors.username = 'Username is required';
            } else if (trimmedMessage === 'Email is required') {
              newFieldErrors.email = 'Email is required';
            } else if (trimmedMessage === 'Password is required') {
              newFieldErrors.password = 'Password is required';
            } else if (trimmedMessage === 'Invalid email format') {
              newFieldErrors.email = 'Please enter a valid email address';
            } else if (trimmedMessage.includes('Network error')) {
              newFieldErrors.general.push('Connection failed. Check your internet.');
            } else {
              newFieldErrors.general.push(trimmedMessage);
            }
          });
        } else {
          newFieldErrors.general = ['Signup failed. Please try again.'];
        }
        setFieldErrors(newFieldErrors);
      }
    } catch (error) {
      setFieldErrors({
        username: '', email: '', password: '', confirmPassword: '',
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

  const handleEmailChange = (e) => {
    const value = e.target.value.substring(0, 100);
    setEmail(value);
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    if (fieldErrors.confirmPassword) {
      setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
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
              <h2 className="auth-hero-title">Join the Innovation</h2>
              <p className="auth-hero-description">
                Revolutionize your customer service operations with cutting-edge AI technology 
                that empowers your team to deliver unprecedented support excellence.
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
              <h2 className="form-title">Create Your Account</h2>
              <p className="form-subtitle">Start your journey to smarter customer service today</p>
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
                    placeholder="Choose a unique username"
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
                  <span className="label-icon">📧</span>
                  <span className="label-text">Email Address</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    disabled={isLoading}
                    placeholder="your.email@company.com"
                    maxLength={100}
                    className={`form-input ${fieldErrors.email ? 'error' : ''}`}
                  />
                  <div className="input-accent"></div>
                </div>
                {fieldErrors.email && (
                  <div className="input-error">
                    <span className="error-icon">⚠️</span>
                    <span>{fieldErrors.email}</span>
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
                    placeholder="Create a strong password"
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

              <div className="input-group">
                <label className="input-label">
                  <span className="label-icon">🔒</span>
                  <span className="label-text">Confirm Password</span>
                </label>
                <div className="input-wrapper password-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    disabled={isLoading}
                    placeholder="Confirm your password"
                    maxLength={50}
                    className={`form-input ${fieldErrors.confirmPassword ? 'error' : ''}`}
                  />
                  <button
                    type="button"
                    className="password-visibility"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                  <div className="input-accent"></div>
                </div>
                {fieldErrors.confirmPassword && (
                  <div className="input-error">
                    <span className="error-icon">⚠️</span>
                    <span>{fieldErrors.confirmPassword}</span>
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
                      <span>Creating Your Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create My Account</span>
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
                Already have an account? 
                <Link to="/signin" className="auth-link">Sign In</Link>
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

export default SignUp;