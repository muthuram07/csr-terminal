import React from 'react';
import '../styles/terminal.css';

/**
 * GlobalStyles Component
 * Enforces terminal theme across the entire application
 * Provides reusable terminal UI components
 */

export const GlobalStyles = ({ children }) => {
    return (
        <div className="terminal-app-wrapper">
            {children}
        </div>
    );
};

/**
 * Terminal Loading Component
 * Consistent loading state across all pages
 */
export const TerminalLoading = ({ message = 'LOADING' }) => {
    return (
        <div className="terminal-loading-screen">
            <div className="terminal-window">
                <div className="terminal-header">
                    <span className="terminal-title">┌─ SYSTEM ─┐</span>
                </div>
                <div className="terminal-body">
                    <div className="terminal-loading-content">
                        <span className="term-green">[</span>
                        <span className="terminal-spinner-char">|</span>
                        <span className="term-green">]</span>
                        <span className="term-white"> {message}...</span>
                        <span className="terminal-cursor"></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Terminal Error Component
 * Consistent error display across all pages
 */
export const TerminalError = ({ message, onRetry }) => {
    return (
        <div className="terminal-error-screen">
            <div className="terminal-window">
                <div className="terminal-header">
                    <span className="terminal-title">┌─ ERROR ─┐</span>
                </div>
                <div className="terminal-body">
                    <div className="terminal-error">
                        {message}
                    </div>
                    {onRetry && (
                        <button onClick={onRetry} className="terminal-button" style={{ marginTop: '1rem' }}>
                            retry
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Terminal Page Header
 * Consistent header across all pages
 */
export const TerminalPageHeader = ({ user, onLogout, showNav = true }) => {
    return (
        <header className="terminal-header-bar">
            <div className="terminal-header-content">
                <div className="terminal-brand">
                    <span className="term-green term-bold">
                        {user ? `${user.username}@csr-bot:~#` : 'root@csr-bot:~#'}
                    </span>
                    <span className="term-white">CSR_DENIAL_KNOWLEDGE_BOT</span>
                </div>
                {showNav && (
                    <nav className="terminal-nav">
                        {user ? (
                            <>
                                <span className="term-dim">
                                    user: <span className="term-green">{user.username || user.email}</span>
                                </span>
                                <button onClick={onLogout} className="terminal-nav-btn">
                                    logout
                                </button>
                            </>
                        ) : (
                            <>
                                <a href="/signin" className="terminal-nav-btn">login</a>
                                <a href="/signup" className="terminal-nav-btn">signup</a>
                            </>
                        )}
                    </nav>
                )}
            </div>
        </header>
    );
};

/**
 * Terminal Command Button
 * Reusable terminal-styled button component
 */
export const TerminalCommandButton = ({
    command,
    onClick,
    disabled = false,
    loading = false,
    className = ''
}) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`terminal-button ${className}`}
        >
            {loading ? (
                <span className="terminal-spinner">
                    <span className="term-green">[</span>
                    <span className="spinner-char">|</span>
                    <span className="term-green">]</span>
                    <span> EXECUTING...</span>
                </span>
            ) : (
                <span>
                    <span className="term-green">&gt;</span> {command}
                </span>
            )}
        </button>
    );
};

/**
 * Terminal Input Field
 * Reusable terminal-styled input component
 */
export const TerminalInput = ({
    label,
    type = 'text',
    value,
    onChange,
    onFocus,
    onBlur,
    placeholder,
    error,
    disabled = false,
    maxLength,
    showCursor = false
}) => {
    return (
        <div className="terminal-input-wrapper">
            <label className="terminal-input-label">
                {label}
            </label>
            <div className="terminal-input-container">
                <span className="term-green">&gt; </span>
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    disabled={disabled}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className={`terminal-input ${error ? 'error' : ''}`}
                />
                {showCursor && <span className="terminal-cursor"></span>}
            </div>
            {error && (
                <div className="terminal-error">
                    {error}
                </div>
            )}
        </div>
    );
};

export default GlobalStyles;
