import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';
import '../styles/terminal.css';
import './ForgotPassword.css';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeField, setActiveField] = useState(false);

    const validateEmail = () => {
        if (!email.trim()) {
            setError('Email is required');
            return false;
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            setError('Invalid email format');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!validateEmail()) {
            setIsLoading(false);
            return;
        }

        try {
            if (!isFirebaseConfigured || !auth) {
                throw new Error('Firebase password reset is not configured for this local environment.');
            }

            await sendPasswordResetEmail(auth, email.trim());
            setSuccess(true);
            setEmail('');
        } catch (error) {
            console.error('Password reset error:', error);

            let errorMessage = 'Password reset failed';

            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Email not found';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email format';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many attempts. Try later';
                    break;
                default:
                    errorMessage = error.message || 'Password reset failed';
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (error) {
            setError('');
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
                {/* Left Side - Recovery Info Bento */}
                <div className="bento-cell-2x2 terminal-window">
                    <div className="terminal-header">
                        <span className="terminal-title">┌─ PASSWORD RECOVERY ─┐</span>
                    </div>
                    <div className="terminal-body">
                        <div className="terminal-ascii-art">
                            <pre className="term-green">
                                {`
  ╔═══════════════════════╗
  ║  RECOVERY TERMINAL    ║
  ╚═══════════════════════╝
`}
                            </pre>
                        </div>

                        <div className="system-info-lines">
                            <div className="terminal-prompt">
                                <span className="term-green">COMMAND:</span>
                                <span className="term-white">sudo recovery --email</span>
                            </div>
                            <div className="terminal-prompt">
                                <span className="term-green">ACTION:</span>
                                <span className="term-white">Reset password</span>
                            </div>
                            <div className="terminal-prompt">
                                <span className="term-green">METHOD:</span>
                                <span className="term-yellow">EMAIL_LINK</span>
                            </div>
                            <div className="terminal-prompt">
                                <span className="term-green">STATUS:</span>
                                <span className="term-matrix-green">READY</span>
                            </div>
                        </div>

                        <div className="terminal-divider">
                            ─────────────────────────────────
                        </div>

                        <div className="terminal-help-text">
                            <p className="term-green term-bold">INSTRUCTIONS:</p>
                            <p className="term-dim">1. Enter your email address</p>
                            <p className="term-dim">2. Execute recovery command</p>
                            <p className="term-dim">3. Check email for reset link</p>
                            <p className="term-dim">4. Follow link to reset password</p>
                        </div>

                        <div className="terminal-divider">
                            ─────────────────────────────────
                        </div>

                        <div className="terminal-help-text">
                            <p className="term-green term-bold">SECURITY NOTE:</p>
                            <p className="term-dim">• Link expires in 1 hour</p>
                            <p className="term-dim">• One-time use only</p>
                            <p className="term-dim">• Secure email delivery</p>
                        </div>

                        <div className="terminal-nav-link">
                            <Link to="/" className="terminal-button">
                                cd ~/home
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Side - Recovery Form Bento */}
                <div className="bento-cell-2x2 terminal-window">
                    <div className="terminal-header">
                        <span className="terminal-title">┌─ EXECUTE RECOVERY ─┐</span>
                    </div>
                    <div className="terminal-body">
                        {success ? (
                            <div className="terminal-success-screen">
                                <div className="terminal-success-art">
                                    <pre className="term-green">
                                        {`
    ✓ SUCCESS
    
  Recovery Email Sent!
`}
                                    </pre>
                                </div>
                                <div className="terminal-success">
                                    Password reset email sent successfully
                                </div>
                                <div className="terminal-prompt">
                                    <span className="term-dim">Check your email inbox</span>
                                </div>
                                <div className="terminal-divider" style={{ margin: '1.5rem 0' }}>
                                    ─────────────────────────────────
                                </div>
                                <div className="terminal-alt-actions">
                                    <div className="terminal-prompt">
                                        <Link to="/signin" className="term-green terminal-link">
                                            user login --signin
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="auth-session-header">
                                    <span className="term-green term-bold">$ sudo recovery --email</span>
                                    <span className="terminal-cursor"></span>
                                </div>

                                <form onSubmit={handleSubmit} className="terminal-auth-form">
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
                                                onFocus={() => setActiveField(true)}
                                                onBlur={() => setActiveField(false)}
                                                disabled={isLoading}
                                                placeholder="user@domain.com"
                                                maxLength={100}
                                                className={`terminal-input ${error ? 'error' : ''}`}
                                            />
                                            {activeField && <span className="terminal-cursor"></span>}
                                        </div>
                                        {error && (
                                            <div className="terminal-error">
                                                {error}
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
                                                <span> SENDING RECOVERY EMAIL...</span>
                                            </span>
                                        ) : (
                                            <span>
                                                <span className="term-green">&gt;</span> sudo recovery --execute
                                            </span>
                                        )}
                                    </button>
                                </form>

                                <div className="terminal-divider">
                                    ─────────────────────────────────
                                </div>

                                {/* Alternative Actions */}
                                <div className="terminal-alt-actions">
                                    <div className="terminal-prompt">
                                        <span className="term-dim">Remember your password?</span>
                                        <Link to="/signin" className="term-green terminal-link">
                                            user login --signin
                                        </Link>
                                    </div>
                                    <div className="terminal-prompt">
                                        <span className="term-dim">Need an account?</span>
                                        <Link to="/signup" className="term-green terminal-link">
                                            sudo useradd --create
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

export default ForgotPassword;
