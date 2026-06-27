import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/terminal.css';
import './TerminalAuth.css';
import GoogleAuthButton from './GoogleAuthButton';

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
  const [activeField, setActiveField] = useState(null);
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newFieldErrors = {
      username: '', email: '', password: '', confirmPassword: '', general: []
    };

    if (!username.trim()) {
      newFieldErrors.username = 'Username is required';
    } else {
      if (username.length < 3) {
        newFieldErrors.username = 'Min 3 characters';
      } else if (username.length > 20) {
        newFieldErrors.username = 'Max 20 characters';
      } else if (!/^[a-zA-Z][a-zA-Z0-9_ ]*$/.test(username)) {
        newFieldErrors.username = 'Invalid format';
      } else if (/^\d+$/.test(username)) {
        newFieldErrors.username = 'Cannot be only numbers';
      }
    }

    if (!email.trim()) {
      newFieldErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        newFieldErrors.email = 'Invalid email';
      } else if (email.length > 100) {
        newFieldErrors.email = 'Max 100 characters';
      }
    }

    if (!password) {
      newFieldErrors.password = 'Password is required';
    } else {
      if (password.length < 6) {
        newFieldErrors.password = 'Min 6 characters';
      } else if (password.length > 50) {
        newFieldErrors.password = 'Max 50 characters';
      } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
        newFieldErrors.password = 'Need letter and number';
      }
    }

    if (!confirmPassword) {
      newFieldErrors.confirmPassword = 'Confirm password';
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
      const result = await register(username.trim(), email.trim(), password);

      if (result.success) {
        setSuccess(true);
        setIsLoading(false);
        setUsername(''); setEmail(''); setPassword(''); setConfirmPassword('');
        setTimeout(() => navigate('/signin'), 2500);
      } else {
        const newFieldErrors = { username: '', email: '', password: '', confirmPassword: '', general: [] };

        if (result.message) {
          const errorMessages = result.message.split('; ');

          errorMessages.forEach(message => {
            const trimmedMessage = message.trim();

            if (trimmedMessage === 'Username is already taken') {
              newFieldErrors.username = 'Username taken';
            } else if (trimmedMessage === 'Email is already registered') {
              newFieldErrors.email = 'Email registered';
            } else if (trimmedMessage === 'Email already in use') {
              newFieldErrors.email = 'Email registered';
            } else if (trimmedMessage === 'Username is required') {
              newFieldErrors.username = 'Username required';
            } else if (trimmedMessage === 'Email is required') {
              newFieldErrors.email = 'Email required';
            } else if (trimmedMessage === 'Password is required') {
              newFieldErrors.password = 'Password required';
            } else if (trimmedMessage === 'Invalid email format') {
              newFieldErrors.email = 'Invalid email';
            } else if (trimmedMessage.includes('Network error')) {
              newFieldErrors.general.push('Connection failed');
            } else {
              newFieldErrors.general.push(trimmedMessage);
            }
          });
        } else {
          newFieldErrors.general = ['Signup failed'];
        }
        setFieldErrors(newFieldErrors);
      }
    } catch (error) {
      setFieldErrors({
        username: '', email: '', password: '', confirmPassword: '',
        general: ['Unexpected error']
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
            <span className="terminal-title">┌─ NEW USER REGISTRATION ─┐</span>
          </div>
          <div className="terminal-body">
            <div className="terminal-ascii-art">
              <pre className="term-green">
                {`
  ╔═══════════════════════╗
  ║  USER CREATION TOOL   ║
  ╚═══════════════════════╝
`}
              </pre>
            </div>

            <div className="system-info-lines">
              <div className="terminal-prompt">
                <span className="term-green">COMMAND:</span>
                <span className="term-white">sudo useradd --create</span>
              </div>
              <div className="terminal-prompt">
                <span className="term-green">ACTION:</span>
                <span className="term-white">Create new account</span>
              </div>
              <div className="terminal-prompt">
                <span className="term-green">PRIVILEGES:</span>
                <span className="term-yellow">STANDARD_USER</span>
              </div>
              <div className="terminal-prompt">
                <span className="term-green">ACCESS:</span>
                <span className="term-matrix-green">GRANTED</span>
              </div>
            </div>

            <div className="terminal-divider">
              ─────────────────────────────────
            </div>

            <div className="terminal-help-text">
              <p className="term-green term-bold">REQUIREMENTS:</p>
              <p className="term-dim">• Username: 3-20 chars</p>
              <p className="term-dim">• Email: Valid format</p>
              <p className="term-dim">• Password: 6+ chars</p>
              <p className="term-dim">• Must contain letter + number</p>
            </div>

            <div className="terminal-divider">
              ─────────────────────────────────
            </div>

            <div className="terminal-help-text">
              <p className="term-green term-bold">BENEFITS:</p>
              <p className="term-dim">✓ AI-Powered CSR Assistant</p>
              <p className="term-dim">✓ Denial Code Analysis</p>
              <p className="term-dim">✓ Plan Coverage Lookup</p>
              <p className="term-dim">✓ Real-time Support</p>
            </div>

            <div className="terminal-nav-link">
              <Link to="/" className="terminal-button">
                cd ~/home
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form Bento */}
        <div className="bento-cell-2x2 terminal-window">
          <div className="terminal-header">
            <span className="terminal-title">┌─ ACCOUNT CREATION ─┐</span>
          </div>
          <div className="terminal-body">
            {success ? (
              <div className="terminal-success-screen">
                <div className="terminal-success-art">
                  <pre className="term-green">
                    {`
    ✓ SUCCESS
    
  Account Created!
`}
                  </pre>
                </div>
                <div className="terminal-success">
                  User account created successfully
                </div>
                <div className="terminal-prompt">
                  <span className="term-dim">Redirecting to login...</span>
                  <span className="terminal-cursor"></span>
                </div>
              </div>
            ) : (
              <>
                <div className="auth-session-header">
                  <span className="term-green term-bold">$ ./useradd.sh --interactive</span>
                  <span className="terminal-cursor"></span>
                </div>

                <form onSubmit={handleSubmit} className="terminal-auth-form">
                  {/* Username Input */}
                  <div className="terminal-input-wrapper">
                    <label className="terminal-input-label">
                      username
                    </label>
                    <div className="terminal-input-container">
                      <span className="term-green">&gt; </span>
                      <input
                        type="text"
                        value={username}
                        onChange={handleUsernameChange}
                        onFocus={() => setActiveField('username')}
                        onBlur={() => setActiveField(null)}
                        disabled={isLoading}
                        placeholder="enter username"
                        maxLength={20}
                        className={`terminal-input ${fieldErrors.username ? 'error' : ''}`}
                      />
                      {activeField === 'username' && <span className="terminal-cursor"></span>}
                    </div>
                    {fieldErrors.username && (
                      <div className="terminal-error">
                        {fieldErrors.username}
                      </div>
                    )}
                  </div>

                  {/* Email Input */}
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
                        placeholder="user@domain.com"
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

                  {/* Confirm Password Input */}
                  <div className="terminal-input-wrapper">
                    <label className="terminal-input-label">
                      confirm_password
                    </label>
                    <div className="terminal-input-container">
                      <span className="term-green">&gt; </span>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={handleConfirmPasswordChange}
                        onFocus={() => setActiveField('confirmPassword')}
                        onBlur={() => setActiveField(null)}
                        disabled={isLoading}
                        placeholder="confirm password"
                        maxLength={50}
                        className={`terminal-input ${fieldErrors.confirmPassword ? 'error' : ''}`}
                      />
                      {activeField === 'confirmPassword' && <span className="terminal-cursor"></span>}
                    </div>
                    <div className="password-toggle-wrapper">
                      <button
                        type="button"
                        className="terminal-toggle-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? '[HIDE]' : '[SHOW]'}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <div className="terminal-error">
                        {fieldErrors.confirmPassword}
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
                        <span> CREATING ACCOUNT...</span>
                      </span>
                    ) : (
                      <span>
                        <span className="term-green">&gt;</span> sudo useradd --execute
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
                    <span className="term-dim">Already have an account?</span>
                    <Link to="/signin" className="term-green terminal-link">
                      user login --signin
                    </Link>
                  </div>
                </div>
              </>
            )}
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

export default SignUp;
