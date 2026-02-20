import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/terminal.css';
import './Dashboard.css';

function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    // Get user display name or email
    const displayName = user?.displayName || user?.username || user?.email || 'user';
    const userEmail = user?.email || 'user@csr-bot.local';

    return (
        <div className="terminal-dashboard-page">
            {/* Terminal Header */}
            <header className="terminal-header-bar">
                <div className="terminal-header-content">
                    <div className="terminal-brand">
                        <span className="term-green term-bold">{displayName}@csr-bot:~/dashboard#</span>
                        <span className="term-white">CSR_DENIAL_KNOWLEDGE_BOT</span>
                    </div>
                    <nav className="terminal-nav">
                        <Link to="/" className="terminal-nav-btn">home</Link>
                        <Link to="/chatbot" className="terminal-nav-btn">chatbot</Link>
                        <button onClick={handleLogout} className="terminal-nav-btn">logout</button>
                    </nav>
                </div>
            </header>

            {/* Dashboard Bento Grid */}
            <div className="bento-grid dashboard-bento">
                {/* User Profile - 2x2 Bento */}
                <div className="bento-cell-2x2 terminal-window">
                    <div className="terminal-header">
                        <span className="terminal-title">┌─ USER PROFILE ─┐</span>
                        <span className="terminal-controls">
                            <span className="term-dim">$ whoami</span>
                        </span>
                    </div>
                    <div className="terminal-body">
                        <div className="user-profile-section">
                            <div className="profile-avatar">
                                <span className="term-green term-bold">{displayName.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="profile-info">
                                <div className="profile-line">
                                    <span className="term-green">USERNAME:</span>
                                    <span className="term-white">{displayName}</span>
                                </div>
                                <div className="profile-line">
                                    <span className="term-green">EMAIL:</span>
                                    <span className="term-white">{userEmail}</span>
                                </div>
                                <div className="profile-line">
                                    <span className="term-green">ROLE:</span>
                                    <span className="term-yellow">CSR_AGENT</span>
                                </div>
                                <div className="profile-line">
                                    <span className="term-green">STATUS:</span>
                                    <span className="term-matrix-green">ACTIVE</span>
                                </div>
                            </div>
                        </div>

                        <div className="terminal-divider">
                            ─────────────────────────────────
                        </div>

                        <div className="profile-actions">
                            <p className="term-green term-bold">$ ./profile-actions.sh</p>
                            <button className="terminal-button dashboard-btn">
                                edit-profile
                            </button>
                            <button className="terminal-button dashboard-btn">
                                change-password
                            </button>
                        </div>
                    </div>
                </div>

                {/* System Stats - 2x1 Bento */}
                <div className="bento-cell-2x1 terminal-window">
                    <div className="terminal-header">
                        <span className="terminal-title">┌─ SYSTEM STATS ─┐</span>
                        <span className="terminal-controls">
                            <span className="term-dim">$ system-stats</span>
                        </span>
                    </div>
                    <div className="terminal-body">
                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="term-green">QUERIES_TODAY:</span>
                                <span className="term-white">47</span>
                            </div>
                            <div className="stat-item">
                                <span className="term-green">AVG_RESPONSE:</span>
                                <span className="term-white">1.8s</span>
                            </div>
                            <div className="stat-item">
                                <span className="term-green">ACCURACY:</span>
                                <span className="term-white">98.5%</span>
                            </div>
                            <div className="stat-item">
                                <span className="term-green">UPTIME:</span>
                                <span className="term-matrix-green">99.99%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions - 2x1 Bento */}
                <div className="bento-cell-2x1 terminal-window">
                    <div className="terminal-header">
                        <span className="terminal-title">┌─ QUICK ACTIONS ─┐</span>
                        <span className="terminal-controls">
                            <span className="term-dim">$ ./quick-actions.sh</span>
                        </span>
                    </div>
                    <div className="terminal-body">
                        <div className="quick-actions-grid">
                            <Link to="/chatbot" className="terminal-button action-btn">
                                start-chatbot
                            </Link>
                            <button className="terminal-button action-btn">
                                view-history
                            </button>
                            <button className="terminal-button action-btn">
                                export-data
                            </button>
                            <button className="terminal-button action-btn">
                                settings
                            </button>
                        </div>
                    </div>
                </div>

                {/* Recent Activity - 4x1 Bento */}
                <div className="bento-cell-4x1 terminal-window">
                    <div className="terminal-header">
                        <span className="terminal-title">┌─ RECENT ACTIVITY ─┐</span>
                        <span className="terminal-controls">
                            <span className="term-dim">$ tail -f activity.log</span>
                        </span>
                    </div>
                    <div className="terminal-body">
                        <div className="activity-log">
                            <div className="log-entry">
                                <span className="term-dim">[2024-02-12 20:15:30]</span>
                                <span className="term-green">[INFO]</span>
                                <span className="term-white">User logged in successfully</span>
                            </div>
                            <div className="log-entry">
                                <span className="term-dim">[2024-02-12 19:42:15]</span>
                                <span className="term-green">[INFO]</span>
                                <span className="term-white">Query: "What is denial code CO-45?"</span>
                            </div>
                            <div className="log-entry">
                                <span className="term-dim">[2024-02-12 19:42:16]</span>
                                <span className="term-matrix-green">[SUCCESS]</span>
                                <span className="term-white">Response delivered in 1.2s</span>
                            </div>
                            <div className="log-entry">
                                <span className="term-dim">[2024-02-12 18:30:22]</span>
                                <span className="term-green">[INFO]</span>
                                <span className="term-white">Query: "Check plan coverage for member ID 12345"</span>
                            </div>
                            <div className="log-entry">
                                <span className="term-dim">[2024-02-12 18:30:23]</span>
                                <span className="term-matrix-green">[SUCCESS]</span>
                                <span className="term-white">Coverage details retrieved</span>
                            </div>
                            <div className="log-entry">
                                <span className="term-dim">[2024-02-12 17:15:10]</span>
                                <span className="term-green">[INFO]</span>
                                <span className="term-white">Session started</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System Info - 2x1 Bento */}
                <div className="bento-cell-2x1 terminal-window">
                    <div className="terminal-header">
                        <span className="terminal-title">┌─ SYSTEM INFO ─┐</span>
                    </div>
                    <div className="terminal-body">
                        <div className="system-info-display">
                            <p className="term-green term-bold">$ cat /etc/system-info</p>
                            <div className="info-line">
                                <span className="term-dim">VERSION:</span>
                                <span className="term-white">1.0.0</span>
                            </div>
                            <div className="info-line">
                                <span className="term-dim">BUILD:</span>
                                <span className="term-white">2024.02.12</span>
                            </div>
                            <div className="info-line">
                                <span className="term-dim">ENVIRONMENT:</span>
                                <span className="term-yellow">PRODUCTION</span>
                            </div>
                            <div className="info-line">
                                <span className="term-dim">API_STATUS:</span>
                                <span className="term-matrix-green">ONLINE</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Help & Support - 2x1 Bento */}
                <div className="bento-cell-2x1 terminal-window">
                    <div className="terminal-header">
                        <span className="terminal-title">┌─ HELP & SUPPORT ─┐</span>
                    </div>
                    <div className="terminal-body">
                        <div className="help-section">
                            <p className="term-green term-bold">$ man csr-bot</p>
                            <div className="help-links">
                                <a href="#" className="term-green terminal-link">Documentation</a>
                                <a href="#" className="term-green terminal-link">FAQ</a>
                                <a href="#" className="term-green terminal-link">Support</a>
                                <a href="#" className="term-green terminal-link">Report Issue</a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer - 4x1 Bento */}
                <div className="bento-cell-4x1 terminal-window terminal-footer-info">
                    <div className="terminal-body terminal-footer-content">
                        <span className="term-dim">© 2024 CSR Denial Knowledge Bot</span>
                        <span className="term-dim">|</span>
                        <span className="term-green">{displayName}@csr-bot:~/dashboard#</span>
                        <span className="terminal-cursor"></span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
